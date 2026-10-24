"""Middleware: issues a stable, HttpOnly device id used for the login limit."""
import re
import secrets

from django.conf import settings

DEVICE_ID_RE = re.compile(r'^[a-f0-9]{64}$')


class DeviceCookieMiddleware:
    """Ensure every browser carries a persistent random device id.

    The cookie is HttpOnly (no script access) and SameSite=Lax, so third-party
    sites cannot forge it. A missing/tampered cookie simply counts as a new
    device on the next login.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.cookie_name = getattr(settings, 'AUTH_DEVICE_COOKIE_NAME', 'dc_device')
        self.max_age = getattr(settings, 'AUTH_DEVICE_COOKIE_AGE', 60 * 60 * 24 * 365)

    def __call__(self, request):
        raw = request.COOKIES.get(self.cookie_name, '')
        fresh = not bool(DEVICE_ID_RE.match(raw or ''))
        request.device_id = secrets.token_hex(32) if fresh else raw

        response = self.get_response(request)

        if fresh:
            response.set_cookie(
                self.cookie_name,
                request.device_id,
                max_age=self.max_age,
                httponly=True,
                samesite='Lax',
                secure=not settings.DEBUG,
                path='/',
            )
        return response
