from django.db.models import F
from django.http import HttpResponse
from django.utils import timezone

from courses.models import StudentReferralLink

from .models import PlatformSettings, SiteVisitDaily


class MaintenanceModeMiddleware:
    """Keep public pages unavailable while allowing administrators to work."""

    EXCLUDED_PREFIXES = ('/panel/', '/django-admin/')

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        settings_data = PlatformSettings.objects.filter(pk=1).values_list('data', flat=True).first()
        path = request.path_info
        if (
            path not in ('/panel', '/django-admin')
            and not path.startswith(self.EXCLUDED_PREFIXES)
            and isinstance(settings_data, dict)
            and settings_data.get('maintenance', False)
            and not (
                request.user.is_authenticated
                and request.user.role == 'admin'
            )
        ):
            return HttpResponse(
                'الموقع متوقف مؤقتاً للصيانة. يرجى المحاولة لاحقاً.',
                status=503,
                content_type='text/plain; charset=utf-8',
            )
        return self.get_response(request)


class SiteVisitMiddleware:
    """Count successful HTML page views, excluding dashboard and Django admin."""

    EXCLUDED_PREFIXES = ('/panel/', '/django-admin/')

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        content_type = response.get('Content-Type', '')
        if (
            response.status_code == 200
            and content_type.startswith('text/html')
            and not request.path_info.startswith(self.EXCLUDED_PREFIXES)
        ):
            visit, _ = SiteVisitDaily.objects.get_or_create(visit_date=timezone.localdate())
            SiteVisitDaily.objects.filter(pk=visit.pk).update(visits=F('visits') + 1)
            referral_code = request.session.get('student_course_referral_code')
            if referral_code:
                StudentReferralLink.objects.filter(code=referral_code).update(
                    visits=F('visits') + 1
                )
        return response
