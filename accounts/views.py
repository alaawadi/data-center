"""Views for the public freelancer (users) pages, backed by the database."""
import json

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Sum
from django.http import JsonResponse
from django.views.decorators.http import require_POST
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
        display_orders = {}
        for profile in context['profiles']:
            data = profile.to_public_dict()
            data['certificates'] = (
                profile.earned_certificates_count
                + profile.approved_manual_certificates_count
            )
            data['projects'] = profile.published_projects_count
            data['courses'] = profile.published_courses_count
            profiles.append(data)
            if profile.display_order is not None:
                display_orders[profile.user.handle] = profile.display_order

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
        original_positions = {
            profile['handle']: index for index, profile in enumerate(profiles)
        }
        profiles.sort(
            key=lambda user: (
                display_orders.get(user['handle']) is None,
                display_orders.get(user['handle'], original_positions[user['handle']]),
            )
        )
        context['profiles_json'] = profiles
        user = self.request.user
        context['can_reorder_freelancers'] = bool(
            user.is_authenticated and (user.is_staff or user.is_admin_role)
        )
        return context


@login_required
@require_POST
def freelancer_reorder(request):
    if not (request.user.is_staff or request.user.is_admin_role):
        return JsonResponse({'ok': False, 'error': 'forbidden'}, status=403)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({'ok': False, 'error': 'invalid_json'}, status=400)

    order = payload.get('order') if isinstance(payload, dict) else None
    if not isinstance(order, list) or any(
        not isinstance(handle, str) or not handle for handle in order
    ):
        return JsonResponse({'ok': False, 'error': 'invalid_order'}, status=400)
    if len(order) != len(set(order)):
        return JsonResponse({'ok': False, 'error': 'duplicate_freelancers'}, status=400)

    with transaction.atomic():
        profiles = list(
            Profile.objects.select_for_update()
            .select_related('user')
            .filter(
                is_public=True,
                user__is_active=True,
                user__role__in=(UserRole.TRAINER, UserRole.STUDENT),
            )
        )
        profiles_by_handle = {profile.user.handle: profile for profile in profiles}
        if set(order) != set(profiles_by_handle):
            return JsonResponse(
                {'ok': False, 'error': 'freelancer_list_changed'}, status=409
            )

        for position, handle in enumerate(order):
            profiles_by_handle[handle].display_order = position
        Profile.objects.bulk_update(profiles, ['display_order'])

    return JsonResponse({'ok': True})


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
