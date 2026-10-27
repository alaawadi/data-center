"""Global template context processors."""

from django.db.models import Sum

from courses.models import Course, CourseStatus, StudentPointTransaction, StudentReferralLink
from users.models import UserRole

from .models import PlatformSettings


BRAND_PALETTES = {
    'current': {
        'label_ar': 'ألوان المنصة الحالية',
        'label_en': 'Current platform colors',
    },
    'ocean': {
        'label_ar': 'أزرق محيطي',
        'label_en': 'Ocean blue',
    },
    'violet': {
        'label_ar': 'بنفسجي هادئ',
        'label_en': 'Soft violet',
    },
    'emerald': {
        'label_ar': 'أخضر زمردي',
        'label_en': 'Emerald green',
    },
    'sunset': {
        'label_ar': 'غروب دافئ',
        'label_en': 'Warm sunset',
    },
    'rose': {
        'label_ar': 'وردي أنيق',
        'label_en': 'Elegant rose',
    },
    'slate': {
        'label_ar': 'رمادي عصري',
        'label_en': 'Modern slate',
    },
}

DEFAULT_PLATFORM_SETTINGS = {
    'name': 'Data Center',
    'homepageTitle': 'مركز داتا للتدريب والتطوير',
    'tagline': 'بوابة التعلّم والتطوير المهني',
    'email': 'datacenteracademy1@gmail.com',
    'phone': '0594810786',
    'whatsapp': '972594810786',
    'website': '',
    'maintenance': False,
    'allowSignup': True,
    'defaultLang': 'ar',
    'brandPalette': 'current',
}


def get_platform_settings():
    data = PlatformSettings.get_solo().data
    settings = {**DEFAULT_PLATFORM_SETTINGS, **(data if isinstance(data, dict) else {})}
    if not settings.get('homepageTitle'):
        settings['homepageTitle'] = DEFAULT_PLATFORM_SETTINGS['homepageTitle']
    if not isinstance(settings['brandPalette'], str) or settings['brandPalette'] not in BRAND_PALETTES:
        settings['brandPalette'] = DEFAULT_PLATFORM_SETTINGS['brandPalette']
    return settings


# Maps the current URL to the navigation tab that must be highlighted
# (mirrors the TAB_OF map that used to live in site-chrome.js).
_TAB_PREFIXES = (
    ('/courses', 'courses'),
    ('/posts', 'courses'),
    ('/projects', 'projects'),
    ('/freelancers', 'users'),
    ('/panel', 'admin'),
)


def site_chrome(request):
    """Expose the active navigation tab and site-wide chrome flags."""
    path = request.path_info
    active_tab = ''
    for prefix, tab in _TAB_PREFIXES:
        if path.startswith(prefix):
            active_tab = tab
            break
    return {
        'active_tab': active_tab,
        'is_landing': request.resolver_match.view_name == 'landing:home'
        if request.resolver_match else False,
        'site_settings': get_platform_settings(),
        'courses_sheet_json': [
            {
                'id': course.slug or str(course.pk),
                'title': course.title,
                'image': course.cover.url if course.cover else '',
                'duration': course.duration,
                'period': course.period,
                'price': f"₪{str(course.price or '').strip().replace('₪', '').strip()}"
                if str(course.price or '').strip().replace('₪', '').strip()
                else '',
            }
            for course in Course.objects.filter(status=CourseStatus.PUBLISHED)
            .only('pk', 'slug', 'title', 'cover', 'duration', 'period', 'price')
            .order_by('-created_at', '-pk')
        ],
    }


def server_profile(request):
    """بيانات البروفايل الحقيقية للمستخدم المسجّل، تُمرَّر للواجهة كي تعرضها."""
    user = getattr(request, 'user', None)
    if user is None or not user.is_authenticated:
        return {}
    profile = getattr(user, 'profile', None)
    if profile is None:
        return {}
    data = profile.to_public_dict()
    data['fullNameArabic'] = user.full_name_ar
    data['fullNameEnglish'] = user.full_name_en
    data['trainerNameEnglish'] = user.trainer_name_en or user.full_name_en
    data['skills'] = [
        {'id': f'sk{link.pk}', 'name': link.skill.name, 'level': link.level}
        for link in profile.profile_skills.select_related('skill')
    ]
    if user.role == UserRole.STUDENT:
        data['canScanWorkshops'] = True
        data['referral_points'] = (
            StudentPointTransaction.objects.filter(student=user)
            .aggregate(total=Sum('points'))['total']
            or 0
        )
        data['referral_visits'] = (
            StudentReferralLink.objects.filter(referrer=user)
            .aggregate(total=Sum('visits'))['total']
            or 0
        )
    return {'server_profile': data}
