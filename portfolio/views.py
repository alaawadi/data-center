"""Views for the personal portfolio hub (index.html)."""
from django.http import JsonResponse
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Q
from django.views.decorators.http import require_GET
from django.views.generic import TemplateView

from courses.models import (
    Course,
    CourseCertificate,
    CourseProgress,
    CourseRegistrationRequest,
    CourseRegistrationRequestStatus,
    CourseStatus,
    CourseType,
    ManualCertificate,
    ManualCertificateStatus,
    WorkshopCertificate,
)
from courses.subscriptions import active_course_progress
from courses.views import published_courses_payload
from projects.models import Project, ProjectInteraction
from users.forms import COUNTRY_CALLING_CODE_CHOICES
from users.models import UserRole


@require_GET
def trainer_course_students(request, course_slug):
    user = request.user
    if not user.is_authenticated or not user.is_trainer:
        return JsonResponse({'ok': False, 'message': 'غير مصرح لك بعرض الطلاب.'}, status=403)

    course = Course.objects.filter(slug=course_slug, owner=user).first()
    if course is None:
        return JsonResponse({'ok': False, 'message': 'الدورة غير موجودة.'}, status=404)

    total_lessons = course.target_lessons_count
    progress_rows = active_course_progress(
        CourseProgress.objects.filter(course=course)
    ).select_related('student', 'student__profile').order_by('created_at', 'pk')
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
            'progress': progress.percent,
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
            context['country_calling_code_choices'] = COUNTRY_CALLING_CODE_CHOICES
            profile = getattr(user, 'profile', None)
            setup = profile.completeness() if profile else {'percent': 0, 'missing': []}
            context['profile_setup'] = setup
            context['profile_setup_missing'] = setup['missing']
            context['profile_setup_complete_notice'] = (
                setup['percent'] == 100
                and self.request.GET.get('saved') == '1'
            )
            projects = (
                Project.objects.filter(owner=user)
                .select_related('owner', 'owner__profile')
                .prefetch_related('tags', 'files')
            )
            interactions = {
                interaction.project_id: interaction
                for interaction in ProjectInteraction.objects.filter(
                    user=user, project__owner=user
                )
            }
            projects_json = []
            for project in projects:
                data = project.to_public_dict(
                    include_content=False,
                    include_comments=False,
                    include_attachments=False,
                )
                interaction = interactions.get(project.pk)
                data['liked'] = interaction.liked if interaction else False
                data['saved'] = interaction.saved if interaction else False
                projects_json.append(data)
            context['projects_json'] = projects_json
            saved_interactions = (
                ProjectInteraction.objects.filter(user=user, saved=True)
                .select_related(
                    'project',
                    'project__owner',
                    'project__owner__profile',
                )
                .prefetch_related('project__tags', 'project__files')
            )
            saved_projects_json = []
            for interaction in saved_interactions:
                project = interaction.project
                data = project.to_public_dict(
                    include_content=False,
                    include_comments=False,
                    include_attachments=False,
                )
                data['liked'] = interaction.liked
                data['saved'] = True
                saved_projects_json.append(data)
            context['saved_projects_json'] = saved_projects_json
            # الشهادات التي اكتسبها الطالب (تُدمج مع قائمة الدورات في الواجهة)
            certs = CourseCertificate.objects.filter(student=user).select_related(
                'course',
                'course__owner',
                'course__owner__profile',
                'student',
            )
            manual_certs = ManualCertificate.objects.filter(
                student=user,
                status__in=(
                    ManualCertificateStatus.PENDING,
                    ManualCertificateStatus.APPROVED,
                    ManualCertificateStatus.REJECTED,
                ),
            ).select_related('student')
            workshop_certs = WorkshopCertificate.objects.filter(
                attendance__student=user
            ).select_related(
                'attendance__student',
                'attendance__workshop__course__owner__profile',
            )
            context['my_certs_json'] = (
                [
                    certificate.to_public_dict(
                        include_syllabus=False,
                        include_content=False,
                    )
                    for certificate in certs
                ]
                + [c.to_public_dict() for c in manual_certs]
                + [c.to_public_dict() for c in workshop_certs]
            )
            if user.role == UserRole.STUDENT:
                active_progress = active_course_progress(
                    CourseProgress.objects.filter(
                        student=user,
                        completed=False,
                    ).filter(
                        Q(course__status=CourseStatus.PUBLISHED)
                        | Q(course__course_type=CourseType.IN_PERSON)
                    )
                ).select_related(
                    'course', 'course__owner', 'course__owner__profile'
                )
                active_courses = [
                    progress.course
                    for progress in active_progress
                ]
                active_course_ids = {course.pk for course in active_courses}
                accepted_inperson_courses = Course.objects.filter(
                    course_type=CourseType.IN_PERSON,
                    registration_requests__student=user,
                    registration_requests__status=CourseRegistrationRequestStatus.ACCEPTED,
                ).select_related(
                    'owner', 'owner__profile'
                ).distinct()
                for course in accepted_inperson_courses:
                    if course.pk not in active_course_ids:
                        active_courses.append(course)
                        active_course_ids.add(course.pk)
                attended_workshop_courses = Course.objects.filter(
                    attendance_workshop__attendances__student=user,
                ).select_related(
                    'owner',
                    'owner__profile',
                ).distinct()
                for course in attended_workshop_courses:
                    if course.pk not in active_course_ids:
                        active_courses.append(course)
                        active_course_ids.add(course.pk)
                active_courses_json = [
                    course.to_public_dict(
                        include_syllabus=False,
                        include_content=False,
                    )
                    for course in active_courses
                ]
                standalone_workshop_certificates = WorkshopCertificate.objects.filter(
                    attendance__student=user,
                    attendance__workshop__course__isnull=True,
                ).select_related(
                    'attendance__student',
                    'attendance__workshop',
                )
                for certificate in standalone_workshop_certificates:
                    workshop_data = certificate.to_public_dict()
                    workshop_data.update({
                        'courseType': CourseType.IN_PERSON,
                        'inPersonKind': 'workshop',
                        'duration': f"{workshop_data['duration']} ساعة",
                    })
                    active_courses_json.append(workshop_data)
                context['active_courses_json'] = active_courses_json
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
