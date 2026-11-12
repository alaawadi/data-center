import hashlib
import json
import base64
import re
from decimal import Decimal
from datetime import timedelta
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from zipfile import ZipFile

from django.contrib.auth import authenticate
from django.contrib.sessions.models import Session
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
    CourseRegistrationPayment,
    CourseRegistrationRequest,
    CourseRegistrationRequestStatus,
    CourseSection,
    CourseStatus,
    CourseType,
    InPersonCourseKind,
    InPersonCourseCohort,
    InPersonWorkshop,
    Lesson,
    LessonType,
    ManualCertificate,
    ManualCertificateStatus,
    OnlineCourseInvoice,
    OnlineCourseInvoicePayment,
    Quiz,
    QuizChoice,
    QuizQuestion,
    StudentPointTransaction,
    StudentReferral,
    StudentReferralLink,
    TrainingCategory,
    WorkshopAttendance,
    WorkshopCertificate,
)
from projects.models import Project, ProjectComment, ProjectStatus, ProjectVisibility
from posts.models import Post, PostTag
from users.models import (
    DeviceSession,
    FreelancerCategory,
    Profile,
    SocialLink,
    SocialPlatform,
    StudentSetupLink,
    User,
    UserRole,
)


class AdminCourseRegistrationRequestTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000091',
            password='admin-password',
            full_name='مدير طلبات التسجيل',
            role=UserRole.ADMIN,
        )
        self.trainer = User.objects.create_user(
            phone='0591000092',
            password='trainer-password',
            full_name='مدرب الدورة',
            role=UserRole.TRAINER,
        )
        self.course = Course.objects.create(
            owner=self.trainer,
            title='دورة وجاهية للتصميم',
            course_type=CourseType.IN_PERSON,
            status=CourseStatus.PUBLISHED,
        )
        self.registration = CourseRegistrationRequest.objects.create(
            course=self.course,
            full_name='محمد أحمد علي حسن',
            phone='+970594567891',
            address='غزة - الرمال',
            specialty='التصميم الجرافيكي',
            student_status='graduate',
            status=CourseRegistrationRequestStatus.NEW,
        )
        self.project = Project.objects.create(
            owner=self.trainer,
            title='مشروع تجريبي',
        )

    def test_admin_panel_lists_inperson_course_registration_requests(self):
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-hide-pwa-install')
        self.assertEqual(response.context['admin_current_user_name'], self.admin.display_name)
        self.assertContains(response, 'id="admin-current-user-name"')
        self.assertContains(response, json.dumps(self.admin.display_name))
        self.assertEqual(
            response.context['course_registration_requests_json'],
            [{
                'id': str(self.registration.pk),
                'courseId': self.course.slug,
                'courseTitle': self.course.title,
                'coursePrice': '',
                'currency': self.course.currency,
                'fullName': self.registration.full_name,
                'phone': self.registration.phone,
                'address': self.registration.address,
                'specialty': self.registration.specialty,
                'governorate': self.registration.governorate,
                'studyYear': self.registration.study_year,
                'studentStatus': self.registration.student_status,
                'cohortId': '',
                'cohortName': '',
                'studentId': '',
                'accountReady': False,
                'hasLoggedIn': False,
                'sourceStudentName': '',
                'status': self.registration.status,
                'paidAmount': '0.00',
                'coursePriceAmount': '',
                'discountAmount': '0.00',
                'totalAmount': '',
                'remainingAmount': '',
                'payments': [],
                'createdAt': self.registration.created_at.isoformat(),
                'setupLinkExpiresAt': '',
            }],
        )
        self.assertContains(response, 'admin-course-registration-requests-data')

    def test_registration_request_payload_marks_student_after_first_login(self):
        student = User.objects.create_user(
            phone='0591000093',
            password='student-password',
            full_name='طالب طلب التسجيل',
            role=UserRole.STUDENT,
        )
        self.registration.student = student
        self.registration.save(update_fields=['student'])
        self.client.force_login(self.admin)

        before_login = self.client.get(reverse('dashboard:home'))
        self.assertFalse(before_login.context['course_registration_requests_json'][0]['hasLoggedIn'])

        student.last_login = timezone.now()
        student.save(update_fields=['last_login'])
        after_login = self.client.get(reverse('dashboard:home'))

        self.assertTrue(after_login.context['course_registration_requests_json'][0]['hasLoggedIn'])

    def test_admin_panel_inperson_students_payload_includes_confirmed_student_payments(self):
        self.course.price = '100.00'
        self.course.save(update_fields=['price'])
        self.registration.status = CourseRegistrationRequestStatus.ACCEPTED
        self.registration.save(update_fields=['status'])
        CourseRegistrationPayment.objects.create(
            registration_request=self.registration,
            amount='30.00',
        )
        online_course = Course.objects.create(
            owner=self.trainer,
            title='دورة أونلاين',
            course_type=CourseType.ONLINE,
            status=CourseStatus.PUBLISHED,
        )
        CourseRegistrationRequest.objects.create(
            course=online_course,
            full_name='طالب أونلاين',
            phone='+970564567890',
            address='غزة',
            specialty='التصميم',
            student_status='student',
            status=CourseRegistrationRequestStatus.ACCEPTED,
        )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        requests = response.context['course_registration_requests_json']
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]['status'], CourseRegistrationRequestStatus.ACCEPTED)
        self.assertEqual(requests[0]['paidAmount'], '30.00')
        self.assertEqual(requests[0]['remainingAmount'], '70.00')
        self.assertEqual(len(requests[0]['payments']), 1)

    def test_admin_panel_keeps_legacy_inperson_balance_without_showing_fake_payment_details(self):
        self.course.price = '100.00'
        self.course.save(update_fields=['price'])
        self.registration.status = CourseRegistrationRequestStatus.ACCEPTED
        self.registration.save(update_fields=['status'])
        CourseRegistrationPayment.objects.create(
            registration_request=self.registration,
            amount='50.00',
            is_historical_balance=True,
        )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        request = response.context['course_registration_requests_json'][0]
        self.assertEqual(request['paidAmount'], '50.00')
        self.assertEqual(request['remainingAmount'], '50.00')
        self.assertEqual(request['payments'], [])

    def test_admin_panel_shows_referring_student_for_course_registration(self):
        student = User.objects.create_user(
            phone='0591000093',
            password='student-password',
            full_name='طالب مُحيل',
            role=UserRole.STUDENT,
        )
        referral_link = StudentReferralLink.objects.create(
            referrer=student,
            course=self.course,
        )
        self.registration.referral_link = referral_link
        self.registration.save(update_fields=['referral_link'])
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.context['course_registration_requests_json'][0]['sourceStudentName'],
            student.display_name,
        )

    def test_course_editor_from_dashboard_uses_admin_layout_for_create_and_edit(self):
        def embedded_json(response, element_id):
            match = re.search(
                rf'<script id="{re.escape(element_id)}" type="application/json">(.*?)</script>',
                response.content.decode(response.charset),
                re.DOTALL,
            )
            self.assertIsNotNone(match, f'Missing {element_id} JSON data')
            return json.loads(match.group(1))

        active_category = TrainingCategory.objects.create(name='تحليل البيانات')
        inactive_category = TrainingCategory.objects.create(
            name='التصميم',
            is_active=False,
        )
        self.client.force_login(self.admin)

        create_response = self.client.get(reverse('dashboard:course-editor-create'))

        self.assertEqual(create_response.status_code, 200)
        self.assertTemplateUsed(create_response, 'dashboard/course_editor.html')
        self.assertContains(create_response, 'id="admSide"')
        self.assertContains(create_response, 'id="edTitle"')
        self.assertContains(create_response, 'data-admin-course-editor="true"')
        self.assertContains(create_response, 'id="edDraftBtn"')
        self.assertContains(create_response, 'data-hide-pwa-install')
        self.assertContains(create_response, 'id="editor-object-data"')
        self.assertNotContains(create_response, 'class="header"')
        self.assertNotContains(create_response, 'id="siteFooter"')
        self.assertEqual(len(create_response.context['courses_json']), 1)
        self.assertEqual(create_response.context['editor_course_json'], [])
        self.assertCountEqual(
            create_response.context['editor_training_categories_json'],
            [active_category.name, inactive_category.name],
        )
        self.assertCountEqual(
            embedded_json(create_response, 'training-categories-data'),
            [active_category.name, inactive_category.name],
        )
        self.assertContains(create_response, 'admin-courses-data')

        dashboard_response = self.client.get(reverse('dashboard:home'))
        self.assertContains(dashboard_response, 'id="admin-training-categories-data"')
        self.assertCountEqual(
            [category['name'] for category in embedded_json(
                dashboard_response, 'admin-training-categories-data'
            )],
            [active_category.name, inactive_category.name],
        )

        ajax_response = self.client.get(
            reverse('dashboard:course-editor-create'),
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(ajax_response.status_code, 200)
        self.assertCountEqual(
            ajax_response.context['editor_training_categories_json'],
            [active_category.name, inactive_category.name],
        )
        self.assertCountEqual(
            embedded_json(ajax_response, 'training-categories-data'),
            [active_category.name, inactive_category.name],
        )

        edit_response = self.client.get(
            reverse('dashboard:course-editor-edit', kwargs={'pk': self.course.slug})
        )

        self.assertEqual(edit_response.status_code, 200)
        self.assertTemplateUsed(edit_response, 'dashboard/course_editor.html')
        self.assertEqual(edit_response.context['courses_json'][0]['id'], self.course.slug)
        self.assertEqual(edit_response.context['editor_course_json'][0]['id'], self.course.slug)
        self.assertContains(edit_response, 'admin-courses-data')
        self.assertContains(edit_response, 'id="editor-object-data"')
        self.assertContains(edit_response, 'id="lblCourseDescription"')
        self.assertContains(edit_response, 'aria-labelledby="lblCourseDescription"')
        self.assertContains(edit_response, f'href="{reverse("dashboard:home")}#courses"')

    def test_dashboard_course_editor_is_restricted_to_admins(self):
        self.client.force_login(self.trainer)

        response = self.client.get(reverse('dashboard:course-editor-create'))

        self.assertEqual(response.status_code, 403)

    def test_project_editor_from_dashboard_uses_admin_layout_for_create_and_edit(self):
        self.client.force_login(self.admin)

        create_response = self.client.get(reverse('dashboard:project-editor-create'))

        self.assertEqual(create_response.status_code, 200)
        self.assertTemplateUsed(create_response, 'dashboard/project_editor.html')
        self.assertContains(create_response, 'id="admSide"')
        self.assertContains(create_response, 'id="edTitle"')
        self.assertContains(create_response, 'data-admin-project-editor="true"')
        self.assertContains(create_response, 'data-hide-pwa-install')
        self.assertContains(create_response, 'id="editor-object-data"')
        self.assertContains(create_response, 'id="edProjectGalleryBox"')
        self.assertContains(create_response, 'id="edProjectGalleryInput"')
        self.assertNotContains(create_response, 'class="header"')
        self.assertNotContains(create_response, 'id="siteFooter"')
        self.assertEqual(create_response.context['projects_json'], [])

        edit_response = self.client.get(
            reverse('dashboard:project-editor-edit', kwargs={'pk': self.project.slug})
        )

        self.assertEqual(edit_response.status_code, 200)
        self.assertTemplateUsed(edit_response, 'dashboard/project_editor.html')
        self.assertEqual(edit_response.context['projects_json'][0]['id'], self.project.slug)
        self.assertContains(edit_response, 'id="editor-object-data"')
        self.assertContains(edit_response, 'id="edProjectGalleryBox"')
        self.assertContains(edit_response, 'id="edProjectGalleryInput"')
        self.assertEqual(
            edit_response.context['admin_project_owner_id'],
            str(self.trainer.pk),
        )
        self.assertContains(edit_response, f'href="{reverse("dashboard:home")}#projects"')
        self.assertContains(edit_response, 'admin-courses-data')

    def test_dashboard_project_editor_is_restricted_to_admins(self):
        self.client.force_login(self.trainer)

        response = self.client.get(reverse('dashboard:project-editor-create'))

        self.assertEqual(response.status_code, 403)

    def test_dashboard_editor_ajax_returns_only_editor_fragment(self):
        self.client.force_login(self.admin)
        routes = (
            ('dashboard:course-editor-create', {}),
            ('dashboard:course-editor-edit', {'pk': self.course.slug}),
            ('dashboard:project-editor-create', {}),
            ('dashboard:project-editor-edit', {'pk': self.project.slug}),
        )

        for route_name, kwargs in routes:
            with self.subTest(route=route_name, kwargs=kwargs):
                response = self.client.get(
                    reverse(route_name, kwargs=kwargs),
                    HTTP_X_REQUESTED_WITH='XMLHttpRequest',
                )

                self.assertEqual(response.status_code, 200)
                self.assertTemplateUsed(response, 'dashboard/editor_fragment_base.html')
                self.assertContains(response, 'id="edTitle"')
                self.assertContains(response, 'id="editor-object-data"')
                self.assertContains(response, 'id="edBack"')
                self.assertContains(response, 'id="edStatus"')
                self.assertContains(response, 'id="edPreviewBtn"')
                self.assertContains(response, 'id="edDraftBtn"')
                self.assertContains(response, 'id="edPublishBtn"')
                self.assertContains(response, 'training-categories-data')
                if 'project-editor' in route_name:
                    self.assertContains(response, 'id="edProjectGalleryBox"')
                    self.assertContains(response, 'id="edProjectGalleryInput"')
                self.assertNotContains(response, 'id="admSide"')
                self.assertNotContains(response, 'admin-projects-data')
                self.assertNotContains(response, 'admin-course-progress-data')
                full_page_response = self.client.get(reverse(route_name, kwargs=kwargs))
                self.assertLess(len(response.content), len(full_page_response.content))

    def test_dashboard_courses_context_includes_all_courses_after_refresh(self):
        for index in range(12):
            Course.objects.create(
                owner=self.trainer,
                title=f'دورة اختبار إضافية {index}',
                course_type=CourseType.ONLINE,
            )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context['courses_json']), 13)
        self.assertContains(response, 'admin-courses-data')

    def test_admin_can_add_registration_request_for_published_inperson_course(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse('dashboard:course-registration-request-save'),
            data=json.dumps({
                'courseId': self.course.slug,
                'fullName': '  محمد   أحمد علي  ',
                'phone': '+970123456789',
                'address': 'غزة',
                'specialty': 'التصميم',
                'governorate': 'online',
                'studyYear': 3,
                'studentStatus': 'student',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        request = CourseRegistrationRequest.objects.get(pk=response.json()['request']['id'])
        self.assertEqual(request.course, self.course)
        self.assertEqual(request.cohort.number, 1)
        self.assertEqual(request.full_name, 'محمد أحمد علي')
        self.assertEqual(request.study_year, 3)
        self.assertEqual(request.governorate, 'online')
        self.assertEqual(response.json()['request']['governorate'], 'online')
        self.assertEqual(response.json()['request']['studyYear'], 3)
        self.assertEqual(request.status, CourseRegistrationRequestStatus.NEW)

    def test_admin_can_add_graduate_registration_request_without_study_year(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse('dashboard:course-registration-request-save'),
            data=json.dumps({
                'courseId': self.course.slug,
                'fullName': 'ليلى أحمد محمد',
                'phone': '+970123456789',
                'address': 'غزة',
                'specialty': 'التصميم',
                'governorate': 'central',
                'studyYear': None,
                'studentStatus': 'graduate',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        registration = CourseRegistrationRequest.objects.get(
            pk=response.json()['request']['id'],
        )
        self.assertIsNone(registration.study_year)
        self.assertIsNone(response.json()['request']['studyYear'])

    def test_inperson_course_activation_closes_and_starts_numbered_cohorts(self):
        self.client.force_login(self.admin)
        status_url = reverse('dashboard:course-status', kwargs={'pk': self.course.pk})

        first_response = self.client.post(
            status_url,
            data=json.dumps({'active': True}),
            content_type='application/json',
        )

        self.assertEqual(first_response.status_code, 200)
        first_cohort = InPersonCourseCohort.objects.get(course=self.course)
        self.assertEqual(first_cohort.number, 1)
        self.assertIsNone(first_cohort.ended_at)
        self.assertEqual(first_response.json()['cohort']['name'], '001')

        close_response = self.client.post(
            status_url,
            data=json.dumps({'active': False}),
            content_type='application/json',
        )

        self.assertEqual(close_response.status_code, 200)
        first_cohort.refresh_from_db()
        self.assertIsNotNone(first_cohort.ended_at)

        second_response = self.client.post(
            status_url,
            data=json.dumps({'active': True}),
            content_type='application/json',
        )

        self.assertEqual(second_response.status_code, 200)
        second_cohort = InPersonCourseCohort.objects.get(course=self.course, number=2)
        self.assertIsNone(second_cohort.ended_at)
        self.assertEqual(second_response.json()['cohort']['name'], '002')

    def test_admin_can_confirm_registration_request(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse(
                'dashboard:course-registration-request-confirm',
                kwargs={'pk': self.registration.pk},
            ),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['request']['status'], CourseRegistrationRequestStatus.ACCEPTED)
        self.assertEqual(response.json()['request']['courseId'], self.course.slug)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, CourseRegistrationRequestStatus.ACCEPTED)
        self.assertFalse(
            StudentPointTransaction.objects.filter(
                registration_request=self.registration,
            ).exists(),
        )

    def test_registration_status_cycles_in_order_and_acceptance_creates_student(self):
        self.client.force_login(self.admin)
        status_url = reverse(
            'dashboard:course-registration-request-status',
            kwargs={'pk': self.registration.pk},
        )

        for expected_status in (
            CourseRegistrationRequestStatus.CONTACTED,
            CourseRegistrationRequestStatus.ACCEPTED,
            CourseRegistrationRequestStatus.REJECTED,
            CourseRegistrationRequestStatus.NEW,
        ):
            response = self.client.post(
                status_url,
                data=json.dumps({'status': expected_status}),
                content_type='application/json',
            )
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(response.json()['request']['status'], expected_status)

        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, CourseRegistrationRequestStatus.NEW)
        self.assertEqual(self.registration.student.phone, '0594567891')
        self.assertTrue(Profile.objects.filter(user=self.registration.student).exists())
        self.assertTrue(StudentSetupLink.objects.filter(user=self.registration.student).exists())

    def test_registration_status_endpoint_only_accepts_the_next_cycle_status(self):
        self.client.force_login(self.admin)
        status_url = reverse(
            'dashboard:course-registration-request-status',
            kwargs={'pk': self.registration.pk},
        )

        response = self.client.post(
            status_url,
            data=json.dumps({'status': CourseRegistrationRequestStatus.ACCEPTED}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 409)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, CourseRegistrationRequestStatus.NEW)
        self.assertFalse(User.objects.filter(phone='0594567891').exists())

    def test_confirming_registration_creates_student_profile_and_private_setup_link(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse(
                'dashboard:course-registration-request-confirm',
                kwargs={'pk': self.registration.pk},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        student = User.objects.get(phone='0594567891')
        self.assertEqual(student.role, UserRole.STUDENT)
        self.assertFalse(student.has_usable_password())
        self.assertTrue(Profile.objects.filter(user=student).exists())
        self.assertEqual(student.profile.whatsapp, self.registration.phone)
        self.assertEqual(student.profile.education_stage, 'graduate')
        setup_link = StudentSetupLink.objects.get(user=student)
        returned = response.json()['request']
        self.assertIn('setupUrl', returned)
        self.assertTrue(returned['setupQrImage'].startswith('data:image/png;base64,'))
        self.assertEqual(
            setup_link.token_hash,
            hashlib.sha256(returned['setupUrl'].rstrip('/').split('/')[-1].encode()).hexdigest(),
        )
        self.assertNotIn('token_hash', returned)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.student, student)

    def test_confirming_registration_accepts_plus_972_phone_prefix(self):
        self.registration.phone = '+972594567891'
        self.registration.save(update_fields=['phone'])
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse(
                'dashboard:course-registration-request-confirm',
                kwargs={'pk': self.registration.pk},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        student = User.objects.get(phone='0594567891')
        self.assertTrue(Profile.objects.filter(user=student).exists())
        self.assertEqual(student.profile.whatsapp, '+972594567891')
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.student, student)

    def test_reconfirming_registration_does_not_duplicate_student_or_reveal_existing_token(self):
        self.client.force_login(self.admin)
        confirm_url = reverse(
            'dashboard:course-registration-request-confirm',
            kwargs={'pk': self.registration.pk},
        )

        first_response = self.client.post(confirm_url)
        token_hash = StudentSetupLink.objects.get().token_hash
        second_response = self.client.post(confirm_url)

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertNotIn('setupUrl', second_response.json()['request'])
        self.assertEqual(User.objects.filter(phone='0594567891').count(), 1)
        self.assertEqual(StudentSetupLink.objects.get().token_hash, token_hash)

    def test_registrations_with_the_same_phone_reuse_the_student_account(self):
        self.client.force_login(self.admin)
        confirm_url = reverse(
            'dashboard:course-registration-request-confirm',
            kwargs={'pk': self.registration.pk},
        )
        self.client.post(confirm_url)
        student = User.objects.get(phone='0594567891')
        another_registration = CourseRegistrationRequest.objects.create(
            course=self.course,
            full_name='محمد أحمد علي حسن',
            phone=self.registration.phone,
            address=self.registration.address,
            specialty=self.registration.specialty,
            student_status='student',
        )

        response = self.client.post(
            reverse(
                'dashboard:course-registration-request-confirm',
                kwargs={'pk': another_registration.pk},
            ),
        )

        self.assertEqual(response.status_code, 200, response.content)
        another_registration.refresh_from_db()
        self.assertEqual(another_registration.student, student)
        self.assertEqual(User.objects.filter(phone='0594567891').count(), 1)
        self.assertNotIn('setupUrl', response.json()['request'])

    def test_confirmation_rejects_a_phone_outside_the_login_format(self):
        self.registration.phone = '+970123456789'
        self.registration.save(update_fields=['phone'])
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse(
                'dashboard:course-registration-request-confirm',
                kwargs={'pk': self.registration.pk},
            ),
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(phone='0123456789').exists())
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, CourseRegistrationRequestStatus.NEW)

    def test_setup_link_can_be_reissued_and_invalidates_the_previous_link(self):
        self.client.force_login(self.admin)
        confirm_url = reverse(
            'dashboard:course-registration-request-confirm',
            kwargs={'pk': self.registration.pk},
        )
        initial = self.client.post(confirm_url).json()['request']
        old_token = initial['setupUrl'].rstrip('/').split('/')[-1]
        issue_url = reverse(
            'dashboard:course-registration-request-setup-link',
            kwargs={'pk': self.registration.pk},
        )

        reissued = self.client.post(issue_url)

        self.assertEqual(reissued.status_code, 200, reissued.content)
        new_payload = reissued.json()['request']
        new_token = new_payload['setupUrl'].rstrip('/').split('/')[-1]
        self.assertNotEqual(new_token, old_token)
        self.assertEqual(
            StudentSetupLink.objects.get().token_hash,
            hashlib.sha256(new_token.encode()).hexdigest(),
        )
        self.assertEqual(
            self.client.get(reverse('users:student-setup', kwargs={'token': old_token})).status_code,
            410,
        )
        self.assertEqual(
            self.client.get(reverse('users:student-setup', kwargs={'token': new_token})).status_code,
            200,
        )

    def test_confirmation_does_not_claim_a_phone_owned_by_a_non_student(self):
        User.objects.create_user(
            phone='0594567891',
            password='trainer-password',
            full_name='مدرب آخر',
            role=UserRole.TRAINER,
        )
        self.client.force_login(self.admin)
        course = Course.objects.create(
            owner=trainer,
            title='دورة سابقة منشورة',
            status=CourseStatus.PUBLISHED,
        )

        response = self.client.post(
            reverse(
                'dashboard:course-registration-request-confirm',
                kwargs={'pk': self.registration.pk},
            ),
        )

        self.assertEqual(response.status_code, 400)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, CourseRegistrationRequestStatus.NEW)
        self.assertIsNone(self.registration.student_id)

    def test_admin_can_edit_inperson_student_and_linked_account_details(self):
        self.client.force_login(self.admin)
        confirm_url = reverse(
            'dashboard:course-registration-request-confirm',
            kwargs={'pk': self.registration.pk},
        )
        self.client.post(confirm_url)
        student = User.objects.get(phone='0594567891')
        update_url = reverse(
            'dashboard:course-registration-request-update',
            kwargs={'pk': self.registration.pk},
        )

        response = self.client.post(
            update_url,
            data=json.dumps({
                'fullName': 'أحمد محمد علي حسن',
                'phone': '+972564567890',
                'address': 'غزة - النصر',
                'specialty': 'تطوير الويب',
                'governorate': 'central',
                'studyYear': 4,
                'studentStatus': 'student',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.registration.refresh_from_db()
        student.refresh_from_db()
        student.profile.refresh_from_db()
        self.assertEqual(self.registration.full_name, 'أحمد محمد علي حسن')
        self.assertEqual(self.registration.phone, '+972564567890')
        self.assertEqual(self.registration.address, 'غزة - النصر')
        self.assertEqual(self.registration.specialty, 'تطوير الويب')
        self.assertEqual(self.registration.governorate, 'central')
        self.assertEqual(self.registration.study_year, 4)
        self.assertEqual(student.full_name, 'أحمد محمد علي حسن')
        self.assertEqual(student.phone, '0564567890')
        self.assertEqual(student.profile.whatsapp, '+972564567890')
        self.assertEqual(response.json()['request']['fullName'], 'أحمد محمد علي حسن')

    def test_admin_can_edit_unaccepted_registration_request_details(self):
        self.client.force_login(self.admin)
        update_url = reverse(
            'dashboard:course-registration-request-update',
            kwargs={'pk': self.registration.pk},
        )

        response = self.client.post(
            update_url,
            data=json.dumps({
                'fullName': 'أحمد محمد علي حسن',
                'phone': '+972564567890',
                'address': 'غزة - النصر',
                'specialty': 'تطوير الويب',
                'governorate': 'online',
                'studyYear': 5,
                'studentStatus': 'student',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, CourseRegistrationRequestStatus.NEW)
        self.assertIsNone(self.registration.student_id)
        self.assertEqual(self.registration.full_name, 'أحمد محمد علي حسن')
        self.assertEqual(self.registration.phone, '+972564567890')
        self.assertEqual(self.registration.address, 'غزة - النصر')
        self.assertEqual(self.registration.specialty, 'تطوير الويب')
        self.assertEqual(self.registration.governorate, 'online')
        self.assertEqual(self.registration.study_year, 5)
        self.assertEqual(self.registration.student_status, 'student')

    def test_editing_registration_as_accepted_creates_student_and_setup_link(self):
        self.client.force_login(self.admin)
        update_url = reverse(
            'dashboard:course-registration-request-update',
            kwargs={'pk': self.registration.pk},
        )

        response = self.client.post(
            update_url,
            data=json.dumps({
                'fullName': self.registration.full_name,
                'phone': self.registration.phone,
                'address': self.registration.address,
                'specialty': self.registration.specialty,
                'studentStatus': self.registration.student_status,
                'status': CourseRegistrationRequestStatus.ACCEPTED,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.status, CourseRegistrationRequestStatus.ACCEPTED)
        self.assertIsNotNone(self.registration.student_id)
        self.assertTrue(Profile.objects.filter(user=self.registration.student).exists())
        self.assertTrue(StudentSetupLink.objects.filter(user=self.registration.student).exists())
        self.assertEqual(response.json()['request']['status'], CourseRegistrationRequestStatus.ACCEPTED)
        self.assertIn('setupUrl', response.json()['request'])

    def test_editing_inperson_student_rejects_phone_already_used_by_another_account(self):
        self.client.force_login(self.admin)
        self.client.post(reverse(
            'dashboard:course-registration-request-confirm',
            kwargs={'pk': self.registration.pk},
        ))
        User.objects.create_user(
            phone='0564567890',
            password='other-password',
            full_name='طالب آخر',
            role=UserRole.STUDENT,
        )

        response = self.client.post(
            reverse(
                'dashboard:course-registration-request-update',
                kwargs={'pk': self.registration.pk},
            ),
            data=json.dumps({
                'fullName': self.registration.full_name,
                'phone': '+972564567890',
                'address': self.registration.address,
                'specialty': self.registration.specialty,
                'studentStatus': self.registration.student_status,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 409)
        self.registration.refresh_from_db()
        self.assertEqual(self.registration.phone, '+970594567891')

    def test_admin_can_add_multiple_payments_and_cannot_exceed_remaining_amount(self):
        self.course.price = '120.00'
        self.course.save(update_fields=['price'])
        self.registration.status = CourseRegistrationRequestStatus.ACCEPTED
        self.registration.save(update_fields=['status'])
        self.client.force_login(self.admin)
        paid_amount_url = reverse(
            'dashboard:course-registration-request-paid-amount',
            kwargs={'pk': self.registration.pk},
        )

        response = self.client.post(
            paid_amount_url,
            data=json.dumps({'amount': '45.50'}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['request']['paidAmount'], '45.50')
        self.assertEqual(response.json()['request']['remainingAmount'], '74.50')
        self.assertEqual(len(response.json()['request']['payments']), 1)

        second_response = self.client.post(
            paid_amount_url,
            data=json.dumps({'amount': '24.50'}),
            content_type='application/json',
        )

        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(second_response.json()['request']['paidAmount'], '70.00')
        self.assertEqual(second_response.json()['request']['remainingAmount'], '50.00')
        self.assertEqual(len(second_response.json()['request']['payments']), 2)

        overpayment_response = self.client.post(
            paid_amount_url,
            data=json.dumps({'amount': '50.01'}),
            content_type='application/json',
        )

        self.assertEqual(overpayment_response.status_code, 400)
        self.assertEqual(
            overpayment_response.json()['message'],
            'لا يمكن أن تتجاوز الدفعة المبلغ المتبقي.',
        )
        self.registration.refresh_from_db()
        self.assertEqual(
            CourseRegistrationPayment.objects.filter(
                registration_request=self.registration,
            ).count(),
            2,
        )

    def test_paid_amount_requires_positive_value_with_at_most_two_decimal_places(self):
        self.course.price = '120.00'
        self.course.save(update_fields=['price'])
        self.registration.status = CourseRegistrationRequestStatus.ACCEPTED
        self.registration.save(update_fields=['status'])
        self.client.force_login(self.admin)
        paid_amount_url = reverse(
            'dashboard:course-registration-request-paid-amount',
            kwargs={'pk': self.registration.pk},
        )

        for invalid_amount in ('0', '-1', '1.001', 'not-a-number'):
            with self.subTest(amount=invalid_amount):
                response = self.client.post(
                    paid_amount_url,
                    data=json.dumps({'amount': invalid_amount}),
                    content_type='application/json',
                )
                self.assertEqual(response.status_code, 400)
        self.assertFalse(
            CourseRegistrationPayment.objects.filter(
                registration_request=self.registration,
            ).exists(),
        )

    def test_payment_requires_a_valid_course_price(self):
        self.registration.status = CourseRegistrationRequestStatus.ACCEPTED
        self.registration.save(update_fields=['status'])
        self.client.force_login(self.admin)
        paid_amount_url = reverse(
            'dashboard:course-registration-request-paid-amount',
            kwargs={'pk': self.registration.pk},
        )

        response = self.client.post(
            paid_amount_url,
            data=json.dumps({'amount': '1'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 409)

    def test_payment_can_only_be_added_to_accepted_requests(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse(
                'dashboard:course-registration-request-paid-amount',
                kwargs={'pk': self.registration.pk},
            ),
            data=json.dumps({'amount': '10'}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 409)
        self.assertFalse(
            CourseRegistrationPayment.objects.filter(
                registration_request=self.registration,
            ).exists(),
        )

    def test_confirming_referred_registration_awards_ten_points_once(self):
        referrer = User.objects.create_user(
            phone='0591000094',
            password='referrer-password',
            full_name='طالب مُحيل',
            role=UserRole.STUDENT,
        )
        referral_link = StudentReferralLink.objects.create(
            referrer=referrer,
            course=self.course,
        )
        self.registration.referral_link = referral_link
        self.registration.save(update_fields=['referral_link'])
        self.client.force_login(self.admin)
        confirm_url = reverse(
            'dashboard:course-registration-request-confirm',
            kwargs={'pk': self.registration.pk},
        )

        response = self.client.post(confirm_url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['request']['referralPointsAwarded'])
        reward = StudentPointTransaction.objects.get(
            registration_request=self.registration,
        )
        self.assertEqual(reward.student, referrer)
        self.assertEqual(reward.course, self.course)
        self.assertEqual(reward.points, 10)
        self.assertEqual(reward.kind, StudentPointTransaction.Kind.REFERRAL)

        duplicate_response = self.client.post(confirm_url)

        self.assertEqual(duplicate_response.status_code, 200)
        self.assertFalse(duplicate_response.json()['request']['referralPointsAwarded'])
        self.assertEqual(
            StudentPointTransaction.objects.filter(
                registration_request=self.registration,
            ).count(),
            1,
        )

    def test_registration_request_creation_rejects_invalid_data_and_non_admins(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse('dashboard:course-registration-request-save'),
            data=json.dumps({
                'courseId': self.course.slug,
                'fullName': 'محمد أحمد',
                'phone': '+970123456789',
                'address': 'غزة',
                'specialty': 'التصميم',
                'governorate': 'gaza',
                'studyYear': 2,
                'studentStatus': 'student',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(CourseRegistrationRequest.objects.count(), 1)

        response = self.client.post(
            reverse('dashboard:course-registration-request-save'),
            data=json.dumps({
                'courseId': self.course.slug,
                'fullName': 'محمد أحمد علي',
                'phone': '+970123456789',
                'address': 'غزة',
                'specialty': 'التصميم',
                'governorate': 'gaza',
                'studyYear': 1.5,
                'studentStatus': 'student',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(CourseRegistrationRequest.objects.count(), 1)

        self.client.force_login(self.trainer)
        response = self.client.post(
            reverse('dashboard:course-registration-request-save'),
            data=json.dumps({
                'courseId': self.course.slug,
                'fullName': 'محمد أحمد علي',
                'phone': '+970123456789',
                'address': 'غزة',
                'specialty': 'التصميم',
                'governorate': 'gaza',
                'studyYear': 2,
                'studentStatus': 'student',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(CourseRegistrationRequest.objects.count(), 1)


class AdminOnlineCourseInvoiceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000181',
            password='admin-password',
            full_name='مدير فواتير الأونلاين',
            role=UserRole.ADMIN,
        )
        self.trainer = User.objects.create_user(
            phone='0591000182',
            password='trainer-password',
            full_name='مدرب أونلاين',
            role=UserRole.TRAINER,
        )
        self.student = User.objects.create_user(
            phone='0591000183',
            password='student-password',
            full_name='طالب أونلاين',
            role=UserRole.STUDENT,
        )
        self.course = Course.objects.create(
            owner=self.trainer,
            title='دورة أونلاين مدفوعة',
            price='120.00',
            currency='USD',
            course_type=CourseType.ONLINE,
            status=CourseStatus.PUBLISHED,
        )
        self.client.force_login(self.admin)

    def create_invoice(self, discount_type='fixed', discount_value='0'):
        return self.client.post(
            reverse('dashboard:online-course-invoice-create'),
            data=json.dumps({
                'studentId': str(self.student.pk),
                'courseId': str(self.course.pk),
                'discountType': discount_type,
                'discountValue': discount_value,
            }),
            content_type='application/json',
        )

    def test_admin_creates_online_invoice_with_percentage_discount_and_enrollment(self):
        response = self.create_invoice('percentage', '25')

        self.assertEqual(response.status_code, 200)
        invoice_data = response.json()['invoice']
        self.assertEqual(invoice_data['coursePrice'], '120.00')
        self.assertEqual(invoice_data['discountType'], OnlineCourseInvoice.DiscountType.PERCENTAGE)
        self.assertEqual(invoice_data['discountValue'], '25.00')
        self.assertEqual(invoice_data['totalAmount'], '90.00')
        self.assertEqual(invoice_data['paidAmount'], '0.00')
        self.assertEqual(invoice_data['remainingAmount'], '90.00')
        self.assertTrue(CourseProgress.objects.filter(student=self.student, course=self.course).exists())
        self.assertEqual(OnlineCourseInvoice.objects.count(), 1)

    def test_admin_can_create_online_invoice_without_discount(self):
        response = self.create_invoice(discount_value='')

        self.assertEqual(response.status_code, 200)
        invoice_data = response.json()['invoice']
        self.assertEqual(invoice_data['discountValue'], '0.00')
        self.assertEqual(invoice_data['totalAmount'], '120.00')

    def test_online_invoice_rejects_duplicate_and_invalid_discount(self):
        self.assertEqual(self.create_invoice().status_code, 200)
        self.assertEqual(self.create_invoice().status_code, 409)

        self.student2 = User.objects.create_user(
            phone='0591000184',
            password='student-password',
            full_name='طالب آخر',
            role=UserRole.STUDENT,
        )
        invalid_discount = self.client.post(
            reverse('dashboard:online-course-invoice-create'),
            data=json.dumps({
                'studentId': str(self.student2.pk),
                'courseId': str(self.course.pk),
                'discountType': 'percentage',
                'discountValue': '100.01',
            }),
            content_type='application/json',
        )
        self.assertEqual(invalid_discount.status_code, 400)
        self.assertFalse(CourseProgress.objects.filter(student=self.student2, course=self.course).exists())

    def test_admin_adds_online_invoice_payments_without_overpayment(self):
        invoice_id = self.create_invoice('fixed', '20').json()['invoice']['id']
        payment_url = reverse(
            'dashboard:online-course-invoice-add-payment',
            kwargs={'pk': invoice_id},
        )
        response = self.client.post(
            payment_url,
            data=json.dumps({'amount': '50.00'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['invoice']['totalAmount'], '100.00')
        self.assertEqual(response.json()['invoice']['paidAmount'], '50.00')
        self.assertEqual(response.json()['invoice']['remainingAmount'], '50.00')
        self.assertEqual(OnlineCourseInvoicePayment.objects.count(), 1)

        overpayment = self.client.post(
            payment_url,
            data=json.dumps({'amount': '50.01'}),
            content_type='application/json',
        )
        self.assertEqual(overpayment.status_code, 400)
        self.assertEqual(OnlineCourseInvoicePayment.objects.count(), 1)

    def test_admin_panel_payload_contains_online_invoices_only(self):
        invoice_data = self.create_invoice().json()['invoice']
        invoice = OnlineCourseInvoice.objects.get(pk=invoice_data['id'])
        OnlineCourseInvoicePayment.objects.create(
            invoice=invoice,
            amount='50.00',
            is_historical_balance=True,
        )
        in_person_course = Course.objects.create(
            owner=self.trainer,
            title='دورة وجاهية',
            price='80.00',
            course_type=CourseType.IN_PERSON,
            status=CourseStatus.PUBLISHED,
        )
        CourseProgress.objects.create(student=self.student, course=in_person_course)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        invoices = response.context['online_course_invoices_json']
        self.assertEqual(len(invoices), 1)
        self.assertEqual(invoices[0]['courseId'], self.course.slug)
        self.assertEqual(invoices[0]['paidAmount'], '50.00')
        self.assertEqual(invoices[0]['payments'], [])
        self.assertContains(response, 'admin-online-course-invoices-data')


class AdminSubscriptionCreateTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000191',
            password='admin-password',
            full_name='مدير الاشتراكات الموحدة',
            role=UserRole.ADMIN,
        )
        self.trainer = User.objects.create_user(
            phone='0591000192',
            password='trainer-password',
            full_name='مدرب الاشتراكات',
            role=UserRole.TRAINER,
        )
        self.student = User.objects.create_user(
            phone='0591000193',
            password='student-password',
            full_name='طالب الاشتراك',
            role=UserRole.STUDENT,
        )
        self.online_course = Course.objects.create(
            owner=self.trainer,
            title='دورة أونلاين للاشتراك',
            price='120.00',
            currency='USD',
            course_type=CourseType.ONLINE,
            status=CourseStatus.PUBLISHED,
        )
        self.inperson_course = Course.objects.create(
            owner=self.trainer,
            title='دورة وجاهية للاشتراك',
            price='₪200',
            course_type=CourseType.IN_PERSON,
            status=CourseStatus.PUBLISHED,
        )
        self.cohort = InPersonCourseCohort.objects.create(
            course=self.inperson_course,
            number=1,
        )
        self.client.force_login(self.admin)

    def create_subscription(self, course, course_type, cohort_id='', discount='0', payment='0'):
        return self.client.post(
            reverse('dashboard:subscription-create'),
            data=json.dumps({
                'studentId': str(self.student.pk),
                'courseType': course_type,
                'courseId': str(course.pk),
                'cohortId': str(cohort_id),
                'paymentAmount': payment,
                'discountAmount': discount,
            }),
            content_type='application/json',
        )

    def test_online_subscription_uses_course_price_and_optional_discount(self):
        response = self.create_subscription(
            self.online_course,
            CourseType.ONLINE,
            discount='20.00',
            payment='10.00',
        )

        self.assertEqual(response.status_code, 201, response.content)
        subscription = response.json()['subscription']
        self.assertEqual(subscription['coursePrice'], '120.00')
        self.assertEqual(subscription['discountValue'], '20.00')
        self.assertEqual(subscription['totalAmount'], '100.00')
        self.assertEqual(subscription['paidAmount'], '10.00')
        self.assertEqual(subscription['remainingAmount'], '90.00')
        self.assertTrue(CourseProgress.objects.filter(
            student=self.student,
            course=self.online_course,
        ).exists())

    def test_online_subscription_rejects_student_with_active_course_progress(self):
        CourseProgress.objects.create(
            student=self.student,
            course=self.online_course,
        )

        response = self.create_subscription(self.online_course, CourseType.ONLINE)

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()['message'], 'الطالب مضاف بالفعل إلى الدورة.')
        self.assertFalse(OnlineCourseInvoice.objects.exists())

    def test_inperson_subscription_stores_discount_and_calculates_balance(self):
        response = self.create_subscription(
            self.inperson_course,
            CourseType.IN_PERSON,
            cohort_id=self.cohort.pk,
            discount='50.00',
            payment='25.00',
        )

        self.assertEqual(response.status_code, 201, response.content)
        subscription = response.json()['subscription']
        registration = CourseRegistrationRequest.objects.get(
            student=self.student,
            course=self.inperson_course,
        )
        self.assertEqual(registration.course_price_amount, Decimal('200.00'))
        self.assertEqual(registration.discount_amount, Decimal('50.00'))
        self.assertEqual(subscription['totalAmount'], '150.00')
        self.assertEqual(subscription['paidAmount'], '25.00')
        self.assertEqual(subscription['remainingAmount'], '125.00')
        self.assertTrue(CourseProgress.objects.filter(
            student=self.student,
            course=self.inperson_course,
        ).exists())

    def test_inperson_subscription_without_payment_is_assigned_to_selected_cohort(self):
        response = self.create_subscription(
            self.inperson_course,
            CourseType.IN_PERSON,
            cohort_id=self.cohort.pk,
        )

        self.assertEqual(response.status_code, 201, response.content)
        registration = CourseRegistrationRequest.objects.get(
            student=self.student,
            course=self.inperson_course,
            cohort=self.cohort,
        )
        self.assertEqual(registration.status, CourseRegistrationRequestStatus.ACCEPTED)
        self.assertEqual(response.json()['registration']['cohortId'], str(self.cohort.pk))
        self.assertEqual(response.json()['registration']['paidAmount'], '0.00')

    def test_inperson_subscription_rejects_student_already_in_selected_cohort(self):
        CourseRegistrationRequest.objects.create(
            course=self.inperson_course,
            cohort=self.cohort,
            student=self.student,
            full_name=self.student.display_name,
            phone=self.student.phone,
            address='',
            specialty='',
            status=CourseRegistrationRequestStatus.ACCEPTED,
        )

        response = self.create_subscription(
            self.inperson_course,
            CourseType.IN_PERSON,
            cohort_id=self.cohort.pk,
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()['message'], 'الطالب مضاف بالفعل إلى الدورة.')
        self.assertEqual(
            CourseRegistrationRequest.objects.filter(
                course=self.inperson_course,
                student=self.student,
            ).count(),
            1,
        )

    def test_inperson_subscription_allows_student_from_older_cohort_in_latest_cohort(self):
        CourseRegistrationRequest.objects.create(
            course=self.inperson_course,
            cohort=self.cohort,
            student=self.student,
            full_name=self.student.display_name,
            phone=self.student.phone,
            address='',
            specialty='',
            status=CourseRegistrationRequestStatus.ACCEPTED,
        )
        self.cohort.ended_at = timezone.now()
        self.cohort.save(update_fields=['ended_at'])
        latest_cohort = InPersonCourseCohort.objects.create(
            course=self.inperson_course,
            number=2,
        )

        response = self.create_subscription(
            self.inperson_course,
            CourseType.IN_PERSON,
            cohort_id=latest_cohort.pk,
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(
            CourseRegistrationRequest.objects.filter(
                course=self.inperson_course,
                student=self.student,
            ).count(),
            2,
        )
        self.assertTrue(CourseRegistrationRequest.objects.filter(
            course=self.inperson_course,
            student=self.student,
            cohort=latest_cohort,
            status=CourseRegistrationRequestStatus.ACCEPTED,
        ).exists())

    def test_subscription_rejects_discount_over_course_price_without_enrollment(self):
        response = self.create_subscription(
            self.inperson_course,
            CourseType.IN_PERSON,
            cohort_id=self.cohort.pk,
            discount='200.01',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(CourseProgress.objects.filter(
            student=self.student,
            course=self.inperson_course,
        ).exists())


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
                    'fullNameArabic': trainer.full_name_ar,
                    'fullNameEnglish': trainer.full_name_en,
                    'handle': trainer.handle,
                    'specialty': '',
                    'rating': 0,
                    'email': trainer.email,
                    'phone': trainer.phone,
                    'whatsapp': '',
                    'avatar': '',
                    'bio': '',
                    'status': 'active' if trainer.is_active else 'paused',
                    'canPublishContent': True,
                    'verified': trainer.is_verified,
                    'joined': trainer.date_joined.isoformat(),
                    'coursesCount': 0,
                    'linkedin': '',
                    'github': '',
                    'displayOrder': None,
                }
                for trainer in reversed(trainers)
            ],
        )

    def test_admin_can_toggle_trainer_content_permission(self):
        trainer = User.objects.create_user(
            phone='3333333333',
            password='trainer-password',
            full_name='مدرب النشر',
            role=UserRole.TRAINER,
        )
        course = Course.objects.create(
            owner=trainer,
            title='دورة سابقة منشورة',
            status=CourseStatus.PUBLISHED,
        )
        profile_course = Course.objects.create(
            owner=trainer,
            title='دورة خاصة بالبروفايل',
            profile_only=True,
        )
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse('dashboard:trainer-content-permission', args=[trainer.pk]),
            data=json.dumps({'allowed': False}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['canPublishContent'])
        trainer.refresh_from_db()
        self.assertFalse(trainer.can_publish_content)
        course.refresh_from_db()
        self.assertFalse(course.profile_only)
        profile_course.refresh_from_db()
        self.assertTrue(profile_course.profile_only)

    def test_non_admin_cannot_toggle_trainer_content_permission(self):
        trainer = User.objects.create_user(
            phone='3333333334',
            password='trainer-password',
            full_name='مدرب النشر',
            role=UserRole.TRAINER,
        )
        self.client.force_login(trainer)

        response = self.client.post(
            reverse('dashboard:trainer-content-permission', args=[trainer.pk]),
            data=json.dumps({'allowed': False}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)
        trainer.refresh_from_db()
        self.assertTrue(trainer.can_publish_content)


class StudentSessionManagementTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000031',
            password='admin-password',
            full_name='مدير الجلسات',
            role=UserRole.ADMIN,
        )
        self.student = User.objects.create_user(
            phone='0591000032',
            password='student-password',
            full_name='طالب الجلسات',
            role=UserRole.STUDENT,
        )
        self.admin_client = self.client
        self.admin_client.force_login(self.admin)

    def _create_device_session(self, index):
        client = self.client_class()
        client.force_login(self.student)
        session_key = client.session.session_key
        device = DeviceSession.objects.create(
            user=self.student,
            device_id=f'student-device-{index}',
            session_key=session_key,
            user_agent=f'Test browser {index}',
        )
        return client, device

    def test_student_table_shows_active_device_count(self):
        self._create_device_session(1)
        self._create_device_session(2)

        response = self.admin_client.get(reverse('dashboard:home'))

        student_row = next(
            row for row in response.context['students_json']
            if row['databaseId'] == str(self.student.pk)
        )
        self.assertEqual(student_row['activeDevices'], 2)

    def test_referral_stats_visibility_defaults_off_and_admin_can_toggle_it(self):
        response = self.admin_client.get(reverse('dashboard:home'))
        student_row = next(
            row for row in response.context['students_json']
            if row['databaseId'] == str(self.student.pk)
        )
        self.assertFalse(student_row['showReferralStats'])
        self.assertFalse(self.student.profile.show_referral_stats)

        toggle_response = self.admin_client.post(
            reverse('dashboard:student-referral-stats-visibility', args=[self.student.pk]),
            data=json.dumps({'visible': True}),
            content_type='application/json',
        )

        self.assertEqual(toggle_response.status_code, 200, toggle_response.content)
        self.assertTrue(toggle_response.json()['showReferralStats'])
        self.student.profile.refresh_from_db()
        self.assertTrue(self.student.profile.show_referral_stats)

    def test_admin_can_revoke_one_session_and_force_logout_that_device(self):
        student_client, device = self._create_device_session(1)
        _, remaining_device = self._create_device_session(2)
        url = reverse('dashboard:student-sessions', args=[self.student.pk])

        listing = self.admin_client.get(url)
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()['activeDevices'], 2)
        self.assertEqual(len(listing.json()['sessions']), 2)

        response = self.admin_client.post(
            url,
            data=json.dumps({'deviceSessionId': device.pk}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['activeDevices'], 1)
        self.assertFalse(Session.objects.filter(session_key=device.session_key).exists())
        self.assertTrue(
            DeviceSession.objects.filter(pk=remaining_device.pk).exists()
        )
        logout_check = student_client.get(reverse('portfolio:home'))
        self.assertFalse(logout_check.wsgi_request.user.is_authenticated)

    def test_admin_can_revoke_all_student_sessions(self):
        _, first = self._create_device_session(1)
        _, second = self._create_device_session(2)
        url = reverse('dashboard:student-sessions', args=[self.student.pk])

        response = self.admin_client.post(
            url,
            data=json.dumps({'all': True}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['activeDevices'], 0)
        self.assertFalse(
            Session.objects.filter(
                session_key__in=[first.session_key, second.session_key]
            ).exists()
        )
        self.assertFalse(DeviceSession.objects.filter(user=self.student).exists())

    def test_non_admin_cannot_read_or_revoke_student_sessions(self):
        _, device = self._create_device_session(1)
        self.admin_client.force_login(self.student)
        url = reverse('dashboard:student-sessions', args=[self.student.pk])

        get_response = self.admin_client.get(url)
        post_response = self.admin_client.post(
            url,
            data=json.dumps({'deviceSessionId': device.pk}),
            content_type='application/json',
        )

        self.assertEqual(get_response.status_code, 403)
        self.assertEqual(post_response.status_code, 403)
        self.assertTrue(DeviceSession.objects.filter(pk=device.pk).exists())

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
        Course.objects.create(
            owner=trainer,
            title='دورة مدفوعة قريبًا',
            price='₪100',
            status=CourseStatus.PUBLISHED,
            is_coming_soon=True,
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

    def test_panel_course_progress_history_includes_expired_enrollments(self):
        student = User.objects.create_user(
            phone='6666666667',
            password='student-password',
            full_name='طالب اشتراك منتهي',
            role=UserRole.STUDENT,
        )
        trainer = User.objects.create_user(
            phone='6666666668',
            password='trainer-password',
            full_name='مدرب الدورة',
            role=UserRole.TRAINER,
        )
        course = Course.objects.create(
            owner=trainer,
            title='دورة اشتراك منتهي',
            course_type=CourseType.ONLINE,
            status=CourseStatus.PUBLISHED,
        )
        progress = CourseProgress.objects.create(
            student=student,
            course=course,
            expires_at=timezone.now() - timedelta(days=1),
        )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        self.assertNotIn(
            str(progress.pk),
            {item['id'] for item in response.context['course_progress_json']},
        )
        self.assertIn(
            str(progress.pk),
            {item['id'] for item in response.context['admin_course_progress_history_json']},
        )

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

        panel_response = self.client.get(reverse('dashboard:home'))
        remove_url = reverse('dashboard:course-student-remove', args=[0])
        self.assertContains(
            panel_response,
            f'courseStudentRemove: "{remove_url}".replace(\'/0/remove/\', \'/__ID__/remove/\')',
        )

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


class AdminStudentDeletionTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000023',
            password='admin-password',
            full_name='مدير النظام',
            role=UserRole.ADMIN,
        )
        self.student = User.objects.create_user(
            phone='0591000024',
            password='student-password',
            full_name='طالب للحذف',
            role=UserRole.STUDENT,
        )
        self.url = reverse('dashboard:student-delete')

    def test_admin_can_delete_multiple_student_accounts(self):
        another_student = User.objects.create_user(
            phone='0591000025',
            password='student-password',
            full_name='طالب آخر للحذف',
            role=UserRole.STUDENT,
        )
        self.client.force_login(self.admin)

        response = self.client.post(
            self.url,
            data=json.dumps({'ids': [self.student.pk, another_student.pk]}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), {'ok': True, 'deleted': 2})
        self.assertFalse(
            User.objects.filter(pk__in=[self.student.pk, another_student.pk]).exists()
        )

    def test_delete_rejects_non_students_without_deleting_them(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            self.url,
            data=json.dumps({'ids': [self.admin.pk]}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 404)
        self.assertTrue(User.objects.filter(pk=self.admin.pk).exists())

    def test_mixed_student_and_non_student_ids_do_not_partially_delete(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            self.url,
            data=json.dumps({'ids': [self.student.pk, self.admin.pk]}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 404)
        self.assertTrue(User.objects.filter(pk=self.student.pk).exists())
        self.assertTrue(User.objects.filter(pk=self.admin.pk).exists())

    def test_non_admin_cannot_delete_students(self):
        self.client.force_login(self.student)

        response = self.client.post(
            self.url,
            data=json.dumps({'ids': [self.student.pk]}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertTrue(User.objects.filter(pk=self.student.pk).exists())

    def test_delete_rejects_invalid_id_lists(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            self.url,
            data=json.dumps({'ids': [self.student.pk, self.student.pk]}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.student.pk).exists())


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
        self.assertEqual(reset.reset_by, self.admin)
        self.assertEqual(transactions.count(), 3)

        repeated = self.client.post(self.url)
        self.assertEqual(repeated.status_code, 200)
        self.assertEqual(repeated.json(), {'ok': True, 'points': 0})
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
            'fullNameArabic': 'محمد أحمد علي',
            'fullNameEnglish': 'Mohammad Ahmad Ali',
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
        self.assertEqual(student.full_name_ar, 'محمد أحمد علي')
        self.assertEqual(student.full_name_en, 'Mohammad Ahmad Ali')
        self.assertEqual(response.json()['student']['fullNameArabic'], 'محمد أحمد علي')
        self.assertEqual(response.json()['student']['fullNameEnglish'], 'Mohammad Ahmad Ali')
        self.assertTrue(authenticate(phone=student.phone, password='Strong#Student2026'))
        self.assertEqual(Profile.objects.get(user=student).bio, 'نبذة الطالب')
        self.assertEqual(response.json()['student']['id'], f'db-user-{student.pk}')
        self.assertEqual(response.json()['student']['databaseId'], str(student.pk))

    def test_student_form_fields_are_optional_and_handle_is_generated_on_create(self):
        payload = self.payload(
            name='Automatic Student',
            phone='0591011004',
        )
        for field in (
            'fullNameArabic', 'fullNameEnglish', 'handle', 'email', 'status',
            'verified', 'bio', 'avatar',
        ):
            payload.pop(field)

        response = self.post_json(payload)

        self.assertEqual(response.status_code, 201, response.content)
        student = User.objects.get(phone='0591011004')
        profile = Profile.objects.get(user=student)
        self.assertEqual(student.handle, 'automatic-student')
        self.assertEqual(student.date_joined.date(), timezone.localdate())
        self.assertEqual(profile.bio, '')

        profile.bio = 'نبذة محفوظة'
        profile.save(update_fields=['bio'])
        student.email = 'preserved@example.com'
        student.is_active = False
        student.is_verified = True
        student.save(update_fields=['email', 'is_active', 'is_verified'])
        original_handle = student.handle
        original_joined = student.date_joined
        update = dict(payload)
        update.update({'id': str(student.pk), 'name': 'Automatic Student Updated'})

        response = self.post_json(update)

        self.assertEqual(response.status_code, 200, response.content)
        student.refresh_from_db()
        profile.refresh_from_db()
        self.assertEqual(student.handle, original_handle)
        self.assertEqual(student.date_joined, original_joined)
        self.assertEqual(student.email, 'preserved@example.com')
        self.assertFalse(student.is_active)
        self.assertTrue(student.is_verified)
        self.assertEqual(profile.bio, 'نبذة محفوظة')

    def test_admin_can_update_student_without_changing_password_or_set_a_new_one(self):
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

    def test_admin_can_update_student_to_phone_with_any_number_of_digits(self):
        response = self.post_json(self.payload(
            id=str(self.student.pk),
            name=self.student.full_name,
            handle=self.student.handle,
            phone='12345',
            email=self.student.email,
            password='',
        ))

        self.assertEqual(response.status_code, 200, response.content)
        self.student.refresh_from_db()
        self.assertEqual(self.student.phone, '12345')

    def test_admin_can_update_student_to_phone_with_country_prefix(self):
        response = self.post_json(self.payload(
            id=str(self.student.pk),
            name=self.student.full_name,
            handle=self.student.handle,
            phone='+12345',
            email=self.student.email,
            password='',
        ))

        self.assertEqual(response.status_code, 200, response.content)
        self.student.refresh_from_db()
        self.assertEqual(self.student.phone, '+12345')

    def test_password_is_required_when_creating_student(self):
        payload = self.payload(phone='0591011005')
        payload.pop('password')

        response = self.post_json(payload)

        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn('password', response.json()['fields'])
        self.assertFalse(User.objects.filter(phone='0591011005').exists())

    def test_admin_can_update_student_specialization(self):
        response = self.post_json(self.payload(
            id=str(self.student.pk),
            name=self.student.full_name,
            handle=self.student.handle,
            phone=self.student.phone,
            email=self.student.email,
            specialization='تصميم تجربة المستخدم',
        ))

        self.assertEqual(response.status_code, 200, response.content)
        self.student.profile.refresh_from_db()
        self.assertEqual(self.student.profile.specialization, 'تصميم تجربة المستخدم')
        self.assertEqual(
            response.json()['student']['specialization'],
            'تصميم تجربة المستخدم',
        )

    def test_admin_can_change_student_role_to_trainer(self):
        response = self.client.post(
            reverse('dashboard:trainer-save'),
            data=json.dumps({
                'id': str(self.student.pk),
                'name': self.student.full_name,
                'fullNameArabic': 'محمد أحمد علي',
                'fullNameEnglish': 'Mohammad Ahmad Ali',
                'phone': self.student.phone,
                'email': self.student.email,
                'specialty': 'تصميم واجهات',
                'status': 'active',
                'verified': False,
                'password': '',
                'avatar': '',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, UserRole.TRAINER)
        self.assertEqual(self.student.phone, '0591011002')
        self.assertEqual(self.student.profile.specialization, 'تصميم واجهات')
        self.assertEqual(response.json()['trainer']['id'], str(self.student.pk))

    def test_student_creation_requires_valid_password_and_admin_access(self):
        response = self.post_json(self.payload(password=''))
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.json()['fields'])
        self.assertFalse(User.objects.filter(phone='0591011003').exists())

        self.client.force_login(self.student)
        response = self.post_json(self.payload())
        self.assertEqual(response.status_code, 403)


class AdminInPersonProgressTests(TestCase):
    def test_inperson_progress_remains_active_in_admin_dashboard(self):
        admin = User.objects.create_user(
            phone='0591010091',
            password='admin-password',
            full_name='مدير الدورات الوجاهية',
            role=UserRole.ADMIN,
        )
        trainer = User.objects.create_user(
            phone='0591010092',
            password='trainer-password',
            full_name='مدرب الدورة الوجاهية',
            role=UserRole.TRAINER,
        )
        student = User.objects.create_user(
            phone='0591010093',
            password='student-password',
            full_name='طالب الدورة الوجاهية',
            role=UserRole.STUDENT,
        )
        course = Course.objects.create(
            owner=trainer,
            title='دورة وجاهية مستمرة',
            course_type=CourseType.IN_PERSON,
            status=CourseStatus.PUBLISHED,
        )
        progress = CourseProgress.objects.create(
            student=student,
            course=course,
            expires_at=timezone.now() - timedelta(days=1),
        )
        self.assertIsNone(progress.expires_at)
        expired_at = timezone.now() - timedelta(days=1)
        CourseProgress.objects.filter(pk=progress.pk).update(expires_at=expired_at)
        self.client.force_login(admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertIn(
            str(progress.pk),
            {item['id'] for item in response.context['course_progress_json']},
        )
        course_data = next(
            item for item in response.context['courses_json'] if item['id'] == course.slug
        )
        self.assertEqual(course_data['enrollmentCount'], 1)


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
        self.course = Course.objects.create(
            owner=self.trainer,
            title='دورة التسجيل',
            price='120.00',
        )
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
        self.assertEqual(response.json()['invoice']['coursePrice'], '120.00')
        self.assertEqual(response.json()['invoice']['totalAmount'], '120.00')
        self.assertTrue(
            CourseProgress.objects.filter(student=self.student, course=self.course).exists()
        )
        self.assertTrue(
            OnlineCourseInvoice.objects.filter(
                progress__student=self.student,
                progress__course=self.course,
            ).exists()
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
        self.assertEqual(duplicate.json()['invoice']['totalAmount'], '120.00')
        self.assertEqual(duplicate.json()['enrolledCount'], 2)
        self.assertEqual(CourseProgress.objects.filter(student=self.student, course=self.course).count(), 1)

    def test_inperson_enrollment_creates_accepted_subscription_at_course_price(self):
        self.course.course_type = CourseType.IN_PERSON
        self.course.price = '₪200'
        self.course.save(update_fields=['course_type', 'price'])
        cohort = InPersonCourseCohort.objects.create(
            course=self.course,
            number=1,
        )

        response = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201, response.content)
        registration_data = response.json()['registration']
        self.assertEqual(registration_data['status'], CourseRegistrationRequestStatus.ACCEPTED)
        self.assertEqual(registration_data['coursePriceAmount'], '200.00')
        self.assertEqual(registration_data['studentId'], str(self.student.pk))
        self.assertEqual(registration_data['cohortId'], str(cohort.pk))
        registration = CourseRegistrationRequest.objects.get(
            course=self.course,
            student=self.student,
        )
        self.assertEqual(registration.status, CourseRegistrationRequestStatus.ACCEPTED)

        duplicate = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )

        self.assertEqual(duplicate.status_code, 200, duplicate.content)
        self.assertEqual(
            CourseRegistrationRequest.objects.filter(
                course=self.course,
                student=self.student,
            ).count(),
            1,
        )

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
        self.assertEqual(response.json()['invoice']['totalAmount'], '100.00')
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

    def test_removing_student_enrollment_does_not_affect_other_students_or_courses(self):
        selected_progress = CourseProgress.objects.create(
            student=self.student,
            course=self.course,
        )
        other_progress = CourseProgress.objects.create(
            student=self.other_student,
            course=self.course,
        )
        other_course = Course.objects.create(
            owner=self.trainer,
            title='دورة أخرى',
            price='80.00',
        )
        other_course_progress = CourseProgress.objects.create(
            student=self.student,
            course=other_course,
        )
        selected_invoice = OnlineCourseInvoice.objects.create(
            progress=selected_progress,
            course_price='120.00',
            total_amount='120.00',
        )
        OnlineCourseInvoicePayment.objects.create(
            invoice=selected_invoice,
            amount='20.00',
        )
        other_invoice = OnlineCourseInvoice.objects.create(
            progress=other_progress,
            course_price='120.00',
            total_amount='120.00',
        )
        other_course_invoice = OnlineCourseInvoice.objects.create(
            progress=other_course_progress,
            course_price='80.00',
            total_amount='80.00',
        )
        selected_certificate = CourseCertificate.objects.create(
            student=self.student,
            course=self.course,
        )
        other_certificate = CourseCertificate.objects.create(
            student=self.other_student,
            course=self.course,
        )

        response = self.client.post(
            reverse('dashboard:course-student-remove', args=[selected_progress.pk]),
            data=json.dumps({}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(CourseProgress.objects.filter(pk=selected_progress.pk).exists())
        self.assertTrue(CourseProgress.objects.filter(pk=other_progress.pk).exists())
        self.assertTrue(CourseProgress.objects.filter(pk=other_course_progress.pk).exists())
        self.assertFalse(OnlineCourseInvoice.objects.filter(pk=selected_invoice.pk).exists())
        self.assertTrue(OnlineCourseInvoice.objects.filter(pk=other_invoice.pk).exists())
        self.assertTrue(OnlineCourseInvoice.objects.filter(pk=other_course_invoice.pk).exists())
        self.assertFalse(CourseCertificate.objects.filter(pk=selected_certificate.pk).exists())
        self.assertTrue(CourseCertificate.objects.filter(pk=other_certificate.pk).exists())
        self.assertEqual(response.json()['enrolledCount'], 1)
        self.assertEqual(
            [row['userId'] for row in response.json()['enrolled']],
            [str(self.other_student.pk)],
        )

    def test_expired_online_enrollment_is_hidden_and_reenrollment_keeps_invoice_payments(self):
        progress = CourseProgress.objects.create(
            student=self.student,
            course=self.course,
        )
        progress.expires_at = timezone.now() - timedelta(seconds=1)
        progress.save(update_fields=['expires_at'])
        invoice = OnlineCourseInvoice.objects.create(
            progress=progress,
            course_price='120.00',
            total_amount='120.00',
        )
        payment = OnlineCourseInvoicePayment.objects.create(
            invoice=invoice,
            amount='35.00',
        )

        listing = self.client.get(self.url, {'q': 'new'})
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()['enrolled'], [])
        self.assertEqual(
            [row['id'] for row in listing.json()['results']],
            [str(self.student.pk)],
        )

        renewed = self.client.post(
            self.url,
            data=json.dumps({'studentId': self.student.pk}),
            content_type='application/json',
        )

        self.assertEqual(renewed.status_code, 200, renewed.content)
        self.assertEqual(renewed.json()['invoice']['id'], str(invoice.pk))
        self.assertEqual(renewed.json()['invoice']['paidAmount'], '35.00')
        self.assertTrue(
            CourseProgress.objects.get(pk=progress.pk).expires_at > timezone.now()
        )
        self.assertTrue(OnlineCourseInvoicePayment.objects.filter(pk=payment.pk).exists())


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
        self.visibility_url = reverse('dashboard:course-visibility', args=[self.course.pk])

    def test_admin_can_choose_online_course_visibility(self):
        self.client.force_login(self.admin)

        hidden = self.client.post(
            self.visibility_url,
            json.dumps({'profileOnly': True}),
            content_type='application/json',
        )
        self.assertEqual(hidden.status_code, 200, hidden.content)
        self.assertTrue(hidden.json()['profileOnly'])
        self.course.refresh_from_db()
        self.assertTrue(self.course.profile_only)
        public_courses = self.client.get(reverse('courses:list')).context['courses_json']
        self.assertNotIn(self.course.slug, [course['id'] for course in public_courses])

        visible = self.client.post(
            self.visibility_url,
            json.dumps({'profileOnly': False}),
            content_type='application/json',
        )
        self.assertEqual(visible.status_code, 200, visible.content)
        self.assertFalse(visible.json()['profileOnly'])
        public_courses = self.client.get(reverse('courses:list')).context['courses_json']
        self.assertIn(self.course.slug, [course['id'] for course in public_courses])

    def test_admin_can_choose_inperson_course_homepage_visibility(self):
        self.course.course_type = CourseType.IN_PERSON
        self.course.profile_only = True
        self.course.save(update_fields=['course_type', 'profile_only'])
        self.client.force_login(self.admin)

        hidden = self.client.post(
            self.visibility_url,
            json.dumps({'profileOnly': True}),
            content_type='application/json',
        )
        self.assertEqual(hidden.status_code, 200, hidden.content)
        homepage_courses = self.client.get(reverse('landing:home')).context['inperson_courses_json']
        self.assertNotIn(self.course.slug, [course['id'] for course in homepage_courses])

        visible = self.client.post(
            self.visibility_url,
            json.dumps({'profileOnly': False}),
            content_type='application/json',
        )
        self.assertEqual(visible.status_code, 200, visible.content)
        homepage_courses = self.client.get(reverse('landing:home')).context['inperson_courses_json']
        self.assertIn(self.course.slug, [course['id'] for course in homepage_courses])

    def test_admin_can_show_online_course_when_trainer_publishing_is_disabled(self):
        self.trainer.can_publish_content = False
        self.trainer.save(update_fields=['can_publish_content'])
        self.course.profile_only = True
        self.course.save(update_fields=['profile_only'])
        self.client.force_login(self.admin)

        response = self.client.post(
            self.visibility_url,
            json.dumps({'profileOnly': False}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['profileOnly'])
        self.course.refresh_from_db()
        self.assertFalse(self.course.profile_only)
        public_courses = self.client.get(reverse('courses:list')).context['courses_json']
        self.assertIn(self.course.slug, [course['id'] for course in public_courses])

    def test_course_visibility_requires_admin_and_boolean_value(self):
        self.client.force_login(self.trainer)
        response = self.client.post(
            self.visibility_url,
            json.dumps({'profileOnly': True}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)

        self.client.force_login(self.admin)
        response = self.client.post(
            self.visibility_url,
            json.dumps({'profileOnly': 'true'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

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
        self.visibility_url = reverse('dashboard:project-visibility', args=[self.project.pk])

    def test_admin_can_change_trainer_project_visibility(self):
        trainer = User.objects.create_user(
            phone='0591000032',
            password='trainer-password',
            full_name='مدرب مشاريع',
            role=UserRole.TRAINER,
        )
        project = Project.objects.create(
            owner=trainer,
            title='مشروع المدرب',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PERSONAL,
        )
        url = reverse('dashboard:project-visibility', args=[project.pk])
        self.client.force_login(self.admin)

        public_response = self.client.post(
            url,
            json.dumps({'profileOnly': False}),
            content_type='application/json',
        )
        self.assertEqual(public_response.status_code, 200, public_response.content)
        self.assertFalse(public_response.json()['profileOnly'])
        project.refresh_from_db()
        self.assertEqual(project.visibility, ProjectVisibility.PUBLIC)

        profile_only_response = self.client.post(
            url,
            json.dumps({'profileOnly': True}),
            content_type='application/json',
        )
        self.assertEqual(profile_only_response.status_code, 200, profile_only_response.content)
        self.assertTrue(profile_only_response.json()['profileOnly'])
        project.refresh_from_db()
        self.assertEqual(project.visibility, ProjectVisibility.PERSONAL)

    def test_project_visibility_toggle_rejects_non_trainer_projects_and_invalid_values(self):
        self.client.force_login(self.admin)
        non_trainer_response = self.client.post(
            self.visibility_url,
            json.dumps({'profileOnly': True}),
            content_type='application/json',
        )
        self.assertEqual(non_trainer_response.status_code, 400)

        trainer = User.objects.create_user(
            phone='0591000033',
            password='trainer-password',
            full_name='مدرب مشاريع آخر',
            role=UserRole.TRAINER,
        )
        project = Project.objects.create(owner=trainer, title='مشروع آخر')
        response = self.client.post(
            reverse('dashboard:project-visibility', args=[project.pk]),
            json.dumps({'profileOnly': 'true'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

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

    def test_admin_panel_includes_project_comment_count_without_comment_details(self):
        root_comment = ProjectComment.objects.create(
            project=self.project,
            author=self.student,
            body='تعليق رئيسي',
        )
        ProjectComment.objects.create(
            project=self.project,
            author=self.admin,
            body='رد',
            parent=root_comment,
        )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('dashboard:home'))

        self.assertEqual(response.status_code, 200)
        project_data = next(
            item for item in response.context['admin_projects_json']
            if item['pk'] == self.project.pk
        )
        self.assertEqual(project_data['comments'], [])
        self.assertEqual(project_data['commentsCount'], 1)


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
        course_certificate = next(item for item in certificates if item['type'] == 'course')
        self.assertEqual(course_certificate['studentId'], str(self.student.pk))
        manual_certificate = next(item for item in certificates if item['type'] == 'manual')
        self.assertEqual(manual_certificate['studentId'], str(self.student.pk))
        self.assertEqual(manual_certificate['category'], 'تطوير')
        self.assertEqual(manual_certificate['description'], 'وصف الشهادة')
        self.assertEqual(manual_certificate['skills'], ['Python', 'Django'])
        self.assertEqual(manual_certificate['verifyUrl'], 'https://example.com/verify')

    def test_admin_panel_lists_in_person_workshop_certificates(self):
        workshop = InPersonWorkshop.objects.create(
            title='ورشة التصوير الاحترافي',
            trainer_name='مدرب التصوير',
            starts_at=timezone.now(),
            duration_minutes=120,
            location='غزة',
        )
        attendance = WorkshopAttendance.objects.create(
            workshop=workshop,
            student=self.student,
        )
        issued_certificate = WorkshopCertificate.objects.create(
            attendance=attendance,
            workshop_title=workshop.title,
            trainer_name=workshop.trainer_name,
            student_name=self.student.display_name,
            attended_on=timezone.localdate(),
            duration_minutes=workshop.duration_minutes,
        )

        response = self.client.get(reverse('dashboard:home'))

        certificates = response.context['admin_student_certificates_json']
        workshop_certificate = next(
            certificate
            for certificate in certificates
            if certificate['type'] == 'workshop'
        )
        self.assertEqual(workshop_certificate['id'], f'workshop-{issued_certificate.pk}')
        self.assertEqual(workshop_certificate['title'], workshop.title)
        self.assertEqual(workshop_certificate['issuer'], workshop.trainer_name)
        self.assertEqual(workshop_certificate['studentName'], self.student.display_name)
        self.assertEqual(workshop_certificate['studentId'], str(self.student.pk))
        self.assertEqual(workshop_certificate['workshopDuration'], '2')
        self.assertEqual(workshop_certificate['workshopLocation'], 'غزة')
        self.assertTrue(workshop_certificate['active'])

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
            'fullNameArabic': 'محمد أحمد علي',
            'fullNameEnglish': 'Mohammad Ahmad Ali',
            'handle': 'database-trainer',
            'specialty': 'تطوير البرمجيات',
            'password': 'Secure#Trainer2026',
            'rating': 4.8,
            'email': 'trainer@example.com',
            'phone': '1234567890',
            'whatsapp': '+970599999999',
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
        self.assertEqual(trainer.full_name_ar, 'محمد أحمد علي')
        self.assertEqual(trainer.full_name_en, 'Mohammad Ahmad Ali')
        self.assertEqual(response.json()['trainer']['fullNameArabic'], 'محمد أحمد علي')
        self.assertEqual(response.json()['trainer']['fullNameEnglish'], 'Mohammad Ahmad Ali')
        self.assertTrue(authenticate(phone='1234567890', password='Secure#Trainer2026'))
        self.assertEqual(profile.specialization, 'تطوير البرمجيات')
        self.assertEqual(profile.bio, 'نبذة المدرب')
        self.assertEqual(profile.whatsapp, '+970599999999')
        self.assertEqual(response.json()['trainer']['whatsapp'], '+970599999999')
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
            whatsapp='+123456789012',
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
        self.assertEqual(profile.whatsapp, '+123456789012')
        self.assertFalse(profile.social_links.filter(platform=SocialPlatform.LINKEDIN).exists())
        self.assertTrue(authenticate(phone=trainer.phone, password='Secure#Trainer2026'))
        update['password'] = 'Changed#Trainer2026'
        response = self.post_json(self.save_url, update)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(authenticate(phone=trainer.phone, password='Secure#Trainer2026'))
        self.assertTrue(authenticate(phone=trainer.phone, password='Changed#Trainer2026'))

    def test_admin_can_update_trainer_to_phone_with_any_number_of_digits(self):
        response = self.post_json(self.save_url, self.trainer_payload(
            name='مدرب اختبار',
            phone='1234567890',
        ))
        self.assertEqual(response.status_code, 201, response.content)
        trainer = User.objects.get(phone='1234567890')

        update = self.trainer_payload(
            id=str(trainer.pk),
            name=trainer.full_name,
            handle=trainer.handle,
            phone='12345678901234567890',
            password='',
        )
        response = self.post_json(self.save_url, update)

        self.assertEqual(response.status_code, 200, response.content)
        trainer.refresh_from_db()
        self.assertEqual(trainer.phone, '12345678901234567890')

    def test_admin_can_update_trainer_to_phone_with_country_prefix(self):
        response = self.post_json(self.save_url, self.trainer_payload(
            name='مدرب اختبار',
            phone='1234567890',
        ))
        self.assertEqual(response.status_code, 201, response.content)
        trainer = User.objects.get(phone='1234567890')

        update = self.trainer_payload(
            id=str(trainer.pk),
            name=trainer.full_name,
            handle=trainer.handle,
            phone='+1234567890',
            password='',
        )
        response = self.post_json(self.save_url, update)

        self.assertEqual(response.status_code, 200, response.content)
        trainer.refresh_from_db()
        self.assertEqual(trainer.phone, '+1234567890')

    def test_trainer_form_fields_are_optional_and_handle_is_generated_on_create(self):
        payload = self.trainer_payload(
            name='Automatic Trainer',
            phone='1234567891',
        )
        for field in (
            'fullNameArabic', 'fullNameEnglish', 'handle', 'specialty', 'rating',
            'email', 'whatsapp', 'bio', 'linkedin', 'github', 'avatar', 'joined',
            'status', 'verified',
        ):
            payload.pop(field)

        response = self.post_json(self.save_url, payload)

        self.assertEqual(response.status_code, 201, response.content)
        trainer = User.objects.get(phone='1234567891')
        profile = Profile.objects.get(user=trainer)
        self.assertEqual(trainer.handle, 'automatic-trainer')
        self.assertEqual(trainer.full_name_ar, '')
        self.assertEqual(trainer.full_name_en, '')
        self.assertEqual(trainer.date_joined.date(), timezone.localdate())
        self.assertEqual(profile.bio, '')
        self.assertEqual(profile.specialization, '')
        self.assertEqual(profile.trainer_rating, Decimal('0'))

        profile.bio = 'نبذة محفوظة'
        profile.trainer_rating = Decimal('4.5')
        profile.save(update_fields=['bio', 'trainer_rating'])
        SocialLink.objects.create(
            profile=profile,
            platform=SocialPlatform.LINKEDIN,
            url='https://linkedin.com/in/automatic-trainer',
        )
        original_handle = trainer.handle
        original_joined = trainer.date_joined
        update = dict(payload)
        update.update({'id': str(trainer.pk), 'name': 'Automatic Trainer Updated'})
        update.pop('password')

        response = self.post_json(self.save_url, update)

        self.assertEqual(response.status_code, 200, response.content)
        trainer.refresh_from_db()
        profile.refresh_from_db()
        self.assertEqual(trainer.handle, original_handle)
        self.assertEqual(trainer.date_joined, original_joined)
        self.assertEqual(profile.bio, 'نبذة محفوظة')
        self.assertEqual(profile.trainer_rating, Decimal('4.5'))
        self.assertTrue(
            profile.social_links.filter(platform=SocialPlatform.LINKEDIN).exists()
        )

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

    def test_invalid_trainer_whatsapp_is_rejected(self):
        for whatsapp in ('1234567890123', '12+345', '+'):
            with self.subTest(whatsapp=whatsapp):
                response = self.post_json(
                    self.save_url,
                    self.trainer_payload(whatsapp=whatsapp),
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn('whatsapp', response.json()['fields'])
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
            'homepageTitle': 'تعلّم وارتقِ بمهاراتك',
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
        self.assertEqual(
            response.json()['settings']['homepageTitle'],
            'تعلّم وارتقِ بمهاراتك',
        )
        stored = PlatformSettings.objects.get(pk=1).data
        self.assertEqual(stored['tagline'], 'نتعلم وننجز')
        self.assertEqual(stored['homepageTitle'], 'تعلّم وارتقِ بمهاراتك')
        self.assertFalse(stored['allowSignup'])
        self.assertEqual(stored['brandPalette'], 'emerald')
        self.assertEqual(
            self.client.get(reverse('dashboard:platform-settings')).json()['settings']['whatsapp'],
            '970591234567',
        )
        public_response = self.client.get(reverse('landing:home'))
        self.assertContains(public_response, 'منصة جديدة')
        self.assertContains(public_response, 'تعلّم وارتقِ بمهاراتك')
        self.assertContains(public_response, 'نتعلم وننجز')
        self.assertContains(public_response, 'https://example.com')
        self.assertContains(public_response, 'data-brand-palette="emerald"')

        panel_response = self.client.get(reverse('dashboard:home'))
        self.assertContains(panel_response, 'data-brand-palette="emerald"')
        self.assertGreater(panel_response.context['settings_summary']['databaseSizeBytes'], 0)
        self.assertEqual(panel_response.context['platform_settings']['brandPalette'], 'emerald')
        self.assertEqual(
            panel_response.context['platform_settings']['homepageTitle'],
            'تعلّم وارتقِ بمهاراتك',
        )

        removed_option = self.post_settings({'commentsEnabled': False})
        self.assertEqual(removed_option.status_code, 400)
        self.assertNotIn('commentsEnabled', PlatformSettings.objects.get(pk=1).data)
        invalid_palette = self.post_settings({'brandPalette': ['ocean']})
        self.assertEqual(invalid_palette.status_code, 400)
        self.assertEqual(PlatformSettings.objects.get(pk=1).data['brandPalette'], 'emerald')
        invalid_homepage_title = self.post_settings({'homepageTitle': ''})
        self.assertEqual(invalid_homepage_title.status_code, 400)
        self.assertEqual(
            PlatformSettings.objects.get(pk=1).data['homepageTitle'],
            'تعلّم وارتقِ بمهاراتك',
        )

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
            'titleEnglish': 'Digital Design Workshop',
            'trainerName': 'مدرب الورشة',
            'trainerNameEnglish': 'Workshop Trainer',
            'description': 'تدريب عملي',
            'descriptionEnglish': 'Practical training',
            'startsAt': (timezone.now() + timedelta(days=1)).replace(microsecond=0).isoformat(),
            'durationMinutes': 90,
            'location': 'غزة',
            'locationEnglish': 'Gaza',
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
        self.assertEqual(response.context['admin_workshops_json'][0]['trainerName'], 'مدرب الورشة')
        self.assertEqual(response.context['admin_workshops_json'][0]['titleEnglish'], 'Digital Design Workshop')
        self.assertEqual(response.context['admin_workshops_json'][0]['trainerNameEnglish'], 'Workshop Trainer')
        self.assertFalse(workshop.attendance_open)

    def test_workshop_creation_requires_a_trainer_name(self):
        self.client.force_login(self.admin)

        response = self.post_json(self.save_url, self.workshop_payload(trainerName=' '))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(InPersonWorkshop.objects.exists())

    def test_adding_a_trainer_to_an_existing_workshop_fills_older_certificates(self):
        workshop = InPersonWorkshop.objects.create(
            title='ورشة سابقة',
            starts_at=timezone.now(),
            duration_minutes=60,
        )
        attendance = WorkshopAttendance.objects.create(
            workshop=workshop,
            student=self.student,
        )
        certificate = WorkshopCertificate.objects.create(
            attendance=attendance,
            workshop_title=workshop.title,
            student_name=self.student.display_name,
            attended_on=timezone.localdate(),
            duration_minutes=workshop.duration_minutes,
        )

        self.client.force_login(self.admin)
        response = self.post_json(
            self.save_url,
            self.workshop_payload(id=workshop.pk, trainerName='مدرب سابق'),
        )

        self.assertEqual(response.status_code, 200, response.content)
        certificate.refresh_from_db()
        self.assertEqual(certificate.trainer_name, 'مدرب سابق')

    def test_workshop_admin_endpoints_reject_non_admins(self):
        self.client.force_login(self.student)

        create_response = self.post_json(self.save_url, self.workshop_payload())
        self.assertEqual(create_response.status_code, 403)
        course_qr_response = self.post_json(
            reverse('dashboard:course-workshop-qr', args=[1]),
            {},
        )
        self.assertEqual(course_qr_response.status_code, 403)

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

    def test_admin_can_view_workshop_attendees(self):
        workshop = self.create_workshop()
        attendance = WorkshopAttendance.objects.create(
            workshop=workshop,
            student=self.student,
        )
        url = reverse('dashboard:workshop-attendees', args=[workshop.pk])

        self.client.force_login(self.admin)
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['attendees'], [{
            'name': self.student.display_name,
            'handle': self.student.handle,
            'attendedAt': attendance.attended_at.isoformat(),
        }])

    def test_workshop_attendee_list_rejects_non_admins_and_missing_workshops(self):
        workshop = self.create_workshop()
        url = reverse('dashboard:workshop-attendees', args=[workshop.pk])

        self.client.force_login(self.student)
        denied = self.client.get(url)
        self.assertEqual(denied.status_code, 403)

        self.client.force_login(self.admin)
        missing = self.client.get(
            reverse('dashboard:workshop-attendees', args=[999999])
        )
        self.assertEqual(missing.status_code, 404)

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
        self.assertEqual(certificate.workshop_title_en, workshop.title_en)
        self.assertEqual(certificate.trainer_name, workshop.trainer_name)
        self.assertEqual(certificate.trainer_name_en, workshop.trainer_name_en)
        self.assertEqual(certificate.student_name, self.student.display_name)
        self.assertEqual(certificate.duration_minutes, workshop.duration_minutes)
        self.assertEqual(certificate.code, first.json()['certificate']['code'])

        profile = self.client.get(reverse('accounts:profile', args=[self.student.handle]))
        self.assertEqual(profile.status_code, 200)
        self.assertNotContains(profile, 'vendor/jsQR.js')
        portfolio = self.client.get(reverse('portfolio:home'))
        self.assertEqual(portfolio.status_code, 200)
        active_workshops = [
            item for item in portfolio.context['active_courses_json']
            if item.get('workshop')
        ]
        self.assertEqual(len(active_workshops), 1)
        self.assertEqual(active_workshops[0]['title'], workshop.title)
        self.assertEqual(active_workshops[0]['inPersonKind'], 'workshop')
        self.assertEqual(
            active_workshops[0]['id'],
            f'workshop-{certificate.pk}',
        )
        self.assertNotContains(profile, 'workshop-scanner.js')
        workshop_certs = [
            item for item in profile.context['profile_certs_json']
            if item.get('workshop')
        ]
        self.assertEqual(len(workshop_certs), 1)
        self.assertEqual(workshop_certs[0]['title'], workshop.title)
        self.assertEqual(workshop_certs[0]['trainerName'], 'مدرب الورشة')
        self.assertEqual(workshop_certs[0]['duration'], '1.5')
        self.assertEqual(workshop_certs[0]['workshopDetails']['duration'], '1.5')

        self.client.force_login(self.admin)
        edited = self.post_json(
            self.save_url,
            self.workshop_payload(
                id=workshop.pk,
                title='عنوان محدث',
                trainerName='مدرب بديل',
                durationMinutes=120,
            ),
        )
        self.assertEqual(edited.status_code, 200, edited.content)
        certificate.refresh_from_db()
        self.assertEqual(certificate.workshop_title, 'ورشة التصميم الرقمي')
        self.assertEqual(certificate.trainer_name, 'مدرب الورشة')
        self.assertEqual(certificate.duration_minutes, 90)

    def test_inperson_workshop_course_qr_records_attendance_and_issues_profile_certificate(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='ورشة تصميم واجهات',
            title_en='Interface Design Workshop',
            summary='تدريب عملي على تصميم الواجهات.',
            duration='2.5 ساعة',
            course_type=CourseType.IN_PERSON,
            in_person_kind=InPersonCourseKind.WORKSHOP,
            status=CourseStatus.PUBLISHED,
        )
        previous_cohort = InPersonCourseCohort.objects.create(
            course=course,
            number=1,
            ended_at=timezone.now(),
        )
        project_section = CourseSection.objects.create(
            course=course,
            title='مشاريع الورشة',
        )
        trainer_project = Project.objects.create(
            owner=self.trainer,
            title='مشروع صفحة هبوط',
            summary='أنشئ صفحة هبوط بسيطة.',
        )
        project_lesson = Lesson.objects.create(
            section=project_section,
            title='تنفيذ صفحة الهبوط',
            type=LessonType.PROJECT,
            linked_project=trainer_project,
        )
        trainer_profile, _ = Profile.objects.get_or_create(user=self.trainer)
        trainer_profile.avatar.name = 'avatars/workshop-trainer.png'
        trainer_profile.save(update_fields=['avatar'])
        self.client.force_login(self.admin)

        qr_response = self.post_json(
            reverse('dashboard:course-workshop-qr', args=[course.pk]),
            {},
        )

        self.assertEqual(qr_response.status_code, 200, qr_response.content)
        workshop = InPersonWorkshop.objects.get(course=course)
        self.assertEqual(workshop.duration_minutes, 150)
        self.assertEqual(workshop.title, course.title)
        self.assertEqual(qr_response.json()['workshop']['courseId'], course.pk)

        qr_again = self.post_json(
            reverse('dashboard:course-workshop-qr', args=[course.pk]),
            {},
        )
        self.assertEqual(qr_again.status_code, 200, qr_again.content)
        self.assertEqual(qr_again.json()['workshop']['id'], workshop.pk)
        self.assertEqual(InPersonWorkshop.objects.filter(course=course).count(), 1)

        opened = self.post_json(
            reverse('dashboard:workshop-attendance-status', args=[workshop.pk]),
            {'open': True},
        )
        self.assertEqual(opened.status_code, 200, opened.content)
        self.client.force_login(self.student)
        scan = self.post_json(
            self.scan_url,
            {'token': str(workshop.qr_token)},
        )

        self.assertEqual(scan.status_code, 201, scan.content)
        self.assertEqual(scan.json()['activeCourse']['id'], course.slug)
        self.assertEqual(
            scan.json()['activeCourse']['inPersonKind'],
            InPersonCourseKind.WORKSHOP,
        )
        self.assertEqual(
            scan.json()['certificateUrl'],
            reverse(
                'courses:certificate',
                kwargs={'pk': f'workshop-{scan.json()["certificate"]["id"].split("-")[1]}'},
            ),
        )
        self.assertEqual(
            scan.json()['certificate']['trainerProfileUrl'],
            reverse('accounts:profile', kwargs={'handle': self.trainer.handle}),
        )
        self.assertEqual(
            scan.json()['certificate']['trainerAvatar'],
            trainer_profile.avatar.url,
        )
        certificate = WorkshopCertificate.objects.get(
            attendance__workshop=workshop,
            attendance__student=self.student,
        )
        registration = CourseRegistrationRequest.objects.get(
            course=course,
            student=self.student,
        )
        self.assertEqual(registration.status, CourseRegistrationRequestStatus.ACCEPTED)
        self.assertNotEqual(registration.cohort, previous_cohort)
        self.assertEqual(registration.cohort.number, 2)
        self.assertIsNone(registration.cohort.ended_at)
        self.assertEqual(registration.course_price_amount, Decimal('0.00'))
        self.client.force_login(self.admin)
        admin_dashboard = self.client.get(reverse('dashboard:home'))
        visible_registration = next(
            item for item in admin_dashboard.context['course_registration_requests_json']
            if item['id'] == str(registration.pk)
        )
        self.assertEqual(visible_registration['studentId'], str(self.student.pk))
        self.assertEqual(visible_registration['cohortId'], str(registration.cohort_id))
        self.assertEqual(visible_registration['status'], CourseRegistrationRequestStatus.ACCEPTED)
        admin_workshop = next(
            item for item in admin_dashboard.context['admin_workshops_json']
            if item['id'] == workshop.pk
        )
        self.assertEqual(admin_workshop['attendeesCount'], 1)
        attendee_list = self.client.get(
            reverse('dashboard:workshop-attendees', args=[workshop.pk])
        )
        self.assertEqual(attendee_list.status_code, 200, attendee_list.content)
        self.assertEqual(attendee_list.json()['attendees'], [{
            'name': self.student.display_name,
            'handle': self.student.handle,
            'attendedAt': WorkshopAttendance.objects.get(
                workshop=workshop,
                student=self.student,
            ).attended_at.isoformat(),
        }])
        active_cohort = next(
            item for item in admin_dashboard.context['admin_inperson_cohorts_json']
            if item['id'] == str(registration.cohort_id)
        )
        self.assertTrue(active_cohort['active'])
        self.client.force_login(self.student)
        self.assertEqual(certificate.workshop_title, course.title)
        self.assertEqual(certificate.duration_minutes, 150)
        self.assertEqual(certificate.attended_on, timezone.localdate())
        student_project = Project.objects.get(
            owner=self.student,
            source_lesson=project_lesson,
        )
        self.assertEqual(student_project.title, trainer_project.title)
        self.assertEqual(student_project.status, ProjectStatus.PUBLISHED)
        self.assertEqual(
            Project.objects.filter(
                owner=self.student,
                source_lesson=project_lesson,
            ).count(),
            1,
        )
        completed_lesson = self.post_json(
            reverse('courses:progress'),
            {
                'id': course.slug,
                'lesson': project_lesson.pk,
                'done': True,
            },
        )
        self.assertEqual(completed_lesson.status_code, 200, completed_lesson.content)
        completion_data = completed_lesson.json()
        self.assertTrue(completion_data['newlyCompleted'])
        self.assertEqual(
            completion_data['certificateUrl'],
            reverse(
                'courses:certificate',
                kwargs={'pk': f'workshop-{certificate.pk}'},
            ),
        )
        self.assertTrue(completion_data['certificate']['workshop'])
        self.assertEqual(
            WorkshopCertificate.objects.filter(
                attendance__workshop=workshop,
                attendance__student=self.student,
            ).count(),
            1,
        )
        self.assertEqual(
            CourseRegistrationRequest.objects.filter(
                course=course,
                student=self.student,
                cohort=registration.cohort,
                status=CourseRegistrationRequestStatus.ACCEPTED,
            ).count(),
            1,
        )
        self.assertFalse(
            CourseCertificate.objects.filter(
                student=self.student,
                course=course,
            ).exists()
        )
        repeated_scan = self.post_json(
            self.scan_url,
            {'token': str(workshop.qr_token)},
        )
        self.assertEqual(repeated_scan.status_code, 200, repeated_scan.content)
        self.assertTrue(repeated_scan.json()['alreadyRegistered'])
        self.assertEqual(
            WorkshopAttendance.objects.filter(
                workshop=workshop,
                student=self.student,
            ).count(),
            1,
        )
        self.assertEqual(
            WorkshopCertificate.objects.filter(
                attendance__workshop=workshop,
                attendance__student=self.student,
            ).count(),
            1,
        )
        self.assertEqual(
            Project.objects.filter(
                owner=self.student,
                source_lesson=project_lesson,
            ).count(),
            1,
        )
        repeated_completion = self.post_json(
            reverse('courses:progress'),
            {
                'id': course.slug,
                'lesson': project_lesson.pk,
                'done': True,
            },
        )
        self.assertFalse(repeated_completion.json()['newlyCompleted'])
        self.assertEqual(
            Project.objects.filter(
                owner=self.student,
                source_lesson=project_lesson,
            ).count(),
            1,
        )
        playlist = self.client.get(
            reverse('courses:playlist', kwargs={'pk': course.slug})
        )
        self.assertEqual(
            playlist.context['progress_json']['certificateUrl'],
            completion_data['certificateUrl'],
        )
        profile = self.client.get(reverse('accounts:profile', args=[self.student.handle]))
        self.assertEqual(profile.status_code, 200)
        self.assertTrue(any(
            item['id'] == student_project.slug
            for item in profile.context['projects_json']
        ))
        self.assertTrue(any(
            item.get('workshop') and item['title'] == course.title
            for item in profile.context['profile_certs_json']
        ))

    def test_course_workshop_qr_rejects_non_workshop_courses_and_invalid_durations(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='دورة وجاهية',
            duration='2',
            course_type=CourseType.IN_PERSON,
            in_person_kind=InPersonCourseKind.COURSE,
        )
        self.client.force_login(self.admin)

        response = self.post_json(
            reverse('dashboard:course-workshop-qr', args=[course.pk]),
            {},
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(InPersonWorkshop.objects.filter(course=course).exists())
        course.in_person_kind = InPersonCourseKind.WORKSHOP
        course.duration = '25'
        course.save(update_fields=['in_person_kind', 'duration'])
        invalid_duration = self.post_json(
            reverse('dashboard:course-workshop-qr', args=[course.pk]),
            {},
        )
        self.assertEqual(invalid_duration.status_code, 400)
        self.assertFalse(InPersonWorkshop.objects.filter(course=course).exists())

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


class TrainingCategoryManagementTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591999001',
            password='admin-password',
            full_name='مدير المجالات',
            role=UserRole.ADMIN,
        )
        self.client.force_login(self.admin)
        self.url = reverse('dashboard:training-categories')

    def post_json(self, payload):
        return self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type='application/json',
        )

    def test_category_management_requires_an_admin(self):
        self.client.logout()
        anonymous_response = self.client.get(self.url)
        self.assertEqual(anonymous_response.status_code, 401)

        student = User.objects.create_user(
            phone='0591999003',
            password='student-password',
            full_name='مستخدم عادي',
            role=UserRole.STUDENT,
        )
        self.client.force_login(student)
        student_response = self.client.post(
            self.url,
            data=json.dumps({'action': 'create', 'name': 'البرمجة'}),
            content_type='application/json',
        )
        self.assertEqual(student_response.status_code, 403)
        self.assertFalse(TrainingCategory.objects.exists())

    def test_category_crud_keeps_courses_projects_and_profiles_in_sync(self):
        created = self.post_json({'action': 'create', 'name': 'البرمجة'})
        self.assertEqual(created.status_code, 200, created.content)
        category = TrainingCategory.objects.get(name='البرمجة')

        course = Course.objects.create(
            owner=self.admin,
            title='دورة برمجة',
            category=category.name,
        )
        project = Project.objects.create(
            owner=self.admin,
            title='مشروع برمجة',
            category=category.name,
        )
        freelancer = User.objects.create_user(
            phone='0591999002',
            password='student-password',
            full_name='مستقل برمجة',
            role=UserRole.STUDENT,
        )
        profile = freelancer.profile
        profile.specialization = category.name
        profile.save(update_fields=['specialization'])
        trainer = User.objects.create_user(
            phone='0591999004',
            password='trainer-password',
            full_name='مدرب برمجة',
            role=UserRole.TRAINER,
        )
        trainer.profile.specialization = category.name
        trainer.profile.save(update_fields=['specialization'])

        updated = self.post_json({
            'action': 'update',
            'id': category.pk,
            'name': 'تطوير البرمجيات',
        })
        self.assertEqual(updated.status_code, 200, updated.content)
        course.refresh_from_db()
        project.refresh_from_db()
        profile.refresh_from_db()
        self.assertEqual(course.category, 'تطوير البرمجيات')
        self.assertEqual(project.category, 'تطوير البرمجيات')
        self.assertEqual(profile.specialization, 'تطوير البرمجيات')

        listed = self.client.get(self.url)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()['categories'][0]['courses'], 1)
        self.assertEqual(listed.json()['categories'][0]['projects'], 1)
        self.assertEqual(listed.json()['categories'][0]['students'], 1)
        self.assertEqual(listed.json()['categories'][0]['trainers'], 1)

        deleted = self.post_json({'action': 'delete', 'id': category.pk})
        self.assertEqual(deleted.status_code, 200, deleted.content)
        course.refresh_from_db()
        project.refresh_from_db()
        profile.refresh_from_db()
        self.assertEqual(course.category, '')
        self.assertEqual(project.category, '')
        self.assertEqual(profile.specialization, '')
        self.assertFalse(TrainingCategory.objects.filter(pk=category.pk).exists())

    def test_category_active_status_is_saved_and_returned(self):
        category = TrainingCategory.objects.create(name='البرمجة')

        response = self.post_json({
            'action': 'set_active',
            'id': category.pk,
            'active': False,
        })

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['category']['is_active'])
        category.refresh_from_db()
        self.assertFalse(category.is_active)

        listed = self.client.get(self.url)
        self.assertFalse(listed.json()['categories'][0]['is_active'])

    def test_category_projects_filter_visibility_is_saved_and_returned(self):
        category = TrainingCategory.objects.create(name='البرمجة')

        response = self.post_json({
            'action': 'set_projects_filter',
            'id': category.pk,
            'visible': False,
        })

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['category']['show_in_projects_filter'])
        category.refresh_from_db()
        self.assertFalse(category.show_in_projects_filter)

        listed = self.client.get(self.url)
        listed_category = next(
            item for item in listed.json()['categories'] if item['id'] == category.pk
        )
        self.assertFalse(listed_category['show_in_projects_filter'])

    def test_projects_filter_visibility_only_affects_all_projects_filter(self):
        visible = TrainingCategory.objects.create(name='تحليل البيانات')
        hidden = TrainingCategory.objects.create(
            name='التصميم',
            show_in_projects_filter=False,
        )

        response = self.client.get(reverse('projects:list'))

        self.assertEqual(response.status_code, 200)
        self.assertIn(visible.name, response.context['training_categories_json'])
        self.assertNotIn(hidden.name, response.context['training_categories_json'])
        self.assertTrue(hidden.is_active)

        courses_response = self.client.get(reverse('courses:list'))
        self.assertIn(hidden.name, courses_response.context['training_categories_json'])

    def test_inactive_category_and_courses_are_hidden_from_all_courses_listing(self):
        active = TrainingCategory.objects.create(name='تحليل البيانات')
        inactive = TrainingCategory.objects.create(name='التصميم', is_active=False)
        visible_course = Course.objects.create(
            owner=self.admin,
            title='دورة تحليل البيانات',
            category=active.name,
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.ONLINE,
        )
        hidden_course = Course.objects.create(
            owner=self.admin,
            title='دورة التصميم',
            category=inactive.name,
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.ONLINE,
        )

        response = self.client.get(reverse('courses:list'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['training_categories_json'], [active.name])
        self.assertEqual(
            [course['slug'] for course in response.context['courses_json']],
            [visible_course.slug],
        )
        self.assertNotIn(
            hidden_course.slug,
            [course['slug'] for course in response.context['courses_json']],
        )

    def test_categories_are_exposed_to_all_public_listing_filters(self):
        TrainingCategory.objects.create(name='تحليل البيانات')
        TrainingCategory.objects.create(name='تصميم غير نشط', is_active=False)
        FreelancerCategory.objects.create(name='تحليل البيانات')
        FreelancerCategory.objects.create(name='تصميم غير نشط', is_active=False)

        for route in ('courses:list', 'projects:list'):
            with self.subTest(route=route):
                response = self.client.get(reverse(route))
                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    response.context['training_categories_json'],
                    ['تحليل البيانات'],
                )
        freelancer_listing = self.client.get(reverse('accounts:list'))
        self.assertEqual(freelancer_listing.status_code, 200)
        self.assertEqual(
            freelancer_listing.context['training_categories_json'],
            ['تحليل البيانات'],
        )


class FreelancerCategoryManagementTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591999011',
            password='admin-password',
            full_name='مدير فئات المستقلين',
            role=UserRole.ADMIN,
        )
        self.client.force_login(self.admin)
        self.url = reverse('dashboard:freelancer-categories')

    def post_json(self, payload):
        return self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type='application/json',
        )

    def test_category_create_update_toggle_and_delete(self):
        created = self.post_json({'action': 'create', 'name': 'تصميم'})
        self.assertEqual(created.status_code, 200, created.content)
        category = FreelancerCategory.objects.get(name='تصميم')

        trainer = User.objects.create_user(
            phone='0591999012',
            password='trainer-password',
            full_name='مدرب التصميم',
            role=UserRole.TRAINER,
        )
        trainer.profile.specialization = category.name
        trainer.profile.save(update_fields=['specialization'])

        updated = self.post_json({
            'action': 'update',
            'id': category.pk,
            'name': 'التصميم الرقمي',
        })
        self.assertEqual(updated.status_code, 200, updated.content)
        trainer.profile.refresh_from_db()
        self.assertEqual(trainer.profile.specialization, 'التصميم الرقمي')

        deactivated = self.post_json({
            'action': 'set_active',
            'id': category.pk,
            'active': False,
        })
        self.assertEqual(deactivated.status_code, 200, deactivated.content)
        self.assertFalse(deactivated.json()['category']['is_active'])

        deleted = self.post_json({'action': 'delete', 'id': category.pk})
        self.assertEqual(deleted.status_code, 200, deleted.content)
        trainer.profile.refresh_from_db()
        self.assertEqual(trainer.profile.specialization, '')
        self.assertFalse(FreelancerCategory.objects.filter(pk=category.pk).exists())

    def test_freelancer_listing_filters_active_freelancer_categories(self):
        active = FreelancerCategory.objects.create(name='تطوير الويب')
        inactive = FreelancerCategory.objects.create(name='التصميم', is_active=False)
        trainer = User.objects.create_user(
            phone='0591999013',
            password='trainer-password',
            full_name='مستقل تطوير الويب',
            role=UserRole.TRAINER,
        )
        trainer.profile.specialization = active.name
        trainer.profile.save(update_fields=['specialization'])

        response = self.client.get(reverse('accounts:list'))

        self.assertEqual(response.status_code, 200)
        self.assertIn(active.name, response.context['training_categories_json'])
        self.assertNotIn(inactive.name, response.context['training_categories_json'])

    def test_freelancer_category_api_requires_admin(self):
        self.client.logout()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 401)


class AdminDisplayOrderTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000031',
            password='admin-password',
            full_name='مدير الترتيب',
            role=UserRole.ADMIN,
        )
        self.trainers = [
            User.objects.create_user(
                phone=f'059100003{number}',
                password='trainer-password',
                full_name=f'مدرب {number}',
                role=UserRole.TRAINER,
            )
            for number in (2, 3)
        ]
        self.students = [
            User.objects.create_user(
                phone=f'059100004{number}',
                password='student-password',
                full_name=f'طالب {number}',
                role=UserRole.STUDENT,
            )
            for number in (1, 2)
        ]
        for user in self.trainers + self.students:
            Profile.objects.get_or_create(user=user)
        self.courses = [
            Course.objects.create(
                owner=self.trainers[0],
                title=f'دورة {number}',
                status=CourseStatus.PUBLISHED,
            )
            for number in (1, 2)
        ]
        self.projects = [
            Project.objects.create(
                owner=self.trainers[0],
                title=f'مشروع {number}',
                status=ProjectStatus.PUBLISHED,
            )
            for number in (1, 2)
        ]
        self.url = reverse('dashboard:display-order')
        self.client.force_login(self.admin)

    def post_order(self, kind, order):
        return self.client.post(
            self.url,
            json.dumps({'kind': kind, 'order': [str(item) for item in order]}),
            content_type='application/json',
        )

    def test_admin_can_save_order_for_courses_projects_trainers_and_students(self):
        for kind, objects in (
            ('courses', self.courses),
            ('projects', self.projects),
        ):
            order = [item.pk for item in reversed(objects)]
            response = self.post_order(kind, order)
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(
                list(
                    (Course if kind == 'courses' else Project)
                    .objects.filter(pk__in=[item.pk for item in objects])
                    .order_by('display_order')
                    .values_list('pk', flat=True)
                ),
                order,
            )
            route = 'courses:list' if kind == 'courses' else 'projects:list'
            listing = self.client.get(reverse(route))
            self.assertEqual(listing.status_code, 200)
            expected_slugs = [
                (Course if kind == 'courses' else Project).objects.get(pk=pk).slug
                for pk in order
            ]
            listing_key = 'courses_json' if kind == 'courses' else 'projects_json'
            self.assertEqual(
                [item['slug'] for item in listing.context[listing_key]],
                expected_slugs,
            )

        trainer_order = [user.pk for user in reversed(self.trainers)]
        response = self.post_order('trainers', trainer_order)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            list(
                Profile.objects.filter(user__role=UserRole.TRAINER)
                .order_by('display_order')
                .values_list('user_id', flat=True)
            ),
            trainer_order,
        )
        self.assertEqual(
            list(
                Profile.objects.filter(user__role=UserRole.STUDENT)
                .order_by('display_order')
                .values_list('user_id', flat=True)
            ),
            [user.pk for user in self.students],
        )

        student_order = [user.pk for user in reversed(self.students)]
        response = self.post_order('students', student_order)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            list(
                Profile.objects.filter(
                    user__role__in=(UserRole.TRAINER, UserRole.STUDENT)
                ).order_by('display_order')
                .values_list('user_id', flat=True)
            ),
            trainer_order + student_order,
        )

    def test_order_rejects_duplicate_and_stale_lists(self):
        duplicate = self.post_order('courses', [self.courses[0].pk, self.courses[0].pk])
        self.assertEqual(duplicate.status_code, 400)

        stale = self.post_order('courses', [self.courses[0].pk])
        self.assertEqual(stale.status_code, 409)

    def test_admin_can_reorder_inperson_courses_for_the_homepage(self):
        inperson_courses = [
            Course.objects.create(
                owner=self.trainers[0],
                title=f'دورة وجاهية {number}',
                status=CourseStatus.PUBLISHED,
                course_type=CourseType.IN_PERSON,
            )
            for number in (1, 2)
        ]
        expected_order = [course.pk for course in reversed(inperson_courses)]

        response = self.post_order('inperson-courses', expected_order)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            list(
                Course.objects.filter(course_type=CourseType.IN_PERSON)
                .order_by('display_order')
                .values_list('pk', flat=True)
            ),
            expected_order,
        )
        self.assertEqual(
            Course.objects.filter(
                pk__in=[course.pk for course in self.courses],
                display_order__isnull=True,
            ).count(),
            len(self.courses),
            'Reordering in-person courses must not change online-course order.',
        )
        homepage = self.client.get(reverse('landing:home'))
        self.assertEqual(
            [course['id'] for course in homepage.context['inperson_courses_json']],
            [Course.objects.get(pk=pk).slug for pk in expected_order],
        )

    def test_non_admin_cannot_reorder(self):
        self.client.force_login(self.students[0])

        response = self.post_order('courses', [item.pk for item in self.courses])

        self.assertEqual(response.status_code, 403)
