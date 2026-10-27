"""Views for the admin dashboard (admin.html)."""
import base64
import binascii
import json
import re
from datetime import date, datetime, time
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
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.core import serializers
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.validators import EmailValidator, URLValidator
from django.db import IntegrityError, connection, models, transaction
from django.db.models import Count, Q, Sum
from django.http import FileResponse, HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_http_methods, require_POST
from django.views.generic import TemplateView

from core.context_processors import BRAND_PALETTES, DEFAULT_PLATFORM_SETTINGS, get_platform_settings
from core.models import PlatformSettings, SiteVisitDaily
from courses.referrals import award_referral_points_for_enrollment
from courses.models import (
    Course,
    CourseCertificate,
    CourseProgress,
    CourseSection,
    CourseStatus,
    InPersonWorkshop,
    Lesson,
    LessonType,
    ManualCertificate,
    ManualCertificateStatus,
    Quiz,
    StudentPointTransaction,
    StudentReferralLink,
    WorkshopAttendance,
    WorkshopCertificate,
)
from courses.views import _sync_quiz
from projects.models import Project, ProjectStatus
from users.models import Profile, SocialLink, SocialPlatform, User, UserRole

PHONE_RE = re.compile(r'^[0-9]{10}$')
AVATAR_RE = re.compile(r'^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$')
AVATAR_TYPES = {'png': 'png', 'jpeg': 'jpg', 'webp': 'webp'}
MAX_AVATAR_BYTES = 4 * 1024 * 1024
MAX_BACKUP_UPLOAD_BYTES = 300 * 1024 * 1024
MAX_BACKUP_EXPANDED_BYTES = 750 * 1024 * 1024
BACKUP_FORMAT = 'data-center-platform'
BACKUP_EXCLUDED_MODELS = {
    'devicesession',
    'loginattempt',
    'signupverification',
    'signupratelimit',
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
    handle = str(payload.get('handle') or '').strip()
    phone = str(payload.get('phone') or '').strip()
    email = str(payload.get('email') or '').strip()
    specialty = str(payload.get('specialty') or '').strip()
    bio = str(payload.get('bio') or '').strip()
    errors = {}

    if not name or len(name) > 150:
        errors['name'] = 'أدخل الاسم، على ألا يتجاوز 150 حرفاً.'
    if not handle or len(handle) > 40:
        errors['handle'] = 'أدخل المعرّف، على ألا يتجاوز 40 حرفاً.'
    elif User.objects.filter(handle=handle).exclude(pk=trainer.pk).exists():
        errors['handle'] = 'هذا المعرّف مستخدم بالفعل.'
    if not PHONE_RE.fullmatch(phone):
        errors['phone'] = 'رقم الجوال يجب أن يتكوّن من 10 أرقام.'
    elif User.objects.filter(phone=phone).exclude(pk=trainer.pk).exists():
        errors['phone'] = 'رقم الجوال مستخدم بالفعل.'
    if len(specialty) > 150 or not specialty:
        errors['specialty'] = 'أدخل التخصص، على ألا يتجاوز 150 حرفاً.'
    if len(email) > 254:
        errors['email'] = 'البريد الإلكتروني طويل جداً.'
    elif email:
        try:
            EmailValidator()(email)
        except ValidationError:
            errors['email'] = 'أدخل بريداً إلكترونياً صحيحاً.'

    try:
        rating = Decimal(str(payload.get('rating') or '0'))
        if not rating.is_finite() or rating < 0 or rating > 5 or rating.as_tuple().exponent < -1:
            raise InvalidOperation
    except (InvalidOperation, TypeError, ValueError):
        errors['rating'] = 'يجب أن يكون التقييم بين 0 و5 وبحد أقصى منزلة عشرية واحدة.'

    links = {
        SocialPlatform.LINKEDIN: str(payload.get('linkedin') or '').strip(),
        SocialPlatform.GITHUB: str(payload.get('github') or '').strip(),
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
    profile = Profile() if is_new else (_trainer_profile(trainer) or Profile())
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
            profile.bio = bio
            profile.trainer_rating = rating
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
    handle = str(payload.get('handle') or '').strip()
    phone = str(payload.get('phone') or '').strip()
    email = str(payload.get('email') or '').strip()
    bio = str(payload.get('bio') or '').strip()
    password = str(payload.get('password') or '')
    errors = {}

    if not name or len(name) > 150:
        errors['name'] = 'أدخل الاسم، على ألا يتجاوز 150 حرفاً.'
    if not handle or len(handle) > 40:
        errors['handle'] = 'أدخل المعرّف، على ألا يتجاوز 40 حرفاً.'
    elif User.objects.filter(handle=handle).exclude(pk=student.pk).exists():
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
    except (Course.DoesNotExist, ValueError, TypeError):
        return _admin_api_error('الدورة غير موجودة.', 404)
    return JsonResponse({'ok': True, 'active': course.status == CourseStatus.PUBLISHED})


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
            ManualCertificate.objects.filter(student__role=UserRole.STUDENT)
            .select_related('student')
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
        ]
        context['admin_workshops_json'] = [
            _workshop_data(workshop)
            for workshop in InPersonWorkshop.objects.annotate(
                attendees_count=Count('attendances', distinct=True)
            )
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
            }
            for student in students
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
            'handle': trainer.handle,
            'specialty': profile.specialization if profile else '',
            'rating': float(profile.trainer_rating) if profile else 0,
            'email': trainer.email,
            'phone': trainer.phone,
            'avatar': profile.avatar.url if profile and profile.avatar else '',
            'bio': profile.bio if profile else '',
            'status': 'active' if trainer.is_active else 'paused',
            'verified': trainer.is_verified,
            'joined': trainer.date_joined.isoformat(),
            'coursesCount': trainer.courses_count,
            'linkedin': social_links.get(SocialPlatform.LINKEDIN, ''),
            'github': social_links.get(SocialPlatform.GITHUB, ''),
        }
