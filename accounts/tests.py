from django.test import TestCase
from django.urls import reverse

from courses.models import Course, CourseCertificate, CourseStatus
from courses.models import StudentPointTransaction, StudentReferralLink
from projects.models import Project, ProjectInteraction, ProjectStatus
from users.models import User, UserRole


class SavedProjectsProfileTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone='059900001', password='pass1234', full_name='صاحب المحفوظات'
        )
        self.viewer = User.objects.create_user(
            phone='059900002', password='pass1234', full_name='زائر البروفايل'
        )
        self.project = Project.objects.create(
            owner=self.owner, title='مشروع محفوظ', status=ProjectStatus.PUBLISHED
        )
        ProjectInteraction.objects.create(
            project=self.project, user=self.owner, saved=True
        )

    def test_saved_projects_are_available_only_on_owner_profile(self):
        self.client.force_login(self.owner)
        owner_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.owner.handle})
        )
        self.assertEqual(
            [project['id'] for project in owner_response.context['saved_projects_json']],
            [self.project.slug],
        )

        self.client.force_login(self.viewer)
        viewer_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.owner.handle})
        )
        self.assertNotIn('saved_projects_json', viewer_response.context)


class FreelancerListTests(TestCase):
    def _user(self, phone, name, role):
        return User.objects.create_user(
            phone=phone, password='pass1234', full_name=name, role=role
        )

    def test_list_shows_only_students_and_trainers_with_correct_role_counts(self):
        trainer = self._user('059900101', 'مدرب', UserRole.TRAINER)
        trainer.is_verified = False
        trainer.save(update_fields=['is_verified'])
        Course.objects.create(
            owner=trainer, title='دورة منشورة', status=CourseStatus.PUBLISHED
        )
        Course.objects.create(
            owner=trainer, title='دورة مسودة', status=CourseStatus.DRAFT
        )

        high_student = self._user('059900102', 'طالب متقدم', UserRole.STUDENT)
        high_student_courses = [
            Course.objects.create(
                owner=trainer, title=f'شهادة {index}', status=CourseStatus.PUBLISHED
            )
            for index in range(2)
        ]
        for course in high_student_courses:
            CourseCertificate.objects.create(student=high_student, course=course)
        Project.objects.create(
            owner=high_student, title='مشروع منشور', status=ProjectStatus.PUBLISHED
        )
        Project.objects.create(
            owner=high_student, title='مشروع مسودة', status=ProjectStatus.DRAFT
        )

        low_student = self._user('059900103', 'طالب مبتدئ', UserRole.STUDENT)
        employee = self._user('059900104', 'موظف', UserRole.EMPLOYEE)
        admin = self._user('059900105', 'أدمن', UserRole.ADMIN)

        response = self.client.get(reverse('accounts:list'))
        profiles = response.context['profiles_json']
        by_handle = {profile['handle']: profile for profile in profiles}
        self.assertContains(response, 'id="freelancersSearch"')
        self.assertContains(response, 'id="freelancersMore"')

        self.assertEqual([profile['roleKey'] for profile in profiles[:1]], [UserRole.TRAINER])
        self.assertEqual(
            [profile['handle'] for profile in profiles],
            [trainer.handle, high_student.handle, low_student.handle],
        )
        self.assertNotIn(employee.handle, by_handle)
        self.assertNotIn(admin.handle, by_handle)

        trainer_data = by_handle[trainer.handle]
        self.assertTrue(trainer_data['verified'])
        self.assertEqual(trainer_data['courses'], 3)
        self.assertEqual(trainer_data['certificates'], 0)

        student_data = by_handle[high_student.handle]
        self.assertEqual(student_data['certificates'], 2)
        self.assertEqual(student_data['projects'], 1)
        self.assertEqual(by_handle[low_student.handle]['certificates'], 0)
        self.assertEqual(by_handle[low_student.handle]['projects'], 0)

    def test_student_ranking_uses_total_published_certificates_and_projects(self):
        more_work = self._user('059900106', 'ترتيب أول', UserRole.STUDENT)
        fewer_work = self._user('059900107', 'ترتيب ثان', UserRole.STUDENT)
        trainer = self._user('059900108', 'مصدر الدورات', UserRole.TRAINER)

        courses = [
            Course.objects.create(
                owner=trainer, title=f'دورة ترتيب {index}', status=CourseStatus.PUBLISHED
            )
            for index in range(2)
        ]
        for course in courses:
            CourseCertificate.objects.create(student=more_work, course=course)
        Project.objects.create(
            owner=more_work, title='مشروع ترتيب', status=ProjectStatus.PUBLISHED
        )
        CourseCertificate.objects.create(student=fewer_work, course=courses[0])
        Project.objects.create(
            owner=fewer_work, title='مشروع ترتيب واحد', status=ProjectStatus.PUBLISHED
        )

        profiles = self.client.get(reverse('accounts:list')).context['profiles_json']
        student_handles = [
            profile['handle']
            for profile in profiles
            if profile['roleKey'] == UserRole.STUDENT
        ]
        self.assertLess(student_handles.index(more_work.handle), student_handles.index(fewer_work.handle))

    def test_public_profile_has_skills_and_profile_tabs_without_saved_tab(self):
        student = self._user('059900109', 'طالب بروفايل', UserRole.STUDENT)

        response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': student.handle})
        )

        self.assertEqual(response.context['profile_json']['roleKey'], UserRole.STUDENT)
        self.assertContains(response, 'id="publicSkills"')
        self.assertContains(response, 'id="profileTabs"')
        self.assertNotContains(response, 'data-tab="saved"')
        self.assertNotContains(response, 'workshop-scanner.js')
        self.assertNotContains(response, 'jsQR.js')

    def test_owner_profile_embeds_referral_points_and_visits_for_profile_header(self):
        student = self._user('059900110', 'طالب الإحالات', UserRole.STUDENT)
        trainer = self._user('059900111', 'مدرب الإحالات', UserRole.TRAINER)
        course = Course.objects.create(
            owner=trainer,
            title='دورة إحالات',
            price='₪150',
            status=CourseStatus.PUBLISHED,
        )
        StudentPointTransaction.objects.create(
            student=student,
            course=course,
            points=20,
            kind=StudentPointTransaction.Kind.REFERRAL,
        )
        StudentReferralLink.objects.create(referrer=student, course=course, visits=3)
        self.client.force_login(student)

        response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': student.handle})
        )

        self.assertEqual(response.context['profile_json']['referral_points'], 20)
        self.assertEqual(response.context['profile_json']['referral_visits'], 3)
        self.assertContains(response, '"referral_points": 20')
        self.assertContains(response, '"referral_visits": 3')
        self.assertNotContains(response, 'workshop-scanner.js')
        self.assertNotContains(response, 'jsQR.js')

        self.client.logout()
        public_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': student.handle})
        )
        self.assertNotIn('canScanWorkshops', public_response.context['profile_json'])
        self.client.force_login(trainer)
        other_user_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': student.handle})
        )
        self.assertNotIn('canScanWorkshops', other_user_response.context['profile_json'])
