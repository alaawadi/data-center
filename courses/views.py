"""Views for courses: listing, details, certificate, playlist, editor and the AJAX endpoints."""
import base64
import binascii
import json
import random
import re
import uuid
from datetime import date, timedelta
from mimetypes import guess_extension

from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.files.base import ContentFile
from django.core.files.images import get_image_dimensions
from django.core.validators import URLValidator
from django.db import transaction
from django.db.models import F, Sum
from django.http import Http404, JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.generic import TemplateView

from projects.models import Project, ProjectFile, ProjectImage, ProjectStatus
from users.models import User, UserRole

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

_PREFETCH = ('sections__lessons',)

_DATA_URL_RE = re.compile(r'^data:(?P<mime>[^;,]+)?(?:;base64)?,(?P<data>.*)$', re.S)

_MAX_SECTIONS = 40
_MAX_LESSONS = 200
_MAX_QUIZ_QUESTIONS = 50
_MAX_QUIZ_CHOICES = 6
_QUIZ_RETRY_COOLDOWN = timedelta(minutes=10)


def _decode_data_url(data_url):
    """Turn a base64 data URL into (filename, bytes) or None."""
    if not isinstance(data_url, str) or not data_url.startswith('data:'):
        return None
    header = data_url.split(',', 1)[0]
    if ';base64' not in header:
        return None
    match = _DATA_URL_RE.match(data_url)
    if not match:
        return None
    try:
        content = base64.b64decode(match.group('data'))
    except (binascii.Error, ValueError):
        return None
    if not content:
        return None
    mime = match.group('mime') or 'application/octet-stream'
    ext = guess_extension(mime) or ''
    if ext == '.jpe':
        ext = '.jpg'
    return f'{uuid.uuid4().hex}{ext}', content


def _published_courses():
    return Course.objects.filter(status=CourseStatus.PUBLISHED).select_related('owner').prefetch_related(*_PREFETCH)


def published_courses_payload():
    """قائمة الدورات المنشورة بصيغة الواجهة (تُحقن كـ JSON في الصفحات)."""
    return [course.to_public_dict() for course in _published_courses()]


def _can_view(course, user):
    """دورات منشورة يراها الجميع + مسودّات صاحبها (أو الأدمن)."""
    if course.is_published:
        return True
    if not user.is_authenticated:
        return False
    return course.owner_id == user.pk or user.is_admin_role or user.is_staff


def _course_is_paid(course):
    return course.is_paid


def _has_course_access(course, user):
    if not _course_is_paid(course):
        return True
    if user.is_authenticated and (
        course.owner_id == user.pk or user.is_admin_role or user.is_staff
    ):
        return True
    return user.is_authenticated and CourseProgress.objects.filter(
        student=user,
        course=course,
    ).exists()


def _find_course(key, queryset=None):
    """البحث بالمعرّف النصي (slug) أولاً ثم بالرقم."""
    queryset = queryset if queryset is not None else Course.objects.all()
    course = queryset.filter(slug=key).first()
    if course is None and str(key).isdigit():
        course = queryset.filter(pk=key).first()
    return course


class CourseListView(TemplateView):
    """all-courses.html — المنشورات العامة فقط."""

    template_name = 'courses/list.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = _published_courses()
        context['courses_json'] = [c.to_public_dict() for c in queryset]
        return context


class CourseDetailView(TemplateView):
    """course.html — دورة واحدة بالمعرّف (أو الرقم)."""

    template_name = 'courses/detail.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        key = kwargs['pk']
        course = _find_course(key, _published_courses())
        if course is None:
            course = _find_course(key)
            if course is not None and not _can_view(course, self.request.user):
                course = None
        if course is None:
            raise Http404('الدورة غير موجودة')
        referral_code = self.request.GET.get('ref')
        if referral_code:
            try:
                referral_uuid = uuid.UUID(referral_code)
            except (TypeError, ValueError, AttributeError):
                referral_uuid = None
            if referral_uuid is not None:
                referral_query = StudentReferralLink.objects.filter(code=referral_uuid, course=course)
                if self.request.user.is_authenticated:
                    referral_query = referral_query.exclude(referrer=self.request.user)
                referral = referral_query.first()
                if referral:
                    self.request.session['student_course_referral_code'] = str(referral.code)
                    self.request.session.modified = True
        related = (
            _published_courses()
            .exclude(pk=course.pk)
            .order_by('-created_at')[:3]
        )
        context['course'] = course
        context['courses_json'] = [course.to_public_dict()] + [r.to_public_dict() for r in related]
        context['is_course_enrolled'] = (
            self.request.user.is_authenticated
            and CourseProgress.objects.filter(
                student=self.request.user,
                course=course,
            ).exists()
        )
        points = 0
        referral_share_url = ''
        if self.request.user.is_authenticated and self.request.user.role == UserRole.STUDENT:
            points = (
                StudentPointTransaction.objects.filter(student=self.request.user)
                .aggregate(total=Sum('points'))['total']
                or 0
            )
            if _course_is_paid(course):
                referral, _ = StudentReferralLink.objects.get_or_create(
                    referrer=self.request.user,
                    course=course,
                )
                referral_share_url = (
                    f'{self.request.build_absolute_uri(reverse("courses:detail", args=[course.slug]))}'
                    f'?ref={referral.code}'
                )
        context['course_rewards_json'] = {
            'points': points,
            'shareUrl': referral_share_url,
            'canRedeem': bool(
                self.request.user.is_authenticated
                and self.request.user.role == UserRole.STUDENT
                and _course_is_paid(course)
                and points >= 100
                and not context['is_course_enrolled']
            ),
            'redeemUrl': reverse('courses:redeem-points', kwargs={'pk': course.slug}),
        }
        return context


@login_required
@require_POST
def redeem_course_points(request, pk):
    course = _find_course(pk, _published_courses())
    if course is None:
        course = _find_course(pk)
        if course is not None and not _can_view(course, request.user):
            course = None
    if course is None:
        raise Http404('الدورة غير موجودة')
    if request.user.role != UserRole.STUDENT:
        return JsonResponse({'ok': False, 'error': 'هذه الميزة متاحة للطلاب فقط.'}, status=403)
    if not _course_is_paid(course):
        return JsonResponse({'ok': False, 'error': 'يمكن استبدال النقاط في الدورات المدفوعة فقط.'}, status=400)

    with transaction.atomic():
        User.objects.select_for_update().get(pk=request.user.pk)
        if CourseProgress.objects.filter(student=request.user, course=course).exists():
            return JsonResponse({'ok': False, 'error': 'أنت مسجل في هذه الدورة بالفعل.'}, status=409)
        points = (
            StudentPointTransaction.objects.filter(student=request.user)
            .aggregate(total=Sum('points'))['total']
            or 0
        )
        if points < 100:
            return JsonResponse({'ok': False, 'error': 'تحتاج إلى 100 نقطة على الأقل.'}, status=400)
        CourseProgress.objects.create(student=request.user, course=course)
        StudentPointTransaction.objects.create(
            student=request.user,
            course=course,
            points=-100,
            kind=StudentPointTransaction.Kind.REDEMPTION,
        )

    return JsonResponse({'ok': True, 'points': points - 100})


class CertificateDetailView(TemplateView):
    """certificate.html — صفحة الشهادة المكتسبة (أو تفاصيل الدورة إن لم تُكتسب)."""

    template_name = 'courses/certificate.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        key = kwargs['pk']
        if key.startswith('manual-'):
            try:
                manual_certificate = ManualCertificate.objects.select_related('student').get(
                    pk=key[len('manual-'):]
                )
            except (ManualCertificate.DoesNotExist, ValueError):
                raise Http404('الشهادة غير موجودة')
            is_owner = (
                self.request.user.is_authenticated
                and manual_certificate.student_id == self.request.user.pk
            )
            if manual_certificate.status != ManualCertificateStatus.APPROVED and not (
                is_owner and manual_certificate.status == ManualCertificateStatus.PENDING
            ):
                raise Http404('الشهادة غير موجودة')
            context['courses_json'] = [manual_certificate.to_public_dict()]
            return context

        course = _find_course(key, _published_courses())
        if course is None:
            course = _find_course(key)
            if course is not None and not _can_view(course, self.request.user):
                course = None
        if course is None:
            raise Http404('الدورة غير موجودة')
        context['course'] = course
        cert = None
        if self.request.user.is_authenticated:
            cert = CourseCertificate.objects.filter(
                student=self.request.user, course=course
            ).first()
        context['courses_json'] = [cert.to_public_dict() if cert else course.to_public_dict()]
        return context


class PlaylistView(TemplateView):
    """playlist.html — قائمة دروس الدورة."""

    template_name = 'courses/playlist.html'

    def get(self, request, *args, **kwargs):
        course = _find_course(kwargs['pk'], _published_courses())
        if course is None:
            course = _find_course(kwargs['pk'])
            if course is not None and not _can_view(course, request.user):
                course = None
        if course is None:
            raise Http404('الدورة غير موجودة')
        if not _has_course_access(course, request.user):
            detail_url = reverse('courses:detail', kwargs={'pk': course.slug})
            return redirect(f'{detail_url}?registration=required')
        return super().get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        key = kwargs['pk']
        course = _find_course(key, _published_courses())
        if course is None:
            course = _find_course(key)
            if course is not None and not _can_view(course, self.request.user):
                course = None
        if course is None:
            raise Http404('الدورة غير موجودة')
        context['course'] = course
        context['courses_json'] = [course.to_public_dict()]
        if self.request.user.is_authenticated:
            progress = (
                CourseProgress.objects.filter(student=self.request.user, course=course).first()
            )
            context['progress_json'] = {
                'done': list(progress.completed_ids or []) if progress else [],
                'complete': bool(progress.completed) if progress else False,
            }
            # حالة محاولات الكويز (لصفحة المشاهدة): لكل درس اختبار محاولات سابقة
            quiz_status = {}
            quizzes = Quiz.objects.filter(
                lesson__section__course=course,
            ).select_related('lesson')
            for quiz in quizzes:
                quiz_status[str(quiz.lesson_id)] = _quiz_attempt_state(quiz, self.request.user)
            context['quiz_json'] = quiz_status
        return context


class CourseEditorView(LoginRequiredMixin, TemplateView):
    """edit-course.html — إنشاء أو تعديل دورة يملكها المستخدم أو يديرها الأدمن."""

    template_name = 'courses/editor.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        key = kwargs.get('pk')
        is_admin = self.request.user.is_staff or self.request.user.is_admin_role
        if key:
            queryset = Course.objects.all() if is_admin else Course.objects.filter(owner=self.request.user)
            course = _find_course(key, queryset)
            if course is None:
                raise Http404('الدورة غير موجودة')
            # محرر الدورة يحتاج نصوص الأسئلة والإجابات الصحيحة.
            context['courses_json'] = [course.to_public_dict(include_answers=True)]
        else:
            if not self.request.user.is_trainer and not is_admin:
                raise PermissionDenied('الإنشاء متاح للمدربين فقط')
            context['courses_json'] = []
        context['is_admin_editor'] = is_admin
        context['admin_trainers'] = (
            User.objects.filter(role=UserRole.TRAINER, is_active=True).order_by('full_name', 'pk')
            if is_admin else []
        )
        # مشاريع المدرب لاختيار أحدها عند ربط درس «مشروع»
        project_owner = course.owner if key else self.request.user
        trainer_projects = (
            Project.objects.filter(owner=project_owner)
            .prefetch_related('tags', 'files', 'images')
            .order_by('-updated_at')
        ) if project_owner.is_trainer else Project.objects.none()
        context['trainer_projects_json'] = [p.to_public_dict() for p in trainer_projects]
        return context


def _sync_quiz(lesson, data):
    """مزامنة أسئلة الكويز مع محتوى الطلب (لدروس نوع «اختبار» فقط).

    data=None يعني عدم إرسال بيانات الكويز (محرر قديم/لوحة إدارة) فنُبقي الموجود.
    """
    if data is None:
        return
    if not isinstance(data, dict):
        data = {}

    def _int(raw, default, low, high):
        try:
            value = int(raw)
        except (TypeError, ValueError):
            value = default
        return max(low, min(value, high))

    quiz, _created = Quiz.objects.get_or_create(lesson=lesson)
    quiz.instructions = str(data.get('instructions') or '').strip()
    quiz.max_attempts = _int(data.get('maxAttempts'), 3, 1, 10)
    quiz.questions_count = _int(data.get('questionsCount'), 0, 0, _MAX_QUIZ_QUESTIONS)
    quiz.pass_score = _int(data.get('passScore'), 60, 0, 100)
    quiz.shuffle_questions = bool(data.get('shuffleQuestions', True))
    quiz.shuffle_choices = bool(data.get('shuffleChoices', True))
    quiz.save()

    raw_questions = data.get('questions')
    if not isinstance(raw_questions, list):
        raw_questions = []

    cleaned = []
    for order, raw_question in enumerate(raw_questions):
        if len(cleaned) >= _MAX_QUIZ_QUESTIONS:
            break
        if not isinstance(raw_question, dict):
            continue
        text = str(raw_question.get('text') or '').strip()
        if not text:
            continue
        raw_choices = raw_question.get('choices')
        if not isinstance(raw_choices, list):
            raw_choices = []
        choices = []
        for raw_choice in raw_choices:
            if not isinstance(raw_choice, dict):
                continue
            choice_text = str(raw_choice.get('text') or '').strip()[:300]
            if not choice_text:
                continue
            choices.append({'text': choice_text, 'correct': bool(raw_choice.get('correct'))})
            if len(choices) >= _MAX_QUIZ_CHOICES:
                break
        if len(choices) < 2:
            continue
        if not any(choice['correct'] for choice in choices):
            choices[0]['correct'] = True
        cleaned.append(
            {
                'text': text,
                'explanation': str(raw_question.get('explanation') or '').strip(),
                'choices': choices,
                'order': order,
            }
        )

    existing_questions = list(quiz.questions.all().order_by('order', 'id'))
    for extra in existing_questions[len(cleaned):]:
        extra.delete()
    existing_questions = existing_questions[: len(cleaned)]

    for index, spec in enumerate(cleaned):
        if index < len(existing_questions):
            question = existing_questions[index]
            question.text = spec['text']
            question.explanation = spec['explanation']
            question.order = spec['order']
            question.save()
        else:
            question = QuizQuestion.objects.create(
                quiz=quiz,
                text=spec['text'],
                explanation=spec['explanation'],
                order=spec['order'],
            )
        existing_choices = list(question.choices.all().order_by('order', 'id'))
        for choice_index, choice_spec in enumerate(spec['choices']):
            if choice_index < len(existing_choices):
                choice = existing_choices[choice_index]
                choice.text = choice_spec['text']
                choice.is_correct = choice_spec['correct']
                choice.order = choice_index
                choice.save()
            else:
                QuizChoice.objects.create(
                    question=question,
                    text=choice_spec['text'],
                    is_correct=choice_spec['correct'],
                    order=choice_index,
                )
        for extra_choice in existing_choices[len(spec['choices']):]:
            extra_choice.delete()

    # لا يمكن عرض عدد أكبر من أسئلة المخزون
    if quiz.questions_count > len(cleaned):
        quiz.questions_count = 0
        quiz.save(update_fields=['questions_count'])


def _resolve_owner_project(owner, raw_id):
    """يحوّل معرّف مشروع (slug أو pk) إلى مشروع يملكه المدرب، أو None."""
    if raw_id in (None, ''):
        return None
    key = str(raw_id).strip()
    if not key:
        return None
    qs = Project.objects.filter(owner=owner)
    project = qs.filter(slug=key).first()
    if project is None:
        try:
            project = qs.filter(pk=int(key)).first()
        except (TypeError, ValueError):
            project = None
    return project


def _sync_syllabus(course, syllabus):
    """مزامنة الأقسام والدروس مع محتوى الطلب (إنشاء/تعديل/حذف)."""
    if not isinstance(syllabus, list):
        return

    existing_sections = {s.pk: s for s in course.sections.all()}
    existing_lessons = {
        lesson.pk: lesson for lesson in Lesson.objects.filter(section__course=course).select_related('section')
    }

    section_pks = []
    lesson_pks = []
    total_lessons = 0

    for order, raw_section in enumerate(syllabus[:_MAX_SECTIONS]):
        if not isinstance(raw_section, dict):
            continue
        title = str(raw_section.get('title') or '').strip()[:200]
        if not title:
            continue

        section_id = raw_section.get('id')
        try:
            section_id = int(section_id) if section_id not in (None, '') else None
        except (TypeError, ValueError):
            section_id = None

        section = existing_sections.get(section_id)
        if section is None:
            section = CourseSection(course=course, title=title, order=order)
        else:
            section.title = title
            section.order = order
        section.save()
        section_pks.append(section.pk)

        lessons = raw_section.get('lessons')
        if not isinstance(lessons, list):
            lessons = []
        for lesson_order, raw_lesson in enumerate(lessons):
            if total_lessons >= _MAX_LESSONS:
                break
            if not isinstance(raw_lesson, dict):
                continue
            lesson_title = str(raw_lesson.get('title') or '').strip()[:200]
            if not lesson_title:
                continue
            total_lessons += 1

            lesson_id = raw_lesson.get('id')
            try:
                lesson_id = int(lesson_id) if lesson_id not in (None, '') else None
            except (TypeError, ValueError):
                lesson_id = None

            lesson = existing_lessons.get(lesson_id)
            lesson_type = raw_lesson.get('type')
            if lesson_type not in LessonType.values:
                lesson_type = LessonType.VIDEO
            linked_project = (
                _resolve_owner_project(course.owner, raw_lesson.get('projectId'))
                if lesson_type == LessonType.PROJECT
                else None
            )
            fields = {
                'title': lesson_title,
                'duration': str(raw_lesson.get('duration') or '').strip()[:12],
                'type': lesson_type,
                'is_free': bool(raw_lesson.get('free')),
                'content': str(raw_lesson.get('content') or '').strip(),
                'video_url': str(raw_lesson.get('videoUrl') or raw_lesson.get('video_url') or '').strip()[:500],
                'linked_project': linked_project,
            }
            if lesson is None or lesson.section_id != section.pk:
                if lesson is None:
                    lesson = Lesson(section=section, order=lesson_order, **fields)
                else:
                    for name, value in fields.items():
                        setattr(lesson, name, value)
                    lesson.section = section
                    lesson.order = lesson_order
            else:
                for name, value in fields.items():
                    setattr(lesson, name, value)
                lesson.order = lesson_order
            lesson.save()
            if lesson_type == LessonType.QUIZ:
                _sync_quiz(lesson, raw_lesson.get('quiz'))
            else:
                # تغيير النوع بعيداً عن «اختبار» يحذف الكويز مع أسئلته
                Quiz.objects.filter(lesson=lesson).delete()
            lesson_pks.append(lesson.pk)

    course.sections.exclude(pk__in=section_pks).delete()
    Lesson.objects.filter(section__course=course).exclude(pk__in=lesson_pks).delete()


@login_required
@require_POST
def course_save(request):
    """AJAX endpoint used by the client-side course editor (create & update).

    المدرب ينشئ دوراته ويعدل ما يملكه؛ الأدمن يستطيع إدارة الدورات وإسنادها لمدرب.
    """
    is_admin = request.user.is_staff or request.user.is_admin_role
    if not request.user.is_trainer and not is_admin:
        return JsonResponse({'ok': False, 'error': 'not_trainer'}, status=403)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)

    key = str(payload.get('id') or '').strip()
    course = None
    if key:
        queryset = Course.objects.all() if is_admin else Course.objects.filter(owner=request.user)
        course = _find_course(key, queryset)
        if course is None:
            return JsonResponse({'ok': False, 'error': 'not_found'}, status=404)

    status = CourseStatus.PUBLISHED if payload.get('status') == CourseStatus.PUBLISHED else CourseStatus.DRAFT
    title = str(payload.get('title') or '').strip()[:200]
    if status == CourseStatus.PUBLISHED and not title:
        return JsonResponse({'ok': False, 'error': 'required'}, status=400)

    created = course is None
    if created:
        if is_admin:
            trainer_id = payload.get('trainerId')
            trainer = User.objects.filter(
                pk=trainer_id, role=UserRole.TRAINER, is_active=True
            ).first()
            if trainer is None:
                return JsonResponse({'ok': False, 'error': 'trainer_required'}, status=400)
            course = Course(owner=trainer)
        else:
            course = Course(owner=request.user)
    elif is_admin and 'trainerId' in payload:
        trainer = User.objects.filter(
            pk=payload.get('trainerId'), role=UserRole.TRAINER, is_active=True
        ).first()
        if trainer is None:
            return JsonResponse({'ok': False, 'error': 'trainer_required'}, status=400)
        course.owner = trainer

    course.title = title or 'دورة بدون عنوان'
    course.category = str(payload.get('category') or '').strip()[:120]
    course.summary = str(payload.get('summary') or payload.get('description') or '').strip()[:320]
    course.content = str(payload.get('content') or '').strip()
    course.price = str(payload.get('price') or '').strip()[:40]
    course.duration = str(payload.get('duration') or '').strip()[:40]
    course.period = str(payload.get('period') or '').strip()[:40]
    course.credential_id = str(payload.get('credentialId') or payload.get('credential_id') or '').strip()[:60]
    course.verify_url = str(payload.get('verifyUrl') or payload.get('verify_url') or '').strip()[:200]
    course.status = status
    course.save()

    cover = payload.get('cover')
    if isinstance(cover, str) and cover.startswith('data:image'):
        decoded = _decode_data_url(cover)
        if decoded:
            name, content = decoded
            course.cover.save(name, ContentFile(content), save=True)
    elif cover == '':
        if course.cover:
            course.cover.delete(save=True)

    skills = payload.get('skills') or payload.get('tags')
    if isinstance(skills, list):
        cleaned = []
        seen = set()
        for raw in skills[:15]:
            name = str(raw or '').strip()[:80]
            if not name or name.lower() in seen:
                continue
            seen.add(name.lower())
            cleaned.append(name)
        course.skills = cleaned
        course.save(update_fields=['skills'])

    if 'syllabus' in payload:
        _sync_syllabus(course, payload.get('syllabus'))

    return JsonResponse(
        {
            'ok': True,
            'id': course.slug,
            'status': course.status,
            'url': reverse('courses:detail', kwargs={'pk': course.slug}),
        }
    )


@login_required
@require_POST
def course_delete(request):
    """AJAX endpoint: delete a course owned by the current trainer."""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)

    key = str(payload.get('id') or '').strip()
    if not key:
        return JsonResponse({'ok': False, 'error': 'required'}, status=400)

    course = _find_course(key, Course.objects.filter(owner=request.user))
    if course is None:
        return JsonResponse({'ok': False, 'error': 'not_found'}, status=404)

    course.delete()
    return JsonResponse({'ok': True, 'url': reverse('courses:list')})


@login_required
@require_POST
def manual_certificate_submit(request):
    """Save a student-submitted certificate as pending admin review."""
    if request.user.role != UserRole.STUDENT:
        return JsonResponse({'ok': False, 'error': 'student_only'}, status=403)

    title = (request.POST.get('title') or '').strip()
    issuer = (request.POST.get('issuer') or '').strip()
    description = (request.POST.get('description') or '').strip()
    if not title or not issuer:
        return JsonResponse({'ok': False, 'error': 'required'}, status=400)
    if len(description) < 150:
        return JsonResponse({'ok': False, 'error': 'description_too_short'}, status=400)

    uploaded_image = request.FILES.get('image')
    if uploaded_image:
        if not (uploaded_image.content_type or '').startswith('image/'):
            return JsonResponse({'ok': False, 'error': 'invalid_image'}, status=400)
        if uploaded_image.size > 8 * 1024 * 1024:
            return JsonResponse({'ok': False, 'error': 'image_too_large'}, status=400)
        image_content = uploaded_image.read()
        extension = guess_extension(uploaded_image.content_type) or '.jpg'
        if extension == '.jpe':
            extension = '.jpg'
        filename = f'{uuid.uuid4().hex}{extension}'
    else:
        image_data = request.POST.get('image_data') or ''
        if not image_data.startswith('data:image/'):
            return JsonResponse({'ok': False, 'error': 'image_required'}, status=400)
        if len(image_data) > 12 * 1024 * 1024:
            return JsonResponse({'ok': False, 'error': 'image_too_large'}, status=400)
        decoded = _decode_data_url(image_data)
        if not decoded:
            return JsonResponse({'ok': False, 'error': 'invalid_image'}, status=400)
        filename, image_content = decoded
    if len(image_content) > 8 * 1024 * 1024:
        return JsonResponse({'ok': False, 'error': 'image_too_large'}, status=400)
    try:
        dimensions = get_image_dimensions(ContentFile(image_content))
    except (OSError, ValueError):
        return JsonResponse({'ok': False, 'error': 'invalid_image'}, status=400)
    if not dimensions or not all(dimensions):
        return JsonResponse({'ok': False, 'error': 'invalid_image'}, status=400)

    issued_date = None
    date_value = (request.POST.get('date') or '').strip()
    if date_value:
        try:
            issued_date = date.fromisoformat(date_value)
        except ValueError:
            return JsonResponse({'ok': False, 'error': 'invalid_date'}, status=400)

    verify_url = (request.POST.get('verify_url') or '').strip()
    if verify_url:
        try:
            URLValidator()(verify_url)
        except ValidationError:
            return JsonResponse({'ok': False, 'error': 'invalid_url'}, status=400)

    try:
        skills = json.loads(request.POST.get('skills') or '[]')
    except (TypeError, ValueError):
        return JsonResponse({'ok': False, 'error': 'invalid_skills'}, status=400)
    if not isinstance(skills, list):
        return JsonResponse({'ok': False, 'error': 'invalid_skills'}, status=400)
    normalized_skills = []
    seen_skills = set()
    for skill in skills[:20]:
        if not isinstance(skill, str):
            continue
        skill = skill.strip()[:80]
        if skill and skill.casefold() not in seen_skills:
            seen_skills.add(skill.casefold())
            normalized_skills.append(skill)

    certificate = ManualCertificate(
        student=request.user,
        title=title[:200],
        issuer=issuer[:200],
        category=(request.POST.get('category') or '').strip()[:120],
        date=issued_date,
        credential_id=(request.POST.get('credential_id') or '').strip()[:120],
        verify_url=verify_url,
        description=description[:5000],
        skills=normalized_skills,
        status=ManualCertificateStatus.PENDING,
        is_active=False,
    )
    certificate.image.save(filename, ContentFile(image_content), save=False)
    certificate.save()
    return JsonResponse({
        'ok': True,
        'certificate': certificate.to_public_dict(),
        'status': certificate.get_status_display(),
    }, status=201)


@login_required
@require_POST
def course_lesson_done(request):
    """AJAX endpoint: تعلّم درساً كمكتمل (أو إلغاء) ويفحص انتهاء الدورة.

    عند إتمام كل الدروس تُنشأ شهادة تلقائياً لطالب الدورة.
    """
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)

    key = str(payload.get('id') or '').strip()
    if not key:
        return JsonResponse({'ok': False, 'error': 'required'}, status=400)

    course = _find_course(key)
    if course is None or not _can_view(course, request.user):
        return JsonResponse({'ok': False, 'error': 'not_found'}, status=404)
    if not _has_course_access(course, request.user):
        return JsonResponse({'ok': False, 'error': 'registration_required'}, status=403)

    try:
        lesson_id = int(payload.get('lesson'))
    except (TypeError, ValueError):
        return JsonResponse({'ok': False, 'error': 'invalid_lesson'}, status=400)
    lesson = Lesson.objects.filter(pk=lesson_id, section__course=course).first()
    if lesson is None:
        return JsonResponse({'ok': False, 'error': 'invalid_lesson'}, status=400)

    done = bool(payload.get('done', True))
    return JsonResponse(_apply_lesson_completion(request.user, course, lesson, done))


def _copy_media_file(source_field, target_field, filename):
    """ينسخ محتوى ملف مخزّن (صورة/ملف) إلى حقل جديد كنسخة مستقلة.

    يعيد True عند النجاح، وFalse إذا تعذّر فتح الملف (مفقود/تالف) دون إيقاف النسخ.
    """
    if not source_field or not getattr(source_field, 'name', ''):
        return False
    try:
        source_field.open('rb')
        data = source_field.read()
    except (OSError, ValueError):
        return False
    finally:
        try:
            source_field.close()
        except Exception:  # pragma: no cover - defensive
            pass
    if not data:
        return False
    target_field.save(filename, ContentFile(data), save=True)
    return True


def _ensure_project_for_lesson(user, course, lesson):
    """مشروع الطالب التلقائي لدرس من نوع «مشروع» (مرة واحدة لكل درس).

    إن كان الدرس مرتبطاً بمشروع للمدرب، تُنسخ بياناته كاملة إلى مشروع الطالب:
    العنوان/الملخص/المحتوى/التصنيف/الدور/روابط/الوسوم/الغلاف/صور المعرض/الملفات
    — بنسخ مستقلة من الملفات على القرص حتى لا يتأثّر أصل المدرب بأي تعديل.
    وإلا يُبنى من وصف الدرس.
    """
    existing = Project.objects.filter(owner=user, source_lesson=lesson).first()
    if existing is not None:
        return existing, False

    source = lesson.linked_project
    if source is not None:
        title = (source.title or lesson.title)[:200]
        summary = (source.summary or '')[:320]
        body = source.content or ''
        if not body:
            body = f'نسخة معدّة للتعديل من مشروع «{source.title}» ضمن دورة «{course.title}».'
        body += (
            f'\n\n<p class="muted small">مشروع ضمن دورة '
            f'<a href="{reverse("courses:detail", kwargs={"pk": course.slug})}">«{course.title}»</a> — {course.owner.display_name}</p>'
        )
        project = Project(
            owner=user,
            title=title,
            summary=summary,
            content=body,
            category=source.category or course.category,
            role=source.role or 'مشروع تدريبي',
            github_url=source.github_url,
            demo_url=source.demo_url,
            status=ProjectStatus.PUBLISHED,
            project_date=timezone.localdate(),
            source_lesson=lesson,
        )
        project.save()

        # الغلاف — نسخة مستقلة
        if source.cover:
            _copy_media_file(source.cover, project.cover, source.cover.name.rsplit('/', 1)[-1])

        # الوسوم (أسماء مشتركة في القاموس العام فقط، والربط خاص بمشروع الطالب)
        for tag in source.tags.all():
            project.tags.add(tag)

        # صور المعرض — نسخ مستقلة بنفس الترتيب
        for image in source.images.all():
            if not image.image:
                continue
            copy = ProjectImage(project=project, order=image.order)
            if _copy_media_file(image.image, copy.image, image.image.name.rsplit('/', 1)[-1]):
                copy.save()

        # الملفات المرفقة — نسخ مستقلة مع الحفاظ على الاسم والحجم
        for project_file in source.files.all():
            if not project_file.file:
                continue
            name = project_file.display_name
            copy = ProjectFile(
                project=project,
                original_name=project_file.original_name,
                size=project_file.size,
            )
            if _copy_media_file(project_file.file, copy.file, project_file.file.name.rsplit('/', 1)[-1]):
                copy.save()

        return project, True

    text = re.sub(r'<[^>]+>', ' ', lesson.content or '').strip()
    summary = text[:300].strip() or course.summary[:300]
    body = text or f'مشروع تدريبي من دورة «{course.title}».'
    body += (
        f'\n\n<p class="muted small">مشروع ضمن دورة '
        f'<a href="{reverse("courses:detail", kwargs={"pk": course.slug})}">«{course.title}»</a> — {course.owner.display_name}</p>'
    )
    project = Project(
        owner=user,
        title=lesson.title[:200],
        summary=summary[:320],
        content=body,
        category=course.category,
        role='مشروع تدريبي',
        status=ProjectStatus.PUBLISHED,
        project_date=timezone.localdate(),
        source_lesson=lesson,
    )
    project.save()
    return project, True


def _apply_lesson_completion(user, course, lesson, done):
    """تعليم/إلغاء الدرس كمكتمل + فحص انتهاء الدورة والشهادة + المشروع التلقائي."""
    progress, _ = CourseProgress.objects.get_or_create(student=user, course=course)
    progress.set_lesson(lesson.pk, done)
    newly_completed = progress.check_completion()
    progress.save()

    certificate = None
    if newly_completed:
        certificate, _ = CourseCertificate.objects.get_or_create(student=user, course=course)

    project = None
    project_created = False
    if done and lesson.type == LessonType.PROJECT:
        project, project_created = _ensure_project_for_lesson(user, course, lesson)

    total = course.lessons_count
    return {
        'ok': True,
        'done': progress.done_count,
        'total': total,
        'percent': round(progress.done_count * 100 / total) if total else 0,
        'complete': progress.completed,
        'newlyCompleted': newly_completed,
        'certificate': certificate.to_public_dict() if certificate else None,
        'project': project.to_public_dict() if project else None,
        'projectCreated': project_created,
    }


def _quiz_lesson(request):
    """يقرأ (id, lesson) من الطلب ويعيد (course, lesson, quiz) أو استجابة خطأ."""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({'ok': False, 'error': 'invalid_payload'}, status=400)

    key = str(payload.get('id') or '').strip()
    if not key:
        return JsonResponse({'ok': False, 'error': 'required'}, status=400)

    course = _find_course(key)
    if course is None or not _can_view(course, request.user):
        return JsonResponse({'ok': False, 'error': 'not_found'}, status=404)
    if not _has_course_access(course, request.user):
        return JsonResponse({'ok': False, 'error': 'registration_required'}, status=403)

    try:
        lesson_id = int(payload.get('lesson'))
    except (TypeError, ValueError):
        return JsonResponse({'ok': False, 'error': 'invalid_lesson'}, status=400)
    lesson = Lesson.objects.filter(pk=lesson_id, section__course=course).first()
    if lesson is None:
        return JsonResponse({'ok': False, 'error': 'invalid_lesson'}, status=400)
    if lesson.type != LessonType.QUIZ:
        return JsonResponse({'ok': False, 'error': 'not_quiz'}, status=400)

    quiz = Quiz.objects.filter(lesson=lesson).prefetch_related('questions__choices').first()
    if quiz is None:
        return JsonResponse({'ok': False, 'error': 'quiz_missing'}, status=400)
    return course, lesson, quiz


def _quiz_request_payload(course, lesson, quiz, attempt, attempts_left, resumed):
    """أسئلة المحاولة للعميل — بدون الإجابات الصحيحة إطلاقاً قبل الإرسال."""
    questions = {q.pk: q for q in quiz.questions.all()}
    response = []
    for question_id in attempt.question_ids:
        question = questions.get(question_id)
        if question is None:
            continue
        choices = {c.pk: c for c in question.choices.all()}
        order = attempt.choice_order.get(str(question_id)) or list(choices)
        response.append(
            {
                'id': question.pk,
                'text': question.text,
                'choices': [
                    {'id': cid, 'text': choices[cid].text}
                    for cid in order
                    if cid in choices
                ],
            }
        )
    return {
        'ok': True,
        'attempt': attempt.attempt_no,
        'maxAttempts': quiz.max_attempts,
        'attemptsLeft': attempts_left,
        'passScore': quiz.pass_score,
        'instructions': quiz.instructions,
        'resumed': resumed,
        'questions': response,
    }


def _quiz_attempt_state(quiz, student, now=None):
    """Return the current attempt cycle and cooldown, retaining earlier results."""
    now = now or timezone.now()
    attempts = QuizAttempt.objects.filter(
        quiz=quiz,
        student=student,
        submitted_at__isnull=False,
    ).order_by('submitted_at', 'attempt_no')
    used = 0
    retry_at = None
    best = 0
    passed = False

    for attempt in attempts:
        best = max(best, attempt.score or 0)
        passed = passed or attempt.passed
        if used >= quiz.max_attempts:
            if retry_at and attempt.submitted_at >= retry_at:
                used = 0
                retry_at = None
            else:
                continue
        used += 1
        if used >= quiz.max_attempts:
            retry_at = attempt.submitted_at + _QUIZ_RETRY_COOLDOWN

    if used >= quiz.max_attempts and retry_at and retry_at <= now:
        used = 0
        retry_at = None

    retry_at = retry_at if retry_at and retry_at > now else None
    retry_after = max(0, int((retry_at - now).total_seconds())) if retry_at else 0
    return {
        'attempts': used,
        'best': best,
        'passed': passed,
        'max': quiz.max_attempts,
        'remaining': max(0, quiz.max_attempts - used),
        'retryAt': retry_at.isoformat() if retry_at else None,
        'retryAfter': retry_after,
    }


@login_required
@require_POST
def course_quiz_start(request):
    """AJAX: بدء (أو استئناف) محاولة في اختبار — أسئلة مختلفة لكل محاولة."""
    parsed = _quiz_lesson(request)
    if isinstance(parsed, JsonResponse):
        return parsed
    course, lesson, quiz = parsed

    in_progress = (
        QuizAttempt.objects.filter(quiz=quiz, student=request.user, submitted_at__isnull=True)
        .order_by('-attempt_no')
        .first()
    )
    state = _quiz_attempt_state(quiz, request.user)

    if in_progress is not None:
        return JsonResponse(
            _quiz_request_payload(
                course, lesson, quiz, in_progress,
                state['remaining'], True,
            )
        )

    attempts_left = state['remaining']
    if attempts_left <= 0:
        return JsonResponse({
            'ok': False,
            'error': 'no_attempts',
            'retryAt': state['retryAt'],
            'retryAfter': state['retryAfter'],
        }, status=403)

    pool = list(quiz.questions.all().order_by('order', 'id'))
    if not pool:
        return JsonResponse({'ok': False, 'error': 'no_questions'}, status=400)

    count = quiz.questions_count or len(pool)
    count = max(1, min(count, len(pool)))
    selected = random.sample(pool, count) if quiz.shuffle_questions else pool[:count]

    choice_order = {}
    for question in selected:
        choice_ids = [c.pk for c in question.choices.all()]
        if quiz.shuffle_choices:
            random.shuffle(choice_ids)
        choice_order[str(question.pk)] = choice_ids

    attempt = QuizAttempt.objects.create(
        quiz=quiz,
        student=request.user,
        attempt_no=QuizAttempt.objects.filter(quiz=quiz, student=request.user).count() + 1,
        question_ids=[q.pk for q in selected],
        choice_order=choice_order,
    )
    return JsonResponse(
        _quiz_request_payload(course, lesson, quiz, attempt, attempts_left - 1, False)
    )


@login_required
@require_POST
def course_quiz_submit(request):
    """AJAX: تصحيح محاولة الكويز — وعند النجاح يُعلّم الدرس كمكتمل تلقائياً."""
    parsed = _quiz_lesson(request)
    if isinstance(parsed, JsonResponse):
        return parsed
    course, lesson, quiz = parsed

    attempt = (
        QuizAttempt.objects.filter(quiz=quiz, student=request.user, submitted_at__isnull=True)
        .order_by('-attempt_no')
        .first()
    )
    if attempt is None:
        return JsonResponse({'ok': False, 'error': 'no_attempt'}, status=400)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        payload = {}
    raw_answers = payload.get('answers')
    if not isinstance(raw_answers, dict):
        raw_answers = {}

    questions = {q.pk: q for q in quiz.questions.all().prefetch_related('choices')}
    results = []
    correct_count = 0
    total = 0
    answers = {}
    for question_id in attempt.question_ids:
        question = questions.get(question_id)
        if question is None:
            continue
        total += 1
        try:
            chosen_id = int(raw_answers.get(str(question_id)))
        except (TypeError, ValueError):
            chosen_id = None
        answers[str(question_id)] = chosen_id
        choices = {c.pk: c for c in question.choices.all()}
        correct_choice = next((c for c in choices.values() if c.is_correct), None)
        is_correct = chosen_id in choices and choices[chosen_id].is_correct
        if is_correct:
            correct_count += 1
        results.append(
            {
                'id': question_id,
                'correct': is_correct,
                'your': chosen_id,
                'correctChoice': correct_choice.pk if correct_choice else None,
                'explanation': question.explanation,
            }
        )

    score = round(correct_count * 100 / total) if total else 0
    passed = score >= quiz.pass_score

    attempt.answers = answers
    attempt.score = score
    attempt.passed = passed
    attempt.submitted_at = timezone.now()
    attempt.save()

    state = _quiz_attempt_state(quiz, request.user)
    response = {
        'ok': True,
        'attempt': attempt.attempt_no,
        'maxAttempts': quiz.max_attempts,
        'attemptsLeft': state['remaining'],
        'retryAt': state['retryAt'],
        'passScore': quiz.pass_score,
        'score': score,
        'correct': correct_count,
        'total': total,
        'passed': passed,
        'results': results,
    }
    if passed:
        response.update(_apply_lesson_completion(request.user, course, lesson, True))
    return JsonResponse(response)
