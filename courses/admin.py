"""Admin registrations for the courses app."""
from django.contrib import admin
from django.utils import timezone

from .models import (
    Course,
    ManualCertificate,
    ManualCertificateStatus,
    CourseSection,
    Lesson,
    Quiz,
    QuizAttempt,
    QuizChoice,
    QuizQuestion,
)


@admin.register(ManualCertificate)
class ManualCertificateAdmin(admin.ModelAdmin):
    list_display = ('title', 'student', 'issuer', 'status', 'created_at', 'reviewed_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'issuer', 'student__full_name', 'student__handle')
    readonly_fields = ('created_at', 'reviewed_at')
    actions = ('approve_certificates', 'reject_certificates')
    fields = (
        'student', 'title', 'issuer', 'category', 'date', 'image',
        'credential_id', 'verify_url', 'description', 'skills', 'status',
        'created_at', 'reviewed_at',
    )

    @admin.action(description='اعتماد الشهادات المحددة')
    def approve_certificates(self, request, queryset):
        queryset.update(status=ManualCertificateStatus.APPROVED, reviewed_at=timezone.now())

    @admin.action(description='رفض الشهادات المحددة')
    def reject_certificates(self, request, queryset):
        queryset.update(status=ManualCertificateStatus.REJECTED, reviewed_at=timezone.now())


class QuizChoiceInline(admin.TabularInline):
    model = QuizChoice
    extra = 2
    fields = ('order', 'text', 'is_correct')
    ordering = ('order', 'id')


class QuizQuestionInline(admin.StackedInline):
    model = QuizQuestion
    extra = 0
    fields = ('order', 'text', 'explanation')
    ordering = ('order', 'id')
    show_change_link = True


class QuizInline(admin.StackedInline):
    model = Quiz
    extra = 0
    fields = (
        'instructions',
        'max_attempts',
        'questions_count',
        'pass_score',
        'shuffle_questions',
        'shuffle_choices',
    )


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('lesson', 'max_attempts', 'questions_count', 'pass_score', 'updated_at')
    search_fields = ('lesson__title', 'lesson__section__course__title')
    inlines = [QuizQuestionInline]


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ('short_text', 'quiz', 'order')
    search_fields = ('text', 'quiz__lesson__title')
    inlines = [QuizChoiceInline]

    @admin.display(description='السؤال')
    def short_text(self, obj):
        return (obj.text or '')[:60]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('student', 'quiz', 'attempt_no', 'score', 'passed', 'submitted_at')
    list_filter = ('passed', 'submitted_at')
    search_fields = ('student__handle', 'student__phone', 'quiz__lesson__title')
    readonly_fields = ('quiz', 'student', 'attempt_no', 'question_ids', 'choice_order', 'answers', 'score', 'passed', 'submitted_at', 'created_at')
    ordering = ('-submitted_at',)


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = ('order', 'title', 'duration', 'type', 'is_free', 'video_url')
    ordering = ('order', 'id')


class CourseSectionInline(admin.TabularInline):
    model = CourseSection
    extra = 0
    fields = ('order', 'title')
    ordering = ('order', 'id')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'category', 'status', 'sections_count', 'created_at')
    list_filter = ('status', 'category', 'created_at')
    search_fields = ('title', 'summary', 'owner__full_name', 'owner__handle')
    autocomplete_fields = ('owner',)
    readonly_fields = ('created_at', 'updated_at')
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    inlines = [CourseSectionInline]

    fieldsets = (
        ('الدورة', {'fields': ('owner', 'title', 'slug', 'status')}),
        ('المحتوى', {'fields': ('category', 'summary', 'content', 'skills')}),
        ('التفاصيل', {'fields': ('price', 'duration', 'period', 'cover', 'credential_id', 'verify_url')}),
        ('التواريخ', {'fields': ('created_at', 'updated_at')}),
    )

    @admin.display(description='الأقسام')
    def sections_count(self, obj):
        return obj.sections.count()


@admin.register(CourseSection)
class CourseSectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order', 'lessons_count')
    search_fields = ('title', 'course__title')
    autocomplete_fields = ('course',)
    ordering = ('course', 'order')

    @admin.display(description='الدروس')
    def lessons_count(self, obj):
        return obj.lessons.count()


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'course_name', 'section', 'duration', 'type', 'is_free', 'order')
    list_filter = ('type', 'is_free')
    search_fields = ('title', 'section__title', 'section__course__title')
    list_editable = ('order',)
    ordering = ('section', 'order')
    inlines = [QuizInline]

    @admin.display(description='الدورة', ordering='section__course__title')
    def course_name(self, obj):
        return obj.section.course.title
