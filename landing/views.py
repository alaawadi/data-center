"""Views for the marketing/landing app."""
from django.views.generic import TemplateView


from courses.views import published_courses_payload, published_inperson_courses_payload


class HomeView(TemplateView):
    """Static landing page (landing.html)."""

    template_name = 'landing/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['courses_json'] = published_courses_payload()
        context['inperson_courses_json'] = published_inperson_courses_payload()
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
        context['online_courses_count'] = len(context['courses_json'])
        context['skip_generic_courses_json'] = True
        return context
