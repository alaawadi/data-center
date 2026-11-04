"""Tests for the personal portfolio hub."""
from django.test import TestCase
from django.urls import reverse

from courses.models import (
    Course,
    CourseSection,
    Lesson,
    CourseProgress,
    CourseStatus,
    CourseType,
    StudentPointTransaction,
    StudentReferralLink,
)
from projects.models import Project, ProjectInteraction, ProjectStatus
from users.models import (
    Language,
    ProfileLanguage,
    ProfileSkill,
    Skill,
    User,
    UserRole,
)


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
        inperson_course = Course.objects.create(
            owner=self.trainer,
            title='دورتي الوجاهية',
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.IN_PERSON,
            profile_only=True,
        )
        homepage_inperson_course = Course.objects.create(
            owner=self.trainer,
            title='دورتي الوجاهية المعروضة في الرئيسية',
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.IN_PERSON,
            profile_only=False,
        )
        inactive_course = Course.objects.create(owner=self.trainer, title='مسودتي')
        Course.objects.create(
            owner=User.objects.create_user(
                phone='059800003', password='pass1234', full_name='مدرب آخر', role=UserRole.TRAINER
            ),
            title='دورة مدرب آخر', status=CourseStatus.PUBLISHED,
        )
        self.client.force_login(self.trainer)
        res = self.client.get(reverse('portfolio:home'))
        self.assertContains(res, 'id="panel-trainer-courses"')
        self.assertContains(res, 'id="panel-certificates"')
        self.assertContains(res, 'id="panel-projects"')
        self.assertContains(res, 'id="panel-saved"')
        titles = [c['title'] for c in res.context['my_courses_json']]
        self.assertIn('دورتي', titles)
        inperson_payload = next(
            course
            for course in res.context['my_courses_json']
            if course['id'] == inperson_course.slug
        )
        self.assertEqual(inperson_payload['courseType'], CourseType.IN_PERSON)
        self.assertIn(
            homepage_inperson_course.slug,
            [course['id'] for course in res.context['my_courses_json']],
        )
        self.assertIn('مسودتي', titles)
        draft = next(course for course in res.context['my_courses_json'] if course['title'] == 'مسودتي')
        self.assertEqual(draft['status'], CourseStatus.DRAFT)
        self.assertIn(inactive_course.slug, [course['id'] for course in res.context['my_courses_json']])
        self.assertNotIn(inactive_course.slug, [course['id'] for course in res.context['courses_json']])
        self.assertNotIn('دورة مدرب آخر', titles)

    def test_trainer_can_view_students_and_progress_for_own_course(self):
        course = Course.objects.create(owner=self.trainer, title='دورة الطلاب')
        section = CourseSection.objects.create(course=course, title='القسم')
        lessons = [
            Lesson.objects.create(section=section, title='الدرس الأول'),
            Lesson.objects.create(section=section, title='الدرس الثاني'),
        ]
        CourseProgress.objects.create(
            student=self.student,
            course=course,
            completed_ids=[lessons[0].pk],
        )
        self.client.force_login(self.trainer)

        response = self.client.get(reverse(
            'portfolio:trainer-course-students',
            kwargs={'course_slug': course.slug},
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['course']['title'], course.title)
        self.assertEqual(response.json()['students'], [{
            'id': str(self.student.pk),
            'name': self.student.display_name,
            'handle': self.student.handle,
            'avatar': '',
            'completed': False,
            'completedLessons': 1,
            'totalLessons': 2,
            'progress': 50,
        }])

    def test_trainer_cannot_view_students_for_another_trainers_course(self):
        other_trainer = User.objects.create_user(
            phone='059800004',
            password='pass1234',
            full_name='مدرب آخر',
            role=UserRole.TRAINER,
        )
        course = Course.objects.create(owner=other_trainer, title='دورة خاصة')
        self.client.force_login(self.trainer)

        response = self.client.get(reverse(
            'portfolio:trainer-course-students',
            kwargs={'course_slug': course.slug},
        ))

        self.assertEqual(response.status_code, 404)

    def test_student_has_no_my_courses_payload(self):
        self.client.force_login(self.student)
        res = self.client.get(reverse('portfolio:home'))
        self.assertNotIn('my_courses_json', res.context)

    def test_student_portfolio_includes_only_active_published_courses(self):
        active_course = Course.objects.create(
            owner=self.trainer,
            title='دورة نشطة',
            status=CourseStatus.PUBLISHED,
        )
        completed_course = Course.objects.create(
            owner=self.trainer,
            title='دورة مكتملة',
            status=CourseStatus.PUBLISHED,
        )
        draft_course = Course.objects.create(
            owner=self.trainer,
            title='دورة غير منشورة',
            status=CourseStatus.DRAFT,
        )
        CourseProgress.objects.create(student=self.student, course=active_course)
        CourseProgress.objects.create(
            student=self.student,
            course=completed_course,
            completed=True,
        )
        CourseProgress.objects.create(student=self.student, course=draft_course)
        self.client.force_login(self.student)

        response = self.client.get(reverse('portfolio:home'))

        self.assertEqual(
            [course['title'] for course in response.context['active_courses_json']],
            ['دورة نشطة'],
        )
        self.assertContains(response, 'id="active-courses-data"')
        self.assertContains(response, 'id="panel-active-courses"')
        self.client.force_login(self.trainer)
        trainer_response = self.client.get(reverse('portfolio:home'))
        self.assertNotIn('active_courses_json', trainer_response.context)

    def test_personal_profile_title_uses_current_user_and_data_center_brand(self):
        self.client.force_login(self.student)

        response = self.client.get(reverse('portfolio:home'))

        self.assertContains(response, f'<title>{self.student.display_name} — مركز داتا</title>')
        self.assertNotContains(response, 'بورتفوليو — أحمد خالد الحسن')

    def test_incomplete_profile_shows_account_setup_alert(self):
        self.client.force_login(self.student)

        response = self.client.get(reverse('portfolio:home'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.context['server_profile']['accountPhone'],
            self.student.phone,
        )
        self.assertGreater(len(response.context['country_calling_code_choices']), 200)
        self.assertContains(response, 'id="country-calling-code-choices"')
        self.assertIn(('+970', '🇵🇸 +970'), response.context['country_calling_code_choices'])
        self.assertTrue(response.context['profile_setup_missing'])
        self.assertEqual(response.context['profile_setup']['percent'], 0)
        self.assertContains(response, 'أكمل إعدادات حسابك')
        self.assertContains(response, 'role="progressbar"')
        self.assertContains(response, 'aria-valuenow="0"')
        self.assertContains(response, '0٪')
        self.assertContains(
            response,
            '<button class="btn btn-primary btn-sm" type="button" data-act="edit-profile">إكمال البيانات</button>',
        )
        self.assertContains(response, 'رقم واتساب')

    def test_complete_profile_hides_account_setup_alert(self):
        profile = self.student.profile
        profile.avatar = 'avatars/test-avatar.png'
        profile.headline = 'طالب'
        profile.bio = 'نبذة تعريفية'
        profile.whatsapp = '+970599999999'
        profile.save()
        ProfileSkill.objects.create(
            profile=profile,
            skill=Skill.objects.create(name='البرمجة'),
        )
        self.client.force_login(self.student)

        response = self.client.get(reverse('portfolio:home'))

        self.assertEqual(response.context['profile_setup_missing'], [])
        self.assertEqual(response.context['profile_setup']['percent'], 100)
        self.assertNotContains(response, 'أكمل إعدادات حسابك')

        completed_response = self.client.get(reverse('portfolio:home') + '?saved=1')

        self.assertTrue(completed_response.context['profile_setup_complete_notice'])
        self.assertContains(completed_response, 'تهانينا! اكتمل إعداد حسابك')
        self.assertContains(completed_response, 'aria-valuenow="100"')

    def test_trainer_completion_uses_fields_available_in_profile_modal_without_email(self):
        profile = self.trainer.profile
        profile.avatar = 'avatars/test-trainer-avatar.png'
        profile.headline = 'مدرب'
        profile.bio = 'نبذة تعريفية'
        profile.whatsapp = '+970599999999'
        profile.save()
        ProfileSkill.objects.create(
            profile=profile,
            skill=Skill.objects.create(name='التدريب'),
        )

        self.assertEqual(profile.completeness()['percent'], 100)
        self.assertEqual(profile.completeness()['missing'], [])

    def test_home_navigation_is_active_on_personal_portfolio(self):
        self.client.force_login(self.student)

        response = self.client.get(reverse('portfolio:home'))

        self.assertEqual(response.context['active_tab'], 'home')
        self.assertContains(
            response,
            '<a href="/" class="active">الرئيسية</a>',
        )
        self.assertContains(
            response,
            '<a href="/" class="active">\n',
        )

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
