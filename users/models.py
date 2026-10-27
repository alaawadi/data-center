"""User + comprehensive profile models with platform roles."""
import re
import unicodedata

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

phone_validator = RegexValidator(
    regex=r'^[0-9]{10}$',
    message='رقم الجوال يجب أن يتكوّن من 10 أرقام.',
)


def validate_arabic_three_part_name(value):
    """Require three to six Arabic-script name parts."""
    parts = value.split()
    if not 3 <= len(parts) <= 6 or any(
        not any(unicodedata.category(char).startswith('L') for char in part)
        or any(
            unicodedata.category(char)[0] not in ('L', 'M')
            or 'ARABIC' not in unicodedata.name(char, '')
            for char in part
        )
        for part in parts
    ):
        raise ValidationError('يرجى إدخال الاسم بالعربية من ثلاث إلى ست كلمات.')


def validate_english_three_part_name(value):
    """Require three to six English name parts."""
    parts = value.split()
    if not 3 <= len(parts) <= 6 or any(
        not re.fullmatch(r"[A-Za-z]+(?:[-'][A-Za-z]+)*", part)
        for part in parts
    ):
        raise ValidationError('Enter a name of three to six words in English.')


class UserRole(models.TextChoices):
    ADMIN = 'admin', 'أدمن'
    TRAINER = 'trainer', 'مدرب'
    EMPLOYEE = 'employee', 'موظف'
    STUDENT = 'student', 'طالب'


class Gender(models.TextChoices):
    MALE = 'male', 'ذكر'
    FEMALE = 'female', 'أنثى'
    UNSPECIFIED = 'unspecified', 'غير محدد'


class Availability(models.TextChoices):
    AVAILABLE = 'available', 'متاح الآن'
    BUSY = 'busy', 'مشغول حالياً'
    OPEN = 'open', 'متاح للتواصل'


class EducationStage(models.TextChoices):
    SCHOOL = 'school', 'مدرسة'
    DIPLOMA = 'diploma', 'دبلوم'
    BACHELOR = 'bachelor', 'بكالوريوس'
    MASTER = 'master', 'ماجستير'
    PHD = 'phd', 'دكتوراه'
    GRADUATE = 'graduate', 'خرّيج'
    OTHER = 'other', 'أخرى'


class SocialPlatform(models.TextChoices):
    WEBSITE = 'website', 'موقع شخصي'
    FACEBOOK = 'facebook', 'فيسبوك'
    LINKEDIN = 'linkedin', 'لينكدإن'
    GITHUB = 'github', 'GitHub'
    BEHANCE = 'behance', 'Behance'
    X = 'x', 'X (تويتر)'
    INSTAGRAM = 'instagram', 'إنستغرام'
    YOUTUBE = 'youtube', 'يوتيوب'
    TELEGRAM = 'telegram', 'تيليجرام'
    OTHER = 'other', 'أخرى'


class LanguageLevel(models.TextChoices):
    BASIC = 'basic', 'مبتدئ'
    CONVERSATIONAL = 'conversational', 'محادثة'
    FLUENT = 'fluent', 'بطلاقة'
    NATIVE = 'native', 'اللغة الأم'


class UserManager(BaseUserManager):
    """Manager for the phone-based custom user."""

    use_in_migrations = True

    def _create_user(self, phone, password, **extra_fields):
        if not phone:
            raise ValueError('رقم الجوال مطلوب')
        user = self.model(phone=str(phone).strip(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, phone, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.STUDENT)
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(phone, password, **extra_fields)

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('المشرف العام يجب أن يكون is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('المشرف العام يجب أن يكون is_superuser=True')
        return self._create_user(phone, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Platform user identified by phone number, with a single role."""

    phone = models.CharField(
        'رقم الجوال', max_length=10, unique=True, validators=[phone_validator]
    )
    full_name = models.CharField('الاسم الكامل', max_length=150, blank=True)
    full_name_ar = models.CharField(
        'الاسم الثلاثي بالعربية',
        max_length=150,
        blank=True,
        validators=[validate_arabic_three_part_name],
    )
    full_name_en = models.CharField(
        'الاسم الثلاثي بالإنجليزية',
        max_length=150,
        blank=True,
        validators=[validate_english_three_part_name],
    )
    trainer_name_en = models.CharField(
        'اسم المدرب بالإنجليزية', max_length=200, blank=True, default=''
    )
    handle = models.CharField('اسم المستخدم العام', max_length=40, unique=True, blank=True)
    email = models.EmailField('البريد الإلكتروني', blank=True)
    role = models.CharField(
        'نوع المستخدم',
        max_length=16,
        choices=UserRole.choices,
        default=UserRole.STUDENT,
    )
    is_verified = models.BooleanField('حساب موثّق', default=False)
    is_active = models.BooleanField('نشط', default=True)
    is_staff = models.BooleanField('يستطيع الدخول إلى لوحة تحكم Django', default=False)
    date_joined = models.DateTimeField('تاريخ الانضمام', default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'مستخدم'
        verbose_name_plural = 'المستخدمون'
        ordering = ['-date_joined']

    def __str__(self):
        return f'{self.display_name} ({self.phone})'

    def save(self, *args, **kwargs):
        if bool(self.full_name_ar) != bool(self.full_name_en):
            raise ValidationError('يجب إدخال الاسم الثلاثي بالعربية والإنجليزية معاً.')
        if self.full_name_ar:
            validate_arabic_three_part_name(self.full_name_ar)
            validate_english_three_part_name(self.full_name_en)

        if self.pk:
            update_fields = kwargs.get('update_fields')
            protected_fields = ('full_name_ar', 'full_name_en')
            if update_fields is not None:
                protected_fields = tuple(
                    field for field in protected_fields if field in update_fields
                )
            if protected_fields:
                original = (
                    type(self).objects.filter(pk=self.pk)
                    .values(*protected_fields)
                    .first()
                )
                if original:
                    for field in protected_fields:
                        if original[field] and getattr(self, field) != original[field]:
                            raise ValidationError(
                                'لا يمكن تعديل الاسم الثلاثي بعد حفظه.'
                            )
        if not self.handle:
            self.handle = self._generate_handle()
        super().save(*args, **kwargs)

    def _generate_handle(self):
        base = slugify(self.family_name_source, allow_unicode=False)
        if not base:
            base = 'u' + (self.phone or 'user')
        base = base[:30] or 'user'
        candidate = base
        index = 1
        while User.objects.filter(handle=candidate).exclude(pk=self.pk).exists():
            index += 1
            candidate = f'{base}-{index}'
        return candidate

    @property
    def family_name_source(self):
        return (self.full_name or (self.email.split('@')[0] if self.email else '')).strip()

    @property
    def display_name(self):
        return self.full_name or self.phone

    @property
    def is_admin_role(self):
        return self.role == UserRole.ADMIN

    @property
    def is_trainer(self):
        return self.role == UserRole.TRAINER

    @property
    def is_student(self):
        return self.role == UserRole.STUDENT

    @property
    def initials(self):
        parts = [p for p in self.display_name.split() if p]
        if not parts:
            return '؟'
        if len(parts) == 1:
            return parts[0][:2]
        return (parts[0][:1] + parts[1][:1])


class Skill(models.Model):
    name = models.CharField('المهارة', max_length=80, unique=True)

    class Meta:
        verbose_name = 'مهارة'
        verbose_name_plural = 'المهارات'
        ordering = ['name']

    def __str__(self):
        return self.name


class Language(models.Model):
    name = models.CharField('اللغة', max_length=80, unique=True)

    class Meta:
        verbose_name = 'لغة'
        verbose_name_plural = 'اللغات'
        ordering = ['name']

    def __str__(self):
        return self.name


class Interest(models.Model):
    name = models.CharField('الاهتمام', max_length=80, unique=True)

    class Meta:
        verbose_name = 'اهتمام'
        verbose_name_plural = 'الاهتمامات'
        ordering = ['name']

    def __str__(self):
        return self.name


class Profile(models.Model):
    """Single comprehensive profile per user (works for trainers and students)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # ── الهوية والصورة ──
    avatar = models.ImageField('الصورة الشخصية', upload_to='avatars/%Y/%m/', blank=True)
    cover = models.ImageField('صورة الغلاف', upload_to='covers/%Y/%m/', blank=True)
    headline = models.CharField('العنوان المهني', max_length=150, blank=True)
    bio = models.TextField('النبذة', blank=True)

    # ── معلومات شخصية ──
    city = models.CharField('المدينة', max_length=80, blank=True)
    country = models.CharField('الدولة', max_length=80, blank=True)
    date_of_birth = models.DateField('تاريخ الميلاد', null=True, blank=True)
    gender = models.CharField(
        'الجنس', max_length=16, choices=Gender.choices, default=Gender.UNSPECIFIED
    )

    # ── تواصل ──
    whatsapp = models.CharField('واتساب', max_length=20, blank=True)
    website = models.URLField('الموقع الشخصي', blank=True)

    # ── بيانات المدرب ──
    specialization = models.CharField('التخصص', max_length=150, blank=True)
    trainer_rating = models.DecimalField(
        'تقييم المدرب', max_digits=2, decimal_places=1, default=0
    )
    experience_years = models.PositiveSmallIntegerField('سنوات الخبرة', null=True, blank=True)
    hourly_rate = models.DecimalField(
        'معدل الساعة', max_digits=8, decimal_places=2, null=True, blank=True
    )
    availability = models.CharField(
        'التوفّر', max_length=16, choices=Availability.choices, blank=True
    )
    intro_video = models.URLField('فيديو تعريفي', blank=True)

    # ── بيانات الطالب ──
    education_stage = models.CharField(
        'المرحلة الدراسية', max_length=16, choices=EducationStage.choices, blank=True
    )
    school = models.CharField('المدرسة / الجامعة', max_length=150, blank=True)
    grade = models.CharField('الصف / السنة', max_length=50, blank=True)
    learning_goals = models.TextField('الأهداف التعليمية', blank=True)

    # ── علاقات ──
    skills = models.ManyToManyField(Skill, through='ProfileSkill', related_name='profiles', blank=True)
    languages = models.ManyToManyField(
        Language, through='ProfileLanguage', related_name='profiles', blank=True
    )
    interests = models.ManyToManyField(Interest, related_name='profiles', blank=True)

    # ── إعدادات ──
    is_public = models.BooleanField('ملف عام', default=True)
    display_order = models.PositiveIntegerField(
        'ترتيب الظهور', null=True, blank=True, db_index=True
    )
    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)
    updated_at = models.DateTimeField('حُدّث في', auto_now=True)

    class Meta:
        verbose_name = 'بروفايل'
        verbose_name_plural = 'البروفايلات'

    def __str__(self):
        return f'بروفايل {self.user.display_name}'

    @property
    def location(self):
        return '، '.join([p for p in (self.city, self.country) if p])

    @property
    def title(self):
        return self.headline or self.user.get_role_display()

    def completeness(self):
        """Smart completeness score: which key fields are still missing."""
        checks = [
            ('الصورة الشخصية', bool(self.avatar)),
            ('العنوان المهني', bool(self.headline)),
            ('النبذة', bool(self.bio)),
            ('المدينة', bool(self.city)),
            ('المهارات', self.skills.exists()),
            ('اللغات', self.languages.exists()),
            ('وسيلة تواصل', bool(self.whatsapp or self.website or self.social_links.exists())),
        ]
        if self.user.is_trainer:
            checks += [
                ('التخصص', bool(self.specialization)),
                ('سنوات الخبرة', self.experience_years is not None),
                ('معدل الساعة', self.hourly_rate is not None),
            ]
        elif self.user.is_student:
            checks += [
                ('المرحلة الدراسية', bool(self.education_stage)),
                ('المدرسة / الجامعة', bool(self.school)),
                ('الصف / السنة', bool(self.grade)),
            ]
        done = sum(1 for _, ok in checks if ok)
        return {
            'percent': round(done * 100 / len(checks)) if checks else 0,
            'missing': [label for label, ok in checks if not ok],
        }

    @property
    def completeness_percent(self):
        return self.completeness()['percent']

    def to_public_dict(self):
        """Shape expected by the client-side profile/list rendering."""
        return {
            'handle': self.user.handle,
            'name': self.user.display_name,
            'avatar': self.avatar.url if self.avatar else '',
            'cover': self.cover.url if self.cover else '',
            'verified': self.user.is_trainer,
            'title': self.title,
            'headline': self.headline,
            'bio': self.bio,
            'location': self.location,
            'website': self.website,
            'email': self.user.email,
            'joined': self.user.date_joined.isoformat(),
            'role': self.user.get_role_display(),
            'roleKey': self.user.role,
            'isTrainer': self.user.is_trainer,
            'specialization': self.specialization,
            'skills': [ps.skill.name for ps in self.profile_skills.select_related('skill')],
            'languages': [
                {'name': pl.language.name, 'level': pl.get_level_display()}
                for pl in self.profile_languages.select_related('language')
            ],
            'social_links': [
                {'platform': link.get_platform_display(), 'url': link.url}
                for link in self.social_links.all()
            ],
        }


class ProfileSkill(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='profile_skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='profile_skills')
    level = models.PositiveSmallIntegerField('المستوى', default=60)

    class Meta:
        verbose_name = 'مهارة البروفايل'
        verbose_name_plural = 'مهارات البروفايل'
        unique_together = ('profile', 'skill')
        ordering = ['-level']

    def __str__(self):
        return f'{self.skill} — {self.level}%'


class ProfileLanguage(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='profile_languages')
    language = models.ForeignKey(Language, on_delete=models.CASCADE, related_name='profile_languages')
    level = models.CharField(
        'المستوى', max_length=16, choices=LanguageLevel.choices, default=LanguageLevel.FLUENT
    )

    class Meta:
        verbose_name = 'لغة البروفايل'
        verbose_name_plural = 'لغات البروفايل'
        unique_together = ('profile', 'language')

    def __str__(self):
        return f'{self.language} — {self.get_level_display()}'


class SocialLink(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='social_links')
    platform = models.CharField('المنصة', max_length=16, choices=SocialPlatform.choices)
    url = models.URLField('الرابط')

    class Meta:
        verbose_name = 'رابط تواصل'
        verbose_name_plural = 'روابط التواصل'
        unique_together = ('profile', 'platform')
        ordering = ['platform']

    def __str__(self):
        return f'{self.get_platform_display()}: {self.url}'


class LoginAttempt(models.Model):
    """A single login attempt — used for brute-force throttling."""

    phone = models.CharField('رقم الجوال', max_length=10, blank=True, default='', db_index=True)
    ip = models.GenericIPAddressField('عنوان IP', null=True, blank=True)
    successful = models.BooleanField('نجاح', default=False)
    created_at = models.DateTimeField('وقت المحاولة', auto_now_add=True)

    class Meta:
        verbose_name = 'محاولة دخول'
        verbose_name_plural = 'محاولات الدخول'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone', 'successful', 'created_at']),
            models.Index(fields=['ip', 'successful', 'created_at']),
        ]

    def __str__(self):
        return f'{self.phone or "-"} {"✓" if self.successful else "✗"} {self.created_at:%Y-%m-%d %H:%M}'


class DeviceSession(models.Model):
    """An authenticated browser/device — enforces the per-account device limit."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='device_sessions', verbose_name='المستخدم'
    )
    device_id = models.CharField('معرّف الجهاز', max_length=64, db_index=True)
    session_key = models.CharField('مفتاح الجلسة', max_length=40, blank=True, default='', db_index=True)
    user_agent = models.CharField('المتصفح/الجهاز', max_length=255, blank=True, default='')
    ip = models.GenericIPAddressField('عنوان IP', null=True, blank=True)
    created_at = models.DateTimeField('أول دخول', auto_now_add=True)
    last_seen = models.DateTimeField('آخر نشاط', auto_now=True)

    class Meta:
        verbose_name = 'جلسة جهاز'
        verbose_name_plural = 'جلسات الأجهزة'
        ordering = ['-last_seen']
        unique_together = ('user', 'device_id')
        indexes = [
            models.Index(fields=['user', 'session_key']),
        ]

    def __str__(self):
        return f'{self.user.phone} @ {self.device_id[:8]}'


class SignupVerification(models.Model):
    """A pending sign-up awaiting its email verification code.

    The user is only created once the code is confirmed, so an abandoned
    sign-up never reserves the phone number or the email.
    """

    phone = models.CharField('رقم الجوال', max_length=10, db_index=True)
    full_name = models.CharField('الاسم الكامل', max_length=150)
    email = models.EmailField('البريد الإلكتروني')
    password_hash = models.CharField('كلمة المرور (مشفّرة)', max_length=128)
    code_hash = models.CharField('رمز التحقق (مشفّر)', max_length=128)
    attempts = models.PositiveSmallIntegerField('عدد المحاولات', default=0)
    sent_at = models.DateTimeField('آخر إرسال', default=timezone.now)
    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)

    class Meta:
        verbose_name = 'تحقق تسجيل'
        verbose_name_plural = 'تحققات التسجيل'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.phone} → {self.email}'


class SignupRateLimit(models.Model):
    """Successful signup timestamps used for the per-IP rolling quota."""

    ip_key = models.CharField('عنوان IP', max_length=45, unique=True)
    signup_timestamps = models.JSONField('أوقات إنشاء الحسابات', default=list, blank=True)

    class Meta:
        verbose_name = 'حد تسجيل الحسابات'
        verbose_name_plural = 'حدود تسجيل الحسابات'

    def __str__(self):
        return self.ip_key
