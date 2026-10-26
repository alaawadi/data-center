"""Views for the public freelancer (users) pages, backed by the database."""
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Sum
from django.views.generic import ListView, TemplateView

from courses.models import (
    CourseCertificate,
    CourseStatus,
    ManualCertificate,
    ManualCertificateStatus,
    StudentPointTransaction,
    StudentReferralLink,
    WorkshopCertificate,
)
from courses.views import published_courses_payload
from posts.models import Post, PostStatus
from projects.models import Project, ProjectInteraction, ProjectStatus, ProjectVisibility
from users.models import Profile, UserRole


class FreelancerListView(ListView):
    """all-users.html — public, active profiles."""

    template_name = 'accounts/freelancer_list.html'
    context_object_name = 'profiles'

    def get_queryset(self):
        return (
            Profile.objects.select_related('user')
            .filter(
                is_public=True,
                user__is_active=True,
                user__role__in=(UserRole.TRAINER, UserRole.STUDENT),
            )
            .annotate(
                earned_certificates_count=Count(
                    'user__earned_certificates',
                    filter=Q(user__earned_certificates__is_active=True),
                    distinct=True,
                ),
                published_projects_count=Count(
                    'user__projects',
                    filter=Q(
                        user__projects__status=ProjectStatus.PUBLISHED,
                        user__projects__visibility=ProjectVisibility.PUBLIC,
                    ),
                    distinct=True,
                ),
                published_courses_count=Count(
                    'user__courses',
                    filter=Q(user__courses__status=CourseStatus.PUBLISHED),
                    distinct=True,
                ),
                approved_manual_certificates_count=Count(
                    'user__manual_certificates',
                    filter=Q(
                        user__manual_certificates__status=ManualCertificateStatus.APPROVED,
                        user__manual_certificates__is_active=True,
                    ),
                    distinct=True,
                ),
            )
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        profiles = []
        for profile in context['profiles']:
            data = profile.to_public_dict()
            data['certificates'] = (
                profile.earned_certificates_count
                + profile.approved_manual_certificates_count
            )
            data['projects'] = profile.published_projects_count
            data['courses'] = profile.published_courses_count
            profiles.append(data)

        profiles.sort(
            key=lambda user: (
                0 if user['roleKey'] == UserRole.TRAINER else 1,
                -(
                    user['certificates'] + user['projects']
                    if user['roleKey'] == UserRole.STUDENT
                    else 0
                ),
                -min(user['certificates'], user['projects'])
                if user['roleKey'] == UserRole.STUDENT
                else 0,
                user['name'].casefold(),
                user['handle'].casefold(),
            )
        )
        context['profiles_json'] = profiles
        return context


class FreelancerDetailView(TemplateView):
    """user-profile.html — public profile of a freelancer by handle."""

    template_name = 'accounts/freelancer_detail.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        profile = get_object_or_404(
            Profile.objects.select_related('user'),
            user__handle=kwargs['handle'],
            user__is_active=True,
            is_public=True,
        )
        context['profile'] = profile

        is_owner = self.request.user.is_authenticated and self.request.user.pk == profile.user_id
        post_filter = {'owner': profile.user}
        if not is_owner:
            post_filter['status'] = PostStatus.PUBLISHED

        context['profile_json'] = profile.to_public_dict()
        if is_owner and profile.user.role == UserRole.STUDENT:
            context['profile_json']['referral_points'] = (
                StudentPointTransaction.objects.filter(student=profile.user)
                .aggregate(total=Sum('points'))['total']
                or 0
            )
            context['profile_json']['referral_visits'] = (
                StudentReferralLink.objects.filter(referrer=profile.user)
                .aggregate(total=Sum('visits'))['total']
                or 0
            )
        profile_projects = list(
            Project.objects.filter(
                owner=profile.user,
                status=ProjectStatus.PUBLISHED,
                visibility=ProjectVisibility.PUBLIC,
            )
            .select_related('owner')
            .prefetch_related('tags', 'images', 'files')
        )
        profile_interactions = {}
        if is_owner:
            profile_interactions = {
                interaction.project_id: interaction
                for interaction in ProjectInteraction.objects.filter(
                    user=self.request.user, project_id__in=[p.pk for p in profile_projects]
                )
            }
        projects_json = []
        for project in profile_projects:
            data = project.to_public_dict()
            interaction = profile_interactions.get(project.pk)
            data['liked'] = interaction.liked if interaction else False
            data['saved'] = interaction.saved if interaction else False
            projects_json.append(data)
        context['projects_json'] = projects_json
        if is_owner:
            saved_interactions = (
                ProjectInteraction.objects.filter(user=self.request.user, saved=True)
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
        context['posts_json'] = [
            p.to_public_dict()
            for p in (
                Post.objects.filter(**post_filter)
                .select_related('owner')
                .prefetch_related('tags', 'media', 'comments')
            )
        ]
        # الشهادات التي اكتسبها صاحب البروفايل
        certs = (
            CourseCertificate.objects.filter(student=profile.user, is_active=True)
            .select_related('course', 'course__owner', 'student')
            .prefetch_related('course__sections__lessons')
        )
        context['profile_certs_json'] = [c.to_public_dict() for c in certs]
        manual_certificates = ManualCertificate.objects.filter(
            student=profile.user,
            status=ManualCertificateStatus.APPROVED,
            is_active=True,
        ).select_related('student')
        context['profile_certs_json'] += [
            certificate.to_public_dict()
            for certificate in manual_certificates
        ]
        context['profile_certs_json'] += [
            certificate.to_public_dict()
            for certificate in WorkshopCertificate.objects.filter(
                attendance__student=profile.user
            ).select_related('attendance__student', 'attendance__workshop')
        ]
        # الدورات المنشورة تُدمج مع الشهادات المكتسبة في لائحة شهادات البروفايل
        context['courses_json'] = published_courses_payload()
        return context
