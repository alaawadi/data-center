import json
from pathlib import Path

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from courses.models import Course, CourseStatus, CourseType, InPersonWorkshop
from users.models import UserRole


class HomePageTests(TestCase):
    def test_platform_page_route_is_removed(self):
        self.assertEqual(self.client.get('/platform/').status_code, 404)

    def test_home_navigation_is_active_in_header_and_bottom_bar(self):
        response = self.client.get(reverse('landing:home'))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context['is_landing'])
        self.assertContains(
            response,
            '<a href="/#home" class="active">الرئيسية</a>',
        )
        self.assertContains(response, '<a href="#home" class="active">')

    def test_homepage_uses_shared_course_listing_hero(self):
        response = self.client.get(reverse('landing:home'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'cd-hero home-hero')
        self.assertContains(response, 'home-bg3.webp')
        self.assertContains(response, 'class="cd-hero-float"')
        self.assertContains(response, 'أحدث الدورات')
        self.assertNotContains(response, 'class="freelancer-cta"')
        self.assertContains(response, 'id="theme-bootstrap"')
        self.assertContains(response, 'id="headerThemeBtn"')
        self.assertContains(response, 'id="waTabBtn"')
        self.assertContains(response, 'class="landing-whatsapp-fab"')
        self.assertContains(response, 'id="site-settings-data"')
        self.assertContains(response, 'class="svc-carousel"')
        self.assertContains(response, 'id="servicesTrack"')
        self.assertContains(response, 'class="svc-card"')
        self.assertEqual(response.content.count(b'class="svc-card"'), 3)
        self.assertNotContains(response, 'مسارات تعلّم متدرّجة')
        self.assertNotContains(response, 'متابعة التقدّم')
        self.assertNotContains(response, 'مجتمع المستقلين')
        self.assertContains(response, 'أحدث <span>الدورات</span>')
        self.assertNotContains(response, 'ورشات وجاهية')
        self.assertContains(response, 'دورات وجاهية')
        self.assertContains(response, 'دورات أونلاين')
        self.assertContains(response, 'دورات متكاملة تساعدك في اكتساب مهارات متكاملة والأكثر طلباً في سوق العمل.')
        self.assertContains(response, 'تعلّم وجاهياً وتفاعل مع المدرب والطلاب في بيئة تعليمية احترافية.')
        self.assertContains(response, 'id="tab-inperson-courses" role="tab" aria-selected="true"')
        self.assertContains(response, 'id="panel-inperson-courses" role="tabpanel" aria-labelledby="tab-inperson-courses" data-course-panel="inperson-courses"')
        self.assertContains(response, 'id="tab-online-courses" role="tab" aria-selected="false"')
        self.assertContains(response, 'data-course-panel="online-courses" hidden')
        self.assertContains(response, 'id="online-courses-more"')
        self.assertContains(response, 'id="online-courses-count"')
        self.assertContains(response, reverse('courses:list'))
        self.assertContains(response, 'id="inperson-courses-container"')
        self.assertNotContains(response, 'id="nav"')
        self.assertNotContains(response, 'js/landing-nav.js')
        service_order = [
            response.content.index(text.encode())
            for text in ('دورات أونلاين', 'مشاريع تطبيقية', 'شهادات معتمدة')
        ]
        self.assertEqual(service_order, sorted(service_order))
        self.assertContains(response, 'css/hero.css')
        self.assertLess(
            response.content.index(b'id="theme-bootstrap"'),
            response.content.index(b'css/base.css'),
        )
        self.assertNotContains(response, 'id="page-loading-bootstrap"')
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
        self.assertNotContains(response, 'id="courses-data"')
        self.assertContains(response, 'id="landing-courses-data"')
        self.assertContains(response, 'courseSheetData')
        titles = [course['title'] for course in response.context['courses_json']]
        self.assertEqual(titles, [published.title])
        self.assertEqual(response.context['courses_json'][0]['syllabus'], [])
        self.assertEqual(response.context['courses_json'][0]['content'], '')
        self.assertNotContains(response, 'id="courses-sheet-data"')

    def test_homepage_sends_only_card_fields_for_the_visible_course_cards(self):
        trainer = get_user_model().objects.create_user(
            phone='059444401',
            password='pass1234',
            full_name='مدرب بطاقات الصفحة الرئيسية',
            role=UserRole.TRAINER,
        )
        for index in range(8):
            Course.objects.create(
                owner=trainer,
                title=f'دورة الصفحة الرئيسية {index}',
                status=CourseStatus.PUBLISHED,
            )

        response = self.client.get(reverse('landing:home'))

        self.assertEqual(len(response.context['courses_json']), 8)
        self.assertEqual(len(response.context['landing_courses_json']), 6)
        self.assertEqual(response.context['online_courses_count'], 8)
        self.assertEqual(
            set(response.context['landing_courses_json'][0]),
            {'id', 'image', 'price', 'title', 'duration', 'period'},
        )
        self.assertContains(response, '"landing-online-courses-count"')

    def test_homepage_does_not_render_the_in_person_workshops_tab(self):
        InPersonWorkshop.objects.create(
            title='ورشة تجربة',
            description='وصف الورشة',
            starts_at=timezone.now(),
            duration_minutes=90,
            location='مركز داتا',
        )

        response = self.client.get(reverse('landing:home'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('workshops_json', response.context)
        self.assertNotContains(response, 'id="tab-workshops"')
        self.assertNotContains(response, 'id="panel-workshops"')
        self.assertNotContains(response, 'id="landing-workshops-data"')

    def test_inperson_courses_show_only_on_homepage_in_their_own_tab(self):
        trainer = get_user_model().objects.create_user(
            phone='059444402',
            password='pass1234',
            full_name='مدرب الدورات الوجاهية',
            role=UserRole.TRAINER,
        )
        online_course = Course.objects.create(
            owner=trainer,
            title='دورة أونلاين ظاهرة',
            status=CourseStatus.PUBLISHED,
        )
        inperson_course = Course.objects.create(
            owner=trainer,
            title='دورة وجاهية للرئيسية',
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.IN_PERSON,
        )
        profile_only_course = Course.objects.create(
            owner=trainer,
            title='دورة وجاهية للبروفايل فقط',
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.IN_PERSON,
            profile_only=True,
        )

        homepage = self.client.get(reverse('landing:home'))
        all_courses = self.client.get(reverse('courses:list'))

        self.assertEqual(
            [course['id'] for course in homepage.context['courses_json']],
            [online_course.slug],
        )
        self.assertEqual(
            [course['id'] for course in homepage.context['inperson_courses_json']],
            [inperson_course.slug],
        )
        self.assertNotIn(
            profile_only_course.slug,
            [course['id'] for course in homepage.context['inperson_courses_json']],
        )
        self.assertContains(homepage, 'id="landing-inperson-courses-data"')
        self.assertContains(homepage, 'id="inperson-courses-container"')
        self.assertEqual(
            [course['id'] for course in all_courses.context['courses_json']],
            [online_course.slug],
        )

    def test_homepage_courses_follow_the_saved_all_courses_order(self):
        trainer = get_user_model().objects.create_user(
            phone='059444401',
            password='pass1234',
            full_name='مدرب ترتيب الصفحة',
            role=UserRole.TRAINER,
        )
        courses = [
            Course.objects.create(
                owner=trainer,
                title=f'دورة مرتبة {index}',
                status=CourseStatus.PUBLISHED,
                display_order=10 - index,
                is_coming_soon=index == 2,
            )
            for index in range(11)
        ]

        homepage = self.client.get(reverse('landing:home'))
        all_courses = self.client.get(reverse('courses:list'))

        homepage_order = [course['id'] for course in homepage.context['courses_json']]
        all_courses_order = [course['id'] for course in all_courses.context['courses_json']]
        self.assertEqual(homepage_order, all_courses_order)
        self.assertEqual(
            homepage_order[:9],
            [course.slug for course in reversed(courses)][:9],
        )
        self.assertTrue(homepage.context['courses_json'][8]['comingSoon'])
        landing_script = (
            Path(__file__).resolve().parent.parent
            / 'static'
            / 'js'
            / 'landing-nav.js'
        ).read_text(encoding='utf-8')
        self.assertIn('function certCard(c)', landing_script)
        self.assertIn('course-coming-soon-badge', landing_script)
        self.assertNotIn('AppPage.certCard', landing_script)

    def test_homepage_course_card_images_fill_and_crop_the_thumbnail(self):
        response = self.client.get(reverse('landing:home'))
        styles = (
            Path(__file__).resolve().parent.parent
            / 'static'
            / 'css'
            / 'plat-nav.css'
        ).read_text(encoding='utf-8')
        landing_script = (
            Path(__file__).resolve().parent.parent
            / 'static'
            / 'js'
            / 'landing-nav.js'
        ).read_text(encoding='utf-8')

        self.assertContains(response, 'css/plat-nav.css')
        self.assertIn('.plat-nav .cert-thumb > img', styles)
        self.assertIn('position: absolute;', styles)
        self.assertIn('object-fit: cover;', styles)
        self.assertIn('.plat-nav .cert-card.is-coming-soon { opacity: .68; }', styles)
        self.assertIn('.plat-nav .course-coming-soon-badge', styles)
        self.assertIn('c.comingSoon', landing_script)
        self.assertIn('is-coming-soon', landing_script)


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
        self.assertIn(
            'event.respondWith(networkFirstPage(request, networkResponse));',
            worker,
        )
        self.assertIn(
            'event.waitUntil(networkResponse.then(function (response)',
            worker,
        )
        self.assertIn('cache.match(request).then(function (cached)', worker)
        self.assertIn('cache.match(request, { ignoreSearch: true })', worker)

    def test_pwa_launcher_uses_platform_logo_in_a_white_box(self):
        pwa_script = (Path(__file__).resolve().parent.parent / 'static' / 'js' / 'pwa.js').read_text(
            encoding='utf-8'
        )
        pwa_styles = (Path(__file__).resolve().parent.parent / 'static' / 'css' / 'pwa.css').read_text(
            encoding='utf-8'
        )

        self.assertIn('function appLogo()', pwa_script)
        self.assertIn('/static/images/logo.svg', pwa_script)
        self.assertIn('.pwa-logo-box', pwa_styles)
        self.assertIn('background: #fff', pwa_styles)
        self.assertIn('Install Data Center', pwa_script)
        self.assertNotIn('📲', pwa_script)

    def test_pwa_manifest_uses_data_center_as_the_app_name(self):
        manifest = json.loads(
            (Path(__file__).resolve().parent.parent / 'static' / 'manifest.webmanifest').read_text(
                encoding='utf-8'
            )
        )

        self.assertEqual(manifest['name'], 'Data Center')
        self.assertEqual(manifest['short_name'], 'Data Center')

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
