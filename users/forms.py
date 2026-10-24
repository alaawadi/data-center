"""Authentication, registration and profile forms."""
import re

from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.password_validation import validate_password
from django.forms import inlineformset_factory

from .models import (
    Interest,
    Language,
    LanguageLevel,
    Profile,
    ProfileLanguage,
    ProfileSkill,
    Skill,
    SocialLink,
    phone_validator,
)

User = get_user_model()


FULL_NAME_WIDGET_ATTRS = {
    'class': 'input',
    'id': 'suName',
    'placeholder': 'اكتب اسمك الكامل',
    'autocomplete': 'name',
    'autofocus': True,
}

PHONE_WIDGET_ATTRS = {
    'class': 'input',
    'id': 'suPhone',
    'type': 'tel',
    'inputmode': 'numeric',
    'maxlength': '10',
    'placeholder': '10 أرقام',
    'autocomplete': 'tel-national',
    'autocapitalize': 'off',
    'spellcheck': 'false',
}

EMAIL_WIDGET_ATTRS = {
    'class': 'input',
    'id': 'suEmail',
    'type': 'email',
    'placeholder': 'name@example.com',
    'autocomplete': 'email',
    'autocapitalize': 'off',
    'spellcheck': 'false',
}

PASSWORD_WIDGET_ATTRS = {
    'class': 'input',
    'id': 'suPassword',
    'minlength': '8',
    'placeholder': '8 أحرف على الأقل',
    'autocomplete': 'new-password',
}

PASSWORD2_WIDGET_ATTRS = {
    'class': 'input',
    'id': 'suPassword2',
    'minlength': '8',
    'placeholder': 'أعد إدخال كلمة المرور',
    'autocomplete': 'new-password',
}


class FullNameWordsMixin:
    """Require a full name made of two or three words."""

    def clean_full_name(self):
        name = ' '.join((self.cleaned_data.get('full_name') or '').split())
        words = name.split(' ')
        if len(words) < 2:
            raise forms.ValidationError('الاسم الكامل يجب أن يتكوّن من كلمتين على الأقل.')
        if len(words) > 3:
            raise forms.ValidationError('الاسم الكامل يجب ألا يزيد عن ثلاث كلمات.')
        return name


class SignupForm(FullNameWordsMixin, forms.Form):
    """Self sign-up data for an immediately active student account."""

    full_name = forms.CharField(
        label='الاسم الكامل', max_length=150, widget=forms.TextInput(attrs=FULL_NAME_WIDGET_ATTRS)
    )
    phone = forms.CharField(
        label='رقم الجوال',
        max_length=10,
        validators=[phone_validator],
        widget=forms.TextInput(attrs=PHONE_WIDGET_ATTRS),
    )
    email = forms.EmailField(
        label='البريد الإلكتروني', widget=forms.EmailInput(attrs=EMAIL_WIDGET_ATTRS)
    )
    password1 = forms.CharField(
        label='كلمة المرور',
        strip=False,
        widget=forms.PasswordInput(attrs=PASSWORD_WIDGET_ATTRS),
    )
    password2 = forms.CharField(
        label='تأكيد كلمة المرور',
        strip=False,
        widget=forms.PasswordInput(attrs=PASSWORD2_WIDGET_ATTRS),
    )

    def clean_phone(self):
        phone = (self.cleaned_data.get('phone') or '').strip()
        if User.objects.filter(phone=phone).exists():
            raise forms.ValidationError('مستخدم بهذا الرقم موجود بالفعل.')
        return phone

    def clean_email(self):
        email = (self.cleaned_data.get('email') or '').strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError('هذا البريد الإلكتروني مستخدم بالفعل.')
        return email

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('كلمتا المرور غير متطابقتين.')
        if password1:
            validate_password(password1)
        return password2


class VerifyCodeForm(forms.Form):
    """The 6-digit code emailed to finish sign-up."""

    code = forms.CharField(
        label='رمز التحقق',
        max_length=6,
        widget=forms.TextInput(
            attrs={
                'class': 'input code-input',
                'id': 'vcCode',
                'inputmode': 'numeric',
                'autocomplete': 'one-time-code',
                'maxlength': '6',
                'pattern': '[0-9]{6}',
                'placeholder': '······',
                'autofocus': True,
            }
        ),
    )

    def clean_code(self):
        code = (self.cleaned_data.get('code') or '').strip()
        if not (code.isdigit() and len(code) == 6):
            raise forms.ValidationError('أدخل رمزاً مكوّناً من 6 أرقام.')
        return code


class LoginForm(AuthenticationForm):
    """Login with phone number and password."""

    username = forms.CharField(
        label='رقم الجوال',
        widget=forms.TextInput(
            attrs={
                'class': 'input',
                'id': 'liPhone',
                'type': 'tel',
                'inputmode': 'numeric',
                'maxlength': '10',
                'placeholder': '10 أرقام',
                'autocomplete': 'tel-national',
                'autofocus': True,
            }
        ),
    )
    password = forms.CharField(
        label='كلمة المرور',
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                'class': 'input',
                'id': 'liPassword',
                'placeholder': 'أدخل كلمة المرور',
                'autocomplete': 'current-password',
            }
        ),
    )

    def clean(self):
        try:
            return super().clean()
        except forms.ValidationError:
            phone = (self.cleaned_data.get('username') or '').strip()
            password = self.cleaned_data.get('password') or ''
            user = User.objects.filter(phone=phone).first()
            if user and not user.is_active and user.check_password(password):
                raise forms.ValidationError(
                    'الحساب غير نشط حالياً. يرجى التواصل مع إدارة المنصة لتفعيله.'
                )
            raise


LEVEL_BY_CODE = dict(LanguageLevel.choices)
LEVEL_BY_LABEL = {label: code for code, label in LanguageLevel.choices}


def _parse_level(raw, default=60):
    """Accept "85", "85%" or nothing → integer 0-100."""
    digits = re.sub(r'[^0-9]', '', raw or '')
    if not digits:
        return default
    return max(0, min(100, int(digits)))


class ProfileEditForm(forms.ModelForm):
    """Comprehensive "edit my profile" form (identity + lists + socials formset)."""

    full_name = forms.CharField(label='الاسم الكامل', max_length=150, required=False)
    email = forms.EmailField(label='البريد الإلكتروني', required=False)

    skills_count = forms.IntegerField(widget=forms.HiddenInput(), initial=0, min_value=0, max_value=8)

    class Meta:
        model = Profile
        fields = (
            'avatar', 'cover', 'headline', 'bio',
            'city', 'country', 'date_of_birth', 'gender',
            'whatsapp', 'website',
            'specialization', 'experience_years', 'hourly_rate', 'availability', 'intro_video',
            'education_stage', 'school', 'grade', 'learning_goals',
            'is_public',
        )
        widgets = {
            'date_of_birth': forms.DateInput(attrs={'type': 'date'}),
            'bio': forms.Textarea(attrs={'rows': 4}),
            'learning_goals': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            widget = field.widget
            if isinstance(widget, forms.CheckboxInput) or isinstance(widget, forms.HiddenInput):
                continue
            css = 'input'
            if isinstance(widget, forms.Select):
                css = 'input select'
            elif isinstance(widget, forms.Textarea):
                css = 'input textarea'
            elif isinstance(widget, forms.ClearableFileInput):
                css = 'input file'
            widget.attrs.setdefault('class', css)

        profile = self.instance
        existing = list(profile.profile_skills.select_related('skill')[:8]) if profile and profile.pk else []

        # determine how many slots are needed: existing skills, or the count submitted on a bound form
        wanted = len(existing)
        if self.is_bound:
            try:
                wanted = max(wanted, int(self.data.get('skills_count') or 1))
            except (TypeError, ValueError):
                wanted = max(wanted, 1)
        if wanted < 1:
            wanted = 1
        if wanted > 8:
            wanted = 8

        for idx in range(1, wanted + 1):
            field_name = f'skill_{idx}'
            if field_name in self.fields:
                continue
            self.fields[field_name] = forms.CharField(
                label=f'المهارة {idx}',
                required=False,
                widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'مثال: تصميم UI/UX'}),
            )
        # prefill from existing skills
        for idx, link in enumerate(existing, start=1):
            key = f'skill_{idx}'
            if key in self.fields:
                self.fields[key].initial = link.skill.name
        if wanted >= 1 and 'skill_1' not in self.fields:
            self.fields['skill_1'] = forms.CharField(
                label='المهارة 1',
                required=False,
                widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'مثال: تصميم UI/UX'}),
            )
        if profile and profile.pk:
            self.fields['full_name'].initial = profile.user.full_name
            self.fields['email'].initial = profile.user.email
        self.fields['skills_count'].initial = wanted

    def clean(self):
        cleaned = super().clean()
        count = cleaned.get('skills_count') or 0
        if count < 1:
            count = 1
        if count > 8:
            count = 8
        cleaned['skills_count'] = count
        skills = []
        for i in range(1, count + 1):
            key = f'skill_{i}'
            val = (cleaned.get(key) or self.data.get(key, '') or '').strip()
            if val:
                skills.append(val[:80])
        cleaned['_skills_list'] = skills
        return cleaned

    def save_lists(self, profile):
        """Rebuild skills from dynamic fields (max 8)."""
        profile.profile_skills.all().delete()
        for name in self.cleaned_data.get('_skills_list', []):
            if not name:
                continue
            name_capped = name.strip()[:80]
            if not name_capped:
                continue
            skill, _ = Skill.objects.get_or_create(name=name_capped)
            ProfileSkill.objects.create(profile=profile, skill=skill, level=60)

    def save(self, commit=True):
        profile = super().save(commit=commit)
        user = profile.user
        user.full_name = self.cleaned_data.get('full_name', '').strip()
        user.email = self.cleaned_data.get('email', '').strip()
        if commit:
            user.save(update_fields=['full_name', 'email'])
        return profile


SocialLinkFormSet = inlineformset_factory(
    Profile,
    SocialLink,
    fields=('platform', 'url'),
    extra=2,
    can_delete=True,
)
