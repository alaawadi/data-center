from django.db import transaction

from .models import CourseProgress, StudentPointTransaction, StudentReferral


@transaction.atomic
def award_referral_points_for_enrollment(student, course=None):
    referral = (
        StudentReferral.objects.select_related('link__referrer')
        .filter(referred_user=student)
        .first()
    )
    if referral is None or referral.link.referrer_id == student.pk:
        return False

    if course is None:
        courses = [
            progress.course
            for progress in CourseProgress.objects.filter(student=student)
            .select_related('course')
            if progress.course.is_paid
        ]
    elif course.is_paid and CourseProgress.objects.filter(
        student=student,
        course=course,
    ).exists():
        courses = [course]
    else:
        return False

    awarded = False
    for enrolled_course in courses:
        _, created = StudentPointTransaction.objects.get_or_create(
            referral=referral,
            course=enrolled_course,
            defaults={
                'student': referral.link.referrer,
                'points': 10,
                'kind': StudentPointTransaction.Kind.REFERRAL,
            },
        )
        awarded = awarded or created
    return awarded
