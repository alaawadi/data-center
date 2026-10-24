"""Tests for the courses module: permissions, CRUD and page payloads."""
import base64
import json
import shutil
import tempfile
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from users.models import User, UserRole

from projects.models import Project, ProjectFile, ProjectImage, ProjectStatus, ProjectTag

from .models import (
    Course,
    CourseCertificate,
    CourseProgress,
    CourseSection,
    CourseStatus,
    Lesson,
    LessonType,
    ManualCertificate,
    ManualCertificateStatus,
    Quiz,
    QuizAttempt,
    QuizChoice,
    QuizQuestion,
    StudentPointTransaction,
    StudentReferral,
    StudentReferralLink,
)


def _payload(**kwargs):
    base = {
        'id': '',
        'title': 'دورة بايثون للمبتدئين',
        'summary': 'ملخص الدورة',
        'content': '<p>وصف تفصيلي للدورة</p>',
        'category': 'برمجة',
        'price': '₪150',
        'duration': '20 ساعة',
        'period': '8 لقاءات',
        'credentialId': 'PY-2026-1',
        'verifyUrl': 'https://example.com/verify/PY-2026-1',
        'tags': ['Python', 'Basics'],
        'cover': '',
        'syllabus': [
            {
                'id': None,
                'title': 'البداية',
                'lessons': [
                    {
                        'id': None,
                        'title': 'مقدمة',
                        'duration': '08:20',
                        'type': 'video',
                        'free': True,
                        'content': 'محتوى الدرس',
                        'videoUrl': 'https://example.com/v1.mp4',
                    }
                ],
            }
        ],
        'status': 'published',
    }
    base.update(kwargs)
    return base


class CoursePermissionsTests(TestCase):
    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059111111', password='pass1234', full_name='مدرب أول', role=UserRole.TRAINER
        )
        self.other_trainer = User.objects.create_user(
            phone='059222222', password='pass1234', full_name='مدرب آخر', role=UserRole.TRAINER
        )
        self.student = User.objects.create_user(
            phone='059333333', password='pass1234', full_name='طالب مجتهد', role=UserRole.STUDENT
        )
        self.admin = User.objects.create_user(
            phone='059444444', password='pass1234', full_name='مدير النظام', role=UserRole.ADMIN
        )
        self.save_url = reverse('courses:save')
        self.delete_url = reverse('courses:delete')

    def _post(self, payload, user=None):
        if user is not None:
            self.client.force_login(user)
        return self.client.post(
            self.save_url,
            data=json.dumps(payload),
            content_type='application/json',
        )

    def test_anonymous_cannot_save(self):
        res = self._post(_payload())
        self.assertEqual(res.status_code, 302)

    def test_student_cannot_create_course(self):
        res = self._post(_payload(), self.student)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()['error'], 'not_trainer')
        self.assertEqual(Course.objects.count(), 0)

    def test_trainer_creates_course_with_syllabus(self):
        res = self._post(_payload(), self.trainer)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['ok'])
        self.assertEqual(data['status'], CourseStatus.PUBLISHED)

        course = Course.objects.get(owner=self.trainer)
        self.assertEqual(course.slug, data['id'])
        self.assertEqual(course.price, '₪150')
        self.assertEqual(course.skills, ['Python', 'Basics'])
        self.assertEqual(course.credential_id, 'PY-2026-1')
        self.assertEqual(course.sections.count(), 1)
        lesson = course.sections.first().lessons.first()
        self.assertEqual(lesson.title, 'مقدمة')
        self.assertEqual(lesson.duration, '08:20')
        self.assertTrue(lesson.is_free)
        self.assertEqual(lesson.video_url, 'https://example.com/v1.mp4')

    def test_admin_can_create_course_and_assign_it_to_a_trainer(self):
        res = self._post(_payload(trainerId=str(self.other_trainer.pk)), self.admin)

        self.assertEqual(res.status_code, 200, res.content)
        course = Course.objects.get(slug=res.json()['id'])
        self.assertEqual(course.owner, self.other_trainer)
        self.assertEqual(course.title, 'دورة بايثون للمبتدئين')

    def test_admin_can_update_course_and_reassign_it_to_another_trainer(self):
        course = Course.objects.create(owner=self.trainer, title='دورة قائمة')

        res = self._post(
            _payload(id=course.slug, trainerId=str(self.other_trainer.pk), title='دورة معدلة'),
            self.admin,
        )

        self.assertEqual(res.status_code, 200, res.content)
        course.refresh_from_db()
        self.assertEqual(course.owner, self.other_trainer)
        self.assertEqual(course.title, 'دورة معدلة')

    def test_admin_must_select_a_trainer_to_create_a_course(self):
        res = self._post(_payload(), self.admin)

        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['error'], 'trainer_required')
        self.assertEqual(Course.objects.count(), 0)

    def test_admin_cannot_assign_course_to_inactive_trainer(self):
        inactive_trainer = User.objects.create_user(
            phone='059555551',
            password='pass1234',
            full_name='مدرب غير نشط',
            role=UserRole.TRAINER,
            is_active=False,
        )
        res = self._post(
            _payload(trainerId=str(inactive_trainer.pk)),
            self.admin,
        )

        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['error'], 'trainer_required')
        self.assertEqual(Course.objects.count(), 0)

    def test_only_owner_can_edit(self):
        course = Course.objects.create(owner=self.trainer, title='دوريتي')
        res = self._post(_payload(id=course.slug, title='عنوان جديد'), self.other_trainer)
        self.assertEqual(res.status_code, 404)
        course.refresh_from_db()
        self.assertEqual(course.title, 'دوريتي')

    def test_owner_can_edit_and_syllabus_is_synced(self):
        course = Course.objects.create(owner=self.trainer, title='دوريتي')
        res = self._post(_payload(id=course.slug, title='عنوان محدّث', status='draft'), self.trainer)
        self.assertEqual(res.status_code, 200)
        course.refresh_from_db()
        self.assertEqual(course.title, 'عنوان محدّث')
        self.assertEqual(course.status, CourseStatus.DRAFT)

        section = course.sections.get()
        lesson = section.lessons.get()
        res = self._post(
            _payload(
                id=course.slug,
                status='published',
                syllabus=[
                    {
                        'id': section.pk,
                        'title': 'قسم معدّل',
                        'lessons': [
                            {'id': lesson.pk, 'title': 'درس معدّل', 'duration': '10:00', 'type': 'article'},
                            {'title': 'درس جديد', 'duration': '05:00', 'type': 'video'},
                        ],
                    }
                ],
            ),
            self.trainer,
        )
        self.assertEqual(res.status_code, 200)
        course.refresh_from_db()
        self.assertEqual(course.sections.count(), 1)
        self.assertEqual(course.sections.get().title, 'قسم معدّل')
        self.assertEqual(course.lessons_count, 2)
        lesson.refresh_from_db()
        self.assertEqual(lesson.title, 'درس معدّل')
        self.assertEqual(lesson.type, 'article')

    def test_only_owner_can_delete(self):
        course = Course.objects.create(owner=self.trainer, title='دوريتي')
        res = self.client.post(
            self.delete_url, data=json.dumps({'id': course.slug}), content_type='application/json'
        )
        self.assertEqual(res.status_code, 302)

        self.client.force_login(self.other_trainer)
        res = self.client.post(
            self.delete_url, data=json.dumps({'id': course.slug}), content_type='application/json'
        )
        self.assertEqual(res.status_code, 404)
        self.assertTrue(Course.objects.filter(pk=course.pk).exists())

        self.client.force_login(self.trainer)
        res = self.client.post(
            self.delete_url, data=json.dumps({'id': course.slug}), content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['ok'])
        self.assertFalse(Course.objects.filter(pk=course.pk).exists())


class CoursePageTests(TestCase):
    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059444444', password='pass1234', full_name='مدرّب المنصة', role=UserRole.TRAINER
        )
        self.admin = User.objects.create_user(
            phone='059666666', password='pass1234', full_name='مدير النظام', role=UserRole.ADMIN
        )
        self.other_trainer = User.objects.create_user(
            phone='059777777', password='pass1234', full_name='مدرب آخر', role=UserRole.TRAINER
        )
        self.inactive_trainer = User.objects.create_user(
            phone='059888888',
            password='pass1234',
            full_name='مدرب غير متاح',
            role=UserRole.TRAINER,
            is_active=False,
        )
        self.student = User.objects.create_user(
            phone='059555555', password='pass1234', full_name='طالبة نشطة', role=UserRole.STUDENT
        )
        self.published = Course.objects.create(
            owner=self.trainer, title='دورة منشورة', status=CourseStatus.PUBLISHED
        )
        self.draft = Course.objects.create(
            owner=self.trainer, title='دورة مسودة', status=CourseStatus.DRAFT
        )
        section = CourseSection.objects.create(course=self.published, title='القسم الأول', order=0)
        Lesson.objects.create(section=section, title='الدرس الأول', duration='08:20', order=0)

    def test_list_page_injects_published_courses(self):
        res = self.client.get(reverse('courses:list'))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'id="courses-data"')
        self.assertContains(res, 'id="coursesSearch"')
        self.assertContains(res, 'id="coursesMore"')
        titles = [c['title'] for c in res.context['courses_json']]
        self.assertIn('دورة منشورة', titles)
        self.assertNotIn('دورة مسودة', titles)

    def test_list_page_hides_drafts_even_from_their_owner(self):
        self.client.force_login(self.trainer)
        res = self.client.get(reverse('courses:list'))
        titles = [c['title'] for c in res.context['courses_json']]
        self.assertIn('دورة منشورة', titles)
        self.assertNotIn('دورة مسودة', titles)

    def test_detail_page_payload_shape(self):
        res = self.client.get(reverse('courses:detail', kwargs={'pk': self.published.slug}))
        self.assertEqual(res.status_code, 200)
        payload = res.context['courses_json'][0]
        self.assertEqual(payload['id'], self.published.slug)
        self.assertEqual(payload['instructor'], 'مدرّب المنصة')
        self.assertEqual(payload['handle'], self.trainer.handle)
        self.assertEqual(payload['syllabus'][0]['lessons'][0]['duration'], '08:20')
        self.assertFalse(res.context['is_course_enrolled'])
        self.assertContains(res, 'id="course-enrollment-data"')

    def test_detail_page_marks_student_enrolled_only_with_course_progress(self):
        url = reverse('courses:detail', kwargs={'pk': self.published.slug})
        self.client.force_login(self.student)

        not_enrolled = self.client.get(url)
        self.assertFalse(not_enrolled.context['is_course_enrolled'])

        CourseProgress.objects.create(student=self.student, course=self.published)
        enrolled = self.client.get(url)
        self.assertTrue(enrolled.context['is_course_enrolled'])

    def test_playlist_registration_redirect_lands_on_course_detail(self):
        response = self.client.get(
            reverse('courses:detail', kwargs={'pk': self.published.slug}),
            {'registration': 'required'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context['is_course_enrolled'])

    def test_draft_detail_hidden_from_others_but_visible_to_owner(self):
        url = reverse('courses:detail', kwargs={'pk': self.draft.slug})
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_login(self.student)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_login(self.trainer)
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_playlist_page_requires_existing_course(self):
        res = self.client.get(reverse('courses:playlist', kwargs={'pk': self.published.slug}))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.context['course'], self.published)
        res = self.client.get(reverse('courses:playlist', kwargs={'pk': 'missing'}))
        self.assertEqual(res.status_code, 404)

    def test_paid_course_playlist_redirects_unenrolled_users_to_registration(self):
        self.published.price = '₪150'
        self.published.save(update_fields=['price'])
        playlist_url = reverse('courses:playlist', kwargs={'pk': self.published.slug})

        anonymous_response = self.client.get(playlist_url)
        self.assertRedirects(
            anonymous_response,
            f"{reverse('courses:detail', kwargs={'pk': self.published.slug})}?registration=required",
            fetch_redirect_response=False,
        )

        self.client.force_login(self.student)
        student_response = self.client.get(playlist_url)
        self.assertRedirects(
            student_response,
            f"{reverse('courses:detail', kwargs={'pk': self.published.slug})}?registration=required",
            fetch_redirect_response=False,
        )

        CourseProgress.objects.create(student=self.student, course=self.published)
        enrolled_response = self.client.get(playlist_url)
        self.assertEqual(enrolled_response.status_code, 200)

    def test_editor_create_requires_trainer(self):
        self.client.force_login(self.student)
        self.assertEqual(self.client.get(reverse('courses:create')).status_code, 403)
        self.client.force_login(self.trainer)
        create_response = self.client.get(reverse('courses:create'))
        self.assertEqual(create_response.status_code, 200)
        self.assertContains(create_response, 'id="edRole"')
        self.assertNotContains(create_response, '<select class="select" id="edRole"')

    def test_editor_edit_only_for_owner(self):
        url = reverse('courses:edit', kwargs={'pk': self.published.slug})
        self.client.force_login(self.student)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_login(self.trainer)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.context['courses_json'][0]['id'], self.published.slug)
        self.assertContains(res, 'id="edRole"')
        self.assertNotContains(res, '<select class="select" id="edRole"')

    def test_admin_can_open_course_editor_and_choose_a_trainer(self):
        self.client.force_login(self.student)
        self.assertEqual(self.client.get(reverse('courses:create')).status_code, 403)

        self.client.force_login(self.admin)
        create_response = self.client.get(reverse('courses:create'))
        self.assertEqual(create_response.status_code, 200)
        self.assertTrue(create_response.context['is_admin_editor'])
        self.assertContains(create_response, '<select class="select" id="edRole" required>')
        self.assertNotContains(create_response, 'id="edTrainer"')
        self.assertCountEqual(
            [trainer.pk for trainer in create_response.context['admin_trainers']],
            [self.trainer.pk, self.other_trainer.pk],
        )
        self.assertNotContains(create_response, f'value="{self.inactive_trainer.pk}"')

        edit_response = self.client.get(
            reverse('courses:edit', kwargs={'pk': self.published.slug})
        )
        self.assertEqual(edit_response.status_code, 200)
        self.assertEqual(edit_response.context['courses_json'][0]['id'], self.published.slug)
        self.assertContains(edit_response, '<select class="select" id="edRole" required>')
        self.assertContains(
            edit_response,
            f'<option value="{self.trainer.pk}">{self.trainer.display_name}</option>',
        )


class CourseProgressTests(TestCase):
    """تتبّع تقدّم الطالب: إكمال الدروس ← تهنئة ← شهادة تلقائية في قائمة شهاداته."""

    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059666666', password='pass1234', full_name='مدرب الشبكات', role=UserRole.TRAINER
        )
        self.student = User.objects.create_user(
            phone='059777777', password='pass1234', full_name='طالب مجتهد', role=UserRole.STUDENT
        )
        self.other_student = User.objects.create_user(
            phone='059888888', password='pass1234', full_name='طالب آخر', role=UserRole.STUDENT
        )
        self.course = Course.objects.create(
            owner=self.trainer, title='دورة الشبكات الأساسية', status=CourseStatus.PUBLISHED
        )
        section = CourseSection.objects.create(course=self.course, title='القسم الأول', order=0)
        self.lessons = [
            Lesson.objects.create(section=section, title=f'الدرس {i + 1}', order=i) for i in range(2)
        ]
        self.progress_url = reverse('courses:progress')
        self.playlist_url = reverse('courses:playlist', kwargs={'pk': self.course.slug})

    def _mark(self, lesson, done=True, user=None):
        if user is not None:
            self.client.force_login(user)
        return self.client.post(
            self.progress_url,
            data=json.dumps({'id': self.course.slug, 'lesson': lesson.pk, 'done': done}),
            content_type='application/json',
        )

    def test_anonymous_cannot_track_progress(self):
        res = self._mark(self.lessons[0])
        self.assertEqual(res.status_code, 302)
        self.assertEqual(CourseProgress.objects.count(), 0)

    def test_paid_course_blocks_lesson_and_quiz_endpoints_until_enrolled(self):
        self.course.price = '₪150'
        self.course.save(update_fields=['price'])
        self.client.force_login(self.student)

        response = self._mark(self.lessons[0])
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['error'], 'registration_required')
        self.assertFalse(CourseProgress.objects.filter(student=self.student, course=self.course).exists())

        response = self.client.post(
            reverse('courses:quiz_start'),
            data=json.dumps({'id': self.course.slug, 'lesson': self.lessons[0].pk}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['error'], 'registration_required')

        CourseProgress.objects.create(student=self.student, course=self.course)
        response = self._mark(self.lessons[0])
        self.assertEqual(response.status_code, 200)

    def test_completion_creates_certificate_automatically(self):
        res = self._mark(self.lessons[0], user=self.student)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['ok'])
        self.assertEqual(data['done'], 1)
        self.assertEqual(data['total'], 2)
        self.assertFalse(data['complete'])
        self.assertFalse(data['newlyCompleted'])
        self.assertEqual(CourseCertificate.objects.count(), 0)

        res = self._mark(self.lessons[1])
        data = res.json()
        self.assertTrue(data['complete'])
        self.assertTrue(data['newlyCompleted'])
        self.assertEqual(data['percent'], 100)

        cert = CourseCertificate.objects.get(student=self.student, course=self.course)
        self.assertEqual(data['certificate']['title'], cert.to_public_dict()['title'])

        progress = CourseProgress.objects.get(student=self.student, course=self.course)
        self.assertTrue(progress.completed)
        self.assertEqual(progress.done_count, 2)

        payload = cert.to_public_dict()
        self.assertEqual(payload['title'], 'دورة الشبكات الأساسية')
        self.assertTrue(payload['earned'])
        self.assertEqual(payload['handle'], self.student.handle)
        self.assertEqual(payload['issuer'], 'مدرب الشبكات')
        self.assertEqual(payload['studentName'], 'طالب مجتهد')

    def test_certificate_not_duplicated_on_recompletion(self):
        self.client.force_login(self.student)
        self._mark(self.lessons[0])
        self._mark(self.lessons[1])
        self.assertEqual(CourseCertificate.objects.count(), 1)

        res = self._mark(self.lessons[1], done=False)
        data = res.json()
        self.assertFalse(data['newlyCompleted'])
        self.assertTrue(data['complete'])
        self.assertEqual(CourseCertificate.objects.count(), 1)

        res = self._mark(self.lessons[1])
        data = res.json()
        self.assertFalse(data['newlyCompleted'])
        self.assertEqual(CourseCertificate.objects.count(), 1)

    def test_lesson_must_belong_to_course(self):
        other_course = Course.objects.create(owner=self.trainer, title='دورة أخرى')
        section = CourseSection.objects.create(course=other_course, title='قسم', order=0)
        foreign_lesson = Lesson.objects.create(section=section, title='درس غريب')
        res = self._mark(foreign_lesson, user=self.student)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['error'], 'invalid_lesson')

    def test_draft_course_progress_forbidden_for_others(self):
        draft = Course.objects.create(owner=self.trainer, title='مسودة سرّية')
        section = CourseSection.objects.create(course=draft, title='قسم', order=0)
        lesson = Lesson.objects.create(section=section, title='درس')
        self.client.force_login(self.student)
        res = self.client.post(
            self.progress_url,
            data=json.dumps({'id': draft.slug, 'lesson': lesson.pk, 'done': True}),
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 404)
        self.assertEqual(CourseProgress.objects.count(), 0)

    def test_playlist_page_injects_progress_json(self):
        self.client.force_login(self.student)
        self._mark(self.lessons[0])
        res = self.client.get(self.playlist_url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            res.context['progress_json'],
            {'done': [self.lessons[0].pk], 'complete': False},
        )

        self.client.force_login(self.other_student)
        res = self.client.get(self.playlist_url)
        self.assertEqual(res.context['progress_json'], {'done': [], 'complete': False})

    def test_playlist_page_anonymous_has_no_progress(self):
        res = self.client.get(self.playlist_url)
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('progress_json', res.context)

    def test_portfolio_injects_earned_certificates(self):
        self.client.force_login(self.student)
        self._mark(self.lessons[0])
        self._mark(self.lessons[1])

        res = self.client.get(reverse('portfolio:home'))
        self.assertEqual(res.status_code, 200)
        certs = res.context['my_certs_json']
        self.assertEqual(len(certs), 1)
        self.assertEqual(certs[0]['title'], 'دورة الشبكات الأساسية')
        self.assertTrue(certs[0]['earned'])
        self.assertEqual(certs[0]['handle'], self.student.handle)

        self.client.force_login(self.other_student)
        res = self.client.get(reverse('portfolio:home'))
        self.assertEqual(res.context['my_certs_json'], [])

    def test_public_profile_injects_profile_certificates(self):
        self.client.force_login(self.student)
        self._mark(self.lessons[0])
        self._mark(self.lessons[1])

        res = self.client.get(reverse('accounts:profile', kwargs={'handle': self.student.handle}))
        self.assertEqual(res.status_code, 200)
        certs = res.context['profile_certs_json']
        self.assertEqual(len(certs), 1)
        self.assertEqual(certs[0]['title'], 'دورة الشبكات الأساسية')
        certificate = CourseCertificate.objects.get(student=self.student, course=self.course)
        certificate.is_active = False
        certificate.save(update_fields=['is_active'])
        res = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.student.handle})
        )
        self.assertEqual(res.context['profile_certs_json'], [])

        res = self.client.get(reverse('accounts:profile', kwargs={'handle': self.other_student.handle}))
        self.assertEqual(res.context['profile_certs_json'], [])

    def test_trainer_public_profile_exposes_own_courses(self):
        """بروفايل المدرب: roleKey=isTrainer + دوراته المنشورة متاحة باسم مالكها."""
        self.client.force_login(self.student)
        res = self.client.get(reverse('accounts:profile', kwargs={'handle': self.trainer.handle}))
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.context['profile_json']['isTrainer'])
        self.assertEqual(res.context['profile_json']['roleKey'], UserRole.TRAINER)
        own = [c for c in res.context['courses_json'] if c['handle'] == self.trainer.handle]
        self.assertEqual(len(own), 1)
        self.assertEqual(own[0]['title'], 'دورة الشبكات الأساسية')

    def test_student_public_profile_is_not_trainer(self):
        self.client.force_login(self.student)
        res = self.client.get(reverse('accounts:profile', kwargs={'handle': self.student.handle}))
        self.assertFalse(res.context['profile_json']['isTrainer'])
        self.assertEqual(res.context['profile_json']['roleKey'], UserRole.STUDENT)

    def test_certificate_page_injects_earned_certificate(self):
        cert_url = reverse('courses:certificate', kwargs={'pk': self.course.slug})
        self._mark(self.lessons[0], user=self.student)
        self._mark(self.lessons[1])

        res = self.client.get(cert_url)
        payload = res.context['courses_json'][0]
        self.assertTrue(payload['earned'])
        self.assertEqual(payload['studentName'], 'طالب مجتهد')
        self.assertTrue(payload['certificateCode'])
        self.assertEqual(payload['handle'], self.student.handle)

    def test_certificate_page_falls_back_to_course_for_guest(self):
        cert_url = reverse('courses:certificate', kwargs={'pk': self.course.slug})
        res = self.client.get(cert_url)
        payload = res.context['courses_json'][0]
        self.assertNotIn('earned', payload)
        self.assertEqual(payload['title'], 'دورة الشبكات الأساسية')

    def test_certificate_page_anonymous_other_student_not_earned(self):
        cert_url = reverse('courses:certificate', kwargs={'pk': self.course.slug})
        self._mark(self.lessons[0], user=self.student)
        self._mark(self.lessons[1])
        self.client.force_login(self.other_student)
        res = self.client.get(cert_url)
        payload = res.context['courses_json'][0]
        self.assertFalse(payload.get('earned', False))


class CourseQuizTests(TestCase):
    """دروس الاختبار: 3 محاولات، أسئلة مختلفة، تصحيح النجاح يُعلّم الدرس مكتملاً."""

    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059444444', password='pass1234', full_name='مدرب الاختبارات', role=UserRole.TRAINER
        )
        self.student = User.objects.create_user(
            phone='059555555', password='pass1234', full_name='طالب الاختبار', role=UserRole.STUDENT
        )
        self.course = Course.objects.create(
            owner=self.trainer, title='دورة الاختبارات', status=CourseStatus.PUBLISHED
        )
        section = CourseSection.objects.create(course=self.course, title='القسم', order=0)
        self.lesson = Lesson.objects.create(
            section=section, title='اختبار الوحدة', type=LessonType.QUIZ, order=0
        )
        self.quiz = Quiz.objects.create(lesson=self.lesson, max_attempts=3, pass_score=60, questions_count=2)
        for i in range(4):
            question = QuizQuestion.objects.create(quiz=self.quiz, text='س%d' % (i + 1), order=i)
            QuizChoice.objects.create(question=question, text='ص', is_correct=True, order=0)
            QuizChoice.objects.create(question=question, text='خ', is_correct=False, order=1)
        self.start_url = reverse('courses:quiz_start')
        self.submit_url = reverse('courses:quiz_submit')
        self.progress_url = reverse('courses:progress')

    def _post(self, url, data):
        return self.client.post(url, data=json.dumps(data), content_type='application/json')

    def _answers(self, payload, correct=True):
        answers = {}
        for question in payload['questions']:
            # ثبّت الإجابة الصحيحة والعشوائية لتفادي أي اعتماد على ترتيب الخلط
            pick = next(c for c in question['choices'] if c['text'] == 'ص') if correct \
                else next(c for c in question['choices'] if c['text'] == 'خ')
            answers[str(question['id'])] = pick['id']
        return answers

    def test_quiz_requires_login(self):
        res = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk})
        self.assertEqual(res.status_code, 302)

    def test_quiz_has_three_attempts_and_varied_questions(self):
        self.client.force_login(self.student)
        for expected_left in (2, 1, 0):
            res = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk})
            self.assertEqual(res.status_code, 200)
            payload = res.json()
            self.assertEqual(len(payload['questions']), 2)
            self.assertEqual(payload['attemptsLeft'], expected_left)
            self._post(self.submit_url, {
                'id': self.course.slug, 'lesson': self.lesson.pk,
                'answers': self._answers(payload, correct=False),
            })
        self.assertEqual(QuizAttempt.objects.filter(student=self.student).count(), 3)
        res = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk})
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()['error'], 'no_attempts')
        self.assertIn('retryAt', res.json())
        self.assertGreater(res.json()['retryAfter'], 0)

    def test_quiz_attempts_refresh_after_ten_minute_cooldown(self):
        self.client.force_login(self.student)
        for _ in range(3):
            payload = self._post(
                self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk}
            ).json()
            self._post(self.submit_url, {
                'id': self.course.slug,
                'lesson': self.lesson.pk,
                'answers': self._answers(payload, correct=False),
            })

        old_submission = timezone.now() - timedelta(minutes=11)
        QuizAttempt.objects.filter(student=self.student).update(submitted_at=old_submission)

        res = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk})
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        self.assertEqual(payload['attempt'], 4)
        self.assertEqual(payload['attemptsLeft'], 2)
        self.assertEqual(QuizAttempt.objects.filter(student=self.student).count(), 4)

    def test_quiz_start_resumes_open_attempt(self):
        self.client.force_login(self.student)
        first = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk}).json()
        second = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk}).json()
        self.assertTrue(second['resumed'])
        self.assertEqual(second['attempt'], first['attempt'])
        self.assertEqual([q['id'] for q in second['questions']], [q['id'] for q in first['questions']])
        self.assertEqual(QuizAttempt.objects.filter(student=self.student).count(), 1)

    def test_correct_answers_never_exposed_before_submit(self):
        self.client.force_login(self.student)
        payload = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk}).json()
        for question in payload['questions']:
            for choice in question['choices']:
                self.assertNotIn('correct', choice)

    def test_passing_quiz_marks_lesson_done(self):
        self.client.force_login(self.student)
        payload = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk}).json()
        res = self._post(self.submit_url, {
            'id': self.course.slug, 'lesson': self.lesson.pk, 'answers': self._answers(payload, correct=True)
        })
        data = res.json()
        self.assertTrue(data['passed'])
        self.assertEqual(data['score'], 100)
        self.assertEqual(len(data['results']), 2)
        self.assertEqual(data['done'], 1)
        self.assertTrue(data['complete'])
        self.assertIsNotNone(data['certificate'])
        self.assertTrue(CourseProgress.objects.get(student=self.student, course=self.course).completed)
        self.assertEqual(CourseCertificate.objects.filter(student=self.student).count(), 1)

    def test_failing_quiz_does_not_complete_lesson(self):
        self.client.force_login(self.student)
        payload = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk}).json()
        res = self._post(self.submit_url, {
            'id': self.course.slug, 'lesson': self.lesson.pk, 'answers': self._answers(payload, correct=False)
        })
        data = res.json()
        self.assertFalse(data['passed'])
        self.assertEqual(data['score'], 0)
        self.assertEqual(data['attemptsLeft'], 2)
        self.assertFalse(CourseProgress.objects.filter(student=self.student).exists())

    def test_quiz_rejects_non_quiz_lesson(self):
        video = Lesson.objects.create(section=self.lesson.section, title='درس فيديو', type=LessonType.VIDEO)
        self.client.force_login(self.student)
        res = self._post(self.start_url, {'id': self.course.slug, 'lesson': video.pk})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['error'], 'not_quiz')

    def test_playlist_injects_quiz_status(self):
        self.client.force_login(self.student)
        payload = self._post(self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk}).json()
        self._post(self.submit_url, {
            'id': self.course.slug, 'lesson': self.lesson.pk, 'answers': self._answers(payload, correct=False)
        })
        res = self.client.get(reverse('courses:playlist', kwargs={'pk': self.course.slug}))
        status = res.context['quiz_json'][str(self.lesson.pk)]
        self.assertEqual(status['attempts'], 1)
        self.assertEqual(status['remaining'], 2)
        self.assertFalse(status['passed'])

    def test_playlist_exposes_retry_time_when_attempts_are_exhausted(self):
        self.client.force_login(self.student)
        for _ in range(3):
            payload = self._post(
                self.start_url, {'id': self.course.slug, 'lesson': self.lesson.pk}
            ).json()
            self._post(self.submit_url, {
                'id': self.course.slug,
                'lesson': self.lesson.pk,
                'answers': self._answers(payload, correct=False),
            })

        res = self.client.get(reverse('courses:playlist', kwargs={'pk': self.course.slug}))
        status = res.context['quiz_json'][str(self.lesson.pk)]
        self.assertEqual(status['remaining'], 0)
        self.assertTrue(status['retryAt'])

    def test_editor_payload_includes_answers_for_owner_only(self):
        self.client.force_login(self.trainer)
        res = self.client.get(reverse('courses:edit', kwargs={'pk': self.course.slug}))
        lesson = res.context['courses_json'][0]['syllabus'][0]['lessons'][0]
        self.assertEqual(lesson['type'], 'quiz')
        self.assertEqual(len(lesson['quiz']['questions']), 4)
        self.assertIn('correct', lesson['quiz']['questions'][0]['choices'][0])

        self.client.force_login(self.student)
        res = self.client.get(reverse('courses:playlist', kwargs={'pk': self.course.slug}))
        public = res.context['courses_json'][0]['syllabus'][0]['lessons'][0]['quiz']
        self.assertEqual(public['questions'], [])


class CourseProjectLessonTests(TestCase):
    """درس من نوع «مشروع»: تعليمه مكتملاً يُضيف مشروعاً لملف الطالب تلقائياً."""

    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059333222', password='pass1234', full_name='مدرب المشاريع', role=UserRole.TRAINER
        )
        self.student = User.objects.create_user(
            phone='059333111', password='pass1234', full_name='طالب المشاريع', role=UserRole.STUDENT
        )
        self.course = Course.objects.create(
            owner=self.trainer, title='دورة المشاريع', category='ويب', status=CourseStatus.PUBLISHED
        )
        section = CourseSection.objects.create(course=self.course, title='القسم', order=0)
        self.lesson = Lesson.objects.create(
            section=section, title='مشروع لوحة التحكم', type=LessonType.PROJECT,
            content='ابنِ لوحة تحكم متجاوبة بالكامل.', order=0,
        )
        self.progress_url = reverse('courses:progress')

    def _mark(self, done=True):
        return self.client.post(
            self.progress_url,
            data=json.dumps({'id': self.course.slug, 'lesson': self.lesson.pk, 'done': done}),
            content_type='application/json',
        )

    def test_completing_project_lesson_creates_project(self):
        self.client.force_login(self.student)
        data = self._mark().json()
        self.assertTrue(data['projectCreated'])
        self.assertIsNotNone(data['project'])
        project = Project.objects.get(owner=self.student, source_lesson=self.lesson)
        self.assertEqual(project.title, 'مشروع لوحة التحكم')
        self.assertEqual(project.status, ProjectStatus.PUBLISHED)
        self.assertIn('لوحة تحكم متجاوبة', project.content)
        self.assertEqual(data['project']['id'], project.slug)

    def test_project_created_once(self):
        self.client.force_login(self.student)
        self._mark()
        self._mark(done=False)
        res = self._mark()
        self.assertFalse(res.json()['projectCreated'])
        self.assertEqual(Project.objects.filter(owner=self.student, source_lesson=self.lesson).count(), 1)

    def test_video_lesson_does_not_create_project(self):
        video = Lesson.objects.create(section=self.lesson.section, title='فيديو', order=1)
        self.client.force_login(self.student)
        res = self.client.post(
            self.progress_url,
            data=json.dumps({'id': self.course.slug, 'lesson': video.pk, 'done': True}),
            content_type='application/json',
        )
        self.assertIsNone(res.json()['project'])
        self.assertEqual(Project.objects.count(), 0)


class CourseLinkedProjectTests(TestCase):
    """ربط درس «مشروع» بأحد مشاريع المدرب: الحفظ + العرض + النسخ للطالب."""

    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059444333', password='pass1234', full_name='مدرب الربط', role=UserRole.TRAINER
        )
        self.student = User.objects.create_user(
            phone='059444111', password='pass1234', full_name='طالب الربط', role=UserRole.STUDENT
        )
        self.course = Course.objects.create(
            owner=self.trainer, title='دورة الربط', category='ويب', status=CourseStatus.PUBLISHED
        )
        self.section = CourseSection.objects.create(course=self.course, title='القسم', order=0)
        self.lesson = Lesson.objects.create(
            section=self.section, title='درس مشروع مرتبط', type=LessonType.PROJECT, order=0
        )
        self.trainer_project = Project.objects.create(
            owner=self.trainer,
            title='مشروع المدرب المرجعي',
            summary='ملخص مشروع المدرب',
            content='<p>تفاصيل مشروع المدرب الكاملة</p>',
            category='ويب',
            role='مطور',
            github_url='https://github.com/example/repo',
            demo_url='https://example.com/demo',
            status=ProjectStatus.PUBLISHED,
        )

    def _save_syllabus(self, project_id):
        payload = {
            'id': self.course.slug,
            'title': self.course.title,
            'syllabus': [
                {
                    'id': self.section.pk,
                    'title': self.section.title,
                    'lessons': [
                        {
                            'id': self.lesson.pk,
                            'title': self.lesson.title,
                            'type': 'project',
                            'projectId': project_id,
                            'content': '',
                        }
                    ],
                }
            ],
        }
        return self.client.post(
            reverse('courses:save'),
            data=json.dumps(payload),
            content_type='application/json',
        )

    def test_syllabus_save_links_owner_project(self):
        self.client.force_login(self.trainer)
        res = self._save_syllabus(self.trainer_project.slug)
        self.assertEqual(res.status_code, 200)
        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.linked_project_id, self.trainer_project.pk)

    def test_syllabus_save_rejects_other_owners_project(self):
        other = User.objects.create_user(
            phone='059444999', password='pass1234', full_name='مدرب آخر', role=UserRole.TRAINER
        )
        foreign = Project.objects.create(owner=other, title='مشروع غريب', status=ProjectStatus.PUBLISHED)
        self.client.force_login(self.trainer)
        self._save_syllabus(foreign.slug)
        self.lesson.refresh_from_db()
        self.assertIsNone(self.lesson.linked_project_id)

    def test_non_project_lesson_clears_link(self):
        self.lesson.linked_project = self.trainer_project
        self.lesson.save()
        payload = {
            'id': self.course.slug,
            'title': self.course.title,
            'syllabus': [
                {
                    'id': self.section.pk,
                    'title': self.section.title,
                    'lessons': [
                        {
                            'id': self.lesson.pk,
                            'title': self.lesson.title,
                            'type': 'video',
                            'projectId': self.trainer_project.slug,
                        }
                    ],
                }
            ],
        }
        self.client.force_login(self.trainer)
        self.client.post(reverse('courses:save'), data=json.dumps(payload), content_type='application/json')
        self.lesson.refresh_from_db()
        self.assertIsNone(self.lesson.linked_project_id)

    def test_playlist_payload_includes_linked_project(self):
        self.lesson.linked_project = self.trainer_project
        self.lesson.save()
        res = self.client.get(reverse('courses:playlist', kwargs={'pk': self.course.slug}))
        lesson = res.context['courses_json'][0]['syllabus'][0]['lessons'][0]
        self.assertEqual(lesson['projectId'], self.trainer_project.slug)
        self.assertEqual(lesson['project']['title'], 'مشروع المدرب المرجعي')
        self.assertEqual(lesson['project']['links']['github'], 'https://github.com/example/repo')

    def test_editor_injects_trainer_projects(self):
        self.client.force_login(self.trainer)
        res = self.client.get(reverse('courses:edit', kwargs={'pk': self.course.slug}))
        projects = res.context['trainer_projects_json']
        self.assertEqual(len(projects), 1)
        self.assertEqual(projects[0]['title'], 'مشروع المدرب المرجعي')

    def test_completing_linked_lesson_copies_project(self):
        self.lesson.linked_project = self.trainer_project
        self.lesson.save()
        self.client.force_login(self.student)
        res = self.client.post(
            reverse('courses:progress'),
            data=json.dumps({'id': self.course.slug, 'lesson': self.lesson.pk, 'done': True}),
            content_type='application/json',
        )
        data = res.json()
        self.assertTrue(data['projectCreated'])
        copied = Project.objects.get(owner=self.student, source_lesson=self.lesson)
        self.assertEqual(copied.title, 'مشروع المدرب المرجعي')
        self.assertEqual(copied.summary, 'ملخص مشروع المدرب')
        self.assertIn('تفاصيل مشروع المدرب الكاملة', copied.content)
        self.assertEqual(copied.github_url, 'https://github.com/example/repo')
        self.assertEqual(copied.demo_url, 'https://example.com/demo')
        # الأصل عند المدرب لم يتغير
        self.trainer_project.refresh_from_db()
        self.assertEqual(self.trainer_project.owner, self.trainer)
        self.assertNotEqual(copied.pk, self.trainer_project.pk)


class ProjectCopyIsolationTests(TestCase):
    """نسخة الطالب مستقلة تماماً عن مشروع المدرب: تعديل/حذف الطالب لا يؤثر عليه."""

    @classmethod
    def setUpClass(cls):
        cls._media = tempfile.mkdtemp()
        cls._override = override_settings(MEDIA_ROOT=cls._media)
        cls._override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)

    _PNG = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01'
        b'\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    )

    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059555333', password='pass1234', full_name='مدرب العزل', role=UserRole.TRAINER
        )
        self.student = User.objects.create_user(
            phone='059555111', password='pass1234', full_name='طالب العزل', role=UserRole.STUDENT
        )
        self.course = Course.objects.create(
            owner=self.trainer, title='دورة العزل', category='ويب', status=CourseStatus.PUBLISHED
        )
        section = CourseSection.objects.create(course=self.course, title='القسم', order=0)
        self.lesson = Lesson.objects.create(
            section=section, title='درس مشروع', type=LessonType.PROJECT, order=0
        )
        self.original = Project.objects.create(
            owner=self.trainer,
            title='مشروع المدرب الأصلي',
            summary='ملخص أصلي',
            content='<p>محتوى أصلي</p>',
            category='ويب',
            role='مطور',
            github_url='https://github.com/example/orig',
            demo_url='https://example.com/orig',
            status=ProjectStatus.PUBLISHED,
        )
        self.original.cover.save('cover_orig.png', SimpleUploadedFile('cover_orig.png', self._PNG))
        ProjectImage.objects.create(
            project=self.original, order=0,
            image=SimpleUploadedFile('gallery_orig.png', self._PNG),
        )
        ProjectFile.objects.create(
            project=self.original, original_name='report.pdf', size=1234,
            file=SimpleUploadedFile('report.pdf', b'PDFDATA-original'),
        )
        self.tag_shared = ProjectTag.objects.create(name='ويب')
        self.original.tags.add(self.tag_shared)
        self.lesson.linked_project = self.original
        self.lesson.save()

    def _copy(self):
        self.client.force_login(self.student)
        self.client.post(
            reverse('courses:progress'),
            data=json.dumps({'id': self.course.slug, 'lesson': self.lesson.pk, 'done': True}),
            content_type='application/json',
        )
        return Project.objects.get(owner=self.student, source_lesson=self.lesson)

    def test_copy_has_distinct_identity(self):
        copy = self._copy()
        self.assertNotEqual(copy.pk, self.original.pk)
        self.assertNotEqual(copy.slug, self.original.slug)
        self.assertEqual(copy.owner, self.student)

    def test_copy_deep_copies_cover_gallery_and_files(self):
        copy = self._copy()
        # الغلاف منسوخ ومستقل
        self.assertTrue(copy.cover)
        self.assertNotEqual(copy.cover.name, self.original.cover.name)
        # صور المعرض منسوخة ومستقلة
        self.assertEqual(copy.images.count(), 1)
        self.assertNotEqual(copy.images.first().image.name, self.original.images.first().image.name)
        # الملفات منسوخة مع الحفاظ على الاسم والحجم
        self.assertEqual(copy.files.count(), 1)
        copied_file = copy.files.first()
        self.assertEqual(copied_file.original_name, 'report.pdf')
        self.assertEqual(copied_file.size, 1234)
        self.assertNotEqual(copied_file.file.name, self.original.files.first().file.name)
        # محتوى الملف المنسوخ مطابق للمحتوى الأصلي
        with copied_file.file.open('rb') as fh:
            self.assertEqual(fh.read(), b'PDFDATA-original')
        # الأصل يحتفظ بملفاته وصوره دون تغيير
        self.original.refresh_from_db()
        self.assertEqual(self.original.files.count(), 1)
        self.assertEqual(self.original.images.count(), 1)
        with self.original.files.first().file.open('rb') as fh:
            self.assertEqual(fh.read(), b'PDFDATA-original')

    def test_deleting_copy_removes_only_copy_files(self):
        copy = self._copy()
        orig_cover = self.original.cover.path
        self.client.force_login(self.student)
        res = self.client.post(
            reverse('projects:delete'),
            data=json.dumps({'id': copy.slug}),
            content_type='application/json',
        )
        self.assertTrue(res.json()['ok'])
        # ملف المدرب الأصلي ما زال موجوداً على القرص بعد حذف النسخة
        import os
        self.assertTrue(os.path.exists(orig_cover))
        self.original.refresh_from_db()
        self.assertEqual(self.original.files.count(), 1)

    def test_editing_copy_tags_does_not_change_original_tags(self):
        copy = self._copy()
        # أضف وسماً جديداً للنسخة
        new_tag = ProjectTag.objects.create(name='اختبار')
        copy.tags.set([new_tag])
        self.original.refresh_from_db()
        self.assertEqual([t.name for t in self.original.tags.all()], ['ويب'])
        self.assertEqual([t.name for t in copy.tags.all()], ['اختبار'])

    def test_deleting_copy_does_not_delete_original(self):
        copy = self._copy()
        self.client.force_login(self.student)
        res = self.client.post(
            reverse('projects:delete'),
            data=json.dumps({'id': copy.slug}),
            content_type='application/json',
        )
        self.assertTrue(res.json()['ok'])
        self.assertFalse(Project.objects.filter(pk=copy.pk).exists())
        self.assertTrue(Project.objects.filter(pk=self.original.pk).exists())
        # درس الدورة ما زال يرتبط بمشروع المدرب
        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.linked_project_id, self.original.pk)

    def test_deleting_original_detaches_copy_without_deleting_it(self):
        copy = self._copy()
        self.original.delete()
        copy.refresh_from_db()
        self.assertEqual(copy.owner, self.student)
        self.assertEqual(copy.title, 'مشروع المدرب الأصلي')
        self.assertTrue(Project.objects.filter(pk=copy.pk).exists())
        # درس الدورة فُصل عن المشروع المحذوف دون التأثير على نسخة الطالب
        self.lesson.refresh_from_db()
        self.assertIsNone(self.lesson.linked_project_id)

    def test_editing_copy_content_does_not_change_original(self):
        copy = self._copy()
        self.client.force_login(self.student)
        self.client.post(
            reverse('projects:save'),
            data=json.dumps({
                'id': copy.slug,
                'title': 'عنوان عدّله الطالب',
                'summary': 'ملخص جديد',
                'content': '<p>محتوى الطالب</p>',
                'status': 'published',
                'tags': ['تعديل'],
            }),
            content_type='application/json',
        )
        self.original.refresh_from_db()
        copy.refresh_from_db()
        self.assertEqual(self.original.title, 'مشروع المدرب الأصلي')
        self.assertEqual(self.original.content, '<p>محتوى أصلي</p>')
        self.assertEqual(copy.title, 'عنوان عدّله الطالب')
        self.assertEqual(copy.content, '<p>محتوى الطالب</p>')
        self.assertEqual([t.name for t in self.original.tags.all()], ['ويب'])


class PlaylistVideoPlayerTests(TestCase):
    """مشغّل الفيديو في صفحة الدروس: تحميل Plyr محلياً + تمرير روابط الدروس للواجهة."""

    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059500001', password='pass1234', full_name='مدرب الفيديو', role=UserRole.TRAINER
        )
        self.student = User.objects.create_user(
            phone='059500002', password='pass1234', full_name='طالب الفيديو', role=UserRole.STUDENT
        )
        self.course = Course.objects.create(
            owner=self.trainer, title='دورة الفيديو', status=CourseStatus.PUBLISHED
        )
        section = CourseSection.objects.create(course=self.course, title='المقدمة', order=0)
        self.video_lesson = Lesson.objects.create(
            section=section,
            title='درس فيديو',
            type=LessonType.VIDEO,
            video_url='https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order=0,
        )
        self.playlist_url = reverse('courses:playlist', kwargs={'pk': self.course.slug})

    def test_playlist_loads_local_plyr_assets(self):
        res = self.client.get(self.playlist_url)
        self.assertEqual(res.status_code, 200)
        html = res.content.decode('utf-8')
        self.assertIn('vendor/plyr/plyr.css', html)
        self.assertIn('vendor/plyr/plyr.min.js', html)
        self.assertIn('js/playlist.js', html)

    def test_playlist_payload_carries_video_url(self):
        res = self.client.get(self.playlist_url)
        lessons = [
            lesson
            for section in res.context['courses_json'][0]['syllabus']
            for lesson in section['lessons']
        ]
        video = next(lesson for lesson in lessons if lesson['id'] == self.video_lesson.pk)
        self.assertEqual(video['videoUrl'], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')


class ManualCertificateReviewTests(TestCase):
    _PNG = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01'
        b'\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    )

    @classmethod
    def setUpClass(cls):
        cls._media = tempfile.mkdtemp()
        cls._override = override_settings(MEDIA_ROOT=cls._media)
        cls._override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)

    def setUp(self):
        self.student = User.objects.create_user(
            phone='059444001', password='pass1234', full_name='طالب الشهادات',
            role=UserRole.STUDENT,
        )
        self.viewer = User.objects.create_user(
            phone='059444002', password='pass1234', full_name='زائر الشهادات',
            role=UserRole.STUDENT,
        )
        self.submit_url = reverse('courses:manual-certificate-submit')
        self.payload = {
            'title': 'شهادة تصميم',
            'issuer': 'مركز التدريب',
            'category': 'تصميم',
            'date': '2026-10-01',
            'credential_id': 'CERT-100',
            'verify_url': 'https://example.com/verify',
            'description': (
                'إتمام دورة التصميم واكتساب مهارات التصميم والواجهات وتجربة المستخدم '
                'وبناء نماذج عملية متكاملة ضمن برنامج تدريبي متخصص ومكثف.'
            ) * 2,
            'skills': json.dumps(['تصميم', 'واجهات']),
            'image_data': 'data:image/png;base64,' + base64.b64encode(self._PNG).decode('ascii'),
        }

    def test_manual_certificate_submission_stays_private_until_admin_enables_visibility(self):
        self.client.force_login(self.student)
        response = self.client.post(self.submit_url, self.payload)

        self.assertEqual(response.status_code, 201)
        certificate = ManualCertificate.objects.get(student=self.student)
        self.assertEqual(certificate.status, ManualCertificateStatus.PENDING)
        self.assertFalse(certificate.is_active)
        self.assertTrue(certificate.image)
        self.assertEqual(response.json()['certificate']['status'], ManualCertificateStatus.PENDING)
        self.assertFalse(response.json()['certificate']['active'])

        personal_portfolio = self.client.get(reverse('portfolio:home'))
        self.assertEqual(
            personal_portfolio.context['my_certs_json'][0]['status'],
            ManualCertificateStatus.PENDING,
        )

        owner_profile = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.student.handle})
        )
        self.assertEqual(owner_profile.context['profile_certs_json'], [])

        self.client.force_login(self.viewer)
        public_profile = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.student.handle})
        )
        self.assertEqual(public_profile.context['profile_certs_json'], [])

        admin = User.objects.create_user(
            phone='059444003', password='pass1234', full_name='مدير الشهادات',
            role=UserRole.ADMIN,
        )
        self.client.force_login(admin)
        response = self.client.post(
            reverse('dashboard:certificate-status', args=[f'manual-{certificate.pk}']),
            data=json.dumps({'active': True}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        certificate.refresh_from_db()
        self.assertTrue(certificate.is_active)
        self.assertEqual(certificate.status, ManualCertificateStatus.APPROVED)
        self.assertIsNotNone(certificate.reviewed_at)

        self.client.force_login(self.viewer)
        visible_profile = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.student.handle})
        )
        self.assertEqual(len(visible_profile.context['profile_certs_json']), 1)
        self.assertIn(
            f'manual-{certificate.pk}',
            visible_profile.content.decode(),
        )
        self.assertEqual(
            visible_profile.context['profile_certs_json'][0]['status'],
            ManualCertificateStatus.APPROVED,
        )

        directory = self.client.get(reverse('accounts:list'))
        student_data = next(
            item for item in directory.context['profiles_json']
            if item['handle'] == self.student.handle
        )
        self.assertEqual(student_data['certificates'], 1)

    def test_manual_certificate_submission_is_student_only_and_requires_image(self):
        self.client.force_login(self.viewer)
        missing_image = dict(self.payload)
        missing_image.pop('image_data')
        response = self.client.post(self.submit_url, missing_image)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'image_required')

        trainer = User.objects.create_user(
            phone='059444003', password='pass1234', full_name='مدرب الشهادات',
            role=UserRole.TRAINER,
        )
        self.client.force_login(trainer)
        response = self.client.post(self.submit_url, self.payload)
        self.assertEqual(response.status_code, 403)
        self.assertFalse(ManualCertificate.objects.exists())

    def test_manual_certificate_requires_description_of_at_least_150_characters(self):
        self.client.force_login(self.student)
        payload = dict(self.payload, description='وصف قصير')

        response = self.client.post(self.submit_url, payload)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'description_too_short')
        self.assertFalse(ManualCertificate.objects.exists())

    def test_manual_certificate_accepts_multipart_image_and_optional_date(self):
        self.client.force_login(self.student)
        payload = dict(self.payload)
        payload.pop('image_data')
        payload['date'] = ''
        payload['image'] = SimpleUploadedFile(
            'certificate.png',
            self._PNG,
            content_type='image/png',
        )

        response = self.client.post(self.submit_url, payload)

        self.assertEqual(response.status_code, 201)
        certificate = ManualCertificate.objects.get(student=self.student)
        self.assertIsNone(certificate.date)
        self.assertEqual(certificate.title, self.payload['title'])
        self.assertEqual(certificate.issuer, self.payload['issuer'])
        self.assertEqual(certificate.category, self.payload['category'])
        self.assertEqual(certificate.credential_id, self.payload['credential_id'])
        self.assertEqual(certificate.verify_url, self.payload['verify_url'])
        self.assertEqual(certificate.description, self.payload['description'])
        self.assertEqual(certificate.skills, ['تصميم', 'واجهات'])
        self.assertTrue(certificate.image.name.endswith('.png'))

    def test_manual_certificate_detail_shows_approved_certificate_data(self):
        certificate = ManualCertificate.objects.create(
            student=self.student,
            title=self.payload['title'],
            issuer=self.payload['issuer'],
            category=self.payload['category'],
            date='2026-10-01',
            credential_id=self.payload['credential_id'],
            verify_url=self.payload['verify_url'],
            description=self.payload['description'],
            skills=['تصميم', 'واجهات'],
            status=ManualCertificateStatus.APPROVED,
            image=SimpleUploadedFile(
                'certificate.png',
                self._PNG,
                content_type='image/png',
            ),
        )

        response = self.client.get(
            reverse('courses:certificate', kwargs={'pk': f'manual-{certificate.pk}'})
        )

        self.assertEqual(response.status_code, 200)
        payload = response.context['courses_json'][0]
        self.assertTrue(payload['manual'])
        self.assertEqual(payload['title'], self.payload['title'])
        self.assertEqual(payload['issuer'], self.payload['issuer'])
        self.assertTrue(payload['image'].endswith('.png'))
        self.assertEqual(payload['description'], self.payload['description'])
        self.assertEqual(payload['skills'], ['تصميم', 'واجهات'])

    def test_pending_manual_certificate_detail_is_owner_only(self):
        certificate = ManualCertificate.objects.create(
            student=self.student,
            title=self.payload['title'],
            issuer=self.payload['issuer'],
            status=ManualCertificateStatus.PENDING,
            image=SimpleUploadedFile(
                'certificate.png',
                self._PNG,
                content_type='image/png',
            ),
        )
        url = reverse('courses:certificate', kwargs={'pk': f'manual-{certificate.pk}'})

        self.client.force_login(self.student)
        owner_response = self.client.get(url)
        self.assertEqual(owner_response.status_code, 200)

        self.client.force_login(self.viewer)
        viewer_response = self.client.get(url)
        self.assertEqual(viewer_response.status_code, 404)


class StudentReferralRewardTests(TestCase):
    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='0591234501', password='pass1234', full_name='مدرب الدورة', role=UserRole.TRAINER
        )
        self.referrer = User.objects.create_user(
            phone='0591234502', password='pass1234', full_name='طالب محيل', role=UserRole.STUDENT
        )
        self.course = Course.objects.create(
            owner=self.trainer,
            title='دورة مدفوعة للإحالة',
            price='₪150',
            status=CourseStatus.PUBLISHED,
        )

    def _make_referral(self, referred_user, course=None):
        link = StudentReferralLink.objects.create(
            referrer=self.referrer,
            course=course or self.course,
        )
        return StudentReferral.objects.create(link=link, referred_user=referred_user), link

    def test_student_share_link_counts_page_views_and_signup_is_attributed(self):
        self.client.force_login(self.referrer)
        detail = self.client.get(reverse('courses:detail', kwargs={'pk': self.course.slug}))
        share_url = detail.context['course_rewards_json']['shareUrl']
        code = parse_qs(urlparse(share_url).query)['ref'][0]
        referral_link = StudentReferralLink.objects.get(code=code)

        visitor = Client()
        url = reverse('courses:detail', kwargs={'pk': self.course.slug})
        self.assertEqual(visitor.get(url, {'ref': code}).status_code, 200)
        self.assertEqual(visitor.get(url, {'ref': code}).status_code, 200)
        referral_link.refresh_from_db()
        self.assertEqual(referral_link.visits, 2)

        signup_response = visitor.post(reverse('users:signup'), {
            'full_name': 'طالب جديد',
            'phone': '0591234503',
            'email': 'newstudent@example.com',
            'password1': 'Sup3r$ecret1',
            'password2': 'Sup3r$ecret1',
        })
        self.assertEqual(signup_response.status_code, 302)
        referred_user = User.objects.get(phone='0591234503')
        referral = StudentReferral.objects.get(referred_user=referred_user)
        self.assertEqual(referral.link_id, referral_link.pk)
        visitor.get('/')
        referral_link.refresh_from_db()
        self.assertEqual(referral_link.visits, 3)

        CourseProgress.objects.create(student=referred_user, course=self.course)
        CourseProgress.objects.get(student=referred_user, course=self.course).save()
        points = StudentPointTransaction.objects.get(
            student=self.referrer,
            kind=StudentPointTransaction.Kind.REFERRAL,
        )
        self.assertEqual(points.points, 10)
        profile_response = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.referrer.handle})
        )
        self.assertEqual(profile_response.context['profile_json']['referral_points'], 10)
        self.assertEqual(profile_response.context['profile_json']['referral_visits'], 3)

    def test_enrollment_in_free_course_does_not_award_referral_points(self):
        free_course = Course.objects.create(
            owner=self.trainer,
            title='دورة مجانية',
            price='مجاني',
            status=CourseStatus.PUBLISHED,
        )
        referred_user = User.objects.create_user(
            phone='0591234504', password='pass1234', full_name='طالب محال', role=UserRole.STUDENT
        )
        self._make_referral(referred_user, free_course)

        CourseProgress.objects.create(student=referred_user, course=free_course)

        self.assertFalse(
            StudentPointTransaction.objects.filter(
                student=self.referrer,
                kind=StudentPointTransaction.Kind.REFERRAL,
            ).exists()
        )

    def test_enrollment_in_another_paid_course_still_awards_referrer(self):
        referred_user = User.objects.create_user(
            phone='0591234505', password='pass1234', full_name='طالب محال لدورة أخرى', role=UserRole.STUDENT
        )
        self._make_referral(referred_user, self.course)
        other_paid_course = Course.objects.create(
            owner=self.trainer,
            title='دورة مدفوعة أخرى',
            price='₪200',
            status=CourseStatus.PUBLISHED,
        )

        CourseProgress.objects.create(student=referred_user, course=other_paid_course)

        reward = StudentPointTransaction.objects.get(student=self.referrer)
        self.assertEqual(reward.course, other_paid_course)
        self.assertEqual(reward.points, 10)

    def test_each_paid_course_enrollment_awards_ten_points_once(self):
        referred_user = User.objects.create_user(
            phone='0591234507', password='pass1234', full_name='طالب يتعلم عدة دورات', role=UserRole.STUDENT
        )
        self._make_referral(referred_user, self.course)
        second_paid_course = Course.objects.create(
            owner=self.trainer,
            title='دورة مدفوعة ثانية',
            price='₪250',
            status=CourseStatus.PUBLISHED,
        )

        CourseProgress.objects.create(student=referred_user, course=self.course)
        CourseProgress.objects.create(student=referred_user, course=second_paid_course)
        CourseProgress.objects.get(student=referred_user, course=second_paid_course).save()

        rewards = StudentPointTransaction.objects.filter(student=self.referrer)
        self.assertEqual(rewards.count(), 2)
        self.assertEqual(set(rewards.values_list('course_id', flat=True)), {
            self.course.pk,
            second_paid_course.pk,
        })
        self.assertEqual(sum(rewards.values_list('points', flat=True)), 20)

    def test_referral_created_after_other_paid_enrollment_still_awards_points(self):
        referred_user = User.objects.create_user(
            phone='0591234506', password='pass1234', full_name='طالب سابق التسجيل', role=UserRole.STUDENT
        )
        other_paid_course = Course.objects.create(
            owner=self.trainer,
            title='دورة مدفوعة بديلة',
            price='₪200',
            status=CourseStatus.PUBLISHED,
        )
        CourseProgress.objects.create(student=referred_user, course=other_paid_course)

        referral, _ = self._make_referral(referred_user, self.course)

        reward = StudentPointTransaction.objects.get(referral=referral)
        self.assertEqual(reward.course, other_paid_course)
        self.assertEqual(reward.points, 10)

    def test_referral_created_after_multiple_paid_enrollments_awards_each_course(self):
        referred_user = User.objects.create_user(
            phone='0591234508', password='pass1234', full_name='طالب مسجل بدورات متعددة', role=UserRole.STUDENT
        )
        second_paid_course = Course.objects.create(
            owner=self.trainer,
            title='دورة مدفوعة سابقة',
            price='₪250',
            status=CourseStatus.PUBLISHED,
        )
        CourseProgress.objects.create(student=referred_user, course=self.course)
        CourseProgress.objects.create(student=referred_user, course=second_paid_course)

        referral, _ = self._make_referral(referred_user, self.course)

        rewards = StudentPointTransaction.objects.filter(referral=referral)
        self.assertEqual(rewards.count(), 2)
        self.assertEqual(sum(rewards.values_list('points', flat=True)), 20)

    def test_student_can_redeem_100_points_once_for_paid_course(self):
        for value in (60, 40):
            StudentPointTransaction.objects.create(
                student=self.referrer,
                course=self.course,
                points=value,
                kind=StudentPointTransaction.Kind.REFERRAL,
            )
        self.client.force_login(self.referrer)
        url = reverse('courses:redeem-points', kwargs={'pk': self.course.slug})
        detail = self.client.get(reverse('courses:detail', kwargs={'pk': self.course.slug}))
        self.assertTrue(detail.context['course_rewards_json']['canRedeem'])

        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True, 'points': 0})
        self.assertTrue(CourseProgress.objects.filter(student=self.referrer, course=self.course).exists())
        total_points = sum(
            StudentPointTransaction.objects.filter(student=self.referrer)
            .values_list('points', flat=True)
        )
        self.assertEqual(total_points, 0)
        duplicate = self.client.post(url)
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(
            StudentPointTransaction.objects.filter(
                student=self.referrer,
                kind=StudentPointTransaction.Kind.REDEMPTION,
            ).count(),
            1,
        )
        detail_after = self.client.get(reverse('courses:detail', kwargs={'pk': self.course.slug}))
        self.assertFalse(detail_after.context['course_rewards_json']['canRedeem'])
