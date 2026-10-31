"""Views for the marketing/landing app."""
from django.views.generic import TemplateView


from courses.models import InPersonWorkshop
from courses.views import published_courses_payload, published_inperson_courses_payload


class HomeView(TemplateView):
    """Static landing page (landing.html)."""

    template_name = 'landing/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['courses_json'] = published_courses_payload()
        context['inperson_courses_json'] = published_inperson_courses_payload()
        context['workshops_json'] = [
            {
                'id': workshop.pk,
                'title': workshop.title,
                'description': workshop.description,
                'startsAt': workshop.starts_at.isoformat(),
                'durationMinutes': workshop.duration_minutes,
                'location': workshop.location,
            }
            for workshop in InPersonWorkshop.objects.order_by('starts_at', 'pk')
        ]
        return context
