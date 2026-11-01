"""Views for the admin dashboard (admin.html)."""
import base64
import binascii
import csv
import hashlib
import json
import re
import secrets
import unicodedata
from datetime import date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation
from io import BytesIO
from pathlib import Path, PurePosixPath
from tempfile import SpooledTemporaryFile
from uuid import UUID, uuid4
from zipfile import BadZipFile, ZIP_DEFLATED, ZipFile

from django.contrib.staticfiles.storage import staticfiles_storage
from django.apps import apps
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.sessions.models import Session
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.core import serializers
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.validators import EmailValidator, URLValidator
from django.db import IntegrityError, connection, models, transaction
from django.db.models import Count, Q, Sum
from django.http import FileResponse, HttpResponse, JsonResponse
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.views.decorators.http import require_http_methods, require_POST
from django.views.generic import TemplateView
from core.context_processors import BRAND_PALETTES, DEFAULT_PLATFORM_SETTINGS, get_platform_settings
from core.models import PlatformSettings, SiteVisitDaily
from courses.referrals import (
    award_referral_points_for_enrollment,
    award_referral_points_for_registration_request,
)
from courses.models import (
    Course,
    CourseCertificate,
    CourseProgress,
    CourseRegistrationPayment,
    InPersonCourseCohort,
    CourseRegistrationRequest,
    CourseRegistrationRequestStatus,
    CourseSection,
    CourseStatus,
    CourseType,
    InPersonWorkshop,
    Lesson,
    LessonType,
    ManualCertificate,
    ManualCertificateStatus,
    Quiz,
    StudentPointTransaction,
    StudentReferralLink,
    TrainingCategory,
    WorkshopAttendance,
    WorkshopCertificate,
    close_active_inperson_cohort,
    start_next_inperson_cohort,
)
from courses.views import _sync_quiz, course_editor_context
from projects.models import Project, ProjectStatus
from projects.views import project_editor_context
from users.models import (
    DeviceSession,
    Profile,
    SocialLink,
    SocialPlatform,
    StudentSetupLink,
    User,
    UserRole,
    validate_arabic_three_part_name,
    validate_english_three_part_name,
)

PHONE_RE = re.compile(r'^[0-9]{10}$')
AVATAR_RE = re.compile(r'^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$')
AVATAR_TYPES = {'png': 'png', 'jpeg': 'jpg', 'webp': 'webp'}
MAX_AVATAR_BYTES = 4 * 1024 * 1024
MAX_BACKUP_UPLOAD_BYTES = 300 * 1024 * 1024
MAX_BACKUP_EXPANDED_BYTES = 750 * 1024 * 1024
STUDENT_SETUP_LINK_TTL = timedelta(days=7)
MAX_CALL_DATA_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_CALL_DATA_UPLOAD_ROWS = 10000
CALL_DATA_DAILY_ASSIGNMENT_LIMIT = 50
BACKUP_FORMAT = 'data-center-platform'
BACKUP_EXCLUDED_MODELS = {
    'devicesession',
    'loginattempt',
    'signupverification',
    'signupratelimit',
    'studentsetuplink',
}


def _backup_models():
    return [
        model
        for app_label in ('core', 'users', 'courses', 'projects')
        for model in apps.get_app_config(app_label).get_models()
        if model._meta.model_name not in BACKUP_EXCLUDED_MODELS
    ]


def _safe_backup_path(value):
    path = PurePosixPath(str(value).replace('\\', '/'))
    if (
        path.is_absolute()
        or not path.parts
        or path.parts[0].endswith(':')
        or any(part in ('', '.', '..') for part in path.parts)
    ):
        raise ValueError('مسار الملف داخل النسخة غير صالح.')
    return path.as_posix()


@require_http_methods(['GET'])
def pwa_service_worker(request):
    static_root = next(
        (Path(directory) for directory in settings.STATICFILES_DIRS if (Path(directory) / 'js' / 'service-worker.js').is_file()),
        None,
    )
    if static_root is None:
        raise RuntimeError('The PWA service worker asset is missing from the static files directories.')
    static_assets = sorted(
        staticfiles_storage.url(path.relative_to(static_root).as_posix())
        for path in static_root.rglob('*')
        if path.is_file()
        and path.name != 'service-worker.js'
        and not any(part.startswith('.') for part in path.relative_to(static_root).parts)
    )
    static_prefix = staticfiles_storage.url('')
    offline_url = staticfiles_storage.url('offline.html')
    worker_path = static_root / 'js' / 'service-worker.js'
    source = (
        worker_path.read_text(encoding='utf-8')
        .replace('__PRECACHE_ASSETS__', json.dumps(static_assets))
        .replace('__STATIC_PREFIX__', json.dumps(static_prefix))
        .replace('__OFFLINE_URL__', json.dumps(offline_url))
    )
    response = HttpResponse(source, content_type='application/javascript; charset=utf-8')
    response['Service-Worker-Allowed'] = '/'
    response['Cache-Control'] = 'no-cache'
    return response


def _database_size_bytes():
    if connection.vendor != 'sqlite':
        raise RuntimeError('Database size reporting is currently supported for SQLite.')

    database_name = str(connection.settings_dict['NAME'])
    if database_name == ':memory:' or (
        database_name.startswith('file:') and 'mode=memory' in database_name
    ):
        with connection.cursor() as cursor:
            cursor.execute('PRAGMA page_count')
            page_count = cursor.fetchone()[0]
            cursor.execute('PRAGMA page_size')
            page_size = cursor.fetchone()[0]
        return page_count * page_size

    database_path = Path(database_name)
    total_bytes = 0
    for path in (database_path, Path(database_name + '-wal')):
        try:
            total_bytes += path.stat().st_size
        except FileNotFoundError:
            continue
    return total_bytes


@require_http_methods(['GET', 'POST'])
def platform_settings(request):
    denied = _admin_api_user(request)
    if denied:
        return denied

    settings_record = PlatformSettings.get_solo()
    settings_data = get_platform_settings()
    if request.method == 'GET':
        return JsonResponse({'ok': True, 'settings': settings_data})

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or not payload:
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)

    allowed = {
        'name', 'homepageTitle', 'tagline', 'email', 'phone', 'whatsapp', 'website',
        'maintenance', 'allowSignup', 'defaultLang', 'brandPalette',
    }
    if set(payload) - allowed:
        return _admin_api_error('تحتوي البيانات على حقول غير مسموح بها.', 400)

    values = {}
    limits = {
        'name': 150, 'homepageTitle': 200, 'tagline': 200, 'email': 254,
        'phone': 30, 'whatsapp': 16, 'website': 200,
    }
    for key, limit in limits.items():
        if key not in payload:
            continue
        value = payload[key]
        if not isinstance(value, str):
            return _admin_api_error('قيمة أحد الحقول النصية غير صالحة.', 400)
        value = value.strip()
        if len(value) > limit or (key in ('name', 'homepageTitle', 'tagline') and not value):
            return _admin_api_error('تحقق من أطوال بيانات المنصة المطلوبة.', 400)
        values[key] = value

    if 'email' in values and values['email']:
        try:
            EmailValidator()(values['email'])
        except ValidationError:
            return _admin_api_error('البريد الإلكتروني غير صالح.', 400)
    if 'phone' in values and values['phone'] and not re.fullmatch(r'[+0-9 ()-]{7,30}', values['phone']):
        return _admin_api_error('رقم الهاتف غير صالح.', 400)
    if 'whatsapp' in values and values['whatsapp'] and not re.fullmatch(r'\+?[0-9]{7,15}', values['whatsapp']):
        return _admin_api_error('رقم واتساب غير صالح.', 400)
    if 'website' in values and values['website']:
        try:
            URLValidator(schemes=['http', 'https'])(values['website'])
        except ValidationError:
            return _admin_api_error('رابط الموقع يجب أن يبدأ بـ http:// أو https://.', 400)
    for key in ('maintenance', 'allowSignup'):
        if key in payload:
            if not isinstance(payload[key], bool):
                return _admin_api_error('قيمة أحد خيارات التشغيل غير صالحة.', 400)
            values[key] = payload[key]
    if 'defaultLang' in payload:
        if payload['defaultLang'] not in ('ar', 'en'):
            return _admin_api_error('لغة المنصة غير مدعومة.', 400)
        values['defaultLang'] = payload['defaultLang']
    if 'brandPalette' in payload:
        if not isinstance(payload['brandPalette'], str) or payload['brandPalette'] not in BRAND_PALETTES:
            return _admin_api_error('مجموعة الألوان المحددة غير مدعومة.', 400)
        values['brandPalette'] = payload['brandPalette']

    settings_data.update(values)
    settings_record.data = settings_data
    settings_record.save(update_fields=['data'])
    return JsonResponse({'ok': True, 'settings': settings_data})


@require_http_methods(['GET', 'POST'])
def database_backup(request):
    denied = _admin_api_user(request)
    if denied:
        return denied

    if request.method == 'GET':
        PlatformSettings.get_solo()
        models_to_export = _backup_models()
        objects = [
            obj
            for model in models_to_export
            for obj in model._default_manager.all().iterator()
        ]
        serialized = json.loads(serializers.serialize('json', objects))
        for record in serialized:
            if record['model'] == 'users.user':
                record['fields'].pop('groups', None)
                record['fields'].pop('user_permissions', None)

        file_names = set()
        for obj in objects:
            for field in obj._meta.get_fields():
                if isinstance(field, models.FileField):
                    value = getattr(obj, field.name)
                    if value and value.name:
                        file_names.add(_safe_backup_path(value.name))

        backup = SpooledTemporaryFile(max_size=8 * 1024 * 1024)
        with ZipFile(backup, 'w', compression=ZIP_DEFLATED) as archive:
            archive.writestr('database.json', json.dumps({
                'format': BACKUP_FORMAT,
                'version': 1,
                'objects': serialized,
                'media': sorted(file_names),
            }, ensure_ascii=False))
            for name in sorted(file_names):
                with default_storage.open(name, 'rb') as media_file:
                    archive.writestr(f'media/{name}', media_file.read())
        backup.seek(0)
        return FileResponse(
            backup,
            as_attachment=True,
            filename=f'data-center-backup-{timezone.localdate().isoformat()}.zip',
            content_type='application/zip',
        )

    uploaded = request.FILES.get('backup')
    if not uploaded or uploaded.size > MAX_BACKUP_UPLOAD_BYTES:
        return _admin_api_error('اختر ملف نسخة احتياطية صالحاً لا يتجاوز 300 ميغابايت.', 400)

    stored_media = []
    try:
        with ZipFile(uploaded) as archive:
            names = archive.namelist()
            if len(names) != len(set(names)):
                return _admin_api_error('ملف النسخة يحتوي مسارات مكررة.', 400)
            expanded_size = sum(info.file_size for info in archive.infolist())
            if expanded_size > MAX_BACKUP_EXPANDED_BYTES:
                return _admin_api_error('حجم الملفات بعد فك الضغط يتجاوز الحد المسموح.', 400)
            manifest = json.loads(archive.read('database.json'))
            if (
                not isinstance(manifest, dict)
                or manifest.get('format') != BACKUP_FORMAT
                or manifest.get('version') != 1
                or not isinstance(manifest.get('objects'), list)
                or not isinstance(manifest.get('media'), list)
            ):
                return _admin_api_error('تنسيق ملف النسخة غير مدعوم.', 400)

            backup_models = {model._meta.label_lower: model for model in _backup_models()}
            backup_media_names = {
                _safe_backup_path(name)
                for name in manifest['media']
                if isinstance(name, str)
            }
            if len(backup_media_names) != len(manifest['media']):
                return _admin_api_error('قائمة ملفات النسخة غير صالحة أو تحتوي قيماً مكررة.', 400)
            for record in manifest['objects']:
                if not isinstance(record, dict) or record.get('model') not in backup_models:
                    return _admin_api_error('يحتوي ملف النسخة على بيانات غير مدعومة.', 400)
                if not isinstance(record.get('fields'), dict):
                    return _admin_api_error('بنية بيانات النسخة غير صالحة.', 400)
                model = backup_models[record['model']]
                for field in model._meta.get_fields():
                    if isinstance(field, models.FileField):
                        file_name = record['fields'].get(field.name)
                        if file_name and _safe_backup_path(file_name) not in backup_media_names:
                            return _admin_api_error('تفتقد النسخة ملفاً مرفوعاً مرتبطاً بأحد سجلاتها.', 400)
                if record['model'] == 'core.platformsettings':
                    settings_payload = record['fields'].get('data')
                    valid_keys = set(DEFAULT_PLATFORM_SETTINGS)
                    if (
                        record.get('pk') != 1
                        or not isinstance(settings_payload, dict)
                        or set(settings_payload) - valid_keys
                        or not isinstance(settings_payload.get('maintenance'), bool)
                        or not isinstance(settings_payload.get('allowSignup'), bool)
                    ):
                        return _admin_api_error('إعدادات المنصة داخل النسخة غير صالحة.', 400)
                    string_limits = {
                        'name': 150,
                        'tagline': 200,
                        'email': 254,
                        'phone': 30,
                        'whatsapp': 16,
                        'website': 200,
                    }
                    if any(
                        key in settings_payload
                        and (
                            not isinstance(settings_payload[key], str)
                            or len(settings_payload[key]) > limit
                        )
                        for key, limit in string_limits.items()
                    ):
                        return _admin_api_error('إعدادات المنصة داخل النسخة غير صالحة.', 400)
                    if (
                        not settings_payload.get('name', '')
                        or not settings_payload.get('tagline', '')
                        or not isinstance(settings_payload.get('defaultLang', 'ar'), str)
                        or settings_payload.get('defaultLang', 'ar') not in ('ar', 'en')
                        or not isinstance(settings_payload.get('brandPalette', 'ocean'), str)
                        or settings_payload.get('brandPalette', 'ocean') not in BRAND_PALETTES
                    ):
                        return _admin_api_error('إعدادات المنصة داخل النسخة غير صالحة.', 400)
                    email = settings_payload.get('email', '')
                    if email:
                        try:
                            EmailValidator()(email)
                        except ValidationError:
                            return _admin_api_error('إعدادات المنصة داخل النسخة غير صالحة.', 400)
                    if (
                        settings_payload.get('phone')
                        and not re.fullmatch(r'[+0-9 ()-]{7,30}', settings_payload['phone'])
                    ):
                        return _admin_api_error('إعدادات المنصة داخل النسخة غير صالحة.', 400)
                    if (
                        settings_payload.get('whatsapp')
                        and not re.fullmatch(r'\+?[0-9]{7,15}', settings_payload['whatsapp'])
                    ):
                        return _admin_api_error('إعدادات المنصة داخل النسخة غير صالحة.', 400)
                    website = settings_payload.get('website', '')
                    if website:
                        try:
                            URLValidator(schemes=['http', 'https'])(website)
                        except ValidationError:
                            return _admin_api_error('إعدادات المنصة داخل النسخة غير صالحة.', 400)
                if record['model'] == 'users.user':
                    record['fields'].pop('groups', None)
                    record['fields'].pop('user_permissions', None)

            media_members = {}
            for name in manifest['media']:
                safe_name = _safe_backup_path(name)
                member = f'media/{safe_name}'
                info = archive.getinfo(member)
                if info.is_dir():
                    return _admin_api_error('يحتوي ملف النسخة على ملف وسائط غير صالح.', 400)
                media_members[safe_name] = member

            if any(name != 'database.json' and name not in set(media_members.values()) for name in names):
                return _admin_api_error('ملف النسخة يحتوي عناصر غير معروفة.', 400)

            try:
                deserialized = list(serializers.deserialize(
                    'json',
                    json.dumps(manifest['objects'], ensure_ascii=False),
                ))
            except (serializers.DeserializationError, ValueError, TypeError, KeyError):
                return _admin_api_error('تعذر قراءة سجلات قاعدة البيانات من ملف النسخة.', 400)

            for name, member in media_members.items():
                if default_storage.exists(name):
                    continue
                saved_name = default_storage.save(name, ContentFile(archive.read(member)))
                if saved_name != name:
                    default_storage.delete(saved_name)
                    raise ValueError('تعذر حفظ ملف وسائط النسخة بالمسار الأصلي.')
                stored_media.append(name)

        added = 0
        skipped = 0
        with transaction.atomic():
            with connection.constraint_checks_disabled():
                for item in deserialized:
                    model = item.object.__class__
                    if model._meta.label_lower not in backup_models:
                        raise ValueError('تحتوي النسخة على نموذج غير مدعوم.')
                    if item.object.pk is not None and model._default_manager.filter(pk=item.object.pk).exists():
                        skipped += 1
                        continue
                    item.save()
                    added += 1
    except (BadZipFile, KeyError, json.JSONDecodeError, ValueError, OSError, IntegrityError) as exc:
        for name in stored_media:
            default_storage.delete(name)
        if isinstance(exc, IntegrityError):
            return _admin_api_error('تعذر دمج النسخة بسبب تعارض في البيانات أو العلاقات.', 400)
        return _admin_api_error('ملف النسخة غير صالح أو تعذر استعادته.', 400)

    return JsonResponse({
        'ok': True,
        'added': added,
        'skipped': skipped,
        'media_added': len(stored_media),
    })


def _admin_api_error(message, status):
    return JsonResponse({'ok': False, 'message': message}, status=status)


def _admin_api_user(request):
    if not request.user.is_authenticated:
        return _admin_api_error('يجب تسجيل الدخول أولاً.', 401)
    if request.user.role != UserRole.ADMIN:
        return _admin_api_error('ليست لديك صلاحية لتنفيذ هذا الإجراء.', 403)
    return None


def _inperson_cohort_payload(cohort):
    return {
        'id': str(cohort.pk),
        'courseId': cohort.course.slug,
        'number': cohort.number,
        'name': cohort.name,
        'startedAt': cohort.started_at.isoformat(),
        'endedAt': cohort.ended_at.isoformat() if cohort.ended_at else '',
        'active': cohort.is_active,
        'requestsCount': getattr(cohort, 'request_count', None)
        if hasattr(cohort, 'request_count')
        else cohort.registration_requests.count(),
    }


def _course_registration_course_price(course):
    raw_price = (course.price or '').strip()
    normalized_price = raw_price.translate(
        str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789')
    ).replace(',', '.')
    if normalized_price.casefold() in ('مجاني', 'free'):
        return Decimal('0.00')
    try:
        price = Decimal(normalized_price)
    except InvalidOperation:
        return None
    if not price.is_finite() or price < 0 or price >= Decimal('100000000'):
        return None
    return price.quantize(Decimal('0.01'))


def _course_registration_request_payload(registration, referral_points_awarded=None):
    course_price = _course_registration_course_price(registration.course)
    payments = list(registration.payments.all())
    paid_amount = sum((payment.amount for payment in payments), Decimal('0.00'))
    payload = {
        'id': str(registration.pk),
        'courseId': registration.course.slug,
        'courseTitle': registration.course.title,
        'coursePrice': registration.course.price or '',
        'coursePriceAmount': format(course_price, 'f') if course_price is not None else '',
        'currency': registration.course.currency,
        'fullName': registration.full_name,
        'phone': registration.phone,
        'address': registration.address,
        'specialty': registration.specialty,
        'governorate': registration.governorate,
        'studyYear': registration.study_year,
        'studentStatus': registration.student_status,
        'cohortId': str(registration.cohort_id or ''),
        'cohortName': registration.cohort.name if registration.cohort_id else '',
        'studentId': str(registration.student_id or ''),
        'sourceStudentName': (
            registration.referral_link.referrer.display_name
            if registration.referral_link_id
            else ''
        ),
        'status': registration.status,
        'paidAmount': format(paid_amount, 'f'),
        'remainingAmount': (
            format(max(Decimal('0.00'), course_price - paid_amount), 'f')
            if course_price is not None
            else ''
        ),
        'payments': [
            {
                'amount': format(payment.amount, 'f'),
                'createdAt': payment.created_at.isoformat(),
            }
            for payment in payments
        ],
        'createdAt': registration.created_at.isoformat(),
    }
    if registration.student_id:
        payload['accountReady'] = registration.student.has_usable_password()
        try:
            setup_link = registration.student.student_setup_link
        except StudentSetupLink.DoesNotExist:
            setup_link = None
        payload['setupLinkExpiresAt'] = (
            setup_link.expires_at.isoformat() if setup_link else ''
        )
    else:
        payload['accountReady'] = False
        payload['setupLinkExpiresAt'] = ''
    if referral_points_awarded is not None:
        payload['referralPointsAwarded'] = referral_points_awarded
    return payload


def _normalized_inperson_student_phone(phone):
    match = re.fullmatch(r'\+97(?:0|2)(59|56)\d{7}', phone or '')
    return '0' + phone[4:] if match else None


def _issue_student_setup_link(user):
    token = secrets.token_urlsafe(32)
    expires_at = timezone.now() + STUDENT_SETUP_LINK_TTL
    StudentSetupLink.objects.update_or_create(
        user=user,
        defaults={
            'token_hash': hashlib.sha256(token.encode('utf-8')).hexdigest(),
            'expires_at': expires_at,
            'consumed_at': None,
        },
    )
    return token, expires_at


def _student_setup_link_payload(request, user, token, expires_at):
    import qrcode

    setup_url = request.build_absolute_uri(
        reverse('users:student-setup', kwargs={'token': token})
    )
    image = BytesIO()
    qrcode.make(setup_url).save(image, format='PNG')
    qr_image = 'data:image/png;base64,' + base64.b64encode(image.getvalue()).decode('ascii')
    return {
        'setupUrl': setup_url,
        'setupQrImage': qr_image,
        'setupLinkExpiresAt': expires_at.isoformat(),
    }


def _ensure_registration_student(registration, issue_missing_link=True):
    phone = _normalized_inperson_student_phone(registration.phone)
    if phone is None:
        raise ValidationError(
            'رقم الهاتف يجب أن يبدأ بـ +970 أو +972 ويتضمن جوالاً يبدأ بـ 59 أو 56.'
        )

    if registration.student_id:
        student = User.objects.select_for_update().get(pk=registration.student_id)
        if student.role != UserRole.STUDENT:
            raise ValidationError('رقم الهاتف مرتبط بحساب ليس حساب طالب.')
    else:
        student = User.objects.select_for_update().filter(phone=phone).first()
        if student is not None and student.role != UserRole.STUDENT:
            raise ValidationError(
                'رقم الهاتف مرتبط بحساب غير طالب؛ لا يمكن ربط طلب التسجيل به.'
            )
        if student is None:
            student = User(
                phone=phone,
                full_name=registration.full_name[:150],
                role=UserRole.STUDENT,
            )
            student.set_unusable_password()
            student.save()
        registration.student = student
        registration.save(update_fields=['student'])

    if not student.is_active:
        raise ValidationError('حساب الطالب المرتبط برقم الهاتف غير نشط.')

    profile, _ = Profile.objects.get_or_create(user=student)
    profile_fields = []
    if not profile.whatsapp:
        profile.whatsapp = registration.phone
        profile_fields.append('whatsapp')
    if registration.student_status == 'graduate' and not profile.education_stage:
        profile.education_stage = 'graduate'
        profile_fields.append('education_stage')
    if profile_fields:
        profile_fields.append('updated_at')
        profile.save(update_fields=profile_fields)

    token = None
    expires_at = None
    if issue_missing_link and not student.has_usable_password():
        try:
            student.student_setup_link
        except StudentSetupLink.DoesNotExist:
            token, expires_at = _issue_student_setup_link(student)
    return student, token, expires_at


@require_POST
def course_registration_request_save(request):
    denied = _admin_api_user(request)
    if denied:
        return denied

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return _admin_api_error('بيانات الطلب غير صالحة.', 400)
    if not isinstance(payload, dict) or set(payload) != {
        'courseId', 'fullName', 'phone', 'address', 'specialty', 'governorate', 'studyYear',
        'studentStatus'
    }:
        return _admin_api_error('بيانات الطلب غير صالحة.', 400)

    course_id = payload.get('courseId')
    course = (
        Course.objects.filter(
            slug=course_id,
            status=CourseStatus.PUBLISHED,
            course_type=CourseType.IN_PERSON,
        ).first()
        if isinstance(course_id, str)
        else None
    )
    if course is None:
        return _admin_api_error('الدورة الوجاهية غير موجودة أو غير منشورة.', 400)

    full_name = payload.get('fullName')
    if not isinstance(full_name, str):
        return _admin_api_error('اسم المتقدم غير صالح.', 400)
    full_name = ' '.join(full_name.split())
    name_parts = full_name.split()
    if (
        not 3 <= len(name_parts) <= 6
        or any(
            not all(
                char.isalpha() or unicodedata.category(char).startswith('M')
                for char in part
            )
            for part in name_parts
        )
    ):
        return _admin_api_error('اسم المتقدم غير صالح.', 400)

    phone = payload.get('phone')
    address = payload.get('address')
    specialty = payload.get('specialty')
    governorate = payload.get('governorate')
    study_year = payload.get('studyYear')
    student_status = payload.get('studentStatus')
    if not isinstance(phone, str) or not re.fullmatch(r'\+[0-9]{12}', phone):
        return _admin_api_error('رقم الهاتف غير صالح.', 400)
    if not isinstance(address, str) or not address.strip() or len(address.strip()) > 255:
        return _admin_api_error('العنوان غير صالح.', 400)
    if not isinstance(specialty, str) or not specialty.strip() or len(specialty.strip()) > 150:
        return _admin_api_error('التخصص غير صالح.', 400)
    if governorate not in ('gaza', 'central'):
        return _admin_api_error('المحافظة غير صالحة.', 400)
    if (
        isinstance(study_year, bool)
        or not isinstance(study_year, int)
        or not 1 <= study_year <= 4294967295
    ):
        return _admin_api_error('السنة الدراسية يجب أن تكون رقماً صحيحاً موجباً.', 400)
    if student_status not in ('student', 'graduate'):
        return _admin_api_error('الحالة الدراسية غير صالحة.', 400)

    with transaction.atomic():
        cohort = start_next_inperson_cohort(course)
        registration = CourseRegistrationRequest.objects.create(
            course=course,
            cohort=cohort,
            full_name=full_name,
            phone=phone,
            address=address.strip(),
            specialty=specialty.strip(),
            governorate=governorate,
            study_year=study_year,
            student_status=student_status,
            status=CourseRegistrationRequestStatus.NEW,
        )
    return JsonResponse({
        'ok': True,
        'request': _course_registration_request_payload(registration),
    }, status=201)


@require_POST
def course_registration_request_update(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return _admin_api_error('بيانات الطالب غير صالحة.', 400)
    allowed_fields = {
        'fullName', 'phone', 'address', 'specialty', 'governorate', 'studyYear',
        'studentStatus', 'status',
    }
    required_fields = allowed_fields - {'status', 'studyYear', 'governorate'}
    if (
        not isinstance(payload, dict)
        or not required_fields.issubset(payload)
        or not set(payload).issubset(allowed_fields)
    ):
        return _admin_api_error('بيانات الطالب غير صالحة.', 400)

    full_name = payload.get('fullName')
    if not isinstance(full_name, str):
        return _admin_api_error('اسم الطالب غير صالح.', 400)
    full_name = ' '.join(full_name.split())
    name_parts = full_name.split()
    if (
        not 3 <= len(name_parts) <= 6
        or any(
            not all(
                char.isalpha() or unicodedata.category(char).startswith('M')
                for char in part
            )
            for part in name_parts
        )
    ):
        return _admin_api_error('اسم الطالب غير صالح.', 400)

    phone = payload.get('phone')
    address = payload.get('address')
    specialty = payload.get('specialty')
    has_governorate = 'governorate' in payload
    governorate = payload.get('governorate')
    has_study_year = 'studyYear' in payload
    study_year = payload.get('studyYear')
    student_status = payload.get('studentStatus')
    request_status = payload.get('status')
    if not isinstance(phone, str) or not re.fullmatch(r'\+[0-9]{12}', phone):
        return _admin_api_error('رقم الهاتف غير صالح.', 400)
    normalized_phone = _normalized_inperson_student_phone(phone)
    if normalized_phone is None:
        return _admin_api_error(
            'رقم الهاتف يجب أن يبدأ بـ +970 أو +972 ويتضمن جوالاً يبدأ بـ 59 أو 56.',
            400,
        )
    if not isinstance(address, str) or not address.strip() or len(address.strip()) > 255:
        return _admin_api_error('العنوان غير صالح.', 400)
    if not isinstance(specialty, str) or not specialty.strip() or len(specialty.strip()) > 150:
        return _admin_api_error('التخصص غير صالح.', 400)
    if has_governorate and governorate not in ('gaza', 'central'):
        return _admin_api_error('المحافظة غير صالحة.', 400)
    if has_study_year and (
        isinstance(study_year, bool)
        or not isinstance(study_year, int)
        or not 1 <= study_year <= 4294967295
    ):
        return _admin_api_error('السنة الدراسية يجب أن تكون رقماً صحيحاً موجباً.', 400)
    if student_status not in ('', 'student', 'graduate'):
        return _admin_api_error('الحالة الدراسية غير صالحة.', 400)
    setup_token = None
    setup_expires_at = None
    referral_points_awarded = False
    try:
        with transaction.atomic():
            registration = (
                CourseRegistrationRequest.objects.select_for_update()
                .select_related('course', 'cohort', 'student', 'referral_link__referrer')
                .filter(
                    pk=pk,
                    course__course_type=CourseType.IN_PERSON,
                )
                .first()
            )
            if registration is None:
                return _admin_api_error('طلب التسجيل الوجاهي غير موجود.', 404)
            if request_status is None:
                request_status = registration.status
            if request_status not in CourseRegistrationRequestStatus.values:
                return _admin_api_error('حالة الطلب غير صالحة.', 400)

            if registration.student_id and User.objects.filter(
                phone=normalized_phone,
            ).exclude(pk=registration.student_id).exists():
                return _admin_api_error('رقم الهاتف مستخدم في حساب آخر.', 409)

            registration.full_name = full_name
            registration.phone = phone
            registration.address = address.strip()
            registration.specialty = specialty.strip()
            if has_governorate:
                registration.governorate = governorate
            if has_study_year:
                registration.study_year = study_year
            registration.student_status = student_status
            registration.status = request_status
            update_fields = [
                'full_name', 'phone', 'address', 'specialty', 'student_status', 'status',
            ]
            if has_study_year:
                update_fields.append('study_year')
            if has_governorate:
                update_fields.append('governorate')
            registration.save(update_fields=update_fields)

            student = None
            if registration.student_id or (
                request_status == CourseRegistrationRequestStatus.ACCEPTED
            ):
                student, issued_token, issued_expiry = _ensure_registration_student(
                    registration,
                    issue_missing_link=request_status == CourseRegistrationRequestStatus.ACCEPTED,
                )
                if request_status == CourseRegistrationRequestStatus.ACCEPTED:
                    setup_token = issued_token
                    setup_expires_at = issued_expiry

            if student:
                student.full_name = full_name[:150]
                student.phone = normalized_phone
                student.save(update_fields=['full_name', 'phone'])
                profile = Profile.objects.get(user=student)
                profile.whatsapp = phone
                profile_fields = ['whatsapp', 'updated_at']
                if student_status == 'graduate' and not profile.education_stage:
                    profile.education_stage = 'graduate'
                    profile_fields.append('education_stage')
                profile.save(update_fields=profile_fields)
            if request_status == CourseRegistrationRequestStatus.ACCEPTED:
                referral_points_awarded = award_referral_points_for_registration_request(
                    registration,
                )
    except ValidationError as exc:
        return _admin_api_error(exc.messages[0], 400)
    except IntegrityError:
        return _admin_api_error('رقم الهاتف مستخدم في حساب آخر.', 409)

    response_payload = _course_registration_request_payload(
        registration,
        referral_points_awarded=referral_points_awarded,
    )
    if setup_token:
        response_payload.update(
            _student_setup_link_payload(
                request,
                registration.student,
                setup_token,
                setup_expires_at,
            )
        )
    return JsonResponse({'ok': True, 'request': response_payload})


@require_POST
def course_registration_request_status(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return _admin_api_error('حالة الطلب غير صالحة.', 400)
    if not isinstance(payload, dict) or set(payload) != {'status'}:
        return _admin_api_error('حالة الطلب غير صالحة.', 400)

    status_order = [
        CourseRegistrationRequestStatus.NEW,
        CourseRegistrationRequestStatus.CONTACTED,
        CourseRegistrationRequestStatus.ACCEPTED,
        CourseRegistrationRequestStatus.REJECTED,
    ]
    requested_status = payload['status']
    if requested_status not in status_order:
        return _admin_api_error('حالة الطلب غير صالحة.', 400)

    setup_token = None
    setup_expires_at = None
    try:
        with transaction.atomic():
            registration = (
                CourseRegistrationRequest.objects.select_for_update()
                .select_related('course', 'cohort', 'referral_link__referrer')
                .filter(pk=pk)
                .first()
            )
            if registration is None:
                return _admin_api_error('طلب التسجيل غير موجود.', 404)
            current_index = status_order.index(registration.status)
            expected_status = status_order[(current_index + 1) % len(status_order)]
            if requested_status != expected_status:
                return _admin_api_error(
                    'حالة الطلب تغيّرت. حدّث الصفحة وحاول مرة أخرى.',
                    409,
                )
            if requested_status == CourseRegistrationRequestStatus.ACCEPTED:
                _, setup_token, setup_expires_at = _ensure_registration_student(registration)
            registration.status = requested_status
            registration.save(update_fields=['status'])
            referral_points_awarded = (
                award_referral_points_for_registration_request(registration)
                if requested_status == CourseRegistrationRequestStatus.ACCEPTED
                else False
            )
    except ValidationError as exc:
        return _admin_api_error(exc.messages[0], 400)

    payload = _course_registration_request_payload(
        registration,
        referral_points_awarded=referral_points_awarded,
    )
    if setup_token:
        payload.update(
            _student_setup_link_payload(request, registration.student, setup_token, setup_expires_at)
        )
    return JsonResponse({'ok': True, 'request': payload})


@require_POST
def course_registration_request_confirm(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        with transaction.atomic():
            registration = (
                CourseRegistrationRequest.objects.select_for_update()
                .select_related('course', 'cohort', 'referral_link__referrer')
                .filter(pk=pk)
                .first()
            )
            if registration is None:
                return _admin_api_error('طلب التسجيل غير موجود.', 404)
            if registration.status == CourseRegistrationRequestStatus.REJECTED:
                return _admin_api_error('لا يمكن تأكيد طلب مرفوض.', 409)
            _, setup_token, setup_expires_at = _ensure_registration_student(registration)
            if registration.status != CourseRegistrationRequestStatus.ACCEPTED:
                registration.status = CourseRegistrationRequestStatus.ACCEPTED
                registration.save(update_fields=['status'])
            referral_points_awarded = award_referral_points_for_registration_request(registration)
    except ValidationError as exc:
        return _admin_api_error(exc.messages[0], 400)

    response_payload = _course_registration_request_payload(
        registration,
        referral_points_awarded=referral_points_awarded,
    )
    if setup_token:
        response_payload.update(
            _student_setup_link_payload(request, registration.student, setup_token, setup_expires_at)
        )
    return JsonResponse({'ok': True, 'request': response_payload})


@require_POST
def course_registration_request_setup_link(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        with transaction.atomic():
            registration = (
                CourseRegistrationRequest.objects.select_for_update()
                .select_related('course', 'cohort', 'referral_link__referrer')
                .filter(pk=pk)
                .first()
            )
            if registration is None:
                return _admin_api_error('طلب التسجيل غير موجود.', 404)
            if registration.status != CourseRegistrationRequestStatus.ACCEPTED:
                return _admin_api_error('يجب تأكيد التسجيل قبل إصدار رابط الحساب.', 409)
            student, _, _ = _ensure_registration_student(
                registration,
                issue_missing_link=False,
            )
            if student.has_usable_password():
                return _admin_api_error(
                    'تم إعداد كلمة مرور هذا الحساب بالفعل ولا يحتاج إلى رابط إعداد جديد.',
                    409,
                )
            token, expires_at = _issue_student_setup_link(student)
    except ValidationError as exc:
        return _admin_api_error(exc.messages[0], 400)

    payload = _course_registration_request_payload(registration)
    payload.update(_student_setup_link_payload(request, student, token, expires_at))
    return JsonResponse({'ok': True, 'request': payload})


@require_POST
def course_registration_request_paid_amount(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return _admin_api_error('بيانات المبلغ المدفوع غير صالحة.', 400)
    if not isinstance(payload, dict) or set(payload) != {'amount'}:
        return _admin_api_error('بيانات المبلغ المدفوع غير صالحة.', 400)

    raw_amount = payload['amount']
    if isinstance(raw_amount, (str, int, float)) and not isinstance(raw_amount, bool):
        try:
            paid_amount = Decimal(str(raw_amount))
        except InvalidOperation:
            return _admin_api_error('أدخل مبلغاً صحيحاً.', 400)
        if (
            not paid_amount.is_finite()
            or paid_amount <= 0
            or paid_amount.as_tuple().exponent < -2
            or paid_amount >= Decimal('100000000')
        ):
            return _admin_api_error('يجب أن يكون المبلغ أكبر من صفر وبحد أقصى منزلتين عشريتين.', 400)
    else:
        return _admin_api_error('أدخل مبلغاً صحيحاً.', 400)

    with transaction.atomic():
        registration = (
            CourseRegistrationRequest.objects.select_for_update()
            .select_related('course', 'cohort', 'referral_link__referrer')
            .prefetch_related('payments')
            .filter(pk=pk)
            .first()
        )
        if registration is None:
            return _admin_api_error('طلب التسجيل غير موجود.', 404)
        if registration.status != CourseRegistrationRequestStatus.ACCEPTED:
            return _admin_api_error('يمكن تحديد المبلغ للطلبات المقبولة فقط.', 409)

        course_price = _course_registration_course_price(registration.course)
        if course_price is None:
            return _admin_api_error('حدد سعراً صالحاً للدورة قبل تسجيل الدفعات.', 409)

        total_paid = registration.payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        remaining_amount = course_price - total_paid
        if paid_amount > remaining_amount:
            return _admin_api_error('لا يمكن أن تتجاوز الدفعة المبلغ المتبقي.', 400)

        CourseRegistrationPayment.objects.create(
            registration_request=registration,
            amount=paid_amount,
        )
        registration._prefetched_objects_cache.pop('payments', None)

    return JsonResponse({
        'ok': True,
        'request': _course_registration_request_payload(registration),
    })


def _training_categories_payload():
    course_counts = dict(
        Course.objects.exclude(category='')
        .values('category')
        .annotate(total=Count('pk'))
        .values_list('category', 'total')
    )
    project_counts = dict(
        Project.objects.exclude(category='')
        .values('category')
        .annotate(total=Count('pk'))
        .values_list('category', 'total')
    )
    trainer_counts = dict(
        Profile.objects.filter(user__role=UserRole.TRAINER)
        .exclude(specialization='')
        .values('specialization')
        .annotate(total=Count('pk'))
        .values_list('specialization', 'total')
    )
    student_counts = dict(
        Profile.objects.filter(user__role=UserRole.STUDENT)
        .exclude(specialization='')
        .values('specialization')
        .annotate(total=Count('pk'))
        .values_list('specialization', 'total')
    )
    return [
        {
            'id': category.pk,
            'name': category.name,
            'display_order': category.display_order,
            'courses': course_counts.get(category.name, 0),
            'projects': project_counts.get(category.name, 0),
            'trainers': trainer_counts.get(category.name, 0),
            'students': student_counts.get(category.name, 0),
        }
        for category in TrainingCategory.objects.order_by(
            'display_order', 'name'
        )
    ]


@require_http_methods(['GET', 'POST'])
def training_categories(request):
    denied = _admin_api_user(request)
    if denied:
        return denied
    if request.method == 'GET':
        return JsonResponse({'ok': True, 'categories': _training_categories_payload()})

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)

    action = payload.get('action')
    if action == 'delete':
        try:
            category_id = int(payload.get('id'))
        except (TypeError, ValueError):
            return _admin_api_error('المجال التدريبي غير موجود.', 404)
        with transaction.atomic():
            category = TrainingCategory.objects.select_for_update().filter(pk=category_id).first()
            if category is None:
                return _admin_api_error('المجال التدريبي غير موجود.', 404)
            Course.objects.filter(category=category.name).update(category='')
            Project.objects.filter(category=category.name).update(category='')
            Profile.objects.filter(specialization=category.name).update(specialization='')
            original_order = category.display_order
            category.delete()
            if original_order is not None:
                TrainingCategory.objects.filter(display_order__gt=original_order).update(
                    display_order=models.F('display_order') - 1
                )
        return JsonResponse({'ok': True, 'id': category_id})

    if action == 'reorder':
        order = payload.get('order')
        if not isinstance(order, list) or not order:
            return _admin_api_error('ترتيب المجالات غير صالح.', 400)
        if any(not isinstance(category_id, str) for category_id in order):
            return _admin_api_error('ترتيب المجالات غير صالح.', 400)
        category_ids = [int(category_id) for category_id in order]
        if len(category_ids) != len(set(category_ids)):
            return _admin_api_error('لا يمكن تكرار المجالات في الترتيب.', 400)
        with transaction.atomic():
            categories = list(
                TrainingCategory.objects.select_for_update().filter(pk__in=category_ids)
            )
            if len(categories) != len(category_ids):
                return _admin_api_error('بعض المجالات غير موجودة.', 404)
            categories_by_id = {category.pk: category for category in categories}
            for position, category_id in enumerate(category_ids):
                categories_by_id[category_id].display_order = position
            TrainingCategory.objects.bulk_update(categories, ['display_order'])
        return JsonResponse({'ok': True, 'categories': _training_categories_payload()})

    if action not in ('create', 'update'):
        return _admin_api_error('نوع العملية غير صالح.', 400)
    name = payload.get('name')
    name = name.strip() if isinstance(name, str) else ''
    if not name or len(name) > 120:
        return _admin_api_error('أدخل اسم المجال، على ألا يتجاوز 120 حرفاً.', 400)

    try:
        with transaction.atomic():
            if action == 'create':
                if TrainingCategory.objects.filter(name__iexact=name).exists():
                    return _admin_api_error('هذا المجال التدريبي موجود بالفعل.', 409)
                max_order = TrainingCategory.objects.aggregate(
                    max_order=models.Max('display_order')
                )['max_order'] or 0
                category = TrainingCategory.objects.create(name=name, display_order=max_order + 1)
            else:
                try:
                    category_id = int(payload.get('id'))
                except (TypeError, ValueError):
                    return _admin_api_error('المجال التدريبي غير موجود.', 404)
                category = TrainingCategory.objects.select_for_update().filter(
                    pk=category_id
                ).first()
                if category is None:
                    return _admin_api_error('المجال التدريبي غير موجود.', 404)
                if TrainingCategory.objects.filter(name__iexact=name).exclude(
                    pk=category.pk
                ).exists():
                    return _admin_api_error('هذا المجال التدريبي موجود بالفعل.', 409)
                old_name = category.name
                if old_name != name:
                    Course.objects.filter(category=old_name).update(category=name)
                    Project.objects.filter(category=old_name).update(category=name)
                    Profile.objects.filter(specialization=old_name).update(
                        specialization=name
                    )
                    category.name = name
                    category.save(update_fields=['name'])
    except IntegrityError:
        return _admin_api_error('هذا المجال التدريبي موجود بالفعل.', 409)

    category_data = next(
        item for item in _training_categories_payload() if item['id'] == category.pk
    )
    return JsonResponse({'ok': True, 'category': category_data})


@require_POST
def admin_display_order(request):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return _admin_api_error('بيانات الترتيب غير صالحة.', 400)
    if not isinstance(payload, dict):
        return _admin_api_error('بيانات الترتيب غير صالحة.', 400)

    kind = payload.get('kind')
    order = payload.get('order')
    if kind not in ('courses', 'projects', 'trainers', 'students'):
        return _admin_api_error('نوع الترتيب غير صالح.', 400)
    if not isinstance(order, list) or any(
        not isinstance(item, str) or not item for item in order
    ):
        return _admin_api_error('قائمة الترتيب غير صالحة.', 400)
    if len(order) != len(set(order)):
        return _admin_api_error('لا يمكن تكرار العناصر في الترتيب.', 400)

    with transaction.atomic():
        if kind == 'courses':
            objects = list(Course.objects.select_for_update().order_by('pk'))
            id_for = lambda item: str(item.pk)
        elif kind == 'projects':
            objects = list(Project.objects.select_for_update().order_by('pk'))
            id_for = lambda item: str(item.pk)
        else:
            role = UserRole.TRAINER if kind == 'trainers' else UserRole.STUDENT
            users = list(
                User.objects.select_for_update()
                .filter(role=role)
                .order_by('pk')
            )
            user_ids = [user.pk for user in users]
            profiles_by_user = {
                profile.user_id: profile
                for profile in Profile.objects.select_for_update()
                .filter(user_id__in=user_ids)
            }
            missing_users = [
                user for user in users if user.pk not in profiles_by_user
            ]
            if missing_users:
                Profile.objects.bulk_create(
                    [Profile(user=user) for user in missing_users]
                )
                profiles_by_user.update({
                    profile.user_id: profile
                    for profile in Profile.objects.filter(
                        user_id__in=[user.pk for user in missing_users]
                    )
                })
            objects = [profiles_by_user[user.pk] for user in users]
            id_for = lambda item: str(item.user_id)

        by_id = {id_for(item): item for item in objects}
        if len(order) != len(objects) or set(order) != set(by_id):
            return _admin_api_error(
                'تغيّرت قائمة العناصر. حدّث الصفحة ثم حاول مجدداً.', 409
            )

        ordered = [by_id[item_id] for item_id in order]
        for position, item in enumerate(ordered):
            item.display_order = position
        if kind in ('courses', 'projects'):
            model = Course if kind == 'courses' else Project
            model.objects.bulk_update(ordered, ['display_order'])
        else:
            Profile.objects.bulk_update(ordered, ['display_order'])
            other_role = UserRole.STUDENT if kind == 'trainers' else UserRole.TRAINER
            other_profiles = list(
                Profile.objects.select_for_update()
                .filter(user__role=other_role)
                .order_by(
                    models.F('display_order').asc(nulls_last=True),
                    'user__date_joined',
                    'user_id',
                )
            )
            trainers = ordered if kind == 'trainers' else other_profiles
            students = other_profiles if kind == 'trainers' else ordered
            combined = trainers + students
            for position, profile in enumerate(combined):
                profile.display_order = position
            Profile.objects.bulk_update(combined, ['display_order'])

    return JsonResponse({'ok': True, 'kind': kind, 'order': order})


def _active_device_counts(user_ids):
    device_rows = list(
        DeviceSession.objects.filter(user_id__in=user_ids)
        .exclude(session_key='')
        .values_list('user_id', 'session_key')
    )
    if not device_rows:
        return {}
    live_keys = set(
        Session.objects.filter(
            session_key__in=[session_key for _, session_key in device_rows],
            expire_date__gt=timezone.now(),
        ).values_list('session_key', flat=True)
    )
    counts = {}
    for user_id, session_key in device_rows:
        if session_key in live_keys:
            counts[user_id] = counts.get(user_id, 0) + 1
    return counts


@require_http_methods(['GET', 'POST'])
def student_sessions(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    student = User.objects.filter(pk=pk, role=UserRole.STUDENT).first()
    if student is None:
        return _admin_api_error('الطالب غير موجود.', 404)

    if request.method == 'GET':
        rows = list(
            DeviceSession.objects.filter(user=student)
            .exclude(session_key='')
            .order_by('-last_seen')
        )
        live_keys = set(
            Session.objects.filter(
                session_key__in=[row.session_key for row in rows],
                expire_date__gt=timezone.now(),
            ).values_list('session_key', flat=True)
        )
        active_rows = [row for row in rows if row.session_key in live_keys]
        return JsonResponse({
            'ok': True,
            'activeDevices': len(active_rows),
            'sessions': [
                {
                    'id': row.pk,
                    'userAgent': row.user_agent,
                    'ip': row.ip or '',
                    'createdAt': row.created_at.isoformat(),
                    'lastSeen': row.last_seen.isoformat(),
                }
                for row in active_rows
            ],
        })

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or set(payload) - {'deviceSessionId', 'all'}:
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)

    with transaction.atomic():
        devices = DeviceSession.objects.select_for_update().filter(user=student)
        if payload.get('all') is True:
            selected = list(devices)
        else:
            device_session_id = payload.get('deviceSessionId')
            if not isinstance(device_session_id, int) or isinstance(device_session_id, bool):
                return _admin_api_error('جلسة الجهاز غير صالحة.', 400)
            selected = list(devices.filter(pk=device_session_id))
            if not selected:
                return _admin_api_error('جلسة الجهاز غير موجودة.', 404)
        session_keys = [row.session_key for row in selected if row.session_key]
        Session.objects.filter(session_key__in=session_keys).delete()
        devices.filter(pk__in=[row.pk for row in selected]).delete()

    return JsonResponse({
        'ok': True,
        'activeDevices': _active_device_counts([student.pk]).get(student.pk, 0),
    })


def _workshop_data(workshop):
    import qrcode

    image = BytesIO()
    qrcode.make(str(workshop.qr_token)).save(image, format='PNG')
    qr_image = 'data:image/png;base64,' + base64.b64encode(image.getvalue()).decode('ascii')
    return {
        'id': workshop.pk,
        'title': workshop.title,
        'titleEnglish': workshop.title_en,
        'trainerName': workshop.trainer_name,
        'trainerNameEnglish': workshop.trainer_name_en,
        'description': workshop.description,
        'descriptionEnglish': workshop.description_en,
        'startsAt': workshop.starts_at.isoformat(),
        'durationMinutes': workshop.duration_minutes,
        'location': workshop.location,
        'locationEnglish': workshop.location_en,
        'attendanceOpen': workshop.attendance_open,
        'qrImage': qr_image,
        'attendeesCount': workshop.attendees_count
        if hasattr(workshop, 'attendees_count')
        else workshop.attendances.count(),
    }


@require_POST
def workshop_save(request):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('بيانات الورشة غير صالحة.', 400)
    if not isinstance(payload, dict) or set(payload) - {
        'id', 'title', 'titleEnglish', 'trainerName', 'trainerNameEnglish',
        'description', 'descriptionEnglish', 'startsAt', 'durationMinutes',
        'location', 'locationEnglish'
    }:
        return _admin_api_error('بيانات الورشة غير صالحة.', 400)

    title = payload.get('title')
    trainer_name = payload.get('trainerName')
    title_en = payload.get('titleEnglish')
    trainer_name_en = payload.get('trainerNameEnglish')
    description = payload.get('description', '')
    description_en = payload.get('descriptionEnglish')
    location = payload.get('location', '')
    location_en = payload.get('locationEnglish')
    try:
        starts_at = (
            parse_datetime(payload.get('startsAt', ''))
            if isinstance(payload.get('startsAt'), str)
            else None
        )
    except ValueError:
        starts_at = None
    duration = payload.get('durationMinutes')
    if (
        not isinstance(title, str) or not title.strip() or len(title.strip()) > 200
        or not isinstance(trainer_name, str) or not trainer_name.strip()
        or len(trainer_name.strip()) > 200
        or (title_en is not None and (
            not isinstance(title_en, str) or len(title_en.strip()) > 200
        ))
        or (trainer_name_en is not None and (
            not isinstance(trainer_name_en, str) or len(trainer_name_en.strip()) > 200
        ))
        or not isinstance(description, str) or len(description) > 4000
        or (description_en is not None and (
            not isinstance(description_en, str) or len(description_en) > 4000
        ))
        or not isinstance(location, str) or len(location.strip()) > 200
        or (location_en is not None and (
            not isinstance(location_en, str) or len(location_en.strip()) > 200
        ))
        or starts_at is None
        or isinstance(duration, bool) or not isinstance(duration, int) or not 1 <= duration <= 1440
    ):
        return _admin_api_error('تحقق من عنوان الورشة واسم المدرب وموعدها ومدتها.', 400)
    if timezone.is_naive(starts_at):
        starts_at = timezone.make_aware(starts_at, timezone.get_current_timezone())

    workshop_id = payload.get('id')
    if workshop_id is not None and (
        isinstance(workshop_id, bool) or not str(workshop_id).isdigit()
    ):
        return _admin_api_error('الورشة غير موجودة.', 404)
    if workshop_id is not None:
        try:
            with transaction.atomic():
                workshop = InPersonWorkshop.objects.select_for_update().get(pk=workshop_id)
                workshop.title = title.strip()
                if title_en is not None:
                    workshop.title_en = title_en.strip()
                workshop.trainer_name = trainer_name.strip()
                if trainer_name_en is not None:
                    workshop.trainer_name_en = trainer_name_en.strip()
                workshop.description = description.strip()
                if description_en is not None:
                    workshop.description_en = description_en.strip()
                workshop.starts_at = starts_at
                workshop.duration_minutes = duration
                workshop.location = location.strip()
                if location_en is not None:
                    workshop.location_en = location_en.strip()
                workshop.save(update_fields=[
                    'title', 'title_en', 'trainer_name', 'trainer_name_en',
                    'description', 'description_en', 'starts_at', 'duration_minutes',
                    'location', 'location_en', 'updated_at',
                ])
                WorkshopCertificate.objects.filter(
                    attendance__workshop=workshop,
                    trainer_name='',
                ).update(trainer_name=workshop.trainer_name)
                WorkshopCertificate.objects.filter(
                    attendance__workshop=workshop,
                    trainer_name_en='',
                ).update(trainer_name_en=workshop.trainer_name_en)
                WorkshopCertificate.objects.filter(
                    attendance__workshop=workshop,
                    workshop_title_en='',
                ).update(workshop_title_en=workshop.title_en)
        except InPersonWorkshop.DoesNotExist:
            return _admin_api_error('الورشة غير موجودة.', 404)
        status = 200
    else:
        workshop = InPersonWorkshop.objects.create(
            title=title.strip(),
            title_en=title_en.strip() if title_en is not None else '',
            trainer_name=trainer_name.strip(),
            trainer_name_en=trainer_name_en.strip() if trainer_name_en is not None else '',
            description=description.strip(),
            description_en=description_en.strip() if description_en is not None else '',
            starts_at=starts_at,
            duration_minutes=duration,
            location=location.strip(),
            location_en=location_en.strip() if location_en is not None else '',
        )
        status = 201
    return JsonResponse({'ok': True, 'workshop': _workshop_data(workshop)}, status=status)


@require_http_methods(['GET'])
def workshop_attendees(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    if not str(pk).isdigit():
        return _admin_api_error('الورشة غير موجودة.', 404)
    if not InPersonWorkshop.objects.filter(pk=pk).exists():
        return _admin_api_error('الورشة غير موجودة.', 404)
    attendees = WorkshopAttendance.objects.filter(workshop_id=pk).select_related(
        'student'
    ).order_by('-attended_at', '-pk')
    return JsonResponse({
        'ok': True,
        'attendees': [
            {
                'name': attendance.student.display_name,
                'handle': attendance.student.handle,
                'attendedAt': attendance.attended_at.isoformat(),
            }
            for attendance in attendees
        ],
    })


@require_POST
def workshop_attendance_status(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('حالة التسجيل غير صالحة.', 400)
    if not isinstance(payload, dict) or not isinstance(payload.get('open'), bool):
        return _admin_api_error('حالة التسجيل غير صالحة.', 400)
    if not str(pk).isdigit():
        return _admin_api_error('الورشة غير موجودة.', 404)
    try:
        with transaction.atomic():
            workshop = InPersonWorkshop.objects.select_for_update().get(pk=pk)
            workshop.attendance_open = payload['open']
            workshop.save(update_fields=['attendance_open', 'updated_at'])
    except InPersonWorkshop.DoesNotExist:
        return _admin_api_error('الورشة غير موجودة.', 404)
    return JsonResponse({'ok': True, 'attendanceOpen': workshop.attendance_open})


@require_POST
def workshop_regenerate_qr(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    if not str(pk).isdigit():
        return _admin_api_error('الورشة غير موجودة.', 404)
    try:
        with transaction.atomic():
            workshop = InPersonWorkshop.objects.select_for_update().get(pk=pk)
            workshop.qr_token = uuid4()
            workshop.attendance_open = False
            workshop.save(update_fields=['qr_token', 'attendance_open', 'updated_at'])
    except InPersonWorkshop.DoesNotExist:
        return _admin_api_error('الورشة غير موجودة.', 404)
    return JsonResponse({
        'ok': True,
        'workshop': _workshop_data(workshop),
    })


@require_POST
def workshop_delete(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    if not str(pk).isdigit():
        return _admin_api_error('الورشة غير موجودة.', 404)
    deleted, _ = InPersonWorkshop.objects.filter(pk=pk).delete()
    if not deleted:
        return _admin_api_error('الورشة غير موجودة.', 404)
    return JsonResponse({'ok': True})


@require_POST
def workshop_attendance_scan(request):
    if not request.user.is_authenticated:
        return _admin_api_error('سجّل الدخول أولاً لتسجيل حضورك.', 401)
    if request.user.role != UserRole.STUDENT or not request.user.is_active:
        return _admin_api_error('تسجيل الحضور متاح للطلاب النشطين فقط.', 403)
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('رمز الورشة غير صالح.', 400)
    if not isinstance(payload, dict) or not isinstance(payload.get('token'), str):
        return _admin_api_error('رمز الورشة غير صالح.', 400)
    try:
        token = str(UUID(payload['token']))
    except (ValueError, TypeError, AttributeError):
        return _admin_api_error('رمز الورشة غير صالح.', 400)

    try:
        with transaction.atomic():
            workshop = InPersonWorkshop.objects.select_for_update().filter(qr_token=token).first()
            if workshop is None:
                return _admin_api_error('رمز الورشة غير صالح أو تم تجديده.', 400)
            if not workshop.attendance_open:
                return _admin_api_error('التسجيل مغلق لهذه الورشة حالياً.', 409)
            attendance, created = WorkshopAttendance.objects.get_or_create(
                workshop=workshop,
                student=request.user,
            )
            certificate, _ = WorkshopCertificate.objects.get_or_create(
                attendance=attendance,
                defaults={
                    'workshop_title': workshop.title,
                    'workshop_title_en': workshop.title_en,
                    'trainer_name': workshop.trainer_name,
                    'trainer_name_en': workshop.trainer_name_en,
                    'student_name': request.user.display_name,
                    'attended_on': timezone.localtime(workshop.starts_at).date(),
                    'duration_minutes': workshop.duration_minutes,
                },
            )
    except IntegrityError:
        attendance = WorkshopAttendance.objects.get(
            workshop__qr_token=token,
            student=request.user,
        )
        certificate = WorkshopCertificate.objects.get(attendance=attendance)
        created = False
    return JsonResponse({
        'ok': True,
        'alreadyRegistered': not created,
        'message': 'تم تسجيل حضورك وإصدار شهادتك.' if created else 'حضورك مسجل مسبقاً.',
        'certificate': certificate.to_public_dict(),
    }, status=201 if created else 200)


def _trainer_profile(trainer):
    try:
        return trainer.profile
    except Profile.DoesNotExist:
        return None


def _trainer_avatar_data(value, profile):
    if not value:
        return None
    if profile.avatar and value == profile.avatar.url:
        return None

    match = AVATAR_RE.fullmatch(value)
    if not match or len(value) > MAX_AVATAR_BYTES * 2:
        raise ValueError('الصورة غير صالحة أو حجمها أكبر من 4 ميغابايت.')

    try:
        data = base64.b64decode(match.group(2), validate=True)
    except binascii.Error as exc:
        raise ValueError('تعذر قراءة الصورة المرفوعة.') from exc
    if not data or len(data) > MAX_AVATAR_BYTES:
        raise ValueError('الصورة غير صالحة أو حجمها أكبر من 4 ميغابايت.')

    try:
        from PIL import Image

        image = Image.open(BytesIO(data))
        image.verify()
    except (ImportError, OSError, ValueError) as exc:
        raise ValueError('الملف المرفوع ليس صورة صالحة.') from exc
    if image.format.lower() != match.group(1):
        raise ValueError('نوع ملف الصورة غير مطابق لمحتواها.')
    return ContentFile(data, name=f'trainer-{uuid4().hex}.{AVATAR_TYPES[match.group(1)]}')


def _admin_legal_name_values(payload, user, errors):
    full_name_ar = str(
        payload.get('fullNameArabic', user.full_name_ar) or ''
    ).strip()
    full_name_en = str(
        payload.get('fullNameEnglish', user.full_name_en) or ''
    ).strip()
    if bool(full_name_ar) != bool(full_name_en):
        message = 'يجب إدخال الاسم العربي والإنجليزي معاً.'
        errors['fullNameArabic'] = message
        errors['fullNameEnglish'] = message
    elif full_name_ar:
        for key, value, validator in (
            ('fullNameArabic', full_name_ar, validate_arabic_three_part_name),
            ('fullNameEnglish', full_name_en, validate_english_three_part_name),
        ):
            try:
                validator(value)
            except ValidationError as exc:
                errors[key] = ' '.join(exc.messages)

    if user.pk:
        for key, original, value in (
            ('fullNameArabic', user.full_name_ar, full_name_ar),
            ('fullNameEnglish', user.full_name_en, full_name_en),
        ):
            if original and original != value:
                errors[key] = 'لا يمكن تعديل الاسم بعد حفظه.'
    return full_name_ar, full_name_en


@require_POST
def trainer_save(request):
    denied = _admin_api_user(request)
    if denied:
        return denied

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)

    trainer_id = payload.get('id')
    if trainer_id:
        try:
            trainer = User.objects.get(pk=trainer_id, role=UserRole.TRAINER)
        except (User.DoesNotExist, ValueError, TypeError):
            return _admin_api_error('المدرب غير موجود.', 404)
        is_new = False
    else:
        trainer = User()
        is_new = True

    name = str(payload.get('name') or '').strip()
    handle = (
        str(payload.get('handle') or '').strip()
        if 'handle' in payload
        else (trainer.handle if not is_new else '')
    )
    phone = str(payload.get('phone') or '').strip()
    whatsapp = str(payload.get('whatsapp') or '').strip()
    email = str(payload.get('email') or '').strip()
    specialty = str(payload.get('specialty') or '').strip()
    bio = str(payload.get('bio') or '').strip() if 'bio' in payload else None
    errors = {}
    full_name_ar, full_name_en = _admin_legal_name_values(payload, trainer, errors)

    if not name or len(name) > 150:
        errors['name'] = 'أدخل الاسم، على ألا يتجاوز 150 حرفاً.'
    if len(handle) > 40:
        errors['handle'] = 'يجب ألا يتجاوز المعرّف 40 حرفاً.'
    elif handle and User.objects.filter(handle=handle).exclude(pk=trainer.pk).exists():
        errors['handle'] = 'هذا المعرّف مستخدم بالفعل.'
    if not PHONE_RE.fullmatch(phone):
        errors['phone'] = 'رقم الجوال يجب أن يتكوّن من 10 أرقام.'
    elif User.objects.filter(phone=phone).exclude(pk=trainer.pk).exists():
        errors['phone'] = 'رقم الجوال مستخدم بالفعل.'
    if 'whatsapp' in payload and whatsapp and not re.fullmatch(r'\+?[0-9]{1,12}', whatsapp):
        errors['whatsapp'] = 'أدخل + اختيارياً ثم من 1 إلى 12 رقماً.'
    if len(specialty) > 150 or not specialty:
        errors['specialty'] = 'أدخل التخصص، على ألا يتجاوز 150 حرفاً.'
    if len(email) > 254:
        errors['email'] = 'البريد الإلكتروني طويل جداً.'
    elif email:
        try:
            EmailValidator()(email)
        except ValidationError:
            errors['email'] = 'أدخل بريداً إلكترونياً صحيحاً.'

    profile = Profile() if is_new else (_trainer_profile(trainer) or Profile())
    if 'rating' in payload:
        try:
            rating = Decimal(str(payload.get('rating') or '0'))
            if not rating.is_finite() or rating < 0 or rating > 5 or rating.as_tuple().exponent < -1:
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            errors['rating'] = 'يجب أن يكون التقييم بين 0 و5 وبحد أقصى منزلة عشرية واحدة.'
    else:
        rating = profile.trainer_rating

    links = {
        platform: str(payload.get(key) or '').strip()
        for key, platform in (
            ('linkedin', SocialPlatform.LINKEDIN),
            ('github', SocialPlatform.GITHUB),
        )
        if key in payload
    }
    for platform, url in links.items():
        if url:
            if len(url) > 200:
                errors[platform] = 'الرابط طويل جداً.'
            else:
                try:
                    URLValidator(schemes=['http', 'https'])(url)
                except ValidationError:
                    errors[platform] = 'أدخل رابطاً كاملاً يبدأ بـ https:// أو http://.'

    password = str(payload.get('password') or '')
    if is_new:
        if not password:
            errors['password'] = 'كلمة المرور مطلوبة لإنشاء حساب المدرب.'
    if password:
        try:
            validate_password(password, trainer)
        except ValidationError as exc:
            errors['password'] = ' '.join(exc.messages)

    avatar_file = None
    try:
        avatar_file = _trainer_avatar_data(str(payload.get('avatar') or ''), profile)
    except ValueError as exc:
        errors['avatar'] = str(exc)

    joined = str(payload.get('joined') or '').strip()
    joined_date = None
    if joined:
        try:
            joined_date = date.fromisoformat(joined)
        except ValueError:
            errors['joined'] = 'تاريخ الانضمام غير صالح.'

    if errors:
        return JsonResponse({'ok': False, 'message': 'تحقق من البيانات المدخلة.', 'fields': errors}, status=400)

    active_status = payload.get('status', 'active')
    if active_status not in ('active', 'paused'):
        return _admin_api_error('حالة الحساب غير صالحة.', 400)
    verified = payload.get('verified', True)
    if not isinstance(verified, bool):
        return _admin_api_error('قيمة التوثيق غير صالحة.', 400)

    try:
        with transaction.atomic():
            trainer.full_name = name
            trainer.full_name_ar = full_name_ar
            trainer.full_name_en = full_name_en
            trainer.handle = handle
            trainer.phone = phone
            trainer.email = email
            trainer.role = UserRole.TRAINER
            trainer.is_active = active_status == 'active'
            trainer.is_verified = verified
            if joined_date:
                trainer.date_joined = timezone.make_aware(datetime.combine(joined_date, time.min))
            if password:
                trainer.set_password(password)
            trainer.save()

            profile, _ = Profile.objects.get_or_create(user=trainer)
            profile.specialization = specialty
            if bio is not None:
                profile.bio = bio
            profile.trainer_rating = rating
            if 'whatsapp' in payload:
                profile.whatsapp = whatsapp
            if avatar_file:
                profile.avatar.save(avatar_file.name, avatar_file, save=False)
            elif not payload.get('avatar') and profile.avatar:
                profile.avatar.delete(save=False)
            profile.save()

            for platform, url in links.items():
                if url:
                    SocialLink.objects.update_or_create(
                        profile=profile, platform=platform, defaults={'url': url}
                    )
                else:
                    SocialLink.objects.filter(profile=profile, platform=platform).delete()
    except IntegrityError:
        return _admin_api_error('رقم الجوال أو المعرّف مستخدم بالفعل.', 409)

    trainer = (
        User.objects.filter(pk=trainer.pk)
        .select_related('profile')
        .prefetch_related('profile__social_links')
        .annotate(courses_count=Count('courses', distinct=True))
        .get()
    )
    return JsonResponse({'ok': True, 'trainer': PanelView._trainer_data(trainer)}, status=201 if is_new else 200)


@require_POST
def student_save(request):
    denied = _admin_api_user(request)
    if denied:
        return denied

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)

    student_id = payload.get('id')
    if student_id:
        try:
            student = User.objects.get(pk=student_id, role=UserRole.STUDENT)
        except (User.DoesNotExist, ValueError, TypeError):
            return _admin_api_error('الطالب غير موجود.', 404)
        is_new = False
    else:
        student = User()
        is_new = True

    name = str(payload.get('name') or '').strip()
    handle = (
        str(payload.get('handle') or '').strip()
        if 'handle' in payload
        else (student.handle if not is_new else '')
    )
    phone = str(payload.get('phone') or '').strip()
    email = str(payload.get('email') or '').strip()
    bio = str(payload.get('bio') or '').strip() if 'bio' in payload else None
    password = str(payload.get('password') or '')
    errors = {}
    full_name_ar, full_name_en = _admin_legal_name_values(payload, student, errors)

    if not name or len(name) > 150:
        errors['name'] = 'أدخل الاسم، على ألا يتجاوز 150 حرفاً.'
    if len(handle) > 40:
        errors['handle'] = 'يجب ألا يتجاوز المعرّف 40 حرفاً.'
    elif handle and User.objects.filter(handle=handle).exclude(pk=student.pk).exists():
        errors['handle'] = 'هذا المعرّف مستخدم بالفعل.'
    if not PHONE_RE.fullmatch(phone):
        errors['phone'] = 'رقم الجوال يجب أن يتكوّن من 10 أرقام.'
    elif User.objects.filter(phone=phone).exclude(pk=student.pk).exists():
        errors['phone'] = 'رقم الجوال مستخدم بالفعل.'
    if len(email) > 254:
        errors['email'] = 'البريد الإلكتروني طويل جداً.'
    elif email:
        try:
            EmailValidator()(email)
        except ValidationError:
            errors['email'] = 'أدخل بريداً إلكترونياً صحيحاً.'
    if not password and is_new:
        errors['password'] = 'كلمة المرور مطلوبة لإنشاء حساب الطالب.'
    if password:
        try:
            validate_password(password, student)
        except ValidationError as exc:
            errors['password'] = ' '.join(exc.messages)

    status = payload.get('status', 'active')
    if status not in ('active', 'suspended'):
        return _admin_api_error('حالة الحساب غير صالحة.', 400)
    verified = payload.get('verified', False)
    if not isinstance(verified, bool):
        return _admin_api_error('قيمة التوثيق غير صالحة.', 400)

    profile = Profile() if is_new else (_trainer_profile(student) or Profile())
    try:
        avatar_file = _trainer_avatar_data(str(payload.get('avatar') or ''), profile)
    except ValueError as exc:
        errors['avatar'] = str(exc)
        avatar_file = None

    if errors:
        return JsonResponse(
            {'ok': False, 'message': 'تحقق من البيانات المدخلة.', 'fields': errors},
            status=400,
        )

    try:
        with transaction.atomic():
            student.full_name = name
            student.full_name_ar = full_name_ar
            student.full_name_en = full_name_en
            if handle:
                student.handle = handle
            student.phone = phone
            student.email = email
            student.role = UserRole.STUDENT
            student.is_active = status == 'active'
            student.is_verified = verified
            if password:
                student.set_password(password)
            student.save()

            profile, _ = Profile.objects.get_or_create(user=student)
            if bio is not None:
                profile.bio = bio
            if avatar_file:
                profile.avatar.save(avatar_file.name, avatar_file, save=False)
            elif not payload.get('avatar') and profile.avatar:
                profile.avatar.delete(save=False)
            profile.save()
    except IntegrityError:
        return _admin_api_error('رقم الجوال أو المعرّف مستخدم بالفعل.', 409)

    profile = _trainer_profile(student)
    return JsonResponse({
        'ok': True,
        'student': {
            'id': f'db-user-{student.pk}',
            'databaseId': str(student.pk),
            'name': student.display_name,
            'fullNameArabic': student.full_name_ar,
            'fullNameEnglish': student.full_name_en,
            'fullNameArabic': student.full_name_ar,
            'fullNameEnglish': student.full_name_en,
            'handle': student.handle,
            'email': student.email,
            'phone': student.phone,
            'role': UserRole.STUDENT,
            'status': 'active' if student.is_active else 'suspended',
            'verified': student.is_verified,
            'joined': student.date_joined.isoformat(),
            'lastActive': student.last_login.isoformat() if student.last_login else '',
            'bio': profile.bio if profile else '',
            'avatar': profile.avatar.url if profile and profile.avatar else '',
            'showReferralStats': profile.show_referral_stats if profile else False,
        },
    }, status=201 if is_new else 200)


@require_POST
def trainer_set_active(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or not isinstance(payload.get('active'), bool):
        return _admin_api_error('حالة الحساب غير صالحة.', 400)
    try:
        trainer = User.objects.get(pk=pk, role=UserRole.TRAINER)
    except (User.DoesNotExist, ValueError, TypeError):
        return _admin_api_error('المدرب غير موجود.', 404)
    trainer.is_active = payload['active']
    trainer.save(update_fields=['is_active'])
    return JsonResponse({'ok': True, 'active': trainer.is_active})


@require_POST
def trainer_set_content_permission(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or not isinstance(payload.get('allowed'), bool):
        return _admin_api_error('حالة صلاحية النشر غير صالحة.', 400)
    try:
        trainer = User.objects.get(pk=pk, role=UserRole.TRAINER)
    except (User.DoesNotExist, ValueError, TypeError):
        return _admin_api_error('المدرب غير موجود.', 404)
    trainer.can_publish_content = payload['allowed']
    trainer.save(update_fields=['can_publish_content'])
    return JsonResponse({'ok': True, 'canPublishContent': trainer.can_publish_content})


@require_POST
def student_set_active(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or not isinstance(payload.get('active'), bool):
        return _admin_api_error('حالة الحساب غير صالحة.', 400)
    try:
        student = User.objects.get(pk=pk, role=UserRole.STUDENT)
    except (User.DoesNotExist, ValueError, TypeError):
        return _admin_api_error('الطالب غير موجود.', 404)
    student.is_active = payload['active']
    student.save(update_fields=['is_active'])
    return JsonResponse({'ok': True, 'active': student.is_active})


@require_POST
def student_referral_stats_visibility(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or not isinstance(payload.get('visible'), bool):
        return _admin_api_error('حالة إظهار إحصاءات الإحالة غير صالحة.', 400)
    try:
        student = User.objects.get(pk=pk, role=UserRole.STUDENT)
    except (User.DoesNotExist, ValueError, TypeError):
        return _admin_api_error('الطالب غير موجود.', 404)

    profile, _ = Profile.objects.get_or_create(user=student)
    profile.show_referral_stats = payload['visible']
    profile.save(update_fields=['show_referral_stats', 'updated_at'])
    return JsonResponse({
        'ok': True,
        'showReferralStats': profile.show_referral_stats,
    })


@require_POST
def student_reset_referral_points(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        with transaction.atomic():
            student = User.objects.select_for_update().get(
                pk=pk,
                role=UserRole.STUDENT,
            )
            balance = (
                StudentPointTransaction.objects.filter(student=student)
                .aggregate(total=Sum('points'))['total']
                or 0
            )
            if balance:
                last_transaction = (
                    StudentPointTransaction.objects.filter(student=student)
                    .order_by('-created_at', '-pk')
                    .first()
                )
                if last_transaction is None:
                    return _admin_api_error('تعذر تحديد حركة النقاط لتسجيل التصفير.', 409)
                StudentPointTransaction.objects.create(
                    student=student,
                    course=last_transaction.course,
                    points=-balance,
                    kind=StudentPointTransaction.Kind.RESET,
                    reset_by=request.user,
                )
    except (User.DoesNotExist, ValueError, TypeError):
        return _admin_api_error('الطالب غير موجود.', 404)

    return JsonResponse({'ok': True, 'points': 0})


@require_POST
def student_redeem_referral_points(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    course_slug = payload.get('courseId')
    if not isinstance(course_slug, str) or not course_slug.strip():
        return _admin_api_error('اختر دورة صالحة.', 400)

    try:
        with transaction.atomic():
            student = User.objects.select_for_update().get(
                pk=pk,
                role=UserRole.STUDENT,
            )
            course = Course.objects.get(
                slug=course_slug.strip(),
                status=CourseStatus.PUBLISHED,
            )
            if not course.is_paid:
                return _admin_api_error('يمكن استبدال النقاط في الدورات المدفوعة فقط.', 400)
            if CourseProgress.objects.filter(student=student, course=course).exists():
                return _admin_api_error('الطالب مسجل في هذه الدورة بالفعل.', 409)
            balance = (
                StudentPointTransaction.objects.filter(student=student)
                .aggregate(total=Sum('points'))['total']
                or 0
            )
            if balance < 100:
                return _admin_api_error('يحتاج الطالب إلى 100 نقطة على الأقل.', 400)

            CourseProgress.objects.create(student=student, course=course)
            redemption = StudentPointTransaction.objects.create(
                student=student,
                course=course,
                points=-100,
                kind=StudentPointTransaction.Kind.REDEMPTION,
            )
    except (User.DoesNotExist, ValueError, TypeError):
        return _admin_api_error('الطالب غير موجود.', 404)
    except Course.DoesNotExist:
        return _admin_api_error('الدورة غير موجودة أو غير منشورة.', 404)
    except IntegrityError:
        if CourseProgress.objects.filter(
            student_id=pk,
            course__slug=course_slug.strip(),
        ).exists():
            return _admin_api_error('الطالب مسجل في هذه الدورة بالفعل.', 409)
        raise

    return JsonResponse({
        'ok': True,
        'points': balance - 100,
        'redemption': {
            'id': str(redemption.pk),
            'studentName': student.display_name,
            'studentHandle': student.handle,
            'courseTitle': course.title,
            'points': 100,
            'date': redemption.created_at.isoformat(),
        },
    })


@require_POST
def course_student_remove(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        with transaction.atomic():
            progress = CourseProgress.objects.select_for_update().get(pk=pk)
            course = progress.course
            CourseCertificate.objects.filter(
                student_id=progress.student_id,
                course_id=progress.course_id,
            ).delete()
            progress.delete()
    except CourseProgress.DoesNotExist:
        return _admin_api_error('سجل الطالب في هذه الدورة غير موجود.', 404)
    return JsonResponse({'ok': True, 'enrolledCount': course.progress.count()})


@require_http_methods(['GET', 'POST'])
def course_students(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied

    course = Course.objects.filter(slug=pk).first()
    if course is None and pk.isdigit():
        course = Course.objects.filter(pk=pk).first()
    if course is None:
        return _admin_api_error('الدورة غير موجودة.', 404)

    def progress_data(progress):
        student = progress.student
        profile = _trainer_profile(student)
        return {
            'id': str(progress.pk),
            'courseId': course.slug,
            'userId': str(student.pk),
            'user': {
                'id': str(student.pk),
                'name': student.display_name,
                'handle': student.handle,
                'avatar': profile.avatar.url if profile and profile.avatar else '',
                'role': student.role,
            },
            'completedIds': progress.completed_ids or [],
            'completed': progress.completed,
            'joinedAt': progress.created_at.isoformat(),
            'updatedAt': progress.updated_at.isoformat(),
            'progress': progress.percent,
        }

    if request.method == 'GET':
        query = request.GET.get('q', '').strip()[:100]
        students = User.objects.none()
        if len(query) >= 2:
            students = (
                User.objects.filter(role=UserRole.STUDENT)
                .filter(
                    Q(full_name__icontains=query)
                    | Q(handle__icontains=query)
                    | Q(phone__icontains=query)
                    | Q(email__icontains=query)
                )
                .exclude(course_progress__course=course)
                .select_related('profile')
                .order_by('full_name', 'pk')[:20]
            )
        results = []
        for student in students:
            profile = _trainer_profile(student)
            results.append({
                'id': str(student.pk),
                'name': student.display_name,
                'handle': student.handle,
                'avatar': profile.avatar.url if profile and profile.avatar else '',
            })
        enrollments = (
            CourseProgress.objects.filter(course=course)
            .select_related('student', 'student__profile')
            .order_by('created_at', 'pk')
        )
        return JsonResponse({
            'ok': True,
            'results': results,
            'enrolled': [progress_data(progress) for progress in enrollments],
            'enrolledCount': enrollments.count(),
        })

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or not str(payload.get('studentId') or '').isdigit():
        return _admin_api_error('الطالب غير صالح.', 400)

    student = User.objects.filter(
        pk=payload['studentId'],
        role=UserRole.STUDENT,
    ).select_related('profile').first()
    if student is None:
        return _admin_api_error('الطالب غير موجود.', 404)

    progress, created = CourseProgress.objects.get_or_create(
        student=student,
        course=course,
    )
    award_referral_points_for_enrollment(student, course)
    enrollments = (
        CourseProgress.objects.filter(course=course)
        .select_related('student', 'student__profile')
        .order_by('created_at', 'pk')
    )
    return JsonResponse({
        'ok': True,
        'created': created,
        'progress': progress_data(progress),
        'enrolled': [progress_data(enrolled) for enrolled in enrollments],
        'enrolledCount': enrollments.count(),
    }, status=201 if created else 200)


@require_POST
def course_set_active(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or not isinstance(payload.get('active'), bool):
        return _admin_api_error('حالة الدورة غير صالحة.', 400)
    try:
        with transaction.atomic():
            course = Course.objects.select_for_update().get(pk=pk)
            if payload['active'] and not course.title.strip():
                return _admin_api_error('لا يمكن تفعيل دورة دون عنوان.', 400)
            course.status = CourseStatus.PUBLISHED if payload['active'] else CourseStatus.DRAFT
            course.save(update_fields=['status', 'updated_at'])
            cohort = None
            if course.course_type == CourseType.IN_PERSON:
                cohort = (
                    start_next_inperson_cohort(course)
                    if payload['active']
                    else close_active_inperson_cohort(course)
                )
    except (Course.DoesNotExist, ValueError, TypeError):
        return _admin_api_error('الدورة غير موجودة.', 404)
    return JsonResponse({
        'ok': True,
        'active': course.status == CourseStatus.PUBLISHED,
        'cohort': _inperson_cohort_payload(cohort) if cohort else None,
    })


@require_POST
def project_set_active(request, pk):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or not isinstance(payload.get('active'), bool):
        return _admin_api_error('حالة المشروع غير صالحة.', 400)
    try:
        with transaction.atomic():
            project = Project.objects.select_for_update().get(pk=pk)
            if payload['active'] and not project.title.strip():
                return _admin_api_error('لا يمكن تفعيل مشروع دون عنوان.', 400)
            project.status = ProjectStatus.PUBLISHED if payload['active'] else ProjectStatus.INACTIVE
            project.save(update_fields=['status', 'updated_at'])
    except (Project.DoesNotExist, ValueError, TypeError):
        return _admin_api_error('المشروع غير موجود.', 404)
    return JsonResponse({'ok': True, 'active': project.status == ProjectStatus.PUBLISHED})


@require_POST
def certificate_set_active(request, certificate_key):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict) or not isinstance(payload.get('active'), bool):
        return _admin_api_error('حالة الشهادة غير صالحة.', 400)

    kind, separator, raw_pk = certificate_key.partition('-')
    if not separator or kind not in ('course', 'manual') or not raw_pk.isdigit():
        return _admin_api_error('الشهادة غير موجودة.', 404)
    model = CourseCertificate if kind == 'course' else ManualCertificate
    try:
        with transaction.atomic():
            certificate = model.objects.select_for_update().get(pk=raw_pk)
            if (
                kind == 'manual'
                and payload['active']
                and certificate.status == ManualCertificateStatus.REJECTED
            ):
                return _admin_api_error('لا يمكن إظهار شهادة مرفوضة.', 400)

            certificate.is_active = payload['active']
            update_fields = ['is_active']
            if (
                kind == 'manual'
                and payload['active']
                and certificate.status == ManualCertificateStatus.PENDING
            ):
                certificate.status = ManualCertificateStatus.APPROVED
                certificate.reviewed_at = timezone.now()
                update_fields.extend(['status', 'reviewed_at'])
            certificate.save(update_fields=update_fields)
    except model.DoesNotExist:
        return _admin_api_error('الشهادة غير موجودة.', 404)
    response = {'ok': True, 'active': certificate.is_active}
    if kind == 'manual':
        response.update({
            'reviewStatus': certificate.status,
            'reviewStatusLabel': certificate.get_status_display(),
        })
    return JsonResponse(response)


@require_POST
def course_lesson_save(request):
    denied = _admin_api_user(request)
    if denied:
        return denied
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)
    if not isinstance(payload, dict):
        return _admin_api_error('البيانات المرسلة غير صالحة.', 400)

    course_key = str(payload.get('courseId') or '').strip()
    course = Course.objects.filter(slug=course_key).first()
    if course is None and course_key.isdigit():
        course = Course.objects.filter(pk=course_key).first()
    if course is None:
        return _admin_api_error('الدورة غير موجودة.', 404)

    lesson_id = payload.get('lessonId')
    lesson = None
    if lesson_id not in (None, ''):
        try:
            lesson = Lesson.objects.select_related('section').get(
                pk=lesson_id, section__course=course
            )
        except (Lesson.DoesNotExist, ValueError, TypeError):
            return _admin_api_error('الدرس غير موجود في هذه الدورة.', 404)

    title = str(payload.get('title') or '').strip()
    section_title = str(payload.get('sectionTitle') or '').strip()
    section_id = payload.get('sectionId')
    lesson_type = payload.get('type')
    if not title or len(title) > 200:
        return JsonResponse(
            {
                'ok': False,
                'fields': {'title': 'أدخل عنواناً صالحاً للدرس.'},
                'message': 'تحقق من بيانات الدرس.',
            },
            status=400,
        )
    if (not section_title and section_id in (None, '')) or len(section_title) > 200:
        return JsonResponse(
            {
                'ok': False,
                'fields': {'sectionTitle': 'أدخل عنواناً صالحاً للقسم.'},
                'message': 'تحقق من بيانات الدرس.',
            },
            status=400,
        )
    if lesson_type not in LessonType.values:
        return JsonResponse(
            {
                'ok': False,
                'fields': {'type': 'نوع الدرس غير صالح.'},
                'message': 'تحقق من بيانات الدرس.',
            },
            status=400,
        )
    if not isinstance(payload.get('free', False), bool):
        return JsonResponse(
            {
                'ok': False,
                'fields': {'free': 'قيمة المعاينة المجانية غير صالحة.'},
                'message': 'تحقق من بيانات الدرس.',
            },
            status=400,
        )

    linked_project = None
    project_key = str(payload.get('projectId') or '').strip()
    if lesson_type == LessonType.PROJECT and project_key:
        projects = Project.objects.filter(owner=course.owner)
        linked_project = projects.filter(slug=project_key).first()
        if linked_project is None and project_key.isdigit():
            linked_project = projects.filter(pk=project_key).first()
        if linked_project is None:
            return _admin_api_error('المشروع المحدد غير موجود أو لا يتبع مدرب الدورة.', 400)

    with transaction.atomic():
        section = None
        if section_id not in (None, ''):
            try:
                section = CourseSection.objects.get(pk=section_id, course=course)
            except (CourseSection.DoesNotExist, ValueError, TypeError):
                return _admin_api_error('القسم المحدد غير موجود في هذه الدورة.', 400)
        if section is None:
            section = CourseSection.objects.filter(course=course, title=section_title).first()
        if section is None:
            section = CourseSection.objects.create(
                course=course,
                title=section_title,
                order=course.sections.count(),
            )
        if lesson is None:
            lesson = Lesson(
                section=section,
                order=section.lessons.count(),
            )
        lesson.section = section
        lesson.title = title
        lesson.duration = str(payload.get('duration') or '').strip()[:12]
        lesson.type = lesson_type
        lesson.is_free = bool(payload.get('free'))
        lesson.content = str(payload.get('content') or '').strip()
        lesson.video_url = str(payload.get('videoUrl') or '').strip()[:500]
        lesson.linked_project = linked_project if lesson_type == LessonType.PROJECT else None
        lesson.save()

        if lesson_type == LessonType.QUIZ:
            Quiz.objects.get_or_create(lesson=lesson)
            _sync_quiz(lesson, payload.get('quiz'))
        else:
            Quiz.objects.filter(lesson=lesson).delete()

    course_payload = (
        Course.objects.filter(pk=course.pk)
        .select_related('owner', 'owner__profile')
        .prefetch_related('sections__lessons')
        .get()
        .to_public_dict(include_answers=True)
    )
    return JsonResponse({'ok': True, 'course': course_payload})


class PanelView(LoginRequiredMixin, UserPassesTestMixin, TemplateView):
    """admin.html — hash-routed admin panel shell."""

    template_name = 'dashboard/admin.html'

    def test_func(self):
        return self.request.user.role == UserRole.ADMIN

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['training_categories_json'] = _training_categories_payload()
        context['platform_settings'] = get_platform_settings()
        context['settings_summary'] = {
            'users': User.objects.filter(role=UserRole.STUDENT).count(),
            'activeUsers': User.objects.filter(role=UserRole.STUDENT, is_active=True).count(),
            'trainers': User.objects.filter(role=UserRole.TRAINER).count(),
            'courses': Course.objects.count(),
            'lessons': Lesson.objects.count(),
            'enrolled': CourseProgress.objects.count(),
            'projects': Project.objects.count(),
            'databaseSizeBytes': _database_size_bytes(),
        }
        context['site_visit_count'] = (
            SiteVisitDaily.objects.aggregate(total=Sum('visits'))['total'] or 0
        )
        courses = (
            Course.objects.select_related('owner', 'owner__profile')
            .prefetch_related('sections__lessons')
            .annotate(enrollment_count=Count('progress', distinct=True))
            .order_by('-created_at', 'pk')
        )
        context['courses_json'] = []
        for course in courses:
            data = course.to_public_dict(include_answers=True)
            data['enrollmentCount'] = course.enrollment_count
            data['displayOrder'] = course.display_order
            context['courses_json'].append(data)
        context['point_redemption_courses_json'] = [
            {'id': course.slug, 'title': course.title, 'price': course.price}
            for course in courses
            if course.is_published and course.is_paid and not course.is_coming_soon
        ]
        admin_projects = (
            Project.objects.select_related('owner', 'source_lesson__section__course')
            .prefetch_related('tags', 'images', 'files', 'comments__author')
            .order_by('-created_at', 'pk')
        )
        context['admin_projects_json'] = []
        for project in admin_projects:
            data = project.to_public_dict()
            data['displayOrder'] = project.display_order
            data['ownerId'] = str(project.owner_id)
            data['ownerRole'] = project.owner.role
            data['sourceLessonId'] = project.source_lesson_id
            data['sourceCourseId'] = (
                project.source_lesson.section.course.slug if project.source_lesson_id else ''
            )
            data['sourceCourseTitle'] = (
                project.source_lesson.section.course.title if project.source_lesson_id else ''
            )
            context['admin_projects_json'].append(data)
        course_certificates = (
            CourseCertificate.objects.filter(student__role=UserRole.STUDENT)
            .select_related('student', 'course')
            .order_by('-created_at', 'pk')
        )
        manual_certificates = (
            ManualCertificate.objects.filter(
                student__role__in=(UserRole.STUDENT, UserRole.TRAINER)
            )
            .select_related('student')
            .order_by('-created_at', 'pk')
        )
        workshop_certificates = (
            WorkshopCertificate.objects.filter(
                attendance__student__role=UserRole.STUDENT
            )
            .select_related('attendance__student', 'attendance__workshop')
            .order_by('-created_at', 'pk')
        )
        context['admin_student_certificates_json'] = [
            {
                'id': f'course-{certificate.pk}',
                'pk': certificate.pk,
                'type': 'course',
                'title': certificate.course.title,
                'issuer': certificate.course.owner.display_name,
                'courseTitle': certificate.course.title,
                'category': certificate.course.category,
                'description': certificate.course.summary or certificate.course.content,
                'skills': list(certificate.course.skills or []),
                'verifyUrl': certificate.course.verify_url,
                'image': certificate.course.cover.url if certificate.course.cover else '',
                'studentId': str(certificate.student_id),
                'studentName': certificate.student.display_name,
                'studentHandle': certificate.student.handle,
                'date': certificate.created_at.date().isoformat(),
                'code': certificate.code,
                'active': certificate.is_active,
            }
            for certificate in course_certificates
        ] + [
            {
                'id': f'manual-{certificate.pk}',
                'pk': certificate.pk,
                'type': 'manual',
                'title': certificate.title,
                'issuer': certificate.issuer,
                'courseTitle': '',
                'studentId': str(certificate.student_id),
                'studentName': certificate.student.display_name,
                'studentHandle': certificate.student.handle,
                'date': certificate.date.isoformat() if certificate.date else '',
                'code': certificate.credential_id,
                'reviewStatus': certificate.status,
                'reviewStatusLabel': certificate.get_status_display(),
                'category': certificate.category,
                'active': certificate.is_active,
                'image': certificate.image.url if certificate.image else '',
                'verifyUrl': certificate.verify_url,
                'description': certificate.description,
                'skills': list(certificate.skills or []),
            }
            for certificate in manual_certificates
        ] + [
            {
                'id': f'workshop-{certificate.pk}',
                'pk': certificate.pk,
                'type': 'workshop',
                'title': certificate.workshop_title,
                'issuer': certificate.trainer_name,
                'courseTitle': '',
                'studentId': str(certificate.attendance.student_id),
                'studentName': certificate.student_name,
                'studentHandle': certificate.attendance.student.handle,
                'date': certificate.attended_on.isoformat(),
                'code': certificate.code,
                'active': True,
                'workshopDuration': certificate.duration_minutes,
                'workshopLocation': certificate.attendance.workshop.location,
            }
            for certificate in workshop_certificates
        ]
        context['admin_workshops_json'] = [
            _workshop_data(workshop)
            for workshop in InPersonWorkshop.objects.annotate(
                attendees_count=Count('attendances', distinct=True)
            )
        ]
        context['admin_inperson_cohorts_json'] = [
            _inperson_cohort_payload(cohort)
            for cohort in InPersonCourseCohort.objects.filter(
                course__course_type=CourseType.IN_PERSON,
            )
            .select_related('course')
            .annotate(request_count=Count('registration_requests'))
            .order_by('course_id', '-number')
        ]
        context['course_registration_requests_json'] = [
            _course_registration_request_payload(registration)
            for registration in CourseRegistrationRequest.objects.filter(
                course__course_type=CourseType.IN_PERSON,
            ).select_related(
                'course', 'cohort', 'student__student_setup_link',
                'referral_link__referrer'
            ).prefetch_related('payments')
        ]
        course_progress = (
            CourseProgress.objects.select_related('student', 'student__profile', 'course')
            .order_by('created_at', 'pk')
        )
        context['course_progress_json'] = [
            {
                'id': str(progress.pk),
                'courseId': progress.course.slug,
                'userId': str(progress.student_id),
                'user': {
                    'id': str(progress.student_id),
                    'name': progress.student.display_name,
                    'handle': progress.student.handle,
                    'avatar': progress.student.profile.avatar.url
                    if _trainer_profile(progress.student)
                    and progress.student.profile.avatar
                    else '',
                    'role': progress.student.role,
                },
                'completedIds': progress.completed_ids or [],
                'completed': progress.completed,
                'joinedAt': progress.created_at.isoformat(),
                'updatedAt': progress.updated_at.isoformat(),
                'progress': progress.percent,
            }
            for progress in course_progress
        ]
        redemptions = (
            StudentPointTransaction.objects.filter(
                kind=StudentPointTransaction.Kind.REDEMPTION,
                student__role=UserRole.STUDENT,
            )
            .select_related('student', 'course')
            .order_by('-created_at', '-pk')
        )
        context['point_redemptions_json'] = [
            {
                'id': str(redemption.pk),
                'studentName': redemption.student.display_name,
                'studentHandle': redemption.student.handle,
                'courseTitle': redemption.course.title,
                'points': abs(redemption.points),
                'date': redemption.created_at.isoformat(),
            }
            for redemption in redemptions
        ]
        trainers = (
            User.objects.filter(role=UserRole.TRAINER)
            .select_related('profile')
            .prefetch_related('profile__social_links')
            .annotate(courses_count=Count('courses', distinct=True))
            .order_by('-date_joined', 'pk')
        )
        context['trainers_json'] = [self._trainer_data(trainer) for trainer in trainers]
        students = (
            User.objects.filter(role=UserRole.STUDENT)
            .select_related('profile')
            .order_by('-date_joined', 'pk')
        )
        student_rows = list(students)
        active_devices = _active_device_counts([student.pk for student in student_rows])
        student_points = {
            item['student_id']: item['total'] or 0
            for item in StudentPointTransaction.objects.values('student_id').annotate(
                total=Sum('points')
            )
        }
        student_referral_visits = {
            item['referrer_id']: item['total'] or 0
            for item in StudentReferralLink.objects.values('referrer_id').annotate(
                total=Sum('visits')
            )
        }
        context['students_json'] = [
            {
                'id': f'db-user-{student.pk}',
                'databaseId': str(student.pk),
                'name': student.display_name,
                'fullNameArabic': student.full_name_ar,
                'fullNameEnglish': student.full_name_en,
                'handle': student.handle,
                'email': student.email,
                'phone': student.phone,
                'role': UserRole.STUDENT,
                'status': 'active' if student.is_active else 'suspended',
                'verified': student.is_verified,
                'joined': student.date_joined.isoformat(),
                'lastActive': student.last_login.isoformat() if student.last_login else '',
                'bio': student.profile.bio if _trainer_profile(student) else '',
                'avatar': student.profile.avatar.url
                if _trainer_profile(student) and student.profile.avatar
                else '',
                'referralPoints': student_points.get(student.pk, 0),
                'referralVisits': student_referral_visits.get(student.pk, 0),
                'showReferralStats': student.profile.show_referral_stats
                if _trainer_profile(student)
                else False,
                'activeDevices': active_devices.get(student.pk, 0),
                'displayOrder': student.profile.display_order
                if _trainer_profile(student)
                else None,
            }
            for student in student_rows
        ]
        return context

    @staticmethod
    def _trainer_data(trainer):
        profile = _trainer_profile(trainer)
        social_links = {
            link.platform: link.url for link in profile.social_links.all()
        } if profile else {}
        return {
            'id': str(trainer.pk),
            'name': trainer.display_name,
            'fullNameArabic': trainer.full_name_ar,
            'fullNameEnglish': trainer.full_name_en,
            'fullNameArabic': trainer.full_name_ar,
            'fullNameEnglish': trainer.full_name_en,
            'handle': trainer.handle,
            'specialty': profile.specialization if profile else '',
            'rating': float(profile.trainer_rating) if profile else 0,
            'email': trainer.email,
            'phone': trainer.phone,
            'whatsapp': profile.whatsapp if profile else '',
            'avatar': profile.avatar.url if profile and profile.avatar else '',
            'bio': profile.bio if profile else '',
            'status': 'active' if trainer.is_active else 'paused',
            'canPublishContent': trainer.can_publish_content,
            'verified': trainer.is_verified,
            'joined': trainer.date_joined.isoformat(),
            'coursesCount': trainer.courses_count,
            'linkedin': social_links.get(SocialPlatform.LINKEDIN, ''),
            'github': social_links.get(SocialPlatform.GITHUB, ''),
            'displayOrder': profile.display_order if profile else None,
        }


class DashboardEditorView(PanelView):
    """Shared access control and context for editors embedded in the admin panel."""

    def get_editor_base_context(self, **kwargs):
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return TemplateView.get_context_data(self, **kwargs)
        return super().get_context_data(**kwargs)

    def editor_base_template(self, full_template):
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return 'dashboard/editor_fragment_base.html'
        return full_template


class PanelCourseEditorView(DashboardEditorView):
    """Course editor rendered inside the admin dashboard shell."""

    template_name = 'dashboard/course_editor.html'

    def get_context_data(self, **kwargs):
        context = self.get_editor_base_context(**kwargs)
        admin_courses = context.get('courses_json')
        admin_categories = context.get('training_categories_json')
        editor_context = course_editor_context(self.request, kwargs.get('pk'))
        context.update(editor_context)
        if admin_courses is not None:
            context['courses_json'] = admin_courses
        if admin_categories is not None:
            context['training_categories_json'] = admin_categories
        context['editor_course_json'] = editor_context['courses_json']
        context['editor_training_categories_json'] = editor_context['training_categories_json']
        context['admin_dashboard_editor'] = True
        context['editor_base_template'] = self.editor_base_template(
            'dashboard/course_editor_base.html'
        )
        return context


class PanelProjectEditorView(DashboardEditorView):
    """Project editor rendered inside the admin dashboard shell."""

    template_name = 'dashboard/project_editor.html'

    def get_context_data(self, **kwargs):
        context = self.get_editor_base_context(**kwargs)
        admin_categories = context.get('training_categories_json')
        editor_context = project_editor_context(self.request, kwargs.get('pk'))
        context.update(editor_context)
        if admin_categories is not None:
            context['training_categories_json'] = admin_categories
        context['editor_training_categories_json'] = editor_context['training_categories_json']
        context['admin_dashboard_project_editor'] = True
        context['editor_base_template'] = self.editor_base_template(
            'dashboard/project_editor_base.html'
        )
        return context
