"""Views for the marketing/landing app."""
from django.views.generic import TemplateView


from courses.views import published_courses_payload


class HomeView(TemplateView):
    """Static landing page (landing.html)."""

    template_name = 'landing/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['courses_json'] = published_courses_payload()
        return context
