"""Tests for the personal portfolio hub."""
from django.test import TestCase
from django.urls import reverse

from courses.models import (
    Course,
    CourseStatus,
    StudentPointTransaction,
    StudentReferralLink,
)
from projects.models import Project, ProjectInteraction, ProjectStatus
from users.models import User, UserRole


class TrainerPortfolioTests(TestCase):
    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059800001', password='pass1234', full_name='مدرب البورتفوليو', role=UserRole.TRAINER
        )
        self.student = User.objects.create_user(
            phone='059800002', password='pass1234', full_name='طالب البورتفوليو', role=UserRole.STUDENT
        )

    def test_trainer_gets_own_courses_payload(self):
        Course.objects.create(owner=self.trainer, title='دورتي', status=CourseStatus.PUBLISHED)
        Course.objects.create(owner=self.trainer, title='مسودتي', status=CourseStatus.DRAFT)
        Course.objects.create(
            owner=User.objects.create_user(
                phone='059800003', password='pass1234', full_name='مدرب آخر', role=UserRole.TRAINER
            ),
            title='دورة مدرب آخر', status=CourseStatus.PUBLISHED,
        )
        self.client.force_login(self.trainer)
        res = self.client.get(reverse('portfolio:home'))
        titles = [c['title'] for c in res.context['my_courses_json']]
        self.assertIn('دورتي', titles)
        self.assertIn('مسودتي', titles)
        draft = next(course for course in res.context['my_courses_json'] if course['title'] == 'مسودتي')
        self.assertEqual(draft['status'], CourseStatus.DRAFT)
        self.assertNotIn('دورة مدرب آخر', titles)

    def test_student_has_no_my_courses_payload(self):
        self.client.force_login(self.student)
        res = self.client.get(reverse('portfolio:home'))
        self.assertNotIn('my_courses_json', res.context)

    def test_student_portfolio_enables_workshop_scanner_assets(self):
        self.client.force_login(self.student)

        response = self.client.get(reverse('portfolio:home'))

        self.assertTrue(response.context['server_profile']['canScanWorkshops'])
        self.assertContains(response, 'workshop-scanner.js')
        self.assertContains(response, 'jsQR.js')
        content = response.content.decode()
        self.assertLess(content.index('jsQR.js'), content.index('workshop-scanner.js'))
        self.assertLess(content.index('workshop-scanner.js'), content.index('js/app.js'))

    def test_student_portfolio_receives_referral_points_and_visit_totals(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='دورة الإحالة',
            price='₪150',
            status=CourseStatus.PUBLISHED,
        )
        StudentPointTransaction.objects.create(
            student=self.student,
            course=course,
            points=10,
            kind=StudentPointTransaction.Kind.REFERRAL,
        )
        StudentReferralLink.objects.create(
            referrer=self.student,
            course=course,
            visits=4,
        )
        self.client.force_login(self.student)

        response = self.client.get(reverse('portfolio:home'))

        self.assertEqual(response.context['server_profile']['referral_points'], 10)
        self.assertEqual(response.context['server_profile']['referral_visits'], 4)
        self.assertContains(response, '"referral_points": 10')
        self.assertContains(response, '"referral_visits": 4')

    def test_profile_tabs_are_rendered_after_skills_and_before_content_panels(self):
        self.client.force_login(self.student)
        response = self.client.get(reverse('portfolio:home'))
        content = response.content.decode()

        skills_position = content.index('id="skillsCard"')
        tabs_position = content.index('id="profileTabs"')
        panels_position = content.index('id="panels"')
        self.assertLess(skills_position, tabs_position)
        self.assertLess(tabs_position, panels_position)

    def test_anonymous_has_no_my_courses_payload(self):
        response = self.client.get(reverse('portfolio:home'))

        self.assertRedirects(
            response,
            f"{reverse('users:login')}?next={reverse('portfolio:home')}",
            fetch_redirect_response=False,
        )

    def test_saved_projects_are_scoped_to_current_user(self):
        own_project = Project.objects.create(
            owner=self.trainer, title='محفوظ لي', status=ProjectStatus.PUBLISHED
        )
        other_project = Project.objects.create(
            owner=self.student, title='محفوظ لغيري', status=ProjectStatus.PUBLISHED
        )
        ProjectInteraction.objects.create(
            project=own_project, user=self.trainer, saved=True
        )
        ProjectInteraction.objects.create(
            project=other_project, user=self.student, saved=True
        )

        self.client.force_login(self.trainer)
        response = self.client.get(reverse('portfolio:home'))

        self.assertEqual(
            [project['id'] for project in response.context['saved_projects_json']],
            [own_project.slug],
        )
