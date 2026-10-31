"""Views for the personal portfolio hub (index.html)."""
from django.http import JsonResponse
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.decorators.http import require_GET
from django.views.generic import TemplateView

from courses.models import (
    Course,
    CourseCertificate,
    CourseProgress,
    CourseStatus,
    ManualCertificate,
    ManualCertificateStatus,
    WorkshopCertificate,
)
from courses.views import published_courses_payload
from posts.models import Post
from projects.models import Project, ProjectInteraction
from users.models import UserRole


@require_GET
def trainer_course_students(request, course_slug):
    user = request.user
    if not user.is_authenticated or not user.is_trainer:
        return JsonResponse({'ok': False, 'message': 'غير مصرح لك بعرض الطلاب.'}, status=403)

    course = Course.objects.filter(slug=course_slug, owner=user).first()
    if course is None:
        return JsonResponse({'ok': False, 'message': 'الدورة غير موجودة.'}, status=404)

    total_lessons = course.lessons_count
    progress_rows = (
        CourseProgress.objects.filter(course=course)
        .select_related('student', 'student__profile')
        .order_by('created_at', 'pk')
    )
    students = []
    for progress in progress_rows:
        completed_count = progress.done_count
        profile = getattr(progress.student, 'profile', None)
        students.append({
            'id': str(progress.student_id),
            'name': progress.student.display_name,
            'handle': progress.student.handle,
            'avatar': profile.avatar.url if profile and profile.avatar else '',
            'completed': progress.completed,
            'completedLessons': completed_count,
            'totalLessons': total_lessons,
            'progress': round(completed_count * 100 / total_lessons) if total_lessons else 0,
        })

    return JsonResponse({
        'ok': True,
        'course': {'id': course.slug, 'title': course.title},
        'students': students,
    })


class HomeView(LoginRequiredMixin, TemplateView):
    """index.html — profile cards, tabs and panels."""

    template_name = 'portfolio/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        if user.is_authenticated:
            projects = (
                Project.objects.filter(owner=user)
                .select_related('owner')
                .prefetch_related('tags', 'images', 'files')
            )
            interactions = {
                interaction.project_id: interaction
                for interaction in ProjectInteraction.objects.filter(
                    user=user, project__owner=user
                )
            }
            projects_json = []
            for project in projects:
                data = project.to_public_dict()
                interaction = interactions.get(project.pk)
                data['liked'] = interaction.liked if interaction else False
                data['saved'] = interaction.saved if interaction else False
                projects_json.append(data)
            context['projects_json'] = projects_json
            saved_interactions = (
                ProjectInteraction.objects.filter(user=user, saved=True)
                .select_related('project', 'project__owner')
                .prefetch_related('project__tags', 'project__images', 'project__files')
            )
            saved_projects_json = []
            for interaction in saved_interactions:
                project = interaction.project
                data = project.to_public_dict()
                data['liked'] = interaction.liked
                data['saved'] = True
                saved_projects_json.append(data)
            context['saved_projects_json'] = saved_projects_json
            posts = (
                Post.objects.filter(owner=user)
                .select_related('owner')
                .prefetch_related('tags', 'media', 'comments')
            )
            context['posts_json'] = [p.to_public_dict() for p in posts]
            # الشهادات التي اكتسبها الطالب (تُدمج مع قائمة الدورات في الواجهة)
            certs = CourseCertificate.objects.filter(student=user).select_related(
                'course', 'course__owner', 'student'
            ).prefetch_related('course__sections__lessons')
            manual_certs = ManualCertificate.objects.filter(
                student=user,
                status__in=(
                    ManualCertificateStatus.PENDING,
                    ManualCertificateStatus.APPROVED,
                ),
            ).select_related('student')
            workshop_certs = WorkshopCertificate.objects.filter(
                attendance__student=user
            ).select_related('attendance__student')
            context['my_certs_json'] = (
                [c.to_public_dict() for c in certs]
                + [c.to_public_dict() for c in manual_certs]
                + [c.to_public_dict() for c in workshop_certs]
            )
            if user.role == UserRole.STUDENT:
                active_progress = (
                    CourseProgress.objects.filter(
                        student=user,
                        completed=False,
                        course__status=CourseStatus.PUBLISHED,
                    )
                    .select_related('course', 'course__owner', 'course__owner__profile')
                )
                context['active_courses_json'] = [
                    progress.course.to_public_dict(
                        include_syllabus=False,
                        include_content=False,
                    )
                    for progress in active_progress
                ]
            # الدورات المنشورة تُدمج مع الشهادات المكتسبة في لائحة الشهادات
            context['courses_json'] = published_courses_payload()
            # للمدرب: دوراته هو (منشورة + مسودّات) تُعرض في قسم «الدورات التدريبية»
            if user.is_trainer:
                my_courses = (
                    Course.objects.filter(owner=user)
                    .select_related('owner', 'owner__profile')
                )
                context['my_courses_json'] = [
                    c.to_public_dict(include_syllabus=False, include_content=False)
                    for c in my_courses
                ]
        return context
