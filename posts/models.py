"""Post (يوميات) models — daily posts with media, tags & comments."""
from django.conf import settings
from django.db import models


class PostStatus(models.TextChoices):
    DRAFT = 'draft', 'مسودة'
    PUBLISHED = 'published', 'منشور'


class PostRatio(models.TextChoices):
    SQUARE = '1:1', 'مربّع'
    PORTRAIT = '4:5', 'طولي'
    LANDSCAPE = '1.91:1', 'عرضي'


class PostMediaType(models.TextChoices):
    IMAGE = 'image', 'صورة'
    VIDEO = 'video', 'فيديو'


class PostTag(models.Model):
    """A hashtag that can be attached to any number of posts."""

    name = models.CharField('الوسم', max_length=80, unique=True)

    class Meta:
        verbose_name = 'وسم منشور'
        verbose_name_plural = 'وسوم المنشورات'
        ordering = ['name']

    def __str__(self):
        return self.name


class Post(models.Model):
    """A daily post published by a platform user."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts',
        verbose_name='صاحب المنشور',
    )
    slug = models.SlugField('المعرّف', max_length=200, unique=True, blank=True, allow_unicode=True)

    content = models.TextField('المحتوى', blank=True)
    ratio = models.CharField(
        'نسبة الوسائط', max_length=10, choices=PostRatio.choices, default=PostRatio.SQUARE
    )

    tags = models.ManyToManyField(PostTag, related_name='posts', blank=True, verbose_name='الوسوم')

    status = models.CharField(
        'الحالة', max_length=16, choices=PostStatus.choices, default=PostStatus.DRAFT
    )
    likes = models.PositiveIntegerField('الإعجابات', default=0)
    saves = models.PositiveIntegerField('الحفظ', default=0)
    shares = models.PositiveIntegerField('المشاركات', default=0)
    comments_count = models.PositiveIntegerField('عدد التعليقات', default=0)

    created_at = models.DateTimeField('أُنشئ في', auto_now_add=True)
    updated_at = models.DateTimeField('حُدّث في', auto_now=True)

    class Meta:
        verbose_name = 'منشور'
        verbose_name_plural = 'المنشورات'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'owner']),
        ]

    def __str__(self):
        return f'منشور #{self.pk} — {self.owner}'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_slug()
        super().save(*args, **kwargs)

    def _generate_slug(self):
        from django.utils.text import slugify

        base = slugify(self.content or '', allow_unicode=True)[:60] or f'post-{self.pk or ""}'
        base = base or f'post-{self.pk or ""}'
        candidate = base
        index = 1
        while True:
            qs = Post.objects.filter(slug=candidate)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if not qs.exists():
                return candidate
            index += 1
            candidate = f'{base}-{index}'

    @property
    def is_published(self):
        return self.status == PostStatus.PUBLISHED

    @property
    def cover(self):
        first = self.media.filter(media_type=PostMediaType.IMAGE).first()
        return first.file.url if first and first.file else ''

    def refresh_comments_count(self):
        count = self.comments.filter(parent__isnull=True).count()
        if count != self.comments_count:
            self.comments_count = count
            self.save(update_fields=['comments_count'])

    def to_public_dict(self):
        """Shape expected by the client-side card/detail rendering."""
        owner = self.owner
        profile = getattr(owner, 'profile', None)
        return {
            'id': self.slug or str(self.pk),
            'pk': self.pk,
            'slug': self.slug,
            'content': self.content,
            'images': [m.file.url for m in self.media.all() if m.media_type == PostMediaType.IMAGE and m.file],
            'media': [
                {'type': m.media_type, 'src': m.file.url} for m in self.media.all() if m.file
            ],
            'ratio': self.ratio,
            'tags': [tag.name for tag in self.tags.all()],
            'likes': self.likes,
            'saves': self.saves,
            'shares': self.shares,
            'liked': False,
            'saved': False,
            'status': self.status,
            'handle': owner.handle if owner else '',
            'author': owner.display_name if owner else '',
            'avatar': profile.avatar.url if profile and profile.avatar else '',
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'comments': [
                c.to_public_dict()
                for c in self.comments.filter(parent__isnull=True).select_related('author')
            ],
        }


class PostMedia(models.Model):
    """A single image or video attached to a post."""

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='media')
    media_type = models.CharField(
        'النوع', max_length=10, choices=PostMediaType.choices, default=PostMediaType.IMAGE
    )
    file = models.FileField('الملف', upload_to='posts/media/%Y/%m/')
    order = models.PositiveSmallIntegerField('الترتيب', default=0)

    class Meta:
        verbose_name = 'وسيط منشور'
        verbose_name_plural = 'وسائط المنشورات'
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.get_media_type_display()} {self.post_id} #{self.pk}'


class PostComment(models.Model):
    """A comment (optionally a reply) on a post."""

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='post_comments',
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
        verbose_name = 'تعليق منشور'
        verbose_name_plural = 'تعليقات المنشورات'
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
        profile = getattr(author, 'profile', None) if author else None
        return {
            'id': self.pk,
            'author': self.display_name,
            'handle': author.handle if author else '',
            'avatar': profile.avatar.url if profile and profile.avatar else '',
            'text': self.body,
            'createdAt': self.created_at.isoformat(),
            'likes': self.likes,
            'replies': [r.to_public_dict() for r in self.replies.all()],
        }
