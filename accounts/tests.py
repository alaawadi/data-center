from pathlib import Path

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from courses.models import (
    Course,
    CourseCertificate,
    ManualCertificate,
    ManualCertificateStatus,
    CourseStatus,
    CourseType,
)
from courses.models import StudentPointTransaction, StudentReferralLink
from projects.models import Project, ProjectInteraction, ProjectStatus
from users.models import (
    DEFAULT_STUDENT_CATEGORY_NAME,
    FreelancerCategory,
    Profile,
    ProfileSkill,
    Skill,
    User,
    UserRole,
)


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

    def test_authenticated_header_shows_name_initial_when_avatar_is_missing(self):
        self.client.force_login(self.owner)

        response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.owner.handle})
        )

        self.assertContains(response, 'class="account-initial"')
        self.assertContains(response, f'data-account-initial="{self.owner.display_name[0]}"')

    def test_admin_profile_edit_data_includes_signup_country_prefix_choices(self):
        admin = User.objects.create_user(
            phone='059900005',
            password='pass1234',
            full_name='مدير المنصة',
            role=UserRole.ADMIN,
        )
        user = User.objects.create_user(
            phone='+972591234567',
            password='pass1234',
            full_name='صاحب البروفايل',
            role=UserRole.STUDENT,
        )
        self.client.force_login(admin)

        response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': user.handle})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['profile_json']['accountPhone'], user.phone)
        self.assertIn(('+972', '🇮🇱 +972'), response.context['country_calling_code_choices'])
        self.assertContains(response, 'id="country-calling-code-choices"')


class ProfilePayloadPerformanceTests(TestCase):
    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059900003',
            password='pass1234',
            full_name='مدرب اختبار الأداء',
            role=UserRole.TRAINER,
        )
        self.student = User.objects.create_user(
            phone='059900004',
            password='pass1234',
            full_name='طالب اختبار الأداء',
            role=UserRole.STUDENT,
        )
        self.course = Course.objects.create(
            owner=self.trainer,
            title='دورة اختبار الأداء',
            status=CourseStatus.PUBLISHED,
        )
        CourseCertificate.objects.create(student=self.student, course=self.course)
        Project.objects.create(
            owner=self.student,
            title='مشروع اختبار الأداء',
            content='محتوى المشروع الكامل',
            status=ProjectStatus.PUBLISHED,
        )

    def test_public_profile_omits_posts_and_uses_compact_cards(self):
        with CaptureQueriesContext(connection) as captured:
            response = self.client.get(
                reverse('accounts:profile', kwargs={'handle': self.student.handle})
            )

        self.assertFalse(any('posts_' in query['sql'] for query in captured.captured_queries))
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('posts_json', response.context)
        certificate = response.context['profile_certs_json'][0]
        self.assertEqual(certificate['syllabus'], [])
        self.assertEqual(certificate['content'], '')
        project = response.context['projects_json'][0]
        self.assertEqual(project['content'], '')
        self.assertEqual(project['comments'], [])
        self.assertEqual(project['fileCount'], 0)
        self.assertEqual(project['files'], [])
        self.assertEqual(project['gallery'], [])

    def test_personal_profile_omits_posts_and_uses_compact_cards(self):
        self.client.force_login(self.student)
        with CaptureQueriesContext(connection) as captured:
            response = self.client.get(reverse('portfolio:home'))

        self.assertFalse(any('posts_' in query['sql'] for query in captured.captured_queries))
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('posts_json', response.context)
        certificate = response.context['my_certs_json'][0]
        self.assertEqual(certificate['syllabus'], [])
        self.assertEqual(certificate['content'], '')
        project = response.context['projects_json'][0]
        self.assertEqual(project['content'], '')
        self.assertEqual(project['comments'], [])
        self.assertEqual(project['fileCount'], 0)
        self.assertEqual(project['files'], [])
        self.assertEqual(project['gallery'], [])


class FreelancerListTests(TestCase):
    def _user(self, phone, name, role):
        return User.objects.create_user(
            phone=phone, password='pass1234', full_name=name, role=role
        )

    def test_category_filter_options_use_active_freelancer_categories(self):
        active = FreelancerCategory.objects.create(name='التصميم')
        FreelancerCategory.objects.create(name='فئة بلا مستخدمين')
        FreelancerCategory.objects.create(name='البرمجة', is_active=False)
        freelancer = self._user('059900099', 'مستقل التصميم', UserRole.TRAINER)
        freelancer.profile.specialization = active.name
        freelancer.profile.save(update_fields=['specialization'])
        self._user('059900095', 'طالب جديد', UserRole.STUDENT)

        response = self.client.get(reverse('accounts:list'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['training_categories_json'], [active.name])
        self.assertNotIn(
            DEFAULT_STUDENT_CATEGORY_NAME, response.context['training_categories_json']
        )

    def test_category_filter_options_only_count_public_active_freelancers(self):
        private_category = FreelancerCategory.objects.create(name='خاص')
        inactive_user_category = FreelancerCategory.objects.create(name='حساب معطل')
        non_freelancer_category = FreelancerCategory.objects.create(name='ليس مستقلاً')

        private_user = self._user('059900098', 'مستقل خاص', UserRole.TRAINER)
        private_user.profile.specialization = private_category.name
        private_user.profile.is_public = False
        private_user.profile.save(update_fields=['specialization', 'is_public'])

        inactive_user = self._user('059900097', 'مستقل معطل', UserRole.STUDENT)
        inactive_user.profile.specialization = inactive_user_category.name
        inactive_user.profile.save(update_fields=['specialization'])
        inactive_user.is_active = False
        inactive_user.save(update_fields=['is_active'])

        regular_user = self._user('059900096', 'مستخدم عادي', UserRole.EMPLOYEE)
        regular_user.profile.specialization = non_freelancer_category.name
        regular_user.profile.save(update_fields=['specialization'])

        response = self.client.get(reverse('accounts:list'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['training_categories_json'], [])

    def test_list_prefetches_profile_skills_languages_and_social_links(self):
        for index in range(4):
            user = self._user(
                f'05990110{index}',
                f'مستقل رقم {index}',
                UserRole.TRAINER,
            )
            user.profile.profile_skills.create(
                skill=Skill.objects.create(name=f'مهارة {index}')
            )

        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(reverse('accounts:list'))

        self.assertEqual(response.status_code, 200)
        for table in (
            'users_profileskill',
            'users_profilelanguage',
            'users_sociallink',
        ):
            table_queries = [
                query for query in queries
                if f'FROM "{table}"' in query['sql']
            ]
            self.assertLessEqual(len(table_queries), 1, table)

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
        self.assertEqual(response.context['freelancers_count'], len(profiles))
        self.assertEqual(response.context['freelancers_badge'], f'{len(profiles)}+ مستقل')
        self.assertContains(response, response.context['freelancers_badge'])

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
        skill = Skill.objects.create(name='Python')
        profile_skill = ProfileSkill.objects.create(
            profile=student.profile, skill=skill, level=85
        )

        response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': student.handle})
        )

        self.assertContains(response, f'<title>{student.display_name} — مركز داتا</title>')
        self.assertEqual(response.context['profile_json']['roleKey'], UserRole.STUDENT)
        self.assertNotIn('freelancerCategories', response.context['profile_json'])
        self.assertEqual(
            response.context['profile_json']['skillsWithLevels'],
            [{'id': f'sk{profile_skill.pk}', 'name': 'Python', 'level': 85}],
        )
        self.assertContains(response, 'id="publicSkills"')
        self.assertContains(response, 'id="profileTabs"')
        self.assertNotContains(response, 'data-tab="saved"')
        self.assertNotContains(response, 'workshop-scanner.js')
        self.assertNotContains(response, 'jsQR.js')

    def test_public_trainer_profile_includes_profile_only_and_inactive_courses(self):
        trainer = self._user('059900115', 'مدرب بروفايل', UserRole.TRAINER)
        profile_only_course = Course.objects.create(
            owner=trainer,
            title='دورة وجاهية للبروفايل',
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.IN_PERSON,
            profile_only=True,
        )
        homepage_course = Course.objects.create(
            owner=trainer,
            title='دورة وجاهية معروضة في الرئيسية',
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.IN_PERSON,
            profile_only=False,
        )
        profile_only_online_course = Course.objects.create(
            owner=trainer,
            title='دورة أونلاين للبروفايل فقط',
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.ONLINE,
            profile_only=True,
        )
        inactive_course = Course.objects.create(
            owner=trainer,
            title='دورة غير نشطة للمدرب',
            status=CourseStatus.DRAFT,
        )
        other_trainer = self._user('059900116', 'مدرب آخر', UserRole.TRAINER)
        other_inactive_course = Course.objects.create(
            owner=other_trainer,
            title='دورة غير نشطة لمدرب آخر',
            status=CourseStatus.DRAFT,
        )

        response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': trainer.handle})
        )

        courses = response.context['courses_json']
        courses_by_id = {course['id']: course for course in courses}
        self.assertIn(profile_only_course.slug, courses_by_id)
        self.assertIn(homepage_course.slug, courses_by_id)
        self.assertEqual(
            courses_by_id[homepage_course.slug]['courseType'],
            CourseType.IN_PERSON,
        )
        self.assertIn(profile_only_online_course.slug, courses_by_id)
        self.assertEqual(
            courses_by_id[profile_only_course.slug]['courseType'],
            CourseType.IN_PERSON,
        )
        self.assertIn(inactive_course.slug, courses_by_id)
        self.assertEqual(courses_by_id[inactive_course.slug]['status'], CourseStatus.DRAFT)
        self.assertNotIn(other_inactive_course.slug, courses_by_id)

    def test_public_trainer_profile_includes_reviewed_certificates_only(self):
        trainer = self._user('059900117', 'مدرب الشهادات المراجعة', UserRole.TRAINER)
        approved_certificate = ManualCertificate.objects.create(
            student=trainer,
            title='شهادة معتمدة',
            issuer='جهة التدريب',
            image='certificates/manual/approved.png',
            status=ManualCertificateStatus.APPROVED,
            is_active=True,
        )
        pending_certificate = ManualCertificate.objects.create(
            student=trainer,
            title='شهادة قيد المراجعة',
            issuer='جهة التدريب',
            image='certificates/manual/pending.png',
            status=ManualCertificateStatus.PENDING,
            is_active=False,
        )
        rejected_certificate = ManualCertificate.objects.create(
            student=trainer,
            title='شهادة مرفوضة',
            issuer='جهة التدريب',
            image='certificates/manual/rejected.png',
            status=ManualCertificateStatus.REJECTED,
            is_active=False,
        )

        response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': trainer.handle})
        )

        certificates = response.context['profile_certs_json']
        self.assertEqual(
            [certificate['id'] for certificate in certificates],
            [f'manual-{approved_certificate.pk}'],
        )
        self.assertNotIn(f'manual-{pending_certificate.pk}', response.content.decode())
        self.assertNotIn(f'manual-{rejected_certificate.pk}', response.content.decode())
        self.assertContains(response, 'id="panel-reviewed-certificates"')

    def test_public_profiles_expose_whatsapp_only_for_trainers(self):
        trainer = self._user('059900114', 'مدرب واتساب', UserRole.TRAINER)
        trainer.profile.whatsapp = '+970599999999'
        trainer.profile.save(update_fields=['whatsapp'])
        student = self._user('059900115', 'طالب واتساب', UserRole.STUDENT)
        student.profile.whatsapp = '+970511111111'
        student.profile.save(update_fields=['whatsapp'])

        trainer_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': trainer.handle})
        )
        student_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': student.handle})
        )

        self.assertEqual(trainer_response.context['profile_json']['whatsapp'], '+970599999999')
        self.assertNotContains(trainer_response, 'profile-banner-contact')
        self.assertNotContains(trainer_response, 'trainer-whatsapp')
        self.assertEqual(student_response.context['profile_json']['whatsapp'], '')

    def test_referral_statistics_are_not_exposed_in_freelancer_profile(self):
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

        self.assertNotIn('referral_points', response.context['profile_json'])
        self.assertNotIn('referral_visits', response.context['profile_json'])
        self.assertNotIn('referral_points', response.context['server_profile'])
        self.assertNotIn('referral_visits', response.context['server_profile'])
        self.assertNotContains(response, 'إجمالي نقاط الإحالة')
        self.assertNotContains(response, 'زيارات روابطك')
        self.assertNotContains(response, 'workshop-scanner.js')
        self.assertNotContains(response, 'jsQR.js')

        self.client.logout()
        public_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': student.handle})
        )
        self.assertNotIn('canScanWorkshops', public_response.context['profile_json'])
        self.assertNotIn('referral_points', public_response.context['profile_json'])
        self.assertNotIn('referral_visits', public_response.context['profile_json'])
        self.assertNotContains(public_response, 'إجمالي نقاط الإحالة')
        self.assertNotContains(public_response, 'زيارات روابطك')
        self.client.force_login(trainer)
        other_user_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': student.handle})
        )
        self.assertNotIn('canScanWorkshops', other_user_response.context['profile_json'])
        self.assertNotIn('referral_points', other_user_response.context['profile_json'])
        self.assertNotIn('referral_visits', other_user_response.context['profile_json'])

    def test_referral_statistics_are_exposed_only_when_student_enables_them(self):
        student = self._user('0599000117', 'طالب إحصاءات عامة', UserRole.STUDENT)
        trainer = self._user('0599000118', 'مدرب إحصاءات عامة', UserRole.TRAINER)
        course = Course.objects.create(
            owner=trainer,
            title='دورة إحصاءات عامة',
            price='₪150',
            status=CourseStatus.PUBLISHED,
        )
        StudentPointTransaction.objects.create(
            student=student,
            course=course,
            points=35,
            kind=StudentPointTransaction.Kind.REFERRAL,
        )
        StudentReferralLink.objects.create(referrer=student, course=course, visits=9)
        student.profile.show_referral_stats = True
        student.profile.save(update_fields=['show_referral_stats'])

        public_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': student.handle})
        )
        self.assertTrue(public_response.context['profile_json']['showReferralStats'])
        self.assertEqual(public_response.context['profile_json']['referral_points'], 35)
        self.assertEqual(public_response.context['profile_json']['referral_visits'], 9)

        self.client.force_login(student)
        portfolio_response = self.client.get(reverse('portfolio:home'))
        self.assertTrue(portfolio_response.context['server_profile']['showReferralStats'])
        self.assertEqual(portfolio_response.context['server_profile']['referral_points'], 35)
        self.assertEqual(portfolio_response.context['server_profile']['referral_visits'], 9)

    def test_trainer_freelancer_profile_does_not_expose_referral_statistics(self):
        trainer = self._user('059900112', 'مدرب الملف الشخصي', UserRole.TRAINER)
        self.client.force_login(trainer)

        response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': trainer.handle})
        )

        self.assertNotIn('referral_points', response.context['profile_json'])
        self.assertNotIn('referral_visits', response.context['profile_json'])
        self.assertNotIn('referral_points', response.context['server_profile'])
        self.assertNotIn('referral_visits', response.context['server_profile'])
        self.assertNotContains(response, 'إجمالي نقاط الإحالة')
        self.assertNotContains(response, 'زيارات روابطك')

    def test_public_profile_avatar_disables_image_dragging(self):
        owner = self._user('059900113', 'صاحب صورة', UserRole.STUDENT)

        response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': owner.handle})
        )

        profile_script = (
            Path(__file__).resolve().parent.parent / 'static' / 'js' / 'user-profile.js'
        ).read_text(encoding='utf-8')
        self.assertContains(response, 'id="profileHost"')
        self.assertIn('draggable="false"', profile_script)
        self.assertIn("avatarImage.addEventListener('contextmenu'", profile_script)
        self.assertIn("avatarImage.addEventListener('dragstart'", profile_script)


class FreelancerReorderingTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='059901201',
            password='pass1234',
            full_name='مدير الترتيب',
            role=UserRole.ADMIN,
        )
        self.first = User.objects.create_user(
            phone='059901202',
            password='pass1234',
            full_name='مستقل أول',
            role=UserRole.STUDENT,
        )
        self.second = User.objects.create_user(
            phone='059901203',
            password='pass1234',
            full_name='مدرب ثاني',
            role=UserRole.TRAINER,
        )
        self.first.profile.display_order = None
        self.first.profile.save(update_fields=['display_order'])
        self.second.profile.display_order = None
        self.second.profile.save(update_fields=['display_order'])

    def test_reordering_controls_are_available_to_admin_only(self):
        admin_response = self.client.get(reverse('accounts:list'))
        self.assertFalse(admin_response.context['can_reorder_freelancers'])
        self.assertNotContains(admin_response, 'id="freelancerReorderTools"')

        self.client.force_login(self.admin)
        admin_response = self.client.get(reverse('accounts:list'))
        self.assertTrue(admin_response.context['can_reorder_freelancers'])
        self.assertContains(admin_response, 'id="freelancerReorderTools"')

        self.client.force_login(self.first)
        member_response = self.client.get(reverse('accounts:list'))
        self.assertFalse(member_response.context['can_reorder_freelancers'])
        self.assertNotContains(member_response, 'id="freelancerReorderTools"')

    def test_admin_can_save_and_view_freelancer_order(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse('accounts:reorder'),
            data={'order': [self.first.handle, self.second.handle]},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            list(
                Profile.objects.filter(
                    user__in=[self.first, self.second]
                ).order_by('display_order').values_list('user__handle', flat=True)
            ),
            [self.first.handle, self.second.handle],
        )
        profiles = self.client.get(reverse('accounts:list')).context['profiles_json']
        self.assertEqual(
            [profile['handle'] for profile in profiles],
            [self.first.handle, self.second.handle],
        )

    def test_non_admin_cannot_reorder_freelancers(self):
        self.client.force_login(self.first)

        response = self.client.post(
            reverse('accounts:reorder'),
            data={'order': [self.first.handle, self.second.handle]},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)

    def test_reorder_rejects_duplicate_or_changed_freelancer_lists(self):
        self.client.force_login(self.admin)
        url = reverse('accounts:reorder')

        duplicate_response = self.client.post(
            url,
            data={'order': [self.first.handle, self.first.handle]},
            content_type='application/json',
        )
        changed_response = self.client.post(
            url,
            data={'order': [self.first.handle]},
            content_type='application/json',
        )

        self.assertEqual(duplicate_response.status_code, 400)
        self.assertEqual(changed_response.status_code, 409)
