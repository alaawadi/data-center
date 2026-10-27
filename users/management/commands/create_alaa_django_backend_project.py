from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'منصة إدارة الأصول والصيانة التنبؤية — AssetOps API'


def _cover_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs>'
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#081426"/><stop offset="1" stop-color="#123b56"/>'
        '</linearGradient>'
        '<linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#3b82f6"/>'
        '</linearGradient>'
        '</defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1020" cy="90" r="220" fill="#22d3ee" opacity=".08"/>'
        '<circle cx="140" cy="630" r="300" fill="#3b82f6" opacity=".08"/>'
        '<text x="600" y="100" text-anchor="middle" fill="#e2e8f0" font-size="32" '
        'font-family="Arial, sans-serif" letter-spacing="5">ASSETOPS  /  BACKEND PLATFORM</text>'
        '<rect x="70" y="220" width="230" height="170" rx="22" fill="#10243a" stroke="#31516c" stroke-width="2"/>'
        '<text x="185" y="285" text-anchor="middle" fill="#94a3b8" font-size="20" font-family="Arial, sans-serif">CLIENT APPS</text>'
        '<text x="185" y="335" text-anchor="middle" fill="#f8fafc" font-size="25" font-family="Arial, sans-serif">Web  /  Mobile</text>'
        '<path d="M310 305 H405" stroke="url(#accent)" stroke-width="5"/>'
        '<path d="M390 292 L410 305 L390 318" fill="none" stroke="#22d3ee" stroke-width="5"/>'
        '<rect x="420" y="180" width="360" height="250" rx="26" fill="#12314a" stroke="#22d3ee" stroke-width="3"/>'
        '<text x="600" y="250" text-anchor="middle" fill="#67e8f9" font-size="22" font-family="Arial, sans-serif">REST API  /  v1</text>'
        '<text x="600" y="310" text-anchor="middle" fill="#f8fafc" font-size="38" font-weight="700" font-family="Arial, sans-serif">Django REST</text>'
        '<text x="600" y="355" text-anchor="middle" fill="#cbd5e1" font-size="23" font-family="Arial, sans-serif">Auth  •  RBAC  •  OpenAPI</text>'
        '<path d="M790 255 H870" stroke="url(#accent)" stroke-width="5"/>'
        '<path d="M855 242 L875 255 L855 268" fill="none" stroke="#22d3ee" stroke-width="5"/>'
        '<path d="M790 355 H870" stroke="url(#accent)" stroke-width="5"/>'
        '<path d="M855 342 L875 355 L855 368" fill="none" stroke="#22d3ee" stroke-width="5"/>'
        '<rect x="885" y="190" width="245" height="125" rx="20" fill="#10243a" stroke="#31516c" stroke-width="2"/>'
        '<text x="1007" y="240" text-anchor="middle" fill="#93c5fd" font-size="21" font-family="Arial, sans-serif">POSTGRESQL</text>'
        '<text x="1007" y="277" text-anchor="middle" fill="#e2e8f0" font-size="19" font-family="Arial, sans-serif">Transactional Data</text>'
        '<rect x="885" y="335" width="245" height="125" rx="20" fill="#10243a" stroke="#31516c" stroke-width="2"/>'
        '<text x="1007" y="385" text-anchor="middle" fill="#6ee7b7" font-size="21" font-family="Arial, sans-serif">REDIS  /  CELERY</text>'
        '<text x="1007" y="422" text-anchor="middle" fill="#e2e8f0" font-size="19" font-family="Arial, sans-serif">Cache • Async Tasks</text>'
        '<rect x="255" y="510" width="690" height="66" rx="18" fill="#0c2032" stroke="#24465f"/>'
        '<text x="600" y="552" text-anchor="middle" fill="#cbd5e1" font-size="21" font-family="Arial, sans-serif">'
        'ASSET LIFECYCLE  /  WORK ORDERS  /  AUDIT TRAIL</text>'
        '</svg>'
    ).encode('utf-8')


def _gallery_svg(kind):
    screens = {
        'api': (
            'API RESOURCE MAP',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#0c1c2d" stroke="#31516c" stroke-width="2"/>'
            '<rect x="180" y="220" width="250" height="45" rx="10" fill="#12314a"/>'
            '<text x="205" y="249" fill="#67e8f9" font-size="19" font-family="Arial, sans-serif">GET  /api/v1/assets</text>'
            '<rect x="180" y="285" width="250" height="45" rx="10" fill="#12314a"/>'
            '<text x="205" y="314" fill="#6ee7b7" font-size="19" font-family="Arial, sans-serif">POST /api/v1/work-orders</text>'
            '<rect x="180" y="350" width="250" height="45" rx="10" fill="#12314a"/>'
            '<text x="205" y="379" fill="#93c5fd" font-size="19" font-family="Arial, sans-serif">GET  /api/v1/metrics</text>'
            '<path d="M470 290 H565 M565 290 V245 H655 M565 290 V365 H655" fill="none" stroke="#22d3ee" stroke-width="4"/>'
            '<rect x="655" y="215" width="330" height="85" rx="16" fill="#12314a" stroke="#22d3ee"/>'
            '<text x="820" y="250" text-anchor="middle" fill="#f8fafc" font-size="22" font-family="Arial, sans-serif">Assets &amp; Locations</text>'
            '<text x="820" y="278" text-anchor="middle" fill="#94a3b8" font-size="16" font-family="Arial, sans-serif">Serializers • Permissions • Filters</text>'
            '<rect x="655" y="325" width="330" height="85" rx="16" fill="#12314a" stroke="#3b82f6"/>'
            '<text x="820" y="360" text-anchor="middle" fill="#f8fafc" font-size="22" font-family="Arial, sans-serif">Work Orders</text>'
            '<text x="820" y="388" text-anchor="middle" fill="#94a3b8" font-size="16" font-family="Arial, sans-serif">State Transitions • Audit Events</text>'
            '<rect x="180" y="445" width="805" height="105" rx="16" fill="#10243a"/>'
            '<text x="582" y="485" text-anchor="middle" fill="#67e8f9" font-size="20" font-family="Arial, sans-serif">VERSIONED REST CONTRACT  /  OPENAPI SCHEMA</text>'
            '<text x="582" y="520" text-anchor="middle" fill="#cbd5e1" font-size="17" font-family="Arial, sans-serif">Pagination • Filtering • Validation • Consistent Errors</text>'
        ),
        'data': (
            'DOMAIN DATA MODEL',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#0c1c2d" stroke="#31516c" stroke-width="2"/>'
            '<path d="M390 320 H485 M700 320 H795 M595 390 V455" stroke="#22d3ee" stroke-width="4"/>'
            '<rect x="210" y="250" width="180" height="140" rx="16" fill="#12314a" stroke="#3b82f6" stroke-width="2"/>'
            '<text x="300" y="285" text-anchor="middle" fill="#93c5fd" font-size="22" font-family="Arial, sans-serif">Asset</text>'
            '<text x="300" y="322" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">serial_number</text>'
            '<text x="300" y="352" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">location_id • status</text>'
            '<rect x="485" y="250" width="220" height="140" rx="16" fill="#12314a" stroke="#22d3ee" stroke-width="2"/>'
            '<text x="595" y="285" text-anchor="middle" fill="#67e8f9" font-size="22" font-family="Arial, sans-serif">WorkOrder</text>'
            '<text x="595" y="322" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">priority • assignee</text>'
            '<text x="595" y="352" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">scheduled_at • state</text>'
            '<rect x="795" y="250" width="180" height="140" rx="16" fill="#12314a" stroke="#10b981" stroke-width="2"/>'
            '<text x="885" y="285" text-anchor="middle" fill="#6ee7b7" font-size="22" font-family="Arial, sans-serif">Location</text>'
            '<text x="885" y="322" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">site • region</text>'
            '<text x="885" y="352" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">timezone</text>'
            '<rect x="465" y="455" width="260" height="95" rx="16" fill="#10243a" stroke="#64748b"/>'
            '<text x="595" y="495" text-anchor="middle" fill="#e2e8f0" font-size="21" font-family="Arial, sans-serif">AuditEvent</text>'
            '<text x="595" y="525" text-anchor="middle" fill="#94a3b8" font-size="16" font-family="Arial, sans-serif">actor • action • timestamp</text>'
            '<text x="435" y="310" text-anchor="middle" fill="#94a3b8" font-size="15" font-family="Arial, sans-serif">1:N</text>'
            '<text x="755" y="310" text-anchor="middle" fill="#94a3b8" font-size="15" font-family="Arial, sans-serif">N:1</text>'
        ),
        'infrastructure': (
            'ASYNC PROCESSING PIPELINE',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#0c1c2d" stroke="#31516c" stroke-width="2"/>'
            '<rect x="205" y="300" width="180" height="105" rx="18" fill="#12314a" stroke="#3b82f6" stroke-width="2"/>'
            '<text x="295" y="342" text-anchor="middle" fill="#93c5fd" font-size="22" font-family="Arial, sans-serif">Django API</text>'
            '<text x="295" y="374" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">Request / Response</text>'
            '<path d="M390 352 H480" stroke="#22d3ee" stroke-width="4"/><path d="M465 339 L485 352 L465 365" fill="none" stroke="#22d3ee" stroke-width="4"/>'
            '<rect x="490" y="300" width="180" height="105" rx="18" fill="#12314a" stroke="#22d3ee" stroke-width="2"/>'
            '<text x="580" y="342" text-anchor="middle" fill="#67e8f9" font-size="22" font-family="Arial, sans-serif">Redis Queue</text>'
            '<text x="580" y="374" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">Broker / Cache</text>'
            '<path d="M675 352 H765" stroke="#22d3ee" stroke-width="4"/><path d="M750 339 L770 352 L750 365" fill="none" stroke="#22d3ee" stroke-width="4"/>'
            '<rect x="775" y="300" width="205" height="105" rx="18" fill="#12314a" stroke="#10b981" stroke-width="2"/>'
            '<text x="877" y="342" text-anchor="middle" fill="#6ee7b7" font-size="22" font-family="Arial, sans-serif">Celery Worker</text>'
            '<text x="877" y="374" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">Scheduled Tasks</text>'
            '<path d="M875 410 V475 H580 V410" fill="none" stroke="#64748b" stroke-width="3" stroke-dasharray="9 8"/>'
            '<rect x="330" y="470" width="500" height="70" rx="16" fill="#10243a"/>'
            '<text x="580" y="513" text-anchor="middle" fill="#e2e8f0" font-size="20" font-family="Arial, sans-serif">Retries • Idempotency • Observability</text>'
            '<rect x="205" y="220" width="775" height="44" rx="12" fill="#10243a"/>'
            '<text x="592" y="249" text-anchor="middle" fill="#94a3b8" font-size="18" font-family="Arial, sans-serif">Background jobs keep API latency predictable</text>'
        ),
    }
    label, artwork = screens[kind]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#081426"/><stop offset="1" stop-color="#123b56"/>'
        '</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1050" cy="90" r="220" fill="#22d3ee" opacity=".06"/>'
        '<text x="600" y="110" text-anchor="middle" fill="#e2e8f0" font-size="30" '
        'font-family="Arial, sans-serif" letter-spacing="3">ASSETOPS  /  '
        f'{label}</text>'
        f'{artwork}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع Django REST API عام للمدرب علاء وادي.'

    def handle(self, *args, **options):
        owner = User.objects.filter(handle='alaawadi').first()
        if owner is None:
            self.stderr.write(self.style.ERROR('لم يتم العثور على حساب المدرب alaawadi.'))
            return

        project, created = Project.objects.get_or_create(
            owner=owner,
            title=TITLE,
            defaults={
                'summary': (
                    'منصة Backend لإدارة الأصول التشغيلية والصيانة التنبؤية، '
                    'تقدّم RESTful API آمنة وقابلة للتوسع لربط التطبيقات والفرق الميدانية.'
                ),
                'category': 'برمجة',
                'role': 'Backend Engineer — Python / Django',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1260,
                'likes': 286,
            },
        )

        project.summary = (
            'منصة Backend لإدارة الأصول التشغيلية والصيانة التنبؤية، '
            'تقدّم RESTful API آمنة وقابلة للتوسع لربط التطبيقات والفرق الميدانية.'
        )
        project.category = 'برمجة'
        project.role = 'Backend Engineer — Python / Django'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>نظرة عامة</h2>'
            '<p>AssetOps منصة خلفية لإدارة الأصول والمعدات عبر دورة حياتها، من التسجيل والتشغيل '
            'إلى الصيانة والإحلال. صُممت لتخدم المؤسسات التي تحتاج إلى مصدر موحّد للبيانات '
            'وتنسيق العمل بين الإدارة والفنيين والفرق الميدانية.</p>'
            '<h2>RESTful API</h2>'
            '<p>توفر المنصة واجهات REST versioned مبنية باستخدام Django REST Framework، '
            'مع موارد واضحة للأصول، المواقع، أوامر العمل، قطع الغيار، وقراءات الصيانة. '
            'تدعم الواجهات pagination وfiltering وsearch وsorting، وتوثيقاً تفاعلياً عبر OpenAPI/Swagger.</p>'
            '<h2>القدرات الرئيسية</h2>'
            '<ul>'
            '<li>إدارة الأصول والمواقع والتصنيفات، مع سجل تاريخي كامل لكل أصل.</li>'
            '<li>جدولة الصيانة الوقائية وإنشاء أوامر العمل وتوزيعها وتتبع دورة حالتها.</li>'
            '<li>قواعد تنبيه قابلة للتهيئة لاكتشاف مؤشرات الأعطال والتأخر في الصيانة.</li>'
            '<li>Role-Based Access Control بصلاحيات دقيقة للمديرين والمشرفين والفنيين.</li>'
            '<li>Audit Trail لتوثيق تغييرات البيانات والعمليات الحساسة لأغراض الحوكمة والتدقيق.</li>'
            '<li>استيراد وتصدير التقارير ومؤشرات الأداء التشغيلي عبر API.</li>'
            '</ul>'
            '<h2>البنية والتقنيات</h2>'
            '<p>Python، Django، Django REST Framework، PostgreSQL للبيانات العلائقية، '
            'Redis للتخزين المؤقت، وCelery للمهام الخلفية المجدولة. يشمل التصميم JWT authentication '
            'مع refresh tokens، validation على مستوى serializers، rate limiting، '
            'معالجة موحدة للأخطاء، وDocker لتوحيد بيئات التشغيل.</p>'
            '<h2>الجودة وقابلية التوسع</h2>'
            '<p>يركز المشروع على فصل منطق الأعمال عن طبقة العرض، المعاملات الآمنة، '
            'الفهارس وتحسين استعلامات ORM، والاختبارات باستخدام pytest. كما يهيئ نقاط تكامل '
            'للمراقبة والسجلات المنظمة، ويتيح إضافة أنواع أصول ومؤشرات صيانة جديدة دون كسر العقود الحالية للـ API.</p>'
        )
        project.save()

        if not project.cover:
            project.cover.save(
                'alaa-assetops-django-api.svg',
                ContentFile(_cover_svg()),
                save=True,
            )

        tag_names = [
            'Python', 'Django', 'Django REST Framework', 'REST API', 'PostgreSQL',
            'Redis', 'Celery', 'Docker', 'OpenAPI', 'Backend',
        ]
        tags = [ProjectTag.objects.get_or_create(name=name)[0] for name in tag_names]
        project.tags.set(tags)

        action = 'إنشاء' if created else 'تحديث'
        self._ensure_gallery(project)
        self.stdout.write(self.style.SUCCESS(
            f'تم {action} المشروع العام المنشور: {project.title} '
            f'(المالك: {owner.handle}, الظهور: {project.visibility})'
        ))

    @staticmethod
    def _ensure_gallery(project):
        if project.images.exists():
            return

        for order, kind in enumerate(('api', 'data', 'infrastructure')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-assetops-{kind}.svg',
                ContentFile(_gallery_svg(kind)),
                save=True,
            )
