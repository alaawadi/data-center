from django.test import TestCase, override_settings
from django.urls import reverse

from courses.models import Course, CourseStatus, StudentReferralLink
from users.models import User, UserRole
from .models import SiteVisitDaily


class CustomErrorPageTests(TestCase):
    @override_settings(
        DEBUG=False,
        ALLOWED_HOSTS=['testserver'],
        SECURE_SSL_REDIRECT=False,
    )
    def test_unknown_url_renders_custom_not_found_page(self):
        response = self.client.get('/this-page-does-not-exist/')

        self.assertEqual(response.status_code, 404)
        self.assertContains(response, 'لم نعثر على هذه الصفحة', status_code=404)
        self.assertNotContains(response, 'Page not found', status_code=404)


class SiteVisitMiddlewareTests(TestCase):
    def test_successful_html_page_views_are_counted(self):
        self.client.get('/')
        self.client.get('/')

        visits = SiteVisitDaily.objects.get()
        self.assertEqual(visits.visits, 2)

    def test_dashboard_and_non_html_responses_are_not_counted(self):
        json_response = self.client.get(
            reverse('users:phone-check'),
            {'phone': '0591112233'},
        )
        self.assertEqual(json_response['Content-Type'], 'application/json')
        self.client.get(reverse('dashboard:home'))

        self.assertFalse(SiteVisitDaily.objects.exists())

    def test_referral_counts_each_successful_page_during_internal_navigation(self):
        referrer = User.objects.create_user(
            phone='0591112201',
            password='pass1234',
            full_name='الطالب المُحيل',
            role=UserRole.STUDENT,
        )
        trainer = User.objects.create_user(
            phone='0591112202',
            password='pass1234',
            full_name='مدرب الدورة',
            role=UserRole.TRAINER,
        )
        course = Course.objects.create(
            owner=trainer,
            title='دورة الإحالة',
            price='₪100',
            status=CourseStatus.PUBLISHED,
        )
        referral = StudentReferralLink.objects.create(referrer=referrer, course=course)
        course_url = reverse('courses:detail', kwargs={'pk': course.slug})

        self.client.get(course_url, {'ref': referral.code})
        self.client.get(reverse('users:signup'))
        self.client.get('/')
        self.client.get(course_url)

        referral.refresh_from_db()
        self.assertEqual(referral.visits, 4)

# Create your tests here.
