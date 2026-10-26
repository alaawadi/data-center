"""Course models — الدورات التدريبية وأقسامها ودروسكها وتقدّم الطلاب وشهاداتهم."""
import uuid

from django.conf import settings
from django.db import models
from django.utils.text import slugify


class CourseStatus(models.TextChoices):
    DRAFT = 'draft', 'مسودة'
    PUBLISHED = 'published', 'منشور'


class LessonType(models.TextChoices):
    VIDEO = 'video', 'فيديو'
    ARTICLE = 'article', 'مقال'
    QUIZ = 'quiz', 'اختبار'
    PROJECT = 'project', 'مشروع'


class Course(models.Model):
    """A training course created by a trainer (owner)."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='courses',
        verbose_name='المدرّب',
    )
    title = models.CharField('العنوان', max_length=200)
    title_en = models.CharField('العنوان بالإنجليزية', max_length=200, blank=True)
    slug = models.SlugField('المعرّف', max_length=200, unique=True, blank=True, allow_unicode=True)

    category = models.CharField('التصنيف', max_length=120, blank=True)
    summary = models.CharField('الملخص', max_length=320, blank=True)
    content = models.TextField('الوصف التفصيلي', blank=True)

    price = models.CharField('السعر', max_length=40, blank=True)
    duration = models.CharField('المدة', max_length=40, blank=True)
    duration_en = models.CharField('المدة بالإنجليزية', max_length=40, blank=True)
    period = models.CharField('الفترة', max_length=40, blank=True)

    cover = models.ImageField('صورة الغلاف', upload_to='courses/covers/%Y/%m/', blank=True)
    skills = models.JSONField('المهارات', default=list, blank=True)

    credential_id = models.CharField('رقم الشهادة', max_length=60, blank=True)
    verify_url = models.URLField('رابط التحقق', blank=True)

    status = models.CharField(
        'الحالة', max_length=16, choices=CourseStatus.choices, default=CourseStatus.DRAFT
    )

    created_at = models.DateTimeField('أُنشئت في', auto_now_add=True)
    updated_at = models.DateTimeField('حُدّثت في', auto_now=True)

    class Meta:
        verbose_name = 'دورة'
        verbose_name_plural = 'الدورات'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'owner']),
        ]

    def __str__(self):
        return self.title or f'دورة #{self.pk}'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_slug()
        super().save(*args, **kwargs)

    def _generate_slug(self):
        base = slugify(self.title or '', allow_unicode=True)[:180] or f'course-{self.pk or ""}'
        candidate = base
        index = 1
        while True:
            qs = Course.objects.filter(slug=candidate)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if not qs.exists():
                return candidate
            index += 1
            candidate = f'{base}-{index}'

    @property
    def is_published(self):
        return self.status == CourseStatus.PUBLISHED

    @property
    def is_paid(self):
        price = (self.price or '').strip().casefold()
        if not price or 'free' in price or 'مجاني' in price:
            return False
        normalized_price = price.translate(str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'))
        amount = ''.join(char for char in normalized_price if char.isdigit() or char == '.')
        if amount:
            try:
                from decimal import Decimal, InvalidOperation

                return Decimal(amount) != 0
            except InvalidOperation:
                pass
        return True

    @property
    def lessons_count(self):
        return Lesson.objects.filter(section__course=self).count()

    def to_public_dict(self, include_answers=False):
        """Shape expected by the client-side course pages (cards/detail/playlist/editor).

        include_answers=True يُستخدم في محرر الدورة (لصاحبها فقط) ليحمل نصوص
        الأسئلة والإجابات الصحيحة — الصفحات العامة تحمل الإحصاءات فقط.
        """
        owner = self.owner
        cover = self.cover.url if self.cover else ''
        price_amount = str(self.price or '').strip().replace('₪', '').strip()
        syllabus = [
            {
                'id': section.pk,
                'title': section.title,
                'lessons': [
                    {
                        'id': lesson.pk,
                        'title': lesson.title,
                        'duration': lesson.duration,
                        'type': lesson.type,
                        'free': lesson.is_free,
                        'content': lesson.content,
                        'videoUrl': lesson.video_url,
                        'projectId': lesson.linked_project.slug if lesson.linked_project_id else '',
                        'project': lesson.linked_project.to_public_dict()
                        if lesson.linked_project_id
                        else None,
                        'quiz': lesson.quiz_dict(include_answers=include_answers),
                    }
                    for lesson in section.lessons.all()
                ],
            }
            for section in self.sections.all()
        ]
        return {
            'id': self.slug or str(self.pk),
            'pk': self.pk,
            'title': self.title,
            'titleEnglish': self.title_en,
            'slug': self.slug,
            'category': self.category,
            'description': self.summary,
            'summary': self.summary,
            'content': self.content,
            'price': f'₪{price_amount}' if price_amount else '',
            'duration': self.duration,
            'durationEnglish': self.duration_en,
            'period': self.period,
            'image': cover,
            'courseImage': cover,
            'cover': cover,
            'issuer': owner.display_name if owner else '',
            'instructor': owner.display_name if owner else '',
            'instructorEnglish': (owner.trainer_name_en or owner.full_name_en) if owner else '',
            'skills': list(self.skills or []),
            'credentialId': self.credential_id,
            'verifyUrl': self.verify_url,
            'status': self.status,
            'handle': owner.handle if owner else '',
            'trainerId': str(owner.pk) if owner else '',
            'owner': {
                'name': owner.display_name if owner else '',
                'handle': owner.handle if owner else '',
                'avatar': owner.profile.avatar.url
                if owner and getattr(owner, 'profile', None) and owner.profile.avatar
                else '',
                'role': owner.get_role_display() if owner else '',
            },
            'syllabus': syllabus,
            'sectionsCount': len(syllabus),
            'lessonsCount': sum(len(sec['lessons']) for sec in syllabus),
            'date': self.created_at.date().isoformat(),
            'addedAt': self.created_at.isoformat(),
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
        }


class CourseSection(models.Model):
    """A section (module) grouping the lessons of a course."""

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name='sections', verbose_name='الدورة'
    )
    title = models.CharField('عنوان القسم', max_length=200)
    order = models.PositiveSmallIntegerField('الترتيب', default=0)

    class Meta:
        verbose_name = 'قسم الدورة'
        verbose_name_plural = 'أقسام الدورات'
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.title} — {self.course_id}'


class Lesson(models.Model):
    """A single lesson inside a course section."""

    section = models.ForeignKey(
        CourseSection, on_delete=models.CASCADE, related_name='lessons', verbose_name='القسم'
    )
    title = models.CharField('عنوان الدرس', max_length=200)
    duration = models.CharField('المدة', max_length=12, blank=True)
    type = models.CharField(
        'النوع', max_length=16, choices=LessonType.choices, default=LessonType.VIDEO
    )
    is_free = models.BooleanField('معاينة مجانية', default=False)
    content = models.TextField('محتوى الدرس', blank=True)
    video_url = models.CharField('رابط الفيديو', max_length=500, blank=True)
    linked_project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='course_lessons',
        verbose_name='المشروع المرتبط',
    )
    order = models.PositiveSmallIntegerField('الترتيب', default=0)

    class Meta:
        verbose_name = 'درس'
        verbose_name_plural = 'الدروس'
        ordering = ['order', 'id']

    def __str__(self):
        return self.title or f'درس #{self.pk}'

    @property
    def course(self):
        return self.section.course

    def quiz_dict(self, include_answers=False):
        """بيانات الكويز مربوطة بهذا الدرس (أو None إذا لم يكن درس اختبار)."""
        if self.type != LessonType.QUIZ:
            return None
        quiz = Quiz.objects.filter(lesson=self).prefetch_related('questions__choices').first()
        if quiz is None:
            return None
        return quiz.to_dict(include_answers=include_answers)

    def to_public_dict(self, include_answers=False):
        return {
            'id': self.pk,
            'section': self.section_id,
            'title': self.title,
            'duration': self.duration,
            'type': self.type,
            'free': self.is_free,
            'content': self.content,
            'videoUrl': self.video_url,
            'projectId': self.linked_project.slug if self.linked_project_id else '',
            'project': self.linked_project.to_public_dict() if self.linked_project_id else None,
            'quiz': self.quiz_dict(include_answers=include_answers),
        }


class Quiz(models.Model):
    """إعدادات اختبار مرتبط بدرس من نوع «اختبار»."""

    lesson = models.OneToOneField(
        Lesson, on_delete=models.CASCADE, related_name='quiz', verbose_name='الدرس'
    )
    instructions = models.TextField('تعليمات الاختبار', blank=True)
    max_attempts = models.PositiveSmallIntegerField('عدد المحاولات', default=3)
    questions_count = models.PositiveSmallIntegerField(
        'عدد أسئلة كل محاولة (0 = كل الأسئلة)', default=0
    )
    pass_score = models.PositiveSmallIntegerField('درجة النجاح (٪)', default=60)
    shuffle_questions = models.BooleanField('خلط ترتيب الأسئلة', default=True)
    shuffle_choices = models.BooleanField('خلط ترتيب الاختيارات', default=True)

    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)
    updated_at = models.DateTimeField('حُدّث في', auto_now=True)

    class Meta:
        verbose_name = 'اختبار'
        verbose_name_plural = 'الاختبارات'
        ordering = ['id']

    def __str__(self):
        return f'اختبار {self.lesson_id}'

    @property
    def questions_total(self):
        return self.questions.count()

    def to_dict(self, include_answers=False):
        """بيانات الكويز — الأسئلة والإجابات فقط لصاحب الدورة (المحرر)."""
        questions = []
        for question in self.questions.all():
            choices = [
                {
                    'id': choice.pk,
                    'text': choice.text,
                    **({'correct': choice.is_correct} if include_answers else {}),
                }
                for choice in question.choices.all()
            ]
            questions.append(
                {
                    'id': question.pk,
                    'text': question.text,
                    **({'explanation': question.explanation} if include_answers else {}),
                    'choices': choices,
                }
            )
        return {
            'maxAttempts': self.max_attempts,
            'questionsCount': self.questions_count,
            'questionsTotal': self.questions_total,
            'passScore': self.pass_score,
            'shuffleQuestions': self.shuffle_questions,
            'shuffleChoices': self.shuffle_choices,
            'instructions': self.instructions,
            'questions': questions if include_answers else [],
        }


class QuizQuestion(models.Model):
    """سؤال واحد داخل اختبار."""

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions', verbose_name='الاختبار')
    text = models.TextField('نص السؤال')
    explanation = models.TextField('الشرح بعد الإجابة', blank=True)
    order = models.PositiveSmallIntegerField('الترتيب', default=0)

    class Meta:
        verbose_name = 'سؤال اختبار'
        verbose_name_plural = 'أسئلة الاختبارات'
        ordering = ['order', 'id']

    def __str__(self):
        return (self.text or 'سؤال')[:60]


class QuizChoice(models.Model):
    """اختيار واحد لسؤال اختيار من متعدد."""

    question = models.ForeignKey(
        QuizQuestion, on_delete=models.CASCADE, related_name='choices', verbose_name='السؤال'
    )
    text = models.CharField('نص الاختيار', max_length=300)
    is_correct = models.BooleanField('إجابة صحيحة', default=False)
    order = models.PositiveSmallIntegerField('الترتيب', default=0)

    class Meta:
        verbose_name = 'اختيار'
        verbose_name_plural = 'الاختيارات'
        ordering = ['order', 'id']

    def __str__(self):
        return self.text[:60]


class QuizAttempt(models.Model):
    """محاولة طالب في اختبار: الأسئلة المختارة لحظة البدء + النتيجة عند الإرسال."""

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts', verbose_name='الاختبار')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_attempts',
        verbose_name='الطالب',
    )
    attempt_no = models.PositiveSmallIntegerField('رقم المحاولة', default=1)
    question_ids = models.JSONField('أسئلة المحاولة', default=list, blank=True)
    choice_order = models.JSONField('ترتيب الاختيارات', default=dict, blank=True)
    answers = models.JSONField('إجابات الطالب', default=dict, blank=True)
    score = models.PositiveSmallIntegerField('النتيجة (٪)', null=True, blank=True)
    passed = models.BooleanField('ناجح', default=False)
    submitted_at = models.DateTimeField('أُرسلت في', null=True, blank=True)
    created_at = models.DateTimeField('بدأت في', auto_now_add=True)

    class Meta:
        verbose_name = 'محاولة اختبار'
        verbose_name_plural = 'محاولات الاختبارات'
        ordering = ['attempt_no', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['quiz', 'student', 'attempt_no'], name='unique_quiz_student_attempt'
            ),
        ]

    def __str__(self):
        return f'{self.student_id} — quiz {self.quiz_id} #{self.attempt_no}'


class CourseProgress(models.Model):
    """تقدّم طالب واحد في دورة: الدروس التي أكملها + ما إذا أنهى الدورة."""

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_progress',
        verbose_name='الطالب',
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name='progress', verbose_name='الدورة'
    )
    completed_ids = models.JSONField('الدروس المكتملة', default=list, blank=True)
    completed = models.BooleanField('أنهى الدورة', default=False)

    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)
    updated_at = models.DateTimeField('حُدّث في', auto_now=True)

    class Meta:
        verbose_name = 'تقدّم الطالب في الدورة'
        verbose_name_plural = 'تقدّم الطلاب في الدورات'
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(fields=['student', 'course'], name='unique_student_course_progress'),
        ]

    def __str__(self):
        return f'{self.student_id} — {self.course_id} ({self.done_count})'

    @property
    def done_count(self):
        return len(self.completed_ids or [])

    @property
    def percent(self):
        total = self.course.lessons_count
        if not total:
            return 0
        return round(self.done_count * 100 / total)

    def set_lesson(self, lesson_id, done):
        """إضافة/إزالة درس من قائمة المكتمل (idempotent) — ويعيد ما إذا تغيّر شيء."""
        ids = list(self.completed_ids or [])
        if done:
            if lesson_id in ids:
                return False
            ids.append(lesson_id)
        else:
            if lesson_id not in ids:
                return False
            ids.remove(lesson_id)
        self.completed_ids = ids
        return True

    def check_completion(self):
        """إن أنهى كل الدروس → علّم «مكتملة» ويعيد True عند الإتمام الأول فقط."""
        if self.completed:
            return False
        total = self.course.lessons_count
        if total and self.done_count >= total:
            self.completed = True
            return True
        return False


class StudentReferralLink(models.Model):
    """A student's course-specific referral link and its attributed visits."""

    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_referrals',
        verbose_name='الطالب المُحيل',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='student_referral_links',
        verbose_name='الدورة',
    )
    code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    visits = models.PositiveIntegerField('الزيارات', default=0)
    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)

    class Meta:
        verbose_name = 'رابط إحالة دورة'
        verbose_name_plural = 'روابط إحالة الدورات'
        constraints = [
            models.UniqueConstraint(
                fields=['referrer', 'course'],
                name='unique_student_course_referral_link',
            ),
        ]

    def __str__(self):
        return f'{self.referrer_id} → {self.course_id}'


class StudentReferral(models.Model):
    """A signup attributed to a student's referral link."""

    link = models.ForeignKey(
        StudentReferralLink,
        on_delete=models.CASCADE,
        related_name='signups',
        verbose_name='رابط الإحالة',
    )
    referred_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_referral_signup',
        verbose_name='الطالب المُحال',
    )
    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)

    class Meta:
        verbose_name = 'إحالة طالب'
        verbose_name_plural = 'إحالات الطلاب'

    def __str__(self):
        return f'{self.link.referrer_id} → {self.referred_user_id}'


class StudentPointTransaction(models.Model):
    """Auditable point grants and redemptions for student course rewards."""

    class Kind(models.TextChoices):
        REFERRAL = 'referral', 'إحالة'
        REDEMPTION = 'redemption', 'استبدال'
        RESET = 'reset', 'تصفير'

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_point_transactions',
        verbose_name='الطالب',
    )
    points = models.IntegerField('النقاط')
    kind = models.CharField('النوع', max_length=16, choices=Kind.choices)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='point_transactions',
        verbose_name='الدورة',
    )
    referral = models.ForeignKey(
        StudentReferral,
        on_delete=models.CASCADE,
        related_name='reward_transaction',
        null=True,
        blank=True,
        verbose_name='الإحالة',
    )
    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)

    class Meta:
        verbose_name = 'حركة نقاط'
        verbose_name_plural = 'حركات النقاط'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['referral', 'course'],
                name='unique_referral_course_point_reward',
            ),
        ]


def _generate_certificate_code():
    while True:
        code = 'DC-' + uuid.uuid4().hex[:10].upper()
        if not CourseCertificate.objects.filter(code=code).exists():
            return code


class CourseCertificate(models.Model):
    """شهادة يكتسبها الطالب تلقائياً بعد إتمام كل دروس الدورة."""

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='earned_certificates',
        verbose_name='الطالب',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='earned_certificates',
        verbose_name='الدورة',
    )
    code = models.CharField('رمز الشهادة', max_length=40, unique=True, blank=True)
    is_active = models.BooleanField('تظهر في الملف العام', default=True)
    created_at = models.DateTimeField('أُصدرت في', auto_now_add=True)

    class Meta:
        verbose_name = 'شهادة مكتسبة'
        verbose_name_plural = 'الشهادات المكتسبة'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['student', 'course'], name='unique_student_course_cert'),
        ]

    def __str__(self):
        return f'{self.course.title} — {self.student_id}'

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = _generate_certificate_code()
        super().save(*args, **kwargs)

    def to_public_dict(self):
        """نسخة الدورة كاملة + حقول الشهادة (نفس الاسم ونفس التفاصيل)."""
        data = self.course.to_public_dict()
        student = self.student
        data.update(
            {
                'certificateId': f'earned-{self.pk}',
                'courseId': self.course.slug or str(self.course_id),
                'earned': True,
                'completed': True,
                'certificateCode': self.code,
                'credentialId': self.course.credential_id or self.code,
                'code': self.code,
                'date': self.created_at.date().isoformat(),
                'issuedAt': self.created_at.isoformat(),
                'addedAt': self.created_at.isoformat(),
                # الشهادة تُنسب لطالبها في صفحات البروفايل
                'handle': student.handle if student else '',
                'studentName': student.display_name if student else '',
                'studentNameArabic': student.full_name_ar if student else '',
                'studentNameEnglish': student.full_name_en if student else '',
                'studentHandle': student.handle if student else '',
                'trainerHandle': self.course.owner.handle if self.course.owner_id else '',
                'active': self.is_active,
            }
        )
        return data


class ManualCertificateStatus(models.TextChoices):
    PENDING = 'pending', 'بانتظار المراجعة'
    APPROVED = 'approved', 'معتمدة'
    REJECTED = 'rejected', 'مرفوضة'


class ManualCertificate(models.Model):
    """A student-submitted certificate that requires admin approval."""

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='manual_certificates',
        verbose_name='الطالب',
    )
    title = models.CharField('اسم الشهادة', max_length=200)
    issuer = models.CharField('الجهة المانحة', max_length=200)
    category = models.CharField('التصنيف', max_length=120, blank=True)
    date = models.DateField('تاريخ الإصدار', null=True, blank=True)
    image = models.ImageField('صورة الشهادة', upload_to='certificates/manual/%Y/%m/')
    credential_id = models.CharField('رقم الشهادة', max_length=120, blank=True)
    verify_url = models.URLField('رابط التحقق', blank=True)
    description = models.TextField('الوصف', blank=True)
    skills = models.JSONField('المهارات', default=list, blank=True)
    status = models.CharField(
        'حالة المراجعة',
        max_length=12,
        choices=ManualCertificateStatus.choices,
        default=ManualCertificateStatus.PENDING,
    )
    is_active = models.BooleanField('تظهر في الملف العام', default=False)
    created_at = models.DateTimeField('تاريخ الإضافة', auto_now_add=True)
    reviewed_at = models.DateTimeField('تاريخ المراجعة', null=True, blank=True)

    class Meta:
        verbose_name = 'شهادة يدوية'
        verbose_name_plural = 'الشهادات اليدوية'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.student.display_name}'

    def to_public_dict(self):
        return {
            'id': f'manual-{self.pk}',
            'title': self.title,
            'issuer': self.issuer,
            'instructor': self.issuer,
            'category': self.category,
            'date': self.date.isoformat() if self.date else '',
            'image': self.image.url if self.image else '',
            'credentialId': self.credential_id,
            'verifyUrl': self.verify_url,
            'description': self.description,
            'skills': list(self.skills or []),
            'handle': self.student.handle,
            'studentName': self.student.display_name,
            'earned': True,
            'manual': True,
            'status': self.status,
            'statusLabel': self.get_status_display(),
            'active': self.is_active,
            'addedAt': self.created_at.isoformat(),
        }


class InPersonWorkshop(models.Model):
    """An in-person workshop with a revocable QR attendance token."""

    title = models.CharField('اسم الورشة', max_length=200)
    title_en = models.CharField('اسم الورشة بالإنجليزية', max_length=200, blank=True)
    trainer_name = models.CharField('اسم المدرب', max_length=200, blank=True, default='')
    trainer_name_en = models.CharField('اسم المدرب بالإنجليزية', max_length=200, blank=True, default='')
    description = models.TextField('وصف الورشة', blank=True)
    description_en = models.TextField('وصف الورشة بالإنجليزية', blank=True)
    starts_at = models.DateTimeField('موعد الورشة')
    duration_minutes = models.PositiveSmallIntegerField('المدة بالدقائق')
    location = models.CharField('الموقع', max_length=200, blank=True)
    location_en = models.CharField('الموقع بالإنجليزية', max_length=200, blank=True)
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    attendance_open = models.BooleanField('الحضور مفتوح', default=False)
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التحديث', auto_now=True)

    class Meta:
        verbose_name = 'ورشة وجاهية'
        verbose_name_plural = 'ورشات وجاهية'
        ordering = ['-starts_at', '-pk']

    def __str__(self):
        return self.title


class WorkshopAttendance(models.Model):
    """A student's single attendance record for an in-person workshop."""

    workshop = models.ForeignKey(
        InPersonWorkshop,
        on_delete=models.CASCADE,
        related_name='attendances',
        verbose_name='الورشة',
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workshop_attendances',
        verbose_name='الطالب',
    )
    attended_at = models.DateTimeField('وقت تسجيل الحضور', auto_now_add=True)

    class Meta:
        verbose_name = 'حضور ورشة'
        verbose_name_plural = 'حضور الورشات'
        ordering = ['-attended_at', '-pk']
        constraints = [
            models.UniqueConstraint(
                fields=['workshop', 'student'],
                name='unique_student_workshop_attendance',
            ),
        ]

    def __str__(self):
        return f'{self.student_id} — {self.workshop.title}'


class WorkshopCertificate(models.Model):
    """A workshop certificate snapshot issued automatically with attendance."""

    attendance = models.OneToOneField(
        WorkshopAttendance,
        on_delete=models.CASCADE,
        related_name='certificate',
        verbose_name='الحضور',
    )
    workshop_title = models.CharField('اسم الورشة', max_length=200)
    workshop_title_en = models.CharField('اسم الورشة بالإنجليزية', max_length=200, blank=True, default='')
    trainer_name = models.CharField('اسم المدرب', max_length=200, blank=True, default='')
    trainer_name_en = models.CharField('اسم المدرب بالإنجليزية', max_length=200, blank=True, default='')
    student_name = models.CharField('اسم الطالب', max_length=200)
    attended_on = models.DateField('تاريخ الحضور')
    duration_minutes = models.PositiveSmallIntegerField('المدة بالدقائق')
    code = models.CharField('رمز الشهادة', max_length=40, unique=True, blank=True)
    created_at = models.DateTimeField('تاريخ الإصدار', auto_now_add=True)

    class Meta:
        verbose_name = 'شهادة ورشة'
        verbose_name_plural = 'شهادات الورشات'
        ordering = ['-created_at', '-pk']

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = 'WS-' + uuid.uuid4().hex.upper()
        super().save(*args, **kwargs)

    def to_public_dict(self):
        student = self.attendance.student
        workshop = self.attendance.workshop
        return {
            'id': f'workshop-{self.pk}',
            'workshop': True,
            'title': self.workshop_title,
            'titleEnglish': self.workshop_title_en,
            'trainerName': self.trainer_name,
            'trainerNameEnglish': self.trainer_name_en,
            'studentName': self.student_name,
            'studentNameArabic': student.full_name_ar,
            'studentNameEnglish': student.full_name_en,
            'handle': student.handle,
            'date': self.attended_on.isoformat(),
            'duration': self.duration_minutes,
            'code': self.code,
            'earned': True,
            'workshopDetails': {
                'title': self.workshop_title,
                'titleEnglish': self.workshop_title_en,
                'trainer': self.trainer_name,
                'trainerEnglish': self.trainer_name_en,
                'date': self.attended_on.isoformat(),
                'duration': self.duration_minutes,
                'location': workshop.location,
                'locationEnglish': workshop.location_en,
                'description': workshop.description,
                'descriptionEnglish': workshop.description_en,
            },
        }
