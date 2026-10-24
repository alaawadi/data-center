"""Email verification for sign-ups: generate, send and check 6-digit codes."""
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone


def generate_code():
    return f'{secrets.randbelow(1_000_000):06d}'


def hash_code(code):
    return make_password(str(code))


def check_code(code, hashed):
    try:
        return check_password(str(code), hashed)
    except (TypeError, ValueError):
        return False


def _setting(name, default):
    return getattr(settings, name, default)


def ttl():
    return timedelta(minutes=_setting('SIGNUP_CODE_TTL_MINUTES', 10))


def resend_cooldown():
    return timedelta(seconds=_setting('SIGNUP_CODE_RESEND_SECONDS', 60))


def is_expired(pending):
    return timezone.now() - pending.sent_at > ttl()


def seconds_until_resend(pending):
    remaining = resend_cooldown() - (timezone.now() - pending.sent_at)
    return max(0, int(remaining.total_seconds()))


def send_verification_email(email, code, full_name=''):
    minutes = _setting('SIGNUP_CODE_TTL_MINUTES', 10)
    context = {
        'code': code,
        'full_name': full_name,
        'minutes': minutes,
        'year': timezone.now().year,
    }
    subject = 'رمز تفعيل حسابك — مركز داتا'
    text_body = render_to_string('emails/verification_code.txt', context)
    html_body = render_to_string('emails/verification_code.html', context)
    message = EmailMultiAlternatives(
        subject,
        text_body,
        _setting('DEFAULT_FROM_EMAIL', None),
        [email],
    )
    message.attach_alternative(html_body, 'text/html')
    message.send(fail_silently=False)


def issue_code(pending):
    """(Re)generate a verification code for a pending sign-up and email it."""
    code = generate_code()
    pending.code_hash = hash_code(code)
    pending.attempts = 0
    pending.sent_at = timezone.now()
    pending.save(update_fields=['code_hash', 'attempts', 'sent_at'])
    send_verification_email(pending.email, code, pending.full_name)
    return code
