"""Admin configuration for the projects section."""
from django.contrib import admin

from .models import Project, ProjectComment, ProjectFile, ProjectImage, ProjectTag


class ProjectImageInline(admin.TabularInline):
    model = ProjectImage
    extra = 1


class ProjectFileInline(admin.TabularInline):
    model = ProjectFile
    extra = 0
    readonly_fields = ('uploaded_at',)


class ProjectCommentInline(admin.TabularInline):
    model = ProjectComment
    extra = 0
    fields = ('author', 'author_name', 'body', 'parent', 'likes', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'status', 'category', 'views', 'likes', 'project_date')
    list_filter = ('status', 'category', 'owner__role')
    search_fields = ('title', 'summary', 'owner__phone', 'owner__full_name', 'owner__handle')
    autocomplete_fields = ('tags',)
    date_hierarchy = 'created_at'
    readonly_fields = ('views', 'likes', 'created_at', 'updated_at')
    inlines = (ProjectImageInline, ProjectFileInline, ProjectCommentInline)
    fieldsets = (
        (None, {'fields': ('owner', 'status', 'title', 'slug')}),
        ('المحتوى', {'fields': ('cover', 'summary', 'content', 'category', 'role', 'project_date')}),
        ('الروابط والوسوم', {'fields': ('github_url', 'demo_url', 'tags')}),
        ('التفاعل', {'fields': ('views', 'likes')}),
        ('التواريخ', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(ProjectTag)
class ProjectTagAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(ProjectComment)
class ProjectCommentAdmin(admin.ModelAdmin):
    list_display = ('project', 'display_name', 'body', 'likes', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('body', 'author__phone', 'author__handle', 'author_name')
    readonly_fields = ('created_at',)
