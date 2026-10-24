import json
import base64
from decimal import Decimal
from datetime import timedelta
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from zipfile import ZipFile

from django.contrib.auth import authenticate
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from django.urls import reverse

from PIL import Image

from core.models import PlatformSettings, SiteVisitDaily
from courses.models import (
    Course,
    CourseCertificate,
    CourseProgress,
    CourseSection,
    CourseStatus,
    InPersonWorkshop,
    Lesson,
    LessonType,
    ManualCertificate,
    ManualCertificateStatus,
    Quiz,
    QuizChoice,
    QuizQuestion,
    StudentPointTransaction,
    StudentReferral,
    StudentReferralLink,
    WorkshopAttendance,
    WorkshopCertificate,
)
from projects.models import Project, ProjectStatus
from posts.models import Post, PostTag
from users.models import Profile, SocialLink, SocialPlatform, User, UserRole


class AdminTrainerListTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000001',
            password='admin-password',
            full_name='مدير النظام',
            role=UserRole.ADMIN,
        )

    def test_panel_includes_every_database_trainer(self):
        trainers = [
            User.objects.create_user(
                phone='1111111111',
                password='trainer-password',
                full_name='مدرب أول',
                role=UserRole.TRAINER,
            ),
            User.objects.create_user(
                phone='2222222222',
                password='trainer-password',
                full_name='مدرب ثان',
                role=UserRole.TRAINER,
                is_active=False,
            ),
        ]
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.context['trainers_json'],
            [
                {
                    'id': str(trainer.pk),
                    'name': trainer.display_name,
                    'handle': trainer.handle,
                    'specialty': '',
                    'rating': 0,
                    'email': trainer.email,
                    'phone': trainer.phone,
                    'avatar': '',
                    'bio': '',
                    'status': 'active' if trainer.is_active else 'paused',
                    'verified': trainer.is_verified,
                    'joined': trainer.date_joined.isoformat(),
                    'coursesCount': 0,
                    'linkedin': '',
                    'github': '',
                }
                for trainer in reversed(trainers)
            ],
        )

    def test_panel_overview_receives_total_site_visits(self):
        SiteVisitDaily.objects.create(visit_date='2026-10-23', visits=7)
        SiteVisitDaily.objects.create(visit_date='2026-10-24', visits=11)
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.context['site_visit_count'], 18)
        self.assertContains(response, 'id="admin-site-visit-count"')

    def test_student_table_data_includes_referral_visits_and_points(self):
        from courses.models import StudentPointTransaction, StudentReferralLink

        trainer = User.objects.create_user(
            phone='6777777777',
            password='trainer-password',
            full_name='مدرب الإحصائية',
            role=UserRole.TRAINER,
        )
        student = User.objects.create_user(
            phone='6888888888',
            password='student-password',
            full_name='طالب الإحصائية',
            role=UserRole.STUDENT,
        )
        course = Course.objects.create(
            owner=trainer,
            title='دورة نقاط الإحالة',
            price='₪100',
        )
        StudentPointTransaction.objects.create(
            student=student,
            course=course,
            points=20,
            kind=StudentPointTransaction.Kind.REFERRAL,
        )
        StudentReferralLink.objects.create(
            referrer=student,
            course=course,
            visits=7,
        )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        row = next(
            row for row in response.context['students_json']
            if row['databaseId'] == str(student.pk)
        )
        self.assertEqual(row['referralPoints'], 20)
        self.assertEqual(row['referralVisits'], 7)

    def test_panel_lists_only_point_redemptions_with_student_and_course(self):
        from courses.models import StudentPointTransaction

        trainer = User.objects.create_user(
            phone='6999999999',
            password='trainer-password',
            full_name='مدرب الخصومات',
            role=UserRole.TRAINER,
        )
        student = User.objects.create_user(
            phone='6999999998',
            password='student-password',
            full_name='طالب الخصومات',
            role=UserRole.STUDENT,
        )
        course = Course.objects.create(
            owner=trainer,
            title='دورة الاستبدال',
            price='₪100',
        )
        redemption = StudentPointTransaction.objects.create(
            student=student,
            course=course,
            points=-100,
            kind=StudentPointTransaction.Kind.REDEMPTION,
        )
        StudentPointTransaction.objects.create(
            student=student,
            course=course,
            points=10,
            kind=StudentPointTransaction.Kind.REFERRAL,
        )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.context['point_redemptions_json'],
            [{
                'id': str(redemption.pk),
                'studentName': student.display_name,
                'studentHandle': student.handle,
                'courseTitle': course.title,
                'points': 100,
                'date': redemption.created_at.isoformat(),
            }],
        )
        self.assertContains(response, 'admin-point-redemptions-data')

    def test_panel_offers_only_published_paid_courses_for_point_redemption(self):
        trainer = User.objects.create_user(
            phone='6777777780',
            password='trainer-password',
            full_name='مدرب خيارات الاستبدال',
            role=UserRole.TRAINER,
        )
        published_paid = Course.objects.create(
            owner=trainer,
            title='دورة مدفوعة منشورة',
            price='₪100',
            status=CourseStatus.PUBLISHED,
        )
        Course.objects.create(
            owner=trainer,
            title='دورة مجانية منشورة',
            price='مجاني',
            status=CourseStatus.PUBLISHED,
        )
        Course.objects.create(
            owner=trainer,
            title='دورة مدفوعة مسودة',
            price='₪100',
            status=CourseStatus.DRAFT,
        )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(
            response.context['point_redemption_courses_json'],
            [{'id': published_paid.slug, 'title': published_paid.title, 'price': published_paid.price}],
        )


    def test_panel_includes_database_courses_progress_and_real_course_detail(self):
        trainer = User.objects.create_user(
            phone='5555555555',
            password='trainer-password',
            full_name='مدرب الدورات',
            role=UserRole.TRAINER,
        )
        student = User.objects.create_user(
            phone='6666666666',
            password='student-password',
            full_name='طالب حقيقي',
            role=UserRole.STUDENT,
            handle='real-student',
        )
        course = Course.objects.create(
            owner=trainer,
            title='دورة من قاعدة البيانات',
            status=CourseStatus.DRAFT,
        )
        section = CourseSection.objects.create(course=course, title='القسم الأول')
        first_lesson = Lesson.objects.create(section=section, title='الدرس الأول')
        Lesson.objects.create(section=section, title='الدرس الثاني')
        progress = CourseProgress.objects.create(
            student=student,
            course=course,
            completed_ids=[first_lesson.pk],
        )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.context['courses_json'][0]['id'],
            course.slug,
        )
        self.assertEqual(response.context['courses_json'][0]['enrollmentCount'], 1)
        self.assertEqual(
            response.context['course_progress_json'],
            [{
                'id': str(progress.pk),
                'courseId': course.slug,
                'userId': str(student.pk),
                'user': {
                    'id': str(student.pk),
                    'name': student.display_name,
                    'handle': student.handle,
                    'avatar': '',
                    'role': UserRole.STUDENT,
                },
                'completedIds': [first_lesson.pk],
                'completed': False,
                'joinedAt': progress.created_at.isoformat(),
                'updatedAt': progress.updated_at.isoformat(),
                'progress': 50,
            }],
        )
        self.assertEqual(
            response.context['students_json'][0]['databaseId'],
            str(student.pk),
        )

        detail_response = self.client.get(reverse('courses:detail', args=[course.slug]))
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.context['course'].pk, course.pk)

    def test_panel_requires_an_admin_user(self):
        trainer = User.objects.create_user(
            phone='3333333333',
            password='trainer-password',
            full_name='مدرب',
            role=UserRole.TRAINER,
        )
        self.client.force_login(trainer)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 403)

    def test_staff_without_admin_role_cannot_access_panel_or_admin_api(self):
        staff_user = User.objects.create_user(
            phone='3333333334',
            password='staff-password',
            full_name='موظف النظام',
            role=UserRole.EMPLOYEE,
            is_staff=True,
        )
        self.client.force_login(staff_user)

        panel_response = self.client.get(reverse('dashboard:home'))
        self.assertEqual(panel_response.status_code, 403)

        api_response = self.client.post(
            reverse('dashboard:student-save'),
            data=json.dumps({
                'name': 'طالب',
                'handle': 'staff-created',
                'phone': '1111111112',
                'password': 'Strong#Student2026',
            }),
            content_type='application/json',
        )
        self.assertEqual(api_response.status_code, 403)
        self.assertFalse(User.objects.filter(handle='staff-created').exists())

    def test_admin_can_remove_student_progress_and_course_certificate(self):
        trainer = User.objects.create_user(
            phone='7777777777',
            password='trainer-password',
            full_name='مدرب',
            role=UserRole.TRAINER,
        )
        student = User.objects.create_user(
            phone='8888888888',
            password='student-password',
            full_name='طالب مسجل',
            role=UserRole.STUDENT,
        )
        course = Course.objects.create(
            owner=trainer,
            title='دورة للإزالة',
            status=CourseStatus.PUBLISHED,
        )
        progress = CourseProgress.objects.create(
            student=student,
            course=course,
            completed_ids=[1],
            completed=True,
        )
        certificate = CourseCertificate.objects.create(student=student, course=course)
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse('dashboard:course-student-remove', args=[progress.pk]),
            data='{}',
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['enrolledCount'], 0)
        self.assertTrue(User.objects.filter(pk=student.pk).exists())
        self.assertTrue(Course.objects.filter(pk=course.pk).exists())
        self.assertFalse(CourseProgress.objects.filter(pk=progress.pk).exists())
        self.assertFalse(CourseCertificate.objects.filter(pk=certificate.pk).exists())

    def test_student_removal_requires_admin_access(self):
        trainer = User.objects.create_user(
            phone='9999999999',
            password='trainer-password',
            full_name='مدرب',
            role=UserRole.TRAINER,
        )
        student = User.objects.create_user(
            phone='0000000001',
            password='student-password',
            full_name='طالب مسجل',
            role=UserRole.STUDENT,
        )
        course = Course.objects.create(owner=trainer, title='دورة محمية')
        progress = CourseProgress.objects.create(student=student, course=course)
        other = User.objects.create_user(
            phone='0000000002',
            password='other-password',
            full_name='مدرب غير مخول',
            role=UserRole.TRAINER,
        )
        self.client.force_login(other)

        response = self.client.post(
            reverse('dashboard:course-student-remove', args=[progress.pk]),
            data='{}',
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertTrue(CourseProgress.objects.filter(pk=progress.pk).exists())


class AdminStudentActivationTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000018',
            password='admin-password',
            full_name='مدير النظام',
            role=UserRole.ADMIN,
        )
        self.student = User.objects.create_user(
            phone='0591000019',
            password='student-password',
            full_name='طالب بانتظار التفعيل',
            role=UserRole.STUDENT,
            is_active=False,
        )
        self.url = reverse('dashboard:student-status', args=[self.student.pk])

    def test_admin_can_activate_and_deactivate_student(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            self.url,
            json.dumps({'active': True}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['active'])
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_active)
        self.assertEqual(
            authenticate(phone=self.student.phone, password='student-password'),
            self.student,
        )

        response = self.client.post(
            self.url,
            json.dumps({'active': False}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.student.refresh_from_db()
        self.assertFalse(self.student.is_active)
        self.assertIsNone(
            authenticate(phone=self.student.phone, password='student-password')
        )

    def test_non_admin_cannot_change_student_activation(self):
        student = User.objects.create_user(
            phone='0591000022',
            password='active-student-password',
            full_name='طالب نشط',
            role=UserRole.STUDENT,
        )
        self.client.force_login(student)

        response = self.client.post(
            reverse('dashboard:student-status', args=[student.pk]),
            json.dumps({'active': False}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)
        student.refresh_from_db()
        self.assertTrue(student.is_active)


class AdminReferralPointsResetTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000081',
            password='admin-password',
            full_name='مدير النقاط',
            role=UserRole.ADMIN,
        )
        self.student = User.objects.create_user(
            phone='0591000082',
            password='student-password',
            full_name='طالب النقاط',
            role=UserRole.STUDENT,
        )
        self.trainer = User.objects.create_user(
            phone='0591000083',
            password='trainer-password',
            full_name='مدرب النقاط',
            role=UserRole.TRAINER,
        )
        self.course = Course.objects.create(
            owner=self.trainer,
            title='دورة النقاط',
            price='₪100',
        )
        self.url = reverse(
            'dashboard:student-reset-referral-points',
            args=[self.student.pk],
        )

    def test_admin_resets_points_with_auditable_adjustment(self):
        StudentPointTransaction.objects.create(
            student=self.student,
            course=self.course,
            points=30,
            kind=StudentPointTransaction.Kind.REFERRAL,
        )
        StudentPointTransaction.objects.create(
            student=self.student,
            course=self.course,
            points=-10,
            kind=StudentPointTransaction.Kind.REDEMPTION,
        )
        self.client.force_login(self.admin)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True, 'points': 0})
        transactions = StudentPointTransaction.objects.filter(student=self.student)
        self.assertEqual(sum(transactions.values_list('points', flat=True)), 0)
        reset = transactions.get(kind=StudentPointTransaction.Kind.RESET)
        self.assertEqual(reset.points, -20)
        self.assertEqual(transactions.count(), 3)

        repeated = self.client.post(self.url)
        self.assertEqual(repeated.status_code, 200)
        self.assertEqual(transactions.count(), 3)

    def test_reset_rejects_non_admin_and_non_student_targets(self):
        viewer = User.objects.create_user(
            phone='0591000084',
            password='viewer-password',
            full_name='طالب آخر',
            role=UserRole.STUDENT,
        )
        self.client.force_login(viewer)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(StudentPointTransaction.objects.filter(student=self.student).exists())

        self.client.force_login(self.admin)
        trainer_url = reverse(
            'dashboard:student-reset-referral-points',
            args=[self.trainer.pk],
        )
        response = self.client.post(trainer_url)
        self.assertEqual(response.status_code, 404)

    def test_admin_redeems_100_points_for_selected_published_course(self):
        self.course.status = CourseStatus.PUBLISHED
        self.course.save(update_fields=['status'])
        StudentPointTransaction.objects.create(
            student=self.student,
            course=self.course,
            points=150,
            kind=StudentPointTransaction.Kind.REFERRAL,
        )
        url = reverse(
            'dashboard:student-redeem-referral-points',
            args=[self.student.pk],
        )
        self.client.force_login(self.admin)

        response = self.client.post(
            url,
            json.dumps({'courseId': self.course.slug}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['points'], 50)
        self.assertTrue(
            CourseProgress.objects.filter(student=self.student, course=self.course).exists()
        )
        redemption = StudentPointTransaction.objects.get(
            student=self.student,
            course=self.course,
            kind=StudentPointTransaction.Kind.REDEMPTION,
        )
        self.assertEqual(redemption.points, -100)
        self.assertEqual(response.json()['redemption']['id'], str(redemption.pk))

        panel = self.client.get(reverse('dashboard:home'))
        self.assertEqual(
            panel.context['point_redemptions_json'][0]['courseTitle'],
            self.course.title,
        )
        self.assertEqual(panel.context['point_redemptions_json'][0]['points'], 100)

    def test_admin_redemption_rejects_insufficient_points_and_duplicate_enrollment(self):
        self.course.status = CourseStatus.PUBLISHED
        self.course.save(update_fields=['status'])
        url = reverse(
            'dashboard:student-redeem-referral-points',
            args=[self.student.pk],
        )
        self.client.force_login(self.admin)
        payload = json.dumps({'courseId': self.course.slug})

        insufficient = self.client.post(
            url,
            payload,
            content_type='application/json',
        )
        self.assertEqual(insufficient.status_code, 400)
        self.assertFalse(
            CourseProgress.objects.filter(student=self.student, course=self.course).exists()
        )

        StudentPointTransaction.objects.create(
            student=self.student,
            course=self.course,
            points=100,
            kind=StudentPointTransaction.Kind.REFERRAL,
        )
        CourseProgress.objects.create(student=self.student, course=self.course)
        duplicate = self.client.post(
            url,
            payload,
            content_type='application/json',
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertFalse(
            StudentPointTransaction.objects.filter(
                student=self.student,
                course=self.course,
                kind=StudentPointTransaction.Kind.REDEMPTION,
            ).exists()
        )

    def test_redemption_endpoint_rejects_non_admin_and_unpublished_course(self):
        url = reverse(
            'dashboard:student-redeem-referral-points',
            args=[self.student.pk],
        )
        payload = json.dumps({'courseId': self.course.slug})
        self.client.force_login(self.student)

        denied = self.client.post(url, payload, content_type='application/json')
        self.assertEqual(denied.status_code, 403)

        self.client.force_login(self.admin)
        unpublished = self.client.post(url, payload, content_type='application/json')
        self.assertEqual(unpublished.status_code, 404)
        self.assertFalse(
            StudentPointTransaction.objects.filter(
                student=self.student,
                kind=StudentPointTransaction.Kind.REDEMPTION,
            ).exists()
        )


class StudentPersistenceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591011001',
            password='admin-password',
            full_name='مدير الطلاب',
            role=UserRole.ADMIN,
        )
        self.student = User.objects.create_user(
            phone='0591011002',
            password='Old#Student2026',
            full_name='طالب موجود',
            handle='existing-student',
            role=UserRole.STUDENT,
        )
        self.client.force_login(self.admin)
        self.url = reverse('dashboard:student-save')

    def payload(self, **overrides):
        data = {
            'name': 'طالب لوحة الإدارة',
            'handle': 'panel-student',
            'phone': '0591011003',
            'email': 'student@example.com',
            'password': 'Strong#Student2026',
            'status': 'active',
            'verified': False,
            'bio': 'نبذة الطالب',
            'avatar': '',
        }
        data.update(overrides)
        return data

    def post_json(self, payload):
        return self.client.post(self.url, json.dumps(payload), content_type='application/json')

    def test_admin_can_create_student_with_password(self):
        response = self.post_json(self.payload())

        self.assertEqual(response.status_code, 201, response.content)
        student = User.objects.get(phone='0591011003')
        self.assertEqual(student.role, UserRole.STUDENT)
        self.assertTrue(authenticate(phone=student.phone, password='Strong#Student2026'))
        self.assertEqual(Profile.objects.get(user=student).bio, 'نبذة الطالب')
        self.assertEqual(response.json()['student']['id'], f'db-user-{student.pk}')
        self.assertEqual(response.json()['student']['databaseId'], str(student.pk))

    def test_admin_can_change_student_password_and_blank_keeps_it(self):
        payload = self.payload(
            id=str(self.student.pk),
            name=self.student.full_name,
            handle=self.student.handle,
            phone=self.student.phone,
            email=self.student.email,
            password='',
        )
        response = self.post_json(payload)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(authenticate(phone=self.student.phone, password='Old#Student2026'))

        payload['password'] = 'New#Student2026'
        response = self.post_json(payload)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(authenticate(phone=self.student.phone, password='Old#Student2026'))
        self.assertTrue(authenticate(phone=self.student.phone, password='New#Student2026'))

    def test_student_creation_requires_valid_password_and_admin_access(self):
        response = self.post_json(self.payload(password=''))
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.json()['fields'])
        self.assertFalse(User.objects.filter(phone='0591011003').exists())

        self.client.force_login(self.student)
        response = self.post_json(self.payload())
        self.assertEqual(response.status_code, 403)


class AdminCourseStudentEnrollmentTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591010001',
            password='admin-password',
            full_name='مدير التسجيل',
            role=UserRole.ADMIN,
        )
        self.trainer = User.objects.create_user(
            phone='0591010002',
            password='trainer-password',
            full_name='مدرب التسجيل',
            role=UserRole.TRAINER,
        )
        self.student = User.objects.create_user(
            phone='0591010003',
            password='student-password',
            full_name='طالب جديد',
            handle='new-student',
            role=UserRole.STUDENT,
        )
        self.other_student = User.objects.create_user(
            phone='0591010004',
            password='student-password',
            full_name='طالب مسجل',
            role=UserRole.STUDENT,
        )
        self.course = Course.objects.create(owner=self.trainer, title='دورة التسجيل')
        self.client.force_login(self.admin)
        self.url = reverse('dashboard:course-students', args=[self.course.slug])

    def test_admin_can_search_students_and_enroll_them(self):
        CourseProgress.objects.create(student=self.other_student, course=self.course)

        response = self.client.get(self.url, {'q': 'new-stud'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [student['id'] for student in response.json()['results']],
            [str(self.student.pk)],
        )

        response = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(response.json()['created'])
        self.assertEqual(response.json()['progress']['courseId'], self.course.slug)
        self.assertTrue(
            CourseProgress.objects.filter(student=self.student, course=self.course).exists()
        )
        self.assertEqual(
            [progress['userId'] for progress in response.json()['enrolled']],
            [str(self.other_student.pk), str(self.student.pk)],
        )
        self.assertEqual(response.json()['enrolledCount'], 2)

        enrolled_response = self.client.get(self.url)
        self.assertEqual(enrolled_response.status_code, 200)
        self.assertEqual(enrolled_response.json()['enrolledCount'], 2)
        self.assertEqual(
            [progress['userId'] for progress in enrolled_response.json()['enrolled']],
            [str(self.other_student.pk), str(self.student.pk)],
        )

        duplicate = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )
        self.assertEqual(duplicate.status_code, 200)
        self.assertFalse(duplicate.json()['created'])
        self.assertEqual(duplicate.json()['enrolledCount'], 2)
        self.assertEqual(CourseProgress.objects.filter(student=self.student, course=self.course).count(), 1)

    def test_admin_enrollment_awards_referral_points_exactly_once(self):
        self.course.price = '₪100'
        self.course.save(update_fields=['price'])
        link = StudentReferralLink.objects.create(
            referrer=self.other_student,
            course=self.course,
        )
        referral = StudentReferral.objects.create(
            link=link,
            referred_user=self.student,
        )

        response = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        reward = StudentPointTransaction.objects.get(referral=referral)
        self.assertEqual(reward.student_id, self.other_student.pk)
        self.assertEqual(reward.points, 10)

        duplicate = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(
            StudentPointTransaction.objects.filter(referral=referral).count(),
            1,
        )

    def test_admin_enrollment_in_different_paid_course_awards_original_referrer(self):
        referral_course = Course.objects.create(
            owner=self.trainer,
            title='الدورة التي تمت مشاركتها',
            price='₪100',
        )
        link = StudentReferralLink.objects.create(
            referrer=self.other_student,
            course=referral_course,
        )
        referral = StudentReferral.objects.create(link=link, referred_user=self.student)
        self.course.price = '₪200'
        self.course.save(update_fields=['price'])

        response = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        reward = StudentPointTransaction.objects.get(referral=referral)
        self.assertEqual(reward.student_id, self.other_student.pk)
        self.assertEqual(reward.course_id, self.course.pk)
        self.assertEqual(reward.points, 10)

    def test_admin_awards_ten_points_for_each_paid_course_and_never_duplicates(self):
        self.course.price = '₪100'
        self.course.save(update_fields=['price'])
        link = StudentReferralLink.objects.create(
            referrer=self.other_student,
            course=self.course,
        )
        referral = StudentReferral.objects.create(
            link=link,
            referred_user=self.student,
        )

        first_response = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )
        second_course = Course.objects.create(
            owner=self.trainer,
            title='دورة مدفوعة ثانية',
            price='₪200',
        )
        second_url = reverse('dashboard:course-students', args=[second_course.slug])
        second_response = self.client.post(
            second_url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )
        duplicate_response = self.client.post(
            second_url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 201)
        self.assertEqual(duplicate_response.status_code, 200)
        rewards = StudentPointTransaction.objects.filter(referral=referral)
        self.assertEqual(rewards.count(), 2)
        self.assertEqual(sum(rewards.values_list('points', flat=True)), 20)

    def test_admin_reenrollment_repairs_missing_reward_for_existing_enrollment(self):
        self.course.price = '₪100'
        self.course.save(update_fields=['price'])
        CourseProgress.objects.create(student=self.student, course=self.course)
        link = StudentReferralLink.objects.create(
            referrer=self.other_student,
            course=self.course,
        )
        referral = StudentReferral.objects.create(
            link=link,
            referred_user=self.student,
        )

        response = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(StudentPointTransaction.objects.filter(referral=referral, points=10).exists())

    def test_course_student_search_and_enrollment_require_admin_and_student_role(self):
        self.client.force_login(self.student)
        self.assertEqual(self.client.get(self.url, {'q': 'new'}).status_code, 403)

        self.client.force_login(self.admin)
        response = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.trainer.pk}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(CourseProgress.objects.filter(course=self.course).exists())


class AdminCourseActivationTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000020',
            password='admin-password',
            full_name='مدير النظام',
            role=UserRole.ADMIN,
        )
        self.trainer = User.objects.create_user(
            phone='0591000021',
            password='trainer-password',
            full_name='مدرب الدورة',
            role=UserRole.TRAINER,
        )
        self.course = Course.objects.create(
            owner=self.trainer,
            title='دورة مفعلة',
            status=CourseStatus.PUBLISHED,
        )
        self.url = reverse('dashboard:course-status', args=[self.course.pk])

    def test_admin_can_deactivate_and_reactivate_course(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            self.url,
            json.dumps({'active': False}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['active'])
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, CourseStatus.DRAFT)
        self.client.logout()
        self.assertEqual(
            self.client.get(reverse('courses:detail', args=[self.course.slug])).status_code,
            404,
        )
        public_courses = self.client.get(reverse('courses:list')).context['courses_json']
        self.assertNotIn(self.course.slug, [course['id'] for course in public_courses])

        self.client.force_login(self.admin)
        response = self.client.post(
            self.url,
            json.dumps({'active': True}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['active'])
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, CourseStatus.PUBLISHED)
        self.assertEqual(
            self.client.get(reverse('courses:detail', args=[self.course.slug])).status_code,
            200,
        )

    def test_course_activation_requires_admin_and_boolean_state(self):
        self.client.force_login(self.trainer)
        response = self.client.post(
            self.url,
            json.dumps({'active': False}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, CourseStatus.PUBLISHED)

        self.client.force_login(self.admin)
        response = self.client.post(
            self.url,
            json.dumps({'active': 'false'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, CourseStatus.PUBLISHED)


class AdminProjectActivationTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000030',
            password='admin-password',
            full_name='مدير المشاريع',
            role=UserRole.ADMIN,
        )
        self.student = User.objects.create_user(
            phone='0591000031',
            password='student-password',
            full_name='صاحب المشروع',
            role=UserRole.STUDENT,
        )
        self.project = Project.objects.create(
            owner=self.student,
            title='مشروع قابل للإيقاف',
            status=ProjectStatus.PUBLISHED,
        )
        self.url = reverse('dashboard:project-status', args=[self.project.pk])

    def test_admin_can_deactivate_and_reactivate_project(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            self.url,
            json.dumps({'active': False}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['active'])
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, ProjectStatus.INACTIVE)

        self.client.logout()
        self.assertEqual(
            self.client.get(reverse('projects:detail', args=[self.project.slug])).status_code,
            404,
        )
        self.client.force_login(self.admin)
        response = self.client.post(
            self.url,
            json.dumps({'active': True}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, ProjectStatus.PUBLISHED)

    def test_project_activation_requires_admin_and_boolean_state(self):
        self.client.force_login(self.student)
        response = self.client.post(
            self.url,
            json.dumps({'active': False}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, ProjectStatus.PUBLISHED)

        self.client.force_login(self.admin)
        response = self.client.post(
            self.url,
            json.dumps({'active': 'false'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, ProjectStatus.PUBLISHED)


class AdminStudentCertificateTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000040',
            password='admin-password',
            full_name='مدير الشهادات',
            role=UserRole.ADMIN,
        )
        self.student = User.objects.create_user(
            phone='0591000041',
            password='student-password',
            full_name='طالب الشهادات',
            role=UserRole.STUDENT,
        )
        self.trainer = User.objects.create_user(
            phone='0591000042',
            password='trainer-password',
            full_name='مدرب الشهادة',
            role=UserRole.TRAINER,
        )
        self.course = Course.objects.create(owner=self.trainer, title='دورة الشهادة')
        self.course_certificate = CourseCertificate.objects.create(
            student=self.student,
            course=self.course,
        )
        self.manual_certificate = ManualCertificate.objects.create(
            student=self.student,
            title='شهادة خارجية',
            issuer='جهة خارجية',
            category='تطوير',
            description='وصف الشهادة',
            skills=['Python', 'Django'],
            verify_url='https://example.com/verify',
            status=ManualCertificateStatus.APPROVED,
        )
        self.client.force_login(self.admin)

    def test_admin_panel_lists_both_student_certificate_types(self):
        response = self.client.get(reverse('dashboard:home'))
        certificates = response.context['admin_student_certificates_json']
        self.assertEqual({item['type'] for item in certificates}, {'course', 'manual'})
        self.assertEqual(len(certificates), 2)
        manual_certificate = next(item for item in certificates if item['type'] == 'manual')
        self.assertEqual(manual_certificate['category'], 'تطوير')
        self.assertEqual(manual_certificate['description'], 'وصف الشهادة')
        self.assertEqual(manual_certificate['skills'], ['Python', 'Django'])
        self.assertEqual(manual_certificate['verifyUrl'], 'https://example.com/verify')

    def test_admin_can_hide_and_restore_course_and_manual_certificates(self):
        for kind, certificate in (
            ('course', self.course_certificate),
            ('manual', self.manual_certificate),
        ):
            url = reverse(
                'dashboard:certificate-status',
                args=[f'{kind}-{certificate.pk}'],
            )
            response = self.client.post(
                url,
                json.dumps({'active': False}),
                content_type='application/json',
            )
            self.assertEqual(response.status_code, 200, response.content)
            certificate.refresh_from_db()
            self.assertFalse(certificate.is_active)

            response = self.client.post(
                url,
                json.dumps({'active': True}),
                content_type='application/json',
            )
            self.assertEqual(response.status_code, 200, response.content)
            certificate.refresh_from_db()
            self.assertTrue(certificate.is_active)

    def test_admin_cannot_show_rejected_manual_certificate(self):
        self.manual_certificate.status = ManualCertificateStatus.REJECTED
        self.manual_certificate.save(update_fields=['status'])
        response = self.client.post(
            reverse(
                'dashboard:certificate-status',
                args=[f'manual-{self.manual_certificate.pk}'],
            ),
            json.dumps({'active': True}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.manual_certificate.refresh_from_db()
        self.assertFalse(self.manual_certificate.is_active)

    def test_certificate_visibility_endpoint_requires_admin_and_boolean(self):
        url = reverse(
            'dashboard:certificate-status',
            args=[f'course-{self.course_certificate.pk}'],
        )
        self.client.force_login(self.student)
        response = self.client.post(
            url,
            json.dumps({'active': False}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)

        self.client.force_login(self.admin)
        response = self.client.post(
            url,
            json.dumps({'active': 'false'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)


class AdminLessonPersistenceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000010',
            password='admin-password',
            full_name='مدير النظام',
            role=UserRole.ADMIN,
        )
        self.trainer = User.objects.create_user(
            phone='0591000011',
            password='trainer-password',
            full_name='مدرب الدورة',
            role=UserRole.TRAINER,
        )
        self.course = Course.objects.create(
            owner=self.trainer,
            title='دورة الدروس',
            status=CourseStatus.DRAFT,
        )
        self.section = CourseSection.objects.create(
            course=self.course,
            title='الوحدة الأولى',
        )
        self.client.force_login(self.admin)
        self.save_url = reverse('dashboard:course-lesson-save')

    def post_lesson(self, payload):
        return self.client.post(
            self.save_url,
            json.dumps(payload),
            content_type='application/json',
        )

    def lesson_payload(self, **overrides):
        payload = {
            'courseId': self.course.slug,
            'lessonId': '',
            'sectionId': self.section.pk,
            'title': 'اختبار قصير',
            'duration': '05:30',
            'type': LessonType.QUIZ,
            'free': False,
            'content': 'تعليمات مختصرة',
            'videoUrl': '',
            'projectId': '',
            'sectionTitle': self.section.title,
        }
        payload.update(overrides)
        return payload

    def test_admin_can_create_edit_and_change_lesson_types(self):
        response = self.post_lesson(self.lesson_payload())

        self.assertEqual(response.status_code, 200, response.content)
        lesson = Lesson.objects.get(section=self.section, title='اختبار قصير')
        self.assertEqual(lesson.type, LessonType.QUIZ)
        self.assertTrue(Quiz.objects.filter(lesson=lesson).exists())
        self.assertEqual(response.json()['course']['syllabus'][0]['lessons'][0]['id'], lesson.pk)

        response = self.post_lesson(self.lesson_payload(
            lessonId=lesson.pk,
            title='مشروع تطبيقي',
            type=LessonType.PROJECT,
            content='نفذ المشروع المطلوب.',
        ))

        self.assertEqual(response.status_code, 200, response.content)
        lesson.refresh_from_db()
        self.assertEqual(lesson.title, 'مشروع تطبيقي')
        self.assertEqual(lesson.type, LessonType.PROJECT)
        self.assertEqual(lesson.content, 'نفذ المشروع المطلوب.')
        self.assertFalse(Quiz.objects.filter(lesson=lesson).exists())

        response = self.post_lesson(self.lesson_payload(
            lessonId=lesson.pk,
            type=LessonType.VIDEO,
            videoUrl='https://example.com/video',
        ))

        self.assertEqual(response.status_code, 200, response.content)
        lesson.refresh_from_db()
        self.assertEqual(lesson.type, LessonType.VIDEO)
        self.assertEqual(lesson.video_url, 'https://example.com/video')

    def test_lesson_edit_rejects_a_lesson_from_another_course(self):
        other_course = Course.objects.create(owner=self.trainer, title='دورة أخرى')
        other_section = CourseSection.objects.create(course=other_course, title='قسم آخر')
        other_lesson = Lesson.objects.create(section=other_section, title='درس خاص')

        response = self.post_lesson(self.lesson_payload(lessonId=other_lesson.pk))

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Lesson.objects.filter(pk=other_lesson.pk).exists())

    def test_admin_can_save_complete_quiz_settings_questions_and_choices(self):
        payload = self.lesson_payload(
            quiz={
                'instructions': 'أجب عن الأسئلة التالية.',
                'maxAttempts': 4,
                'questionsCount': 1,
                'passScore': 75,
                'shuffleQuestions': False,
                'shuffleChoices': True,
                'questions': [{
                    'text': 'ما ناتج 2 + 2؟',
                    'explanation': 'جمع العددين ينتج أربعة.',
                    'choices': [
                        {'text': '4', 'correct': True},
                        {'text': '5', 'correct': False},
                    ],
                }],
            },
        )

        response = self.post_lesson(payload)

        self.assertEqual(response.status_code, 200, response.content)
        lesson = Lesson.objects.get(section=self.section, title='اختبار قصير')
        quiz = Quiz.objects.get(lesson=lesson)
        question = QuizQuestion.objects.get(quiz=quiz)
        self.assertEqual(quiz.instructions, 'أجب عن الأسئلة التالية.')
        self.assertEqual(quiz.max_attempts, 4)
        self.assertEqual(quiz.questions_count, 1)
        self.assertEqual(quiz.pass_score, 75)
        self.assertFalse(quiz.shuffle_questions)
        self.assertEqual(question.text, 'ما ناتج 2 + 2؟')
        self.assertEqual(question.explanation, 'جمع العددين ينتج أربعة.')
        self.assertEqual(
            list(question.choices.order_by('order').values_list('text', 'is_correct')),
            [('4', True), ('5', False)],
        )
        returned_quiz = response.json()['course']['syllabus'][0]['lessons'][0]['quiz']
        self.assertEqual(returned_quiz['questions'][0]['text'], 'ما ناتج 2 + 2؟')
        self.assertTrue(returned_quiz['questions'][0]['choices'][0]['correct'])


class TrainerPersistenceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000001',
            password='admin-password',
            full_name='مدير النظام',
            role=UserRole.ADMIN,
        )
        self.client.force_login(self.admin)
        self.save_url = reverse('dashboard:trainer-save')

    def trainer_payload(self, **overrides):
        payload = {
            'name': 'مدرب قاعدة البيانات',
            'handle': 'database-trainer',
            'specialty': 'تطوير البرمجيات',
            'password': 'Secure#Trainer2026',
            'rating': 4.8,
            'email': 'trainer@example.com',
            'phone': '1234567890',
            'status': 'active',
            'bio': 'نبذة المدرب',
            'linkedin': 'https://linkedin.com/in/database-trainer',
            'github': 'https://github.com/database-trainer',
            'avatar': '',
            'verified': True,
            'joined': '',
        }
        payload.update(overrides)
        return payload

    def post_json(self, url, payload):
        return self.client.post(url, json.dumps(payload), content_type='application/json')

    def test_create_and_update_trainer_persists_account_and_profile(self):
        response = self.post_json(self.save_url, self.trainer_payload())

        self.assertEqual(response.status_code, 201, response.content)
        trainer = User.objects.get(phone='1234567890')
        profile = Profile.objects.get(user=trainer)
        self.assertEqual(trainer.role, UserRole.TRAINER)
        self.assertEqual(trainer.handle, 'database-trainer')
        self.assertTrue(authenticate(phone='1234567890', password='Secure#Trainer2026'))
        self.assertEqual(profile.specialization, 'تطوير البرمجيات')
        self.assertEqual(profile.bio, 'نبذة المدرب')
        self.assertEqual(profile.trainer_rating, Decimal('4.8'))
        self.assertEqual(
            profile.social_links.get(platform=SocialPlatform.LINKEDIN).url,
            'https://linkedin.com/in/database-trainer',
        )
        self.assertEqual(
            profile.social_links.get(platform=SocialPlatform.GITHUB).url,
            'https://github.com/database-trainer',
        )

        update = self.trainer_payload(
            id=str(trainer.pk),
            name='اسم محدث',
            handle='updated-trainer',
            phone='0987654321',
            specialty='تحليل البيانات',
            rating=4.2,
            linkedin='',
        )
        update.pop('password')
        response = self.post_json(self.save_url, update)

        self.assertEqual(response.status_code, 200, response.content)
        trainer.refresh_from_db()
        profile.refresh_from_db()
        self.assertEqual(trainer.full_name, 'اسم محدث')
        self.assertEqual(trainer.phone, '0987654321')
        self.assertEqual(profile.specialization, 'تحليل البيانات')
        self.assertEqual(profile.trainer_rating, Decimal('4.2'))
        self.assertFalse(profile.social_links.filter(platform=SocialPlatform.LINKEDIN).exists())
        update['password'] = 'Changed#Trainer2026'
        response = self.post_json(self.save_url, update)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(authenticate(phone=trainer.phone, password='Secure#Trainer2026'))
        self.assertTrue(authenticate(phone=trainer.phone, password='Changed#Trainer2026'))

    def test_deactivating_trainer_keeps_account_and_owned_courses(self):
        trainer = User.objects.create_user(
            phone='1111111111',
            password='Secure#Trainer2026',
            full_name='مدرب نشط',
            role=UserRole.TRAINER,
        )
        course = Course.objects.create(owner=trainer, title='دورة المدرب')

        response = self.post_json(
            reverse('dashboard:trainer-status', args=[trainer.pk]),
            {'active': False},
        )

        self.assertEqual(response.status_code, 200, response.content)
        trainer.refresh_from_db()
        self.assertFalse(trainer.is_active)
        self.assertTrue(User.objects.filter(pk=trainer.pk).exists())
        self.assertTrue(Course.objects.filter(pk=course.pk, owner=trainer).exists())
        self.assertIsNone(authenticate(phone=trainer.phone, password='Secure#Trainer2026'))

    def test_status_url_template_accepts_a_trainer_id(self):
        trainer = User.objects.create_user(
            phone='4444444444',
            password='Secure#Trainer2026',
            full_name='مدرب الرابط',
            role=UserRole.TRAINER,
        )
        url_template = reverse('dashboard:trainer-status', args=['__ID__'])
        url = url_template.replace('__ID__', str(trainer.pk))

        response = self.post_json(url, {'active': False})

        self.assertEqual(response.status_code, 200, response.content)
        trainer.refresh_from_db()
        self.assertFalse(trainer.is_active)

    def test_uploaded_trainer_avatar_is_saved_to_media_storage(self):
        image_bytes = BytesIO()
        Image.new('RGB', (2, 2), color='blue').save(image_bytes, format='PNG')
        avatar = 'data:image/png;base64,' + base64.b64encode(image_bytes.getvalue()).decode('ascii')

        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.post_json(self.save_url, self.trainer_payload(avatar=avatar))

            self.assertEqual(response.status_code, 201, response.content)
            profile = Profile.objects.get(user__phone='1234567890')
            self.assertTrue(profile.avatar)
            self.assertTrue(profile.avatar.storage.exists(profile.avatar.name))

    def test_invalid_and_duplicate_values_are_rejected(self):
        User.objects.create_user(
            phone='1111111111',
            password='Secure#Trainer2026',
            full_name='مدرب موجود',
            role=UserRole.TRAINER,
            handle='existing-trainer',
        )

        response = self.post_json(
            self.save_url,
            self.trainer_payload(phone='1111111111', handle='existing-trainer'),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('phone', response.json()['fields'])
        self.assertIn('handle', response.json()['fields'])
        self.assertFalse(User.objects.filter(phone='1234567890').exists())

    def test_trainer_mutations_require_admin_access(self):
        trainer = User.objects.create_user(
            phone='2222222222',
            password='Secure#Trainer2026',
            full_name='مدرب',
            role=UserRole.TRAINER,
        )
        self.client.force_login(trainer)

        response = self.post_json(self.save_url, self.trainer_payload())

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(phone='1234567890').exists())


class PlatformSettingsAndBackupTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591999000',
            password='admin-password',
            full_name='مدير النظام',
            role=UserRole.ADMIN,
        )
        self.client.force_login(self.admin)

    def post_settings(self, payload):
        return self.client.post(
            reverse('dashboard:platform-settings'),
            data=json.dumps(payload),
            content_type='application/json',
        )

    def test_database_size_includes_sqlite_database_and_wal_files(self):
        from dashboard.views import _database_size_bytes

        with TemporaryDirectory() as directory:
            database_path = Path(directory) / 'database.sqlite3'
            database_path.write_bytes(b'database')
            Path(str(database_path) + '-wal').write_bytes(b'wal')
            with patch('dashboard.views.connection') as database_connection:
                database_connection.vendor = 'sqlite'
                database_connection.settings_dict = {'NAME': str(database_path)}

                self.assertEqual(_database_size_bytes(), len(b'databasewal'))

    def test_platform_settings_are_persisted_and_reject_removed_options(self):
        response = self.post_settings({
            'name': 'منصة جديدة',
            'tagline': 'نتعلم وننجز',
            'email': 'hello@example.com',
            'phone': '+970 59 1234567',
            'whatsapp': '970591234567',
            'website': 'https://example.com',
            'maintenance': False,
            'allowSignup': False,
            'brandPalette': 'emerald',
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['settings']['name'], 'منصة جديدة')
        stored = PlatformSettings.objects.get(pk=1).data
        self.assertEqual(stored['tagline'], 'نتعلم وننجز')
        self.assertFalse(stored['allowSignup'])
        self.assertEqual(stored['brandPalette'], 'emerald')
        self.assertEqual(
            self.client.get(reverse('dashboard:platform-settings')).json()['settings']['whatsapp'],
            '970591234567',
        )
        public_response = self.client.get(reverse('landing:home'))
        self.assertContains(public_response, 'منصة جديدة')
        self.assertContains(public_response, 'نتعلم وننجز')
        self.assertContains(public_response, 'https://example.com')
        self.assertContains(public_response, 'data-brand-palette="emerald"')

        panel_response = self.client.get(reverse('dashboard:home'))
        self.assertContains(panel_response, 'data-brand-palette="emerald"')
        self.assertGreater(panel_response.context['settings_summary']['databaseSizeBytes'], 0)
        self.assertEqual(panel_response.context['platform_settings']['brandPalette'], 'emerald')

        removed_option = self.post_settings({'commentsEnabled': False})
        self.assertEqual(removed_option.status_code, 400)
        self.assertNotIn('commentsEnabled', PlatformSettings.objects.get(pk=1).data)
        invalid_palette = self.post_settings({'brandPalette': ['ocean']})
        self.assertEqual(invalid_palette.status_code, 400)
        self.assertEqual(PlatformSettings.objects.get(pk=1).data['brandPalette'], 'emerald')

    def test_current_platform_colors_are_default_palette(self):
        response = self.client.get(reverse('dashboard:platform-settings'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['settings']['brandPalette'], 'current')
        panel_response = self.client.get(reverse('dashboard:home'))
        self.assertEqual(panel_response.context['platform_settings']['brandPalette'], 'current')

    def test_platform_settings_api_requires_admin(self):
        trainer = User.objects.create_user(
            phone='0591999001',
            password='trainer-password',
            full_name='مدرب',
            role=UserRole.TRAINER,
        )
        self.client.force_login(trainer)

        response = self.post_settings({'maintenance': True})

        self.assertEqual(response.status_code, 403)
        self.assertFalse(PlatformSettings.objects.filter(pk=1).exists())

    def test_maintenance_and_signup_switches_affect_public_routes(self):
        PlatformSettings.objects.create(
            pk=1,
            data={'maintenance': True, 'allowSignup': False},
        )

        self.client.logout()
        public_response = self.client.get(reverse('landing:home'))
        signup_response = self.client.get(reverse('users:signup'))
        self.assertEqual(public_response.status_code, 503)
        self.assertEqual(signup_response.status_code, 503)

        self.client.force_login(self.admin)
        self.assertEqual(self.client.get(reverse('dashboard:home')).status_code, 200)
        self.assertEqual(self.client.get(reverse('landing:home')).status_code, 200)

        PlatformSettings.objects.filter(pk=1).update(data={
            'maintenance': False,
            'allowSignup': False,
        })
        self.client.logout()
        signup_response = self.client.get(reverse('users:signup'))
        self.assertEqual(signup_response.status_code, 302)
        self.assertEqual(signup_response.url, reverse('landing:home'))

    def test_database_backup_excludes_post_records(self):
        Post.objects.create(owner=self.admin, content='يجب ألا تظهر في النسخة')

        response = self.client.get(reverse('dashboard:database-backup'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/zip')
        with ZipFile(BytesIO(b''.join(response.streaming_content))) as archive:
            manifest = json.loads(archive.read('database.json'))
        self.assertFalse(any(item['model'].startswith('posts.') for item in manifest['objects']))
        self.assertNotIn(b'posts.', json.dumps(manifest, ensure_ascii=False).encode('utf-8'))
        self.assertTrue(any(item['model'] == 'core.platformsettings' for item in manifest['objects']))
        self.assertTrue(any(item['model'] == 'users.user' for item in manifest['objects']))

    def test_database_backup_contains_uploaded_media(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            profile = Profile.objects.get(user=self.admin)
            profile.avatar.save('backup-avatar.png', ContentFile(b'image-data'))
            response = self.client.get(reverse('dashboard:database-backup'))

            with ZipFile(BytesIO(b''.join(response.streaming_content))) as archive:
                manifest = json.loads(archive.read('database.json'))
                media_name = profile.avatar.name
                self.assertIn(media_name, manifest['media'])
                self.assertEqual(archive.read('media/' + media_name), b'image-data')

    def test_backup_import_merges_missing_records_and_preserves_existing(self):
        from django.core import serializers

        existing_record = json.loads(serializers.serialize('json', [self.admin]))[0]
        existing_record['fields']['full_name'] = 'اسم من النسخة'
        incoming = User.objects.create_user(
            phone='0591999002',
            password='student-password',
            full_name='طالب مستعاد',
            role=UserRole.STUDENT,
        )
        incoming_record = json.loads(serializers.serialize('json', [incoming]))[0]
        User.objects.filter(pk=incoming.pk).delete()
        payload = {
            'format': 'data-center-platform',
            'version': 1,
            'objects': [existing_record, incoming_record],
            'media': [],
        }
        archive_bytes = BytesIO()
        with ZipFile(archive_bytes, 'w') as archive:
            archive.writestr('database.json', json.dumps(payload))
        backup_file = SimpleUploadedFile(
            'backup.zip',
            archive_bytes.getvalue(),
            content_type='application/zip',
        )

        response = self.client.post(
            reverse('dashboard:database-backup'),
            {'backup': backup_file},
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['added'], 1)
        self.assertEqual(response.json()['skipped'], 1)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.full_name, 'مدير النظام')
        self.assertTrue(User.objects.filter(pk=incoming.pk, full_name='طالب مستعاد').exists())

    def test_backup_import_rejects_unapproved_model_records(self):
        payload = {
            'format': 'data-center-platform',
            'version': 1,
            'objects': [{'model': 'posts.post', 'pk': 1, 'fields': {}}],
            'media': [],
        }
        archive_bytes = BytesIO()
        with ZipFile(archive_bytes, 'w') as archive:
            archive.writestr('database.json', json.dumps(payload))
        backup_file = SimpleUploadedFile('backup.zip', archive_bytes.getvalue())

        response = self.client.post(
            reverse('dashboard:database-backup'),
            {'backup': backup_file},
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Post.objects.exists())


class InPersonWorkshopTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0593000001',
            password='admin-password',
            full_name='مشرف الورشات',
            role=UserRole.ADMIN,
        )
        self.student = User.objects.create_user(
            phone='0593000002',
            password='student-password',
            full_name='طالب الورشة',
            role=UserRole.STUDENT,
        )
        self.trainer = User.objects.create_user(
            phone='0593000003',
            password='trainer-password',
            full_name='مدرب الورشة',
            role=UserRole.TRAINER,
        )
        self.save_url = reverse('dashboard:workshop-save')
        self.scan_url = reverse('dashboard:workshop-attendance-scan')

    def post_json(self, url, payload):
        return self.client.post(url, json.dumps(payload), content_type='application/json')

    def workshop_payload(self, **overrides):
        payload = {
            'title': 'ورشة التصميم الرقمي',
            'description': 'تدريب عملي',
            'startsAt': (timezone.now() + timedelta(days=1)).replace(microsecond=0).isoformat(),
            'durationMinutes': 90,
            'location': 'غزة',
        }
        payload.update(overrides)
        return payload

    def create_workshop(self):
        self.client.force_login(self.admin)
        response = self.post_json(self.save_url, self.workshop_payload())
        self.assertEqual(response.status_code, 201, response.content)
        return InPersonWorkshop.objects.get(pk=response.json()['workshop']['id'])

    def test_admin_can_create_workshop_and_panel_receives_qr_code(self):
        workshop = self.create_workshop()

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context['admin_workshops_json']), 1)
        self.assertTrue(response.context['admin_workshops_json'][0]['qrImage'].startswith('data:image/png;base64,'))
        self.assertEqual(response.context['admin_workshops_json'][0]['id'], workshop.pk)
        self.assertFalse(workshop.attendance_open)

    def test_workshop_admin_endpoints_reject_non_admins(self):
        self.client.force_login(self.student)

        create_response = self.post_json(self.save_url, self.workshop_payload())
        self.assertEqual(create_response.status_code, 403)

        workshop = InPersonWorkshop.objects.create(
            title='ورشة خاصة',
            starts_at=timezone.now(),
            duration_minutes=60,
        )
        status_response = self.post_json(
            reverse('dashboard:workshop-attendance-status', args=[workshop.pk]),
            {'open': True},
        )
        self.assertEqual(status_response.status_code, 403)
        workshop.refresh_from_db()
        self.assertFalse(workshop.attendance_open)

    def test_scan_requires_login_student_role_and_open_attendance(self):
        workshop = self.create_workshop()

        self.client.force_login(self.student)
        closed = self.post_json(self.scan_url, {'token': str(workshop.qr_token)})
        self.assertEqual(closed.status_code, 409)
        self.assertFalse(WorkshopAttendance.objects.exists())

        workshop.attendance_open = True
        workshop.save(update_fields=['attendance_open'])
        invalid = self.post_json(self.scan_url, {'token': 'not-a-uuid'})
        self.assertEqual(invalid.status_code, 400)
        self.assertFalse(WorkshopAttendance.objects.exists())

        self.client.force_login(self.trainer)
        denied = self.post_json(self.scan_url, {'token': str(workshop.qr_token)})
        self.assertEqual(denied.status_code, 403)
        self.assertFalse(WorkshopAttendance.objects.exists())

    def test_scan_rejects_anonymous_and_inactive_students(self):
        workshop = self.create_workshop()
        workshop.attendance_open = True
        workshop.save(update_fields=['attendance_open'])

        self.client.logout()
        anonymous = self.post_json(self.scan_url, {'token': str(workshop.qr_token)})
        self.assertEqual(anonymous.status_code, 401)

        self.student.is_active = False
        self.student.save(update_fields=['is_active'])
        self.client.force_login(self.student)
        inactive = self.post_json(self.scan_url, {'token': str(workshop.qr_token)})
        self.assertEqual(inactive.status_code, 401)
        self.assertFalse(WorkshopAttendance.objects.exists())

    def test_scan_records_attendance_once_and_issues_profile_certificate(self):
        workshop = self.create_workshop()
        workshop.attendance_open = True
        workshop.save(update_fields=['attendance_open'])
        self.client.force_login(self.student)

        first = self.post_json(self.scan_url, {'token': str(workshop.qr_token)})
        second = self.post_json(self.scan_url, {'token': str(workshop.qr_token)})

        self.assertEqual(first.status_code, 201, first.content)
        self.assertFalse(first.json()['alreadyRegistered'])
        self.assertEqual(second.status_code, 200, second.content)
        self.assertTrue(second.json()['alreadyRegistered'])
        self.assertEqual(WorkshopAttendance.objects.filter(workshop=workshop, student=self.student).count(), 1)
        self.assertEqual(WorkshopCertificate.objects.filter(attendance__workshop=workshop).count(), 1)
        certificate = WorkshopCertificate.objects.get(attendance__student=self.student)
        self.assertEqual(certificate.workshop_title, workshop.title)
        self.assertEqual(certificate.student_name, self.student.display_name)
        self.assertEqual(certificate.duration_minutes, workshop.duration_minutes)
        self.assertEqual(certificate.code, first.json()['certificate']['code'])

        profile = self.client.get(reverse('accounts:profile', args=[self.student.handle]))
        self.assertEqual(profile.status_code, 200)
        self.assertNotContains(profile, 'vendor/jsQR.js')
        self.assertNotContains(profile, 'workshop-scanner.js')
        workshop_certs = [
            item for item in profile.context['profile_certs_json']
            if item.get('workshop')
        ]
        self.assertEqual(len(workshop_certs), 1)
        self.assertEqual(workshop_certs[0]['title'], workshop.title)
        self.assertEqual(workshop_certs[0]['duration'], workshop.duration_minutes)

        self.client.force_login(self.admin)
        edited = self.post_json(
            self.save_url,
            self.workshop_payload(
                id=workshop.pk,
                title='عنوان محدث',
                durationMinutes=120,
            ),
        )
        self.assertEqual(edited.status_code, 200, edited.content)
        certificate.refresh_from_db()
        self.assertEqual(certificate.workshop_title, 'ورشة التصميم الرقمي')
        self.assertEqual(certificate.duration_minutes, 90)

    def test_regenerating_qr_revokes_old_code_and_closes_attendance(self):
        workshop = self.create_workshop()
        workshop.attendance_open = True
        workshop.save(update_fields=['attendance_open'])
        old_token = str(workshop.qr_token)

        rotated = self.post_json(
            reverse('dashboard:workshop-regenerate-qr', args=[workshop.pk]),
            {},
        )

        self.assertEqual(rotated.status_code, 200, rotated.content)
        workshop.refresh_from_db()
        self.assertNotEqual(str(workshop.qr_token), old_token)
        self.assertFalse(workshop.attendance_open)
        self.client.force_login(self.student)
        old_code = self.post_json(self.scan_url, {'token': old_token})
        new_code_while_closed = self.post_json(
            self.scan_url,
            {'token': str(workshop.qr_token)},
        )
        self.assertEqual(old_code.status_code, 400)
        self.assertEqual(new_code_while_closed.status_code, 409)

    def test_deleting_workshop_removes_attendance_and_issued_certificate(self):
        workshop = self.create_workshop()
        workshop.attendance_open = True
        workshop.save(update_fields=['attendance_open'])
        self.client.force_login(self.student)
        response = self.post_json(self.scan_url, {'token': str(workshop.qr_token)})
        self.assertEqual(response.status_code, 201, response.content)

        self.client.force_login(self.admin)
        deleted = self.post_json(
            reverse('dashboard:workshop-delete', args=[workshop.pk]),
            {},
        )

        self.assertEqual(deleted.status_code, 200, deleted.content)
        self.assertFalse(InPersonWorkshop.objects.filter(pk=workshop.pk).exists())
        self.assertFalse(WorkshopAttendance.objects.filter(workshop=workshop).exists())
        self.assertFalse(WorkshopCertificate.objects.filter(attendance__workshop=workshop).exists())
