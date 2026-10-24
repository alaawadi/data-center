"""Admin configuration for the posts (يوميات) section."""
from django.contrib import admin

from .models import Post, PostComment, PostMedia, PostTag


class PostMediaInline(admin.TabularInline):
    model = PostMedia
    extra = 1
    fields = ('media_type', 'file', 'order')


class PostCommentInline(admin.TabularInline):
    model = PostComment
    extra = 0
    fields = ('author', 'author_name', 'body', 'parent', 'likes', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'owner', 'status', 'ratio', 'likes', 'saves', 'shares', 'created_at')
    list_filter = ('status', 'ratio', 'owner__role')
    search_fields = ('content', 'owner__phone', 'owner__full_name', 'owner__handle')
    autocomplete_fields = ('tags',)
    date_hierarchy = 'created_at'
    readonly_fields = ('likes', 'saves', 'shares', 'comments_count', 'created_at', 'updated_at')
    inlines = (PostMediaInline, PostCommentInline)
    fieldsets = (
        (None, {'fields': ('owner', 'status', 'slug', 'ratio')}),
        ('المحتوى', {'fields': ('content', 'tags')}),
        ('التفاعل', {'fields': ('likes', 'saves', 'shares', 'comments_count')}),
        ('التواريخ', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(PostTag)
class PostTagAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(PostComment)
class PostCommentAdmin(admin.ModelAdmin):
    list_display = ('post', 'display_name', 'body', 'likes', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('body', 'author__phone', 'author__handle', 'author_name')
    readonly_fields = ('created_at',)
