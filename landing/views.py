"""Views for the marketing/landing app."""
from django.db.models import F
from django.views.generic import TemplateView

from courses.models import Course, CourseStatus, CourseType


def _landing_course_cards(course_type, limit=None):
    courses = Course.objects.filter(
        status=CourseStatus.PUBLISHED,
        profile_only=False,
        course_type=course_type,
    ).only(
        'pk',
        'slug',
        'cover',
        'price',
        'currency',
        'title',
        'duration',
        'period',
        'in_person_kind',
        'is_coming_soon',
    ).order_by(F('display_order').asc(nulls_last=True), '-created_at')
    if limit is not None:
        courses = courses[:limit]

    cards = []
    for course in courses:
        price_amount = str(course.price or '').strip().replace('₪', '').replace('$', '').strip()
        cards.append({
            'id': course.slug or str(course.pk),
            'pk': course.pk,
            'title': course.title,
            'price': (
                f'{"$" if course.currency == "USD" else "₪"}{price_amount}'
                if price_amount else ''
            ),
            'image': course.cover.url if course.cover else '',
            'duration': course.duration,
            'period': course.period,
            'inPersonKind': course.in_person_kind,
            'isFree': bool(price_amount) and not course.is_paid,
            'comingSoon': course.is_coming_soon,
        })
    return cards


class HomeView(TemplateView):
    """Static landing page (landing.html)."""

    template_name = 'landing/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['courses_json'] = _landing_course_cards(CourseType.ONLINE, limit=6)
        context['inperson_courses_json'] = _landing_course_cards(CourseType.IN_PERSON)
        context['landing_courses_json'] = [
            {
                key: course[key]
                for key in (
                    'id', 'image', 'price', 'isFree', 'title', 'duration', 'period',
                    'inPersonKind',
                )
            }
            for course in context['courses_json'][:6]
        ]
        context['landing_inperson_courses_json'] = [
            {
                key: course[key]
                for key in (
                    'id', 'image', 'price', 'isFree', 'title', 'duration', 'period',
                    'inPersonKind',
                )
            }
            for course in context['inperson_courses_json']
        ]
        context['online_courses_count'] = Course.objects.filter(
            status=CourseStatus.PUBLISHED,
            profile_only=False,
            course_type=CourseType.ONLINE,
        ).count()
        context['skip_generic_courses_json'] = True
        return context
