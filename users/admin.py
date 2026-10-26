"""Admin configuration for users and profiles."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    DeviceSession,
    Interest,
    Language,
    LoginAttempt,
    Profile,
    ProfileLanguage,
    ProfileSkill,
    Skill,
    SocialLink,
    User,
)


class ProfileSkillInline(admin.TabularInline):
    model = ProfileSkill
    extra = 1
    autocomplete_fields = ('skill',)


class ProfileLanguageInline(admin.TabularInline):
    model = ProfileLanguage
    extra = 1
    autocomplete_fields = ('language',)


class SocialLinkInline(admin.TabularInline):
    model = SocialLink
    extra = 1


class DeviceSessionInline(admin.TabularInline):
    model = DeviceSession
    extra = 0
    can_delete = True
    readonly_fields = ('device_id', 'user_agent', 'ip', 'created_at', 'last_seen', 'session_key')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ('-date_joined',)
    list_display = ('phone', 'display_name', 'role', 'is_verified', 'is_active', 'is_staff')
    list_filter = ('role', 'is_verified', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('phone', 'full_name', 'handle', 'email')
    readonly_fields = ('date_joined', 'last_login')
    inlines = (DeviceSessionInline,)

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if obj:
            fields.extend(
                name for name in ('full_name_ar', 'full_name_en')
                if getattr(obj, name)
            )
        return fields

    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        ('المعلومات الشخصية', {
            'fields': ('full_name', 'full_name_ar', 'full_name_en', 'handle', 'email')
        }),
        ('الصلاحيات', {
            'fields': ('role', 'is_verified', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('تواريخ', {'fields': ('date_joined', 'last_login')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'phone', 'full_name', 'full_name_ar', 'full_name_en',
                'role', 'password1', 'password2'
            ),
        }),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'location', 'completeness_percent', 'is_public')
    list_filter = ('is_public', 'education_stage', 'availability', 'gender')
    search_fields = ('user__phone', 'user__full_name', 'user__handle', 'headline', 'specialization')
    autocomplete_fields = ('interests',)
    inlines = (ProfileSkillInline, ProfileLanguageInline, SocialLinkInline)
    fieldsets = (
        ('المستخدم', {'fields': ('user', 'is_public')}),
        ('الهوية والصورة', {'fields': ('avatar', 'cover', 'headline', 'bio')}),
        ('معلومات شخصية', {'fields': ('city', 'country', 'date_of_birth', 'gender')}),
        ('تواصل', {'fields': ('whatsapp', 'website')}),
        ('بيانات المدرب', {'fields': ('specialization', 'experience_years', 'hourly_rate', 'availability', 'intro_video')}),
        ('بيانات الطالب', {'fields': ('education_stage', 'school', 'grade', 'learning_goals')}),
        ('الاهتمامات', {'fields': ('interests',)}),
        ('تواريخ', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(Interest)
class InterestAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(DeviceSession)
class DeviceSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_id', 'ip', 'last_seen', 'created_at')
    search_fields = ('user__phone', 'user__full_name', 'device_id', 'ip')
    list_filter = ('created_at', 'last_seen')
    readonly_fields = ('created_at', 'last_seen')


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ('phone', 'ip', 'successful', 'created_at')
    list_filter = ('successful', 'created_at')
    search_fields = ('phone', 'ip')
    date_hierarchy = 'created_at'
    readonly_fields = ('phone', 'ip', 'successful', 'created_at')
