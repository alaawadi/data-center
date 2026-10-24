"""Project models — the portfolio projects section (card, detail & editor)."""
from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils.text import slugify

from users.models import UserRole


class ProjectStatus(models.TextChoices):
    DRAFT = 'draft', 'مسودة'
    PUBLISHED = 'published', 'منشور'
    INACTIVE = 'inactive', 'غير نشط'


class ProjectVisibility(models.TextChoices):
    PUBLIC = 'public', 'عام'
    COURSES = 'courses', 'مخصّص للدورات'


class ProjectTag(models.Model):
    """A single tag that can be attached to any number of projects."""

    name = models.CharField('الوسم', max_length=80, unique=True)

    class Meta:
        verbose_name = 'وسم مشروع'
        verbose_name_plural = 'وسوم المشاريع'
        ordering = ['name']

    def __str__(self):
        return self.name


class Project(models.Model):
    """A project published by a platform user (mainly students)."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='projects',
        verbose_name='صاحب المشروع',
    )
    title = models.CharField('العنوان', max_length=200)
    slug = models.SlugField('المعرّف', max_length=200, unique=True, blank=True, allow_unicode=True)

    cover = models.ImageField('صورة الغلاف', upload_to='projects/covers/%Y/%m/', blank=True)
    summary = models.CharField('الملخص', max_length=320, blank=True)
    content = models.TextField('المحتوى', blank=True)

    category = models.CharField('التصنيف', max_length=120, blank=True)
    role = models.CharField('الدور', max_length=150, blank=True)
    project_date = models.DateField('تاريخ المشروع', null=True, blank=True)

    github_url = models.URLField('رابط GitHub', blank=True)
    demo_url = models.URLField('رابط المعاينة', blank=True)

    tags = models.ManyToManyField(ProjectTag, related_name='projects', blank=True, verbose_name='الوسوم')

    source_lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_projects',
        verbose_name='درس الدورة المصدر',
    )

    status = models.CharField(
        'الحالة', max_length=16, choices=ProjectStatus.choices, default=ProjectStatus.DRAFT
    )
    visibility = models.CharField(
        'الظهور',
        max_length=16,
        choices=ProjectVisibility.choices,
        default=ProjectVisibility.PUBLIC,
    )
    views = models.PositiveIntegerField('المشاهدات', default=0)
    likes = models.PositiveIntegerField('الإعجابات', default=0)

    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)
    updated_at = models.DateTimeField('حُدّث في', auto_now=True)

    class Meta:
        verbose_name = 'مشروع'
        verbose_name_plural = 'المشاريع'
        ordering = ['-project_date', '-created_at']
        indexes = [
            models.Index(fields=['status', 'owner']),
        ]

    def __str__(self):
        return self.title or f'مشروع #{self.pk}'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_slug()
        super().save(*args, **kwargs)

    def _generate_slug(self):
        base = slugify(self.title or '', allow_unicode=True)[:180] or f'project-{self.pk or ""}'
        candidate = base
        index = 1
        while True:
            qs = Project.objects.filter(slug=candidate)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if not qs.exists():
                return candidate
            index += 1
            candidate = f'{base}-{index}'

    @property
    def is_published(self):
        return self.status == ProjectStatus.PUBLISHED

    @property
    def is_trainer_project(self):
        return self.owner.role == UserRole.TRAINER

    def to_public_dict(self):
        """Shape expected by the client-side card/detail rendering."""
        owner = self.owner
        return {
            'id': self.slug or str(self.pk),
            'pk': self.pk,
            'title': self.title,
            'slug': self.slug,
            'cover': self.cover.url if self.cover else '',
            'summary': self.summary,
            'content': self.content,
            'category': self.category,
            'role': self.role,
            'date': self.project_date.isoformat() if self.project_date else '',
            'tags': [tag.name for tag in self.tags.all()],
            'links': {'github': self.github_url, 'demo': self.demo_url},
            'files': [
                {
                    'id': f.pk,
                    'name': f.display_name,
                    'size': f.size,
                    'url': f.file.url,
                    'dataUrl': f.file.url,
                    'downloadUrl': reverse('projects:file-download', args=[f.pk]),
                    'downloads': f.downloads,
                }
                for f in self.files.all()
            ],
            'gallery': [img.image.url for img in self.images.all() if img.image],
            'views': self.views,
            'likes': self.likes,
            'status': self.status,
            'visibility': self.visibility,
            'handle': owner.handle if owner else '',
            'owner': {
                'name': owner.display_name if owner else '',
                'handle': owner.handle if owner else '',
                'avatar': owner.profile.avatar.url if owner and getattr(owner, 'profile', None) and owner.profile.avatar else '',
                'role': owner.get_role_display() if owner else '',
            },
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'comments': [
                c.to_public_dict()
                for c in self.comments.filter(parent__isnull=True).select_related('author')
            ],
        }


class ProjectInteraction(models.Model):
    """A user's like and bookmark state for a project."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='interactions')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_interactions'
    )
    liked = models.BooleanField(default=False)
    saved = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=('project', 'user'), name='projects_unique_interaction'),
        ]


class ProjectImage(models.Model):
    """A gallery image attached to a project."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField('الصورة', upload_to='projects/gallery/%Y/%m/')
    order = models.PositiveSmallIntegerField('الترتيب', default=0)

    class Meta:
        verbose_name = 'صورة مشروع'
        verbose_name_plural = 'صور المشاريع'
        ordering = ['order', 'id']

    def __str__(self):
        return f'صورة {self.project_id} #{self.pk}'


class ProjectFile(models.Model):
    """A downloadable file (report, presentation…) attached to a project."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    file = models.FileField('الملف', upload_to='projects/files/%Y/%m/')
    original_name = models.CharField('الاسم الأصلي', max_length=255, blank=True)
    size = models.PositiveIntegerField('الحجم (بايت)', default=0)
    downloads = models.PositiveIntegerField('عدد مرات التنزيل', default=0)
    uploaded_at = models.DateTimeField('أُضيف في', auto_now_add=True)

    class Meta:
        verbose_name = 'ملف مشروع'
        verbose_name_plural = 'ملفات المشاريع'
        ordering = ['id']

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        if self.original_name:
            return self.original_name
        return self.file.name.rsplit('/', 1)[-1] if self.file else f'ملف #{self.pk}'


class ProjectComment(models.Model):
    """A comment (optionally a reply) on a project."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='project_comments',
        verbose_name='المعلّق',
    )
    author_name = models.CharField('اسم المعلّق', max_length=150, blank=True)
    body = models.TextField('التعليق')
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies'
    )
    likes = models.PositiveIntegerField('الإعجابات', default=0)
    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)

    class Meta:
        verbose_name = 'تعليق مشروع'
        verbose_name_plural = 'تعليقات المشاريع'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.display_name}: {self.body[:40]}'

    @property
    def display_name(self):
        if self.author:
            return self.author.display_name
        return self.author_name or 'زائر'

    def to_public_dict(self):
        author = self.author
        return {
            'id': self.pk,
            'author': self.display_name,
            'handle': author.handle if author else '',
            'avatar': author.profile.avatar.url if author and getattr(author, 'profile', None) and author.profile.avatar else '',
            'text': self.body,
            'createdAt': self.created_at.isoformat(),
            'likes': self.likes,
            'replies': [r.to_public_dict() for r in self.replies.all()],
        }
