"""SEO metadata and public discovery endpoints."""

import json
import xml.etree.ElementTree as ET
from itertools import chain
from urllib.parse import urljoin

from django.conf import settings
from django.http import HttpResponse
from django.urls import reverse
from django.utils.encoding import iri_to_uri
from django.utils.html import strip_tags
from django.utils.safestring import mark_safe
from django.views.decorators.http import require_GET


DEFAULT_SEO_DESCRIPTION = (
    'اكتشف الدورات التدريبية الأونلاين والوجاهية، واستعرض المشاريع والملفات المهنية '
    'على مركز داتا للتدريب والتطوير.'
)
ROBOTS_NO_INDEX_VIEWS = {
    'dashboard:home',
    'dashboard:course-editor-create',
    'dashboard:course-editor-edit',
    'dashboard:project-editor-create',
    'dashboard:project-editor-edit',
    'courses:create',
    'courses:edit',
    'courses:playlist',
    'courses:certificate',
    'projects:create',
    'projects:edit',
    'portfolio:trainer-course-students',
    'users:login',
    'users:signup',
    'users:verify-signup',
    'users:student-setup',
    'users:profile-edit',
    'users:profile-update',
    'users:phone-check',
    'users:profile-whatsapp-check',
}


def seo_base_url():
    return getattr(
        settings,
        'SEO_SITE_URL',
        'https://alaawadi99998.pythonanywhere.com',
    ).rstrip('/')


def _json_ld_script(data):
    encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    for character, replacement in (
        ('&', '\\u0026'),
        ('<', '\\u003C'),
        ('>', '\\u003E'),
        ('\u2028', '\\u2028'),
        ('\u2029', '\\u2029'),
    ):
        encoded = encoded.replace(character, replacement)
    return mark_safe(f'<script type="application/ld+json">{encoded}</script>')


def json_ld_script(data):
    """Serialize trusted structured data without allowing script-tag injection."""
    return _json_ld_script(data)


def seo_absolute_url(path):
    return urljoin(seo_base_url() + '/', iri_to_uri(str(path).lstrip('/')))


def seo_plain_text(value, fallback):
    text = ' '.join(strip_tags(value or '').split())
    if not text:
        return fallback
    if len(text) <= 160:
        return text
    return text[:159].rsplit(' ', 1)[0].rstrip(' .،,;') + '…'


def seo_context(request):
    """Provide safe defaults for every HTML page; views may override page-specific values."""
    resolver_match = getattr(request, 'resolver_match', None)
    view_name = resolver_match.view_name if resolver_match else ''
    titles = {
        'landing:home': 'مركز داتا للتدريب والتطوير',
        'courses:list': 'الدورات التدريبية الأونلاين والوجاهية — مركز داتا',
        'projects:list': 'مشاريع وأعمال مهنية — مركز داتا',
        'accounts:list': 'المستقلون والخبراء — مركز داتا',
        'users:terms': 'شروط الاستخدام — مركز داتا',
        'users:privacy': 'سياسة الخصوصية — مركز داتا',
    }
    descriptions = {
        'landing:home': (
            'تعلّم مهارات عملية مع دورات أونلاين ووجاهية، واستعرض المشاريع والملفات '
            'المهنية عبر مركز داتا للتدريب والتطوير.'
        ),
        'courses:list': (
            'تصفّح الدورات التدريبية الأونلاين في مجالات متنوعة، وتعلّم من خبراء '
            'واحصل على شهادة إتمام معتمدة.'
        ),
        'projects:list': (
            'استعرض مشاريع وأعمالاً مهنية موثقة، وتعرّف على الخبرات والمهارات '
            'المستخدمة في تنفيذها.'
        ),
        'accounts:list': (
            'اكتشف ملفات المستقلين والمدربين والطلاب، واستعرض مهاراتهم وأعمالهم '
            'وخبراتهم المهنية.'
        ),
        'users:terms': 'اطّلع على شروط استخدام منصة مركز داتا وحقوق والتزامات المستخدمين.',
        'users:privacy': 'تعرّف على كيفية جمع البيانات الشخصية واستخدامها وحمايتها في مركز داتا.',
    }
    noindex = view_name in ROBOTS_NO_INDEX_VIEWS or view_name.startswith('dashboard:')
    if view_name == 'portfolio:home':
        noindex = True
    canonical_url = seo_absolute_url(request.path) if not noindex else ''
    default_image = seo_absolute_url('/static/images/home-bg3.webp')
    organization_url = f'{seo_base_url()}/#organization'
    website_url = f'{seo_base_url()}/#website'
    structured_data = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': organization_url,
                'name': 'مركز داتا للتدريب والتطوير',
                'url': seo_base_url(),
                'logo': seo_absolute_url('/static/images/logo.svg'),
            },
            {
                '@type': 'WebSite',
                '@id': website_url,
                'name': 'مركز داتا للتدريب والتطوير',
                'url': seo_base_url(),
                'inLanguage': 'ar',
                'publisher': {'@id': organization_url},
            },
        ],
    }
    return {
        'seo_title': titles.get(view_name, 'مركز داتا للتدريب والتطوير'),
        'seo_description': descriptions.get(view_name, DEFAULT_SEO_DESCRIPTION),
        'seo_canonical_url': canonical_url,
        'seo_robots': 'noindex, nofollow' if noindex else 'index, follow',
        'seo_image_url': default_image,
        'seo_og_type': 'website',
        'seo_site_name': 'مركز داتا للتدريب والتطوير',
        'seo_json_ld': _json_ld_script(structured_data),
    }


@require_GET
def robots_txt(request):
    sitemap_url = seo_absolute_url(reverse('sitemap'))
    body = '\n'.join((
        'User-agent: *',
        'Disallow: /panel/',
        'Disallow: /django-admin/',
        'Disallow: /courses/edit/',
        'Disallow: /projects/edit/',
        'Disallow: /login/',
        'Disallow: /signup/',
        'Disallow: /profile/',
        'Disallow: /portfolio/',
        'Disallow: /*/playlist/',
        f'Sitemap: {sitemap_url}',
        '',
    ))
    return HttpResponse(body, content_type='text/plain; charset=utf-8')


@require_GET
def sitemap_xml(request):
    """List only canonical, public pages and published public content."""
    from courses.models import Course, CourseStatus, CourseType
    from projects.models import Project, ProjectStatus, ProjectVisibility
    from users.models import Profile, UserRole

    urlset = ET.Element(
        'urlset',
        xmlns='http://www.sitemaps.org/schemas/sitemap/0.9',
    )
    urls = [
        (reverse('landing:home'), None),
        (reverse('courses:list'), None),
        (reverse('projects:list'), None),
        (reverse('accounts:list'), None),
    ]
    courses = Course.objects.filter(
        status=CourseStatus.PUBLISHED,
        profile_only=False,
    ).filter(
        course_type=CourseType.ONLINE,
    ).only('slug', 'updated_at')
    in_person_courses = Course.objects.filter(
        status=CourseStatus.PUBLISHED,
        course_type=CourseType.IN_PERSON,
        profile_only=False,
    ).only('slug', 'updated_at')
    for course in chain(courses, in_person_courses):
        urls.append(
            (reverse('courses:detail', kwargs={'pk': course.slug}), course.updated_at)
        )

    public_projects = Project.objects.filter(
        status=ProjectStatus.PUBLISHED,
        visibility=ProjectVisibility.PUBLIC,
        owner__role=UserRole.TRAINER,
    ).only('slug', 'updated_at')
    urls.extend(
        (reverse('projects:detail', kwargs={'pk': project.slug}), project.updated_at)
        for project in public_projects
    )

    public_profiles = Profile.objects.select_related('user').filter(
        is_public=True,
        user__is_active=True,
        user__role__in=(UserRole.TRAINER, UserRole.STUDENT),
    ).only('user__handle', 'updated_at')
    urls.extend(
        (
            reverse('accounts:profile', kwargs={'handle': profile.user.handle}),
            profile.updated_at,
        )
        for profile in public_profiles
    )

    for path, last_modified in urls:
        location = ET.SubElement(urlset, 'url')
        ET.SubElement(location, 'loc').text = seo_absolute_url(path)
        if last_modified:
            ET.SubElement(location, 'lastmod').text = last_modified.date().isoformat()

    return HttpResponse(
        ET.tostring(urlset, encoding='utf-8', xml_declaration=True),
        content_type='application/xml; charset=utf-8',
    )
