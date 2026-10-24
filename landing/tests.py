import json
from pathlib import Path

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse

from courses.models import Course, CourseStatus
from users.models import UserRole


class HomePageTests(TestCase):
    def test_platform_page_route_is_removed(self):
        self.assertEqual(self.client.get('/platform/').status_code, 404)

    def test_homepage_uses_shared_course_listing_hero(self):
        response = self.client.get(reverse('landing:home'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'cd-hero home-hero')
        self.assertContains(response, 'home-bg3.webp')
        self.assertContains(response, 'class="cd-hero-float"')
        self.assertContains(response, 'أحدث الدورات')
        self.assertContains(response, 'class="cd-cta ghost">⭐ وظّف مستقل</a>')
        self.assertContains(response, 'css/hero.css')
        self.assertContains(response, 'السرايا - مقابل شركة جوال - عمارة عنان - الطابق الاول')
        self.assertContains(response, '(بجوار حلويات ابو بكر ساق الله)')
        self.assertContains(response, 'عن مركز داتا للتدريب والتطوير')
        self.assertContains(response, 'تُعدّ مؤسسة داتا للتدريب والتطوير من أبرز المؤسسات التعليمية والتدريبية في قطاع غزة')
        self.assertContains(response, 'https://www.smartindex.ps/company/')
        self.assertContains(response, 'شركة داتا للتدريب والتطوير | سمارت اندكس')
        self.assertNotContains(response, 'id="registerCta"')
        self.assertNotContains(response, 'class="wa-float"')
        self.assertGreater(
            response.content.index(b'class="brand-container"'),
            response.content.index(b'class="contact"'),
        )

    def test_homepage_injects_only_published_courses_for_landing_cards(self):
        trainer = get_user_model().objects.create_user(
            phone='059444400',
            password='pass1234',
            full_name='مدرب الصفحة الرئيسية',
            role=UserRole.TRAINER,
        )
        published = Course.objects.create(
            owner=trainer,
            title='دورة منشورة للصفحة الرئيسية',
            status=CourseStatus.PUBLISHED,
        )
        Course.objects.create(
            owner=trainer,
            title='دورة مسودة لا تظهر',
            status=CourseStatus.DRAFT,
        )

        response = self.client.get(reverse('landing:home'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="courses-data"')
        titles = [course['title'] for course in response.context['courses_json']]
        self.assertEqual(titles, [published.title])


class ProgressiveWebAppTests(TestCase):
    def test_public_page_includes_pwa_manifest_and_install_prompt(self):
        response = self.client.get(reverse('landing:home'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'manifest.webmanifest')
        self.assertContains(response, 'apple-mobile-web-app-capable')
        self.assertContains(response, 'css/pwa.css')
        self.assertContains(response, 'js/pwa.js')

    def test_service_worker_is_root_scoped_and_precaches_static_assets(self):
        response = self.client.get('/service-worker.js')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'].split(';')[0], 'application/javascript')
        self.assertEqual(response['Service-Worker-Allowed'], '/')
        worker = response.content.decode()
        self.assertNotIn('__PRECACHE_ASSETS__', worker)
        self.assertNotIn('__STATIC_PREFIX__', worker)
        self.assertNotIn('__OFFLINE_URL__', worker)
        self.assertIn('/static/offline.html', worker)
        self.assertIn('/static/js/pwa.js', worker)
        self.assertIn('/static/css/app.css', worker)
        self.assertIn('/static/images/pwa-512.png', worker)
        self.assertIn('/static/vendor/jsQR.js', worker)
        self.assertIn('/static/css/workshops.css', worker)

    def test_pwa_launcher_uses_android_logo_instead_of_phone_emoji(self):
        pwa_script = (Path(__file__).resolve().parent.parent / 'static' / 'js' / 'pwa.js').read_text(
            encoding='utf-8'
        )

        self.assertIn('function androidLogo()', pwa_script)
        self.assertIn('class="pwa-android-logo"', pwa_script)
        self.assertNotIn('📲', pwa_script)

    def test_web_manifest_declares_platform_install_icons_and_root_scope(self):
        manifest_path = Path(__file__).resolve().parent.parent / 'static' / 'manifest.webmanifest'
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        static_dir = manifest_path.parent

        self.assertEqual(manifest['start_url'], '/')
        self.assertEqual(manifest['scope'], '/')
        self.assertEqual(manifest['display'], 'standalone')
        for icon in manifest['icons']:
            icon_path = icon['src'].replace('/static/', '', 1)
            self.assertTrue((static_dir / icon_path).is_file())
