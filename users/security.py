"""Security helpers: login throttling and per-account device limits.

Implemented without third-party packages:
- `LoginAttempt` rows drive a sliding-window lockout for phone and IP.
- `DeviceSession` rows track which authenticated browsers own a session so an
  account can only be logged in from AUTH_MAX_DEVICES_PER_USER devices.
"""
import re
from datetime import timedelta

from django.conf import settings
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.utils import timezone

from .models import DeviceSession, LoginAttempt

PHONE_RE = re.compile(r'^0(?:59|56)\d{7}$')


def _cfg(name, default):
    return getattr(settings, name, default)


def client_ip(request):
    """REMOTE_ADDR only — trusting X-Forwarded-For lets clients spoof it."""
    return (request.META.get('REMOTE_ADDR') or '').strip() or None


def _window():
    return timezone.now() - timedelta(minutes=_cfg('AUTH_LOGIN_WINDOW_MINUTES', 15))


def login_lock_status(phone, ip):
    """Return ``(locked, minutes_remaining)`` for a phone and/or IP."""
    since = _window()
    phone = (phone or '').strip()
    phone_qs = None
    if phone:
        phone_qs = LoginAttempt.objects.filter(phone=phone, successful=False, created_at__gte=since)

    ip_qs = LoginAttempt.objects.filter(ip=ip, successful=False, created_at__gte=since) if ip else None
    phone_count = phone_qs.count() if phone_qs is not None else 0
    ip_count = ip_qs.count() if ip_qs is not None else 0

    over_phone = phone_count >= _cfg('AUTH_LOGIN_MAX_ATTEMPTS', 5)
    over_ip = ip_count >= _cfg('AUTH_LOGIN_IP_MAX_ATTEMPTS', 25)
    if not over_phone and not over_ip:
        return False, 0

    oldest = None
    if over_phone:
        oldest = phone_qs.order_by('created_at').values_list('created_at', flat=True).first()
    if over_ip:
        ip_oldest = ip_qs.order_by('created_at').values_list('created_at', flat=True).first()
        if ip_oldest and (oldest is None or ip_oldest < oldest):
            oldest = ip_oldest

    minutes = _cfg('AUTH_LOGIN_WINDOW_MINUTES', 15)
    if not oldest:
        return True, minutes
    unlock_at = oldest + timedelta(minutes=minutes)
    remaining = int((unlock_at - timezone.now()).total_seconds() // 60) + 1
    return True, max(1, min(remaining, minutes))


def record_failed_login(phone, ip):
    """Store a failed attempt and prune history older than a day."""
    LoginAttempt.objects.create(
        phone=(phone or '')[:10],
        ip=ip,
        successful=False,
    )
    LoginAttempt.objects.filter(created_at__lt=timezone.now() - timedelta(days=1)).delete()


def clear_failed_logins(phone):
    """A successful login resets the account's counters."""
    phone = (phone or '').strip()
    if phone:
        LoginAttempt.objects.filter(phone=phone).delete()


def _valid_session_keys(keys):
    if not keys:
        return set()
    now = timezone.now()
    return set(
        Session.objects.filter(session_key__in=keys, expire_date__gt=now)
        .values_list('session_key', flat=True)
    )


def active_device_count(user):
    """Count devices with a still-live session, dropping stale rows."""
    devices = list(DeviceSession.objects.filter(user=user))
    if not devices:
        return 0
    keys = [d.session_key for d in devices if d.session_key]
    valid = _valid_session_keys(keys)
    stale = [d.pk for d in devices if not d.session_key or d.session_key not in valid]
    if stale:
        DeviceSession.objects.filter(pk__in=stale).delete()
    return len(devices) - len(stale)


def device_login_allowed(user, device_id):
    """Allow the same device always; block new devices past the limit."""
    if not user or not device_id:
        return False
    if DeviceSession.objects.filter(user=user, device_id=device_id).exists():
        return True
    return active_device_count(user) < _cfg('AUTH_MAX_DEVICES_PER_USER', 2)


def register_device_session(user, request):
    """Bind the freshly-created login session to this device."""
    device_id = getattr(request, 'device_id', '') or ''
    session_key = request.session.session_key or ''
    if not user or not device_id or not session_key:
        return
    existing = DeviceSession.objects.filter(user=user, device_id=device_id).first()
    if existing and existing.session_key and existing.session_key != session_key:
        # Re-login on this device invalidates the previous session.
        Session.objects.filter(session_key=existing.session_key).delete()
    DeviceSession.objects.update_or_create(
        user=user,
        device_id=device_id,
        defaults={
            'session_key': session_key,
            'user_agent': (request.META.get('HTTP_USER_AGENT') or '')[:255],
            'ip': client_ip(request),
        },
    )


def unregister_device_session(user, session_key):
    """Free the device slot when the user logs out."""
    if user and user.is_authenticated and session_key:
        DeviceSession.objects.filter(user=user, session_key=session_key).delete()


def rate_limited(key, limit, seconds):
    """Fixed-window counter shared across requests. Returns True when over."""
    cache_key = f'security:{key}'
    try:
        hits = int(cache.get(cache_key, 0)) + 1
    except (TypeError, ValueError):
        hits = 1
    cache.set(cache_key, hits, seconds)
    return hits > limit
