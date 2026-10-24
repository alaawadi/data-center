"""Views for the personal portfolio hub (index.html)."""
from django.views.generic import TemplateView

from courses.models import (
    Course,
    CourseCertificate,
    ManualCertificate,
    ManualCertificateStatus,
    WorkshopCertificate,
)
from courses.views import published_courses_payload
from posts.models import Post
from projects.models import Project, ProjectInteraction


class HomeView(TemplateView):
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
            # الدورات المنشورة تُدمج مع الشهادات المكتسبة في لائحة الشهادات
            context['courses_json'] = published_courses_payload()
            # للمدرب: دوراته هو (منشورة + مسودّات) تُعرض في قسم «الدورات التدريبية»
            if user.is_trainer:
                my_courses = (
                    Course.objects.filter(owner=user)
                    .select_related('owner')
                    .prefetch_related('sections__lessons')
                )
                context['my_courses_json'] = [c.to_public_dict() for c in my_courses]
        return context
