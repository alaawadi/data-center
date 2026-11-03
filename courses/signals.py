from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CourseProgress, CourseType, StudentReferral
from .referrals import award_referral_points_for_enrollment
from .subscriptions import add_calendar_months


@receiver(post_save, sender=CourseProgress)
def set_online_subscription_expiry(sender, instance, created, **kwargs):
    if not created or instance.course.course_type != CourseType.ONLINE:
        return
    expires_at = add_calendar_months(instance.created_at)
    CourseProgress.objects.filter(pk=instance.pk, expires_at__isnull=True).update(
        expires_at=expires_at,
    )
    instance.expires_at = expires_at


@receiver(post_save, sender=CourseProgress)
def grant_referral_points(sender, instance, created, **kwargs):
    award_referral_points_for_enrollment(instance.student, instance.course)


@receiver(post_save, sender=StudentReferral)
def grant_referral_points_for_existing_enrollment(sender, instance, created, **kwargs):
    if created:
        award_referral_points_for_enrollment(instance.referred_user)
