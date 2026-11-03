"""Authentication, registration and profile forms."""
import re

from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.password_validation import validate_password
from django.forms import inlineformset_factory

from .models import (
    FreelancerCategory,
    Interest,
    Language,
    LanguageLevel,
    Profile,
    ProfileLanguage,
    ProfileSkill,
    Skill,
    SocialLink,
    SocialPlatform,
    validate_arabic_three_part_name,
    validate_english_three_part_name,
)
from .security import phone_lookup_values

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
    'maxlength': '14',
    'placeholder': 'رقمك المحلي',
    'autocomplete': 'tel-national',
    'autocapitalize': 'off',
    'spellcheck': 'false',
}

COUNTRY_CALLING_CODES = (
    '970 1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 '
    '51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 '
    '90 91 92 93 94 95 98 211 212 213 216 218 '
    '220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 '
    '235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 '
    '250 251 252 253 254 255 256 257 258 260 261 262 263 264 265 '
    '266 267 268 269 290 291 297 298 299 '
    '350 351 352 353 354 355 356 357 358 359 '
    '370 371 372 373 374 375 376 377 378 380 381 382 383 385 '
    '386 387 389 420 421 423 '
    '500 501 502 503 504 505 506 507 508 509 '
    '590 591 592 593 594 595 596 597 598 599 '
    '670 672 673 674 675 676 677 678 679 680 681 682 683 685 686 '
    '687 688 689 690 691 692 850 852 853 855 856 880 886 '
    '960 961 962 963 964 965 966 967 968 971 972 973 974 975 976 '
    '977 992 993 994 995 996 998'
).split()

_COUNTRY_CALLING_CODE_REGIONS = dict(
    item.split(':')
    for item in (
        '970:PS 1:US 7:RU 20:EG 27:ZA 30:GR 31:NL 32:BE 33:FR 34:ES '
        '36:HU 39:IT 40:RO 41:CH 43:AT 44:GB 45:DK 46:SE 47:NO 48:PL '
        '49:DE 51:PE 52:MX 53:CU 54:AR 55:BR 56:CL 57:CO 58:VE 60:MY '
        '61:AU 62:ID 63:PH 64:NZ 65:SG 66:TH 81:JP 82:KR 84:VN 86:CN '
        '90:TR 91:IN 92:PK 93:AF 94:LK 95:MM 98:IR '
        '211:SS 212:MA 213:DZ 216:TN 218:LY 220:GM 221:SN 222:MR 223:ML '
        '224:GN 225:CI 226:BF 227:NE 228:TG 229:BJ 230:MU 231:LR 232:SL '
        '233:GH 234:NG 235:TD 236:CF 237:CM 238:CV 239:ST 240:GQ 241:GA '
        '242:CG 243:CD 244:AO 245:GW 246:IO 247:SH 248:SC 249:SD 250:RW '
        '251:ET 252:SO 253:DJ 254:KE 255:TZ 256:UG 257:BI 258:MZ 260:ZM '
        '261:MG 262:RE 263:ZW 264:NA 265:MW 266:LS 267:BW 268:SZ 269:KM '
        '290:SH 291:ER 297:AW 298:FO 299:GL '
        '350:GI 351:PT 352:LU 353:IE 354:IS 355:AL 356:MT 357:CY 358:FI '
        '359:BG 370:LT 371:LV 372:EE 373:MD 374:AM 375:BY 376:AD 377:MC '
        '378:SM 380:UA 381:RS 382:ME 383:XK 385:HR 386:SI 387:BA 389:MK '
        '420:CZ 421:SK 423:LI '
        '500:FK 501:BZ 502:GT 503:SV 504:HN 505:NI 506:CR 507:PA 508:PM '
        '509:HT 590:GP 591:BO 592:GY 593:EC 594:GF 595:PY 596:MQ 597:SR '
        '598:UY 599:CW '
        '670:TL 672:NF 673:BN 674:NR 675:PG 676:TO 677:SB 678:VU 679:FJ '
        '680:PW 681:WF 682:CK 683:NU 685:WS 686:KI 687:NC 688:TV 689:PF '
        '690:TK 691:FM 692:MH 850:KP 852:HK 853:MO 855:KH 856:LA 880:BD '
        '886:TW 960:MV 961:LB 962:JO 963:SY 964:IQ 965:KW 966:SA 967:YE '
        '968:OM 971:AE 972:IL 973:BH 974:QA 975:BT 976:MN 977:NP 992:TJ '
        '993:TM 994:AZ 995:GE 996:KG 998:UZ'
    ).split()
)


def _country_flag(region):
    """Build a regional-indicator flag emoji from a two-letter region code."""
    return ''.join(chr(127397 + ord(letter)) for letter in region)


COUNTRY_CALLING_CODE_CHOICES = tuple(
    (
        f'+{code}',
        f'{_country_flag(_COUNTRY_CALLING_CODE_REGIONS[code])} +{code}',
    )
    for code in COUNTRY_CALLING_CODES
)

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
    country_code = forms.ChoiceField(
        label='مقدمة الدولة',
        choices=COUNTRY_CALLING_CODE_CHOICES,
        required=False,
        initial='+970',
        widget=forms.Select(attrs={'class': 'input select', 'id': 'suCountryCode'}),
    )
    phone = forms.CharField(
        label='رقم الهاتف',
        max_length=14,
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
        raw_phone = (self.cleaned_data.get('phone') or '').strip()
        country_code = self.cleaned_data.get('country_code') or ''
        if not country_code and re.fullmatch(r'0(?:59|56)\d{7}', raw_phone):
            phone = raw_phone
        else:
            country_code = country_code or '+970'
            if not raw_phone.isdigit():
                raise forms.ValidationError('أدخل رقم الجوال بالأرقام فقط.')
            national_number = raw_phone.lstrip('0')
            full_number = country_code[1:] + national_number
            if not 7 <= len(full_number) <= 15:
                raise forms.ValidationError(
                    'رقم الجوال غير صحيح. يجب أن يكون طول الرقم الدولي بين 7 و15 رقماً.'
                )
            phone = '+' + full_number
        if User.objects.filter(phone__in=phone_lookup_values(phone)).exists():
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

    country_code = forms.ChoiceField(
        label='مقدمة الدولة',
        choices=(('', 'اختر مقدمة الدولة'), *COUNTRY_CALLING_CODE_CHOICES),
        required=False,
        initial='+970',
        widget=forms.Select(attrs={'class': 'input select', 'id': 'liCountryCode'}),
    )
    username = forms.CharField(
        label='رقم الهاتف',
        widget=forms.TextInput(
            attrs={
                'class': 'input',
                'id': 'liPhone',
                'type': 'tel',
                'inputmode': 'tel',
                'maxlength': '14',
                'placeholder': 'رقمك المحلي بدون المقدمة',
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
        phone = (self.cleaned_data.get('username') or '').strip()
        for candidate in phone_lookup_values(phone):
            if User.objects.filter(phone=candidate).exists():
                self.cleaned_data['username'] = candidate
                break
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
    full_name_ar = forms.CharField(
        label='الاسم الكامل بالعربية (3–6 كلمات)',
        max_length=150,
        required=False,
        validators=[validate_arabic_three_part_name],
        widget=forms.TextInput(attrs={
            'dir': 'rtl',
            'autocomplete': 'name',
            'placeholder': 'مثال: أحمد محمد خالد عبد الرحمن الحسن',
        }),
    )
    full_name_en = forms.CharField(
        label='الاسم الكامل بالإنجليزية (3–6 كلمات)',
        max_length=150,
        required=False,
        validators=[validate_english_three_part_name],
        widget=forms.TextInput(attrs={
            'dir': 'ltr',
            'autocomplete': 'name',
            'placeholder': 'Example: Ahmad Mohammad Khaled Abdul Rahman Alhasan',
        }),
    )
    trainer_name_en = forms.CharField(
        label='اسم المدرب بالإنجليزية',
        max_length=200,
        required=False,
        widget=forms.TextInput(attrs={
            'dir': 'ltr',
            'autocomplete': 'name',
            'placeholder': 'Example: Ahmad Khaled',
        }),
    )
    skills_count = forms.IntegerField(widget=forms.HiddenInput(), initial=0, min_value=0, max_value=8)

    class Meta:
        model = Profile
        fields = (
            'avatar', 'cover', 'headline', 'bio',
            'city', 'country', 'date_of_birth', 'gender',
            'whatsapp',
            'specialization', 'experience_years', 'hourly_rate', 'availability', 'intro_video',
            'student_specialization', 'education_stage', 'school', 'grade', 'learning_goals',
            'is_public',
        )
        widgets = {
            'date_of_birth': forms.DateInput(attrs={'type': 'date'}),
            'bio': forms.Textarea(attrs={'rows': 4}),
            'learning_goals': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.freelancer_category_names = list(
            FreelancerCategory.objects.filter(is_active=True)
            .order_by('display_order', 'name')
            .values_list('name', flat=True)
        )
        self.fields['headline'].label = 'المسمى المهني'
        self.fields['headline'].help_text = 'اكتب للبحث، ثم اختر فئة نشطة من القائمة.'
        self.fields['headline'].widget.attrs.update({
            'autocomplete': 'off',
            'data-freelancer-category-combobox': 'true',
            'role': 'combobox',
            'aria-autocomplete': 'list',
            'aria-expanded': 'false',
            'placeholder': 'ابحث عن فئة المستقل',
        })
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
        if profile and profile.pk and profile.user.is_student:
            self.fields['student_specialization'].widget.attrs.update({
                'maxlength': 30,
                'data-specialization-maxlength': '30',
            })
        elif profile and profile.pk:
            self.fields.pop('student_specialization')
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
            category_value = next(
                (
                    value for value in (profile.specialization, profile.headline)
                    if value in self.freelancer_category_names
                ),
                '',
            )
            self.fields['headline'].initial = category_value
            self.fields['full_name'].initial = profile.user.full_name
            if profile.user.is_trainer:
                self.fields.pop('full_name_ar')
                self.fields.pop('full_name_en')
                self.fields['trainer_name_en'].initial = (
                    profile.user.trainer_name_en or profile.user.full_name_en
                )
                self.fields['trainer_name_en'].help_text = (
                    'يُستخدم هذا الاسم في النسخة الإنجليزية لشهادات دوراتك.'
                )
            else:
                self.fields.pop('trainer_name_en')
                self.fields['full_name_ar'].initial = profile.user.full_name_ar
                self.fields['full_name_en'].initial = profile.user.full_name_en
                if profile.user.full_name_ar:
                    self.fields['full_name_ar'].disabled = True
                if profile.user.full_name_en:
                    self.fields['full_name_en'].disabled = True
        else:
            self.fields.pop('trainer_name_en')
        self.fields['skills_count'].initial = wanted

    def clean_headline(self):
        headline = (self.cleaned_data.get('headline') or '').strip()
        if headline and headline not in self.freelancer_category_names:
            raise forms.ValidationError('اختر المسمى المهني من فئات المستقلين النشطة.')
        return headline

    def clean_student_specialization(self):
        specialization = (self.cleaned_data.get('student_specialization') or '').strip()
        if self.instance.user.is_student and len(specialization) > 30:
            raise forms.ValidationError('يجب ألا يتجاوز التخصص 30 حرفاً.')
        return specialization

    def clean(self):
        cleaned = super().clean()
        if 'headline' in cleaned:
            cleaned['specialization'] = cleaned['headline']
        name_ar = (cleaned.get('full_name_ar') or '').strip()
        name_en = (cleaned.get('full_name_en') or '').strip()
        if bool(name_ar) != bool(name_en):
            self.add_error(
                'full_name_en' if name_ar else 'full_name_ar',
                'أدخل الاسم الثلاثي باللغتين معاً.',
            )
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
        update_fields = ['full_name']
        if user.is_trainer:
            user.trainer_name_en = self.cleaned_data.get('trainer_name_en', '').strip()
            update_fields.append('trainer_name_en')
        else:
            user.full_name_ar = self.cleaned_data.get('full_name_ar', '').strip()
            user.full_name_en = self.cleaned_data.get('full_name_en', '').strip()
            update_fields.extend(('full_name_ar', 'full_name_en'))
        if commit:
            user.save(update_fields=update_fields)
        return profile


class SocialLinkForm(forms.ModelForm):
    class Meta:
        model = SocialLink
        fields = ('platform', 'url')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        choices = [
            choice for choice in SocialPlatform.choices
            if choice[0] != SocialPlatform.WEBSITE
        ]
        if self.instance.pk and self.instance.platform == SocialPlatform.WEBSITE:
            choices.insert(0, next(
                choice for choice in SocialPlatform.choices
                if choice[0] == SocialPlatform.WEBSITE
            ))
        self.fields['platform'].choices = choices


SocialLinkFormSet = inlineformset_factory(
    Profile,
    SocialLink,
    form=SocialLinkForm,
    extra=2,
    can_delete=True,
)
