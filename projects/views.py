"""Views for projects: listing, details, editor and the save endpoint."""
import base64
import binascii
import json
import re
import uuid
from mimetypes import guess_extension

from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import F, Q
from django.http import FileResponse, Http404, JsonResponse
from django.urls import reverse
from django.utils.dateparse import parse_date
from django.utils.html import strip_tags
from django.views.decorators.http import require_GET, require_POST
from django.views.generic import TemplateView

from users.models import User, UserRole

from .models import (
    Project,
    ProjectFile,
    ProjectImage,
    ProjectInteraction,
    ProjectStatus,
    ProjectTag,
    ProjectVisibility,
)

_PREFETCH = ('tags', 'images', 'files')

_DATA_URL_RE = re.compile(r'^data:(?P<mime>[^;,]+)?(?:;base64)?,(?P<data>.*)$', re.S)


def _decode_data_url(data_url):
    """Turn a base64 data URL into (filename, bytes) or None."""
    if not isinstance(data_url, str) or not data_url.startswith('data:'):
        return None
    header = data_url.split(',', 1)[0]
    if ';base64' not in header:
        return None
    match = _DATA_URL_RE.match(data_url)
    if not match:
        return None
    try:
        content = base64.b64decode(match.group('data'))
    except (binascii.Error, ValueError):
        return None
    if not content:
        return None
    mime = match.group('mime') or 'application/octet-stream'
    ext = guess_extension(mime) or ''
    if ext == '.jpe':
        ext = '.jpg'
    return f'{uuid.uuid4().hex}{ext}', content


def _published_projects():
    return (
        Project.objects.filter(
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC,
        )
        .select_related('owner')
        .prefetch_related(*_PREFETCH)
    )


def _projects_with_interactions(projects, user):
    projects = list(projects)
    interactions = {}
    if user.is_authenticated and projects:
        interactions = {
            interaction.project_id: interaction
            for interaction in ProjectInteraction.objects.filter(
                user=user, project_id__in=[project.pk for project in projects]
            )
        }

    result = []
    for project in projects:
        data = project.to_public_dict()
        interaction = interactions.get(project.pk)
        data['liked'] = interaction.liked if interaction else False
        data['saved'] = interaction.saved if interaction else False
        result.append(data)
    return result


def _find_project(key, queryset):
    project = queryset.filter(slug=key).first()
    if project is None and str(key).isdigit():
        project = queryset.filter(pk=key).first()
    return project


class ProjectListView(TemplateView):
    """all-projects.html — only projects owned by trainers."""

    template_name = 'projects/list.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = _published_projects().filter(owner__role=UserRole.TRAINER)
        context['projects_json'] = _projects_with_interactions(queryset, self.request.user)
        return context


class ProjectDetailView(TemplateView):
    """project.html — a single project by slug (or pk)."""

    template_name = 'projects/detail.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        key = kwargs['pk']
        # المشاريع العامة متاحة للجميع.
        queryset = _published_projects()
        project = _find_project(key, queryset)
        # المستخدم المسجّل يصل أيضاً لمشاريع «مخصّص للدورات» المنشورة (عبر الدروس)
        # ولمشاريعه الخاصة (بما فيها المسودّات).
        if project is None and self.request.user.is_authenticated:
            accessible = (
                Project.objects.filter(status=ProjectStatus.PUBLISHED)
                .select_related('owner')
                .prefetch_related(*_PREFETCH)
            )
            project = _find_project(key, accessible)
        if project is None and self.request.user.is_authenticated:
            if self.request.user.is_staff or self.request.user.role == UserRole.ADMIN:
                admin_projects = (
                    Project.objects.select_related('owner')
                    .prefetch_related(*_PREFETCH)
                )
                project = _find_project(key, admin_projects)
        if project is None and self.request.user.is_authenticated:
            owned = (
                Project.objects.filter(owner=self.request.user)
                .select_related('owner')
                .prefetch_related(*_PREFETCH)
            )
            project = _find_project(key, owned)
        if project is None:
            raise Http404('المشروع غير موجود')
        if project.is_published:
            Project.objects.filter(pk=project.pk).update(views=F('views') + 1)
        related = (
            _published_projects()
            .filter(owner__role=UserRole.TRAINER)
            .exclude(pk=project.pk)
            .exclude(owner=project.owner)
            .order_by('-created_at')[:3]
        )
        context['project'] = project
        context['projects_json'] = _projects_with_interactions(
            [project, *related], self.request.user
        )
        return context


class ProjectEditorView(LoginRequiredMixin, TemplateView):
    """edit-project.html — create (no pk) or edit (pk in path)."""

    template_name = 'projects/editor.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        key = kwargs.get('pk')
        is_admin = self.request.user.is_staff or self.request.user.role == UserRole.ADMIN
        queryset = Project.objects.all() if is_admin else Project.objects.filter(owner=self.request.user)
        queryset = queryset.select_related('owner').prefetch_related(*_PREFETCH)
        project = None
        if key:
            project = queryset.filter(slug=key).first()
            if project is None and str(key).isdigit():
                project = queryset.filter(pk=key).first()
        context['projects_json'] = [project.to_public_dict()] if project else []
        context['is_admin_project_editor'] = is_admin
        if is_admin:
            owners = User.objects.order_by('full_name', 'phone')
            context['admin_project_owners'] = [
                {
                    'id': str(owner.pk),
                    'name': owner.display_name,
                    'handle': owner.handle,
                    'phone': owner.phone,
                    'email': owner.email,
                    'role': owner.get_role_display(),
                }
                for owner in owners
            ]
            context['admin_project_owner_id'] = (
                str(project.owner_id) if project else str(self.request.user.pk)
            )
        return context


@login_required
@require_POST
def project_save(request):
    """AJAX endpoint used by the client-side project editor (create & update)."""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)

    is_admin = request.user.is_staff or request.user.role == UserRole.ADMIN
    key = str(payload.get('id') or '').strip()
    project = None
    if key:
        queryset = Project.objects.all() if is_admin else Project.objects.filter(owner=request.user)
        project = queryset.filter(slug=key).first()
        if project is None and key.isdigit():
            project = queryset.filter(pk=key).first()

    status = ProjectStatus.PUBLISHED if payload.get('status') == ProjectStatus.PUBLISHED else ProjectStatus.DRAFT
    owner = request.user
    if is_admin:
        owner_id = str(payload.get('ownerId') or '').strip()
        if owner_id:
            try:
                owner = User.objects.get(pk=owner_id)
            except (User.DoesNotExist, ValueError, TypeError):
                return JsonResponse({'ok': False, 'error': 'invalid_owner'}, status=400)
        elif project is not None:
            owner = project.owner

    title = str(payload.get('title') or '').strip()[:200]
    summary = str(payload.get('summary') or '').strip()[:320]
    content = str(payload.get('content') or '').strip()
    category = str(payload.get('category') or '').strip()[:120]
    date_value = str(payload.get('date') or '').strip()
    project_date = parse_date(date_value) if date_value else None
    visibility = str(payload.get('visibility') or '').strip()
    raw_tags = payload.get('tags')
    tag_names = []
    seen_tags = set()
    if isinstance(raw_tags, list):
        for raw in raw_tags[:10]:
            name = str(raw or '').strip()[:80]
            if name and name.lower() not in seen_tags:
                seen_tags.add(name.lower())
                tag_names.append(name)

    cover = payload.get('cover')
    decoded_cover = (
        _decode_data_url(cover)
        if isinstance(cover, str) and cover.startswith('data:image')
        else None
    )
    if status == ProjectStatus.PUBLISHED:
        missing = []
        if not title:
            missing.append('title')
        if not ((project is not None and project.cover) or decoded_cover):
            missing.append('cover')
        if not summary:
            missing.append('summary')
        if len(strip_tags(content).split()) < 50:
            missing.append('content')
        if not category:
            missing.append('category')
        if visibility not in (ProjectVisibility.PUBLIC, ProjectVisibility.COURSES):
            missing.append('visibility')
        if len(tag_names) < 3:
            missing.append('tags')
        if project_date is None:
            missing.append('date')
        if missing:
            return JsonResponse(
                {'ok': False, 'error': 'project_incomplete', 'missing': missing},
                status=400,
            )

    if project is None:
        project = Project(owner=owner)
    else:
        project.owner = owner

    project.title = title or 'مشروع بدون عنوان'
    project.summary = summary
    project.content = content
    project.category = category
    project.role = str(payload.get('role') or '').strip()[:150]
    project.project_date = project_date
    project.github_url = str(payload.get('github') or '').strip()[:200]
    project.demo_url = str(payload.get('demo') or '').strip()[:200]
    project.status = status
    # الظهور: «مخصّص للدورات» يُسمح به للمدرب فقط، وإلا يبقى «عام».
    if project.owner.is_trainer and visibility == ProjectVisibility.COURSES:
        project.visibility = ProjectVisibility.COURSES
    else:
        project.visibility = ProjectVisibility.PUBLIC
    project.save()

    if decoded_cover:
        name, image_content = decoded_cover
        project.cover.save(name, ContentFile(image_content), save=True)

    if isinstance(raw_tags, list):
        tag_objects = [
            ProjectTag.objects.get_or_create(name=name)[0]
            for name in tag_names
        ]
        project.tags.set(tag_objects)

    gallery = payload.get('gallery')
    if isinstance(gallery, list):
        existing_images = {img.image.url: img for img in project.images.all() if img.image}
        kept = []
        new_images = []
        for item in gallery[:12]:
            if isinstance(item, str) and item.startswith('data:'):
                new_images.append(item)
            else:
                image = existing_images.get(item)
                if image:
                    kept.append(image)
        project.images.exclude(pk__in=[img.pk for img in kept]).delete()
        order = 0
        for image in kept:
            if image.order != order:
                image.order = order
                image.save(update_fields=['order'])
            order += 1
        for data_url in new_images:
            decoded = _decode_data_url(data_url)
            if not decoded:
                continue
            name, content = decoded
            image = ProjectImage(project=project, order=order)
            image.image.save(name, ContentFile(content), save=False)
            image.save()
            order += 1

    files = payload.get('files')
    if isinstance(files, list):
        existing_files = {}
        for project_file in project.files.all():
            existing_files.setdefault(project_file.display_name, project_file)
        kept_ids = []
        new_files = []
        for item in files[:10]:
            if not isinstance(item, dict):
                continue
            name = str(item.get('name') or '').strip()[:255]
            data_url = item.get('dataUrl')
            if isinstance(data_url, str) and data_url.startswith('data:'):
                new_files.append((name, data_url))
            else:
                project_file = existing_files.get(name)
                if project_file:
                    kept_ids.append(project_file.pk)
        project.files.exclude(pk__in=kept_ids).delete()
        for name, data_url in new_files:
            decoded = _decode_data_url(data_url)
            if not decoded:
                continue
            stored, content = decoded
            project_file = ProjectFile(
                project=project, original_name=name or stored, size=len(content)
            )
            project_file.file.save(stored, ContentFile(content), save=False)
            project_file.save()

    return JsonResponse(
        {
            'ok': True,
            'id': project.slug,
            'status': project.status,
            'url': reverse('projects:detail', kwargs={'pk': project.slug}),
        }
    )


@require_GET
def project_file_download(request, pk):
    project_file = (
        ProjectFile.objects.select_related('project', 'project__owner').filter(pk=pk).first()
    )
    if project_file is None or not project_file.file:
        raise Http404('ملف المشروع غير موجود')

    project = project_file.project
    user = request.user
    is_admin = user.is_authenticated and (user.is_staff or user.role == UserRole.ADMIN)
    can_access_published = project.status == ProjectStatus.PUBLISHED and (
        project.visibility == ProjectVisibility.PUBLIC or user.is_authenticated
    )
    if not can_access_published and not (
        user.is_authenticated and (project.owner_id == user.pk or is_admin)
    ):
        raise Http404('ملف المشروع غير موجود')

    try:
        file_stream = project_file.file.open('rb')
    except (FileNotFoundError, OSError) as exc:
        raise Http404('ملف المشروع غير موجود') from exc
    ProjectFile.objects.filter(pk=project_file.pk).update(downloads=F('downloads') + 1)
    return FileResponse(file_stream, as_attachment=True, filename=project_file.display_name)


@login_required
@require_POST
def project_delete(request):
    """AJAX endpoint: delete a project owned by the current user."""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)

    key = str(payload.get('id') or '').strip()
    if not key:
        return JsonResponse({'ok': False, 'error': 'required'}, status=400)

    project = Project.objects.filter(slug=key, owner=request.user).first()
    if project is None and key.isdigit():
        project = Project.objects.filter(pk=key, owner=request.user).first()
    if project is None:
        return JsonResponse({'ok': False, 'error': 'not_found'}, status=404)

    project.delete()
    return JsonResponse({'ok': True, 'url': reverse('portfolio:home')})


@login_required
@require_POST
def project_interaction(request):
    """Toggle the current user's like or bookmark for a published project."""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)

    key = str(payload.get('id') or '').strip()
    field = payload.get('field')
    if not key:
        return JsonResponse({'ok': False, 'error': 'required'}, status=400)
    if field not in ('like', 'save'):
        return JsonResponse({'ok': False, 'error': 'invalid_field'}, status=400)

    with transaction.atomic():
        accessible = Project.objects.select_for_update().filter(
            Q(status=ProjectStatus.PUBLISHED) | Q(owner=request.user)
        )
        project = _find_project(key, accessible)
        if project is None:
            return JsonResponse({'ok': False, 'error': 'not_found'}, status=404)

        interaction, _ = ProjectInteraction.objects.select_for_update().get_or_create(
            project=project, user=request.user
        )
        state_field = 'liked' if field == 'like' else 'saved'
        new_state = not getattr(interaction, state_field)
        setattr(interaction, state_field, new_state)
        interaction.save(update_fields=[state_field])

        if field == 'like':
            project.likes = max(0, project.likes + (1 if new_state else -1))
            project.save(update_fields=['likes'])

    return JsonResponse(
        {
            'ok': True,
            'liked': interaction.liked,
            'saved': interaction.saved,
            'likes': project.likes,
        }
    )
