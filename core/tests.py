from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.encoding import iri_to_uri

from courses.models import Course, CourseStatus, CourseType, StudentReferralLink
from projects.models import Project, ProjectStatus, ProjectVisibility
from users.models import Profile, User, UserRole
from .models import PlatformSettings, SiteVisitDaily


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
    def test_static_assets_are_not_blocked_by_maintenance_mode(self):
        PlatformSettings.objects.create(pk=1, data={'maintenance': True})

        response = self.client.get('/static/not-found.js')

        self.assertEqual(response.status_code, 404)

    def test_html_pages_are_compressed_when_the_client_accepts_gzip(self):
        response = self.client.get('/', HTTP_ACCEPT_ENCODING='gzip')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get('Content-Encoding'), 'gzip')
        self.assertLess(
            int(response.get('Content-Length', len(response.content))),
            len(response.content) * 2,
        )

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
            full_name='المستخدم المُحيل',
            role=UserRole.TRAINER,
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


class SEOEndpointTests(TestCase):
    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='0591112299',
            password='pass1234',
            full_name='مدرب اختبار',
            role=UserRole.TRAINER,
        )

    @override_settings(SEO_SITE_URL='https://seo.example')
    def test_public_course_detail_has_canonical_metadata_and_course_schema(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='دورة SEO',
            summary='تعلم تحسين محركات البحث.',
            status=CourseStatus.PUBLISHED,
        )

        response = self.client.get(
            reverse('courses:detail', kwargs={'pk': course.slug}),
            {'utm_source': 'campaign'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            (
                '<link rel="canonical" href="https://seo.example'
                f'{iri_to_uri(reverse("courses:detail", kwargs={"pk": course.slug}))}">'
            ),
            html=True,
        )
        self.assertContains(response, 'name="robots" content="index, follow"')
        self.assertContains(response, '"@type":"Course"')
        self.assertContains(response, 'تعلم تحسين محركات البحث.')

        numeric_url = reverse('courses:detail', kwargs={'pk': course.pk})
        numeric_response = self.client.get(numeric_url)
        self.assertContains(
            numeric_response,
            (
                '<link rel="canonical" href="https://seo.example'
                f'{iri_to_uri(reverse("courses:detail", kwargs={"pk": course.slug}))}">'
            ),
            html=True,
        )

    def test_private_pages_are_noindex_and_public_endpoints_are_available(self):
        login = self.client.get(reverse('users:login'))
        self.assertContains(login, 'name="robots" content="noindex, nofollow"')

        robots = self.client.get(reverse('robots_txt'))
        sitemap = self.client.get(reverse('sitemap'))
        self.assertEqual(robots.status_code, 200)
        self.assertIn('Sitemap: https://alaawadi99998.pythonanywhere.com/sitemap.xml', robots.content.decode())
        self.assertEqual(sitemap.status_code, 200)
        self.assertEqual(sitemap['Content-Type'], 'application/xml; charset=utf-8')

    def test_project_and_public_profile_have_page_specific_metadata(self):
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع مميز',
            summary='وصف المشروع.',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC,
        )
        profile = Profile.objects.get(user=self.trainer)
        profile.is_public = True
        profile.bio = 'نبذة مهنية.'
        profile.save(update_fields=['is_public', 'bio'])

        project_response = self.client.get(
            reverse('projects:detail', kwargs={'pk': project.slug})
        )
        profile_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.trainer.handle})
        )

        self.assertEqual(project_response.status_code, 200)
        self.assertContains(project_response, 'مشروع مميز — مشروع | مركز داتا')
        self.assertContains(project_response, '"@type":"CreativeWork"')
        self.assertContains(profile_response, 'مدرب اختبار — ملف مهني | مركز داتا')
        self.assertContains(profile_response, '"@type":"ProfilePage"')
        self.assertContains(profile_response, 'نبذة مهنية.')

    def test_sitemap_contains_only_public_courses_projects_and_profiles(self):
        online_course = Course.objects.create(
            owner=self.trainer,
            title='دورة أونلاين',
            status=CourseStatus.PUBLISHED,
        )
        in_person_course = Course.objects.create(
            owner=self.trainer,
            title='دورة وجاهية',
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.IN_PERSON,
        )
        hidden_course = Course.objects.create(
            owner=self.trainer,
            title='دورة مخفية',
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.IN_PERSON,
            profile_only=True,
        )
        draft_course = Course.objects.create(
            owner=self.trainer,
            title='دورة مسودة',
            status=CourseStatus.DRAFT,
        )
        public_project = Project.objects.create(
            owner=self.trainer,
            title='مشروع عام',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC,
        )
        restricted_project = Project.objects.create(
            owner=self.trainer,
            title='مشروع للدورات',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
        )
        Profile.objects.filter(user=self.trainer).update(is_public=True)

        response = self.client.get(reverse('sitemap'))
        xml = response.content.decode()

        self.assertIn(reverse('courses:detail', kwargs={'pk': online_course.slug}), xml)
        self.assertIn(reverse('courses:detail', kwargs={'pk': in_person_course.slug}), xml)
        self.assertNotIn(reverse('courses:detail', kwargs={'pk': hidden_course.slug}), xml)
        self.assertNotIn(reverse('courses:detail', kwargs={'pk': draft_course.slug}), xml)
        self.assertIn(reverse('projects:detail', kwargs={'pk': public_project.slug}), xml)
        self.assertNotIn(reverse('projects:detail', kwargs={'pk': restricted_project.slug}), xml)
        self.assertIn(reverse('accounts:profile', kwargs={'handle': self.trainer.handle}), xml)

# Create your tests here.
