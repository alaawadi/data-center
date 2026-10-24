from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CourseProgress, StudentReferral
from .referrals import award_referral_points_for_enrollment


@receiver(post_save, sender=CourseProgress)
def grant_referral_points(sender, instance, created, **kwargs):
    award_referral_points_for_enrollment(instance.student, instance.course)


@receiver(post_save, sender=StudentReferral)
def grant_referral_points_for_existing_enrollment(sender, instance, created, **kwargs):
    if created:
        award_referral_points_for_enrollment(instance.referred_user)
