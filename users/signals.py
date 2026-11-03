"""Signals: every user gets a profile automatically."""
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import DEFAULT_STUDENT_CATEGORY_NAME, FreelancerCategory, Profile, UserRole

User = get_user_model()


@receiver(post_save, sender=User)
def ensure_profile(sender, instance, created, **kwargs):
    if created:
        profile, _ = Profile.objects.get_or_create(user=instance)
        if instance.role == UserRole.STUDENT:
            category = FreelancerCategory.objects.filter(
                name=DEFAULT_STUDENT_CATEGORY_NAME,
                is_active=True,
            ).first()
            if category:
                profile.specialization = category.name
                profile.save(update_fields=['specialization'])
    elif not hasattr(instance, 'profile'):
        Profile.objects.get_or_create(user=instance)
