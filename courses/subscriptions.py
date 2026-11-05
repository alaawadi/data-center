import calendar

from django.db.models import Q
from django.utils import timezone

from .models import CourseType


ONLINE_SUBSCRIPTION_MONTHS = 2


def add_calendar_months(value, months=ONLINE_SUBSCRIPTION_MONTHS):
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def active_course_progress(queryset, now=None):
    return queryset.filter(
        Q(course__course_type=CourseType.IN_PERSON)
        | Q(expires_at__isnull=True)
        | Q(expires_at__gt=now or timezone.now())
    )


def subscription_is_active(expires_at, now=None):
    return expires_at is None or expires_at > (now or timezone.now())


def course_progress_is_active(progress, now=None):
    return (
        progress.course.course_type == CourseType.IN_PERSON
        or subscription_is_active(progress.expires_at, now)
    )
