from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'Salla Growth Intelligence — منظومة نمو ذكية لمتاجر سلة'


def _cover_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs>'
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#10231d"/><stop offset="1" stop-color="#164e3b"/>'
        '</linearGradient>'
        '<linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">'
        '<stop offset="0" stop-color="#a3e635"/><stop offset="1" stop-color="#34d399"/>'
        '</linearGradient>'
        '</defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1020" cy="90" r="220" fill="#a3e635" opacity=".08"/>'
        '<circle cx="140" cy="640" r="290" fill="#34d399" opacity=".08"/>'
        '<text x="600" y="105" text-anchor="middle" fill="#d1fae5" font-size="29" '
        'font-family="Arial, sans-serif" letter-spacing="4">SALLA  /  COMMERCE INTELLIGENCE</text>'
        '<rect x="75" y="215" width="270" height="250" rx="24" fill="#102b23" stroke="#32654f" stroke-width="2"/>'
        '<text x="210" y="275" text-anchor="middle" fill="#a3e635" font-size="22" font-family="Arial, sans-serif">SALLA STORE</text>'
        '<rect x="115" y="305" width="190" height="112" rx="14" fill="#173c30"/>'
        '<path d="M140 380 L180 350 L216 365 L278 325" fill="none" stroke="#a3e635" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
        '<circle cx="278" cy="325" r="8" fill="#d9f99d"/>'
        '<path d="M350 340 H445" stroke="url(#accent)" stroke-width="5"/>'
        '<path d="M430 327 L450 340 L430 353" fill="none" stroke="#a3e635" stroke-width="5"/>'
        '<rect x="465" y="175" width="310" height="330" rx="30" fill="#15392c" stroke="#a3e635" stroke-width="3"/>'
        '<circle cx="620" cy="265" r="52" fill="#1e513d"/>'
        '<path d="M594 267 L613 286 L650 241" fill="none" stroke="#a3e635" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>'
        '<text x="620" y="355" text-anchor="middle" fill="#f0fdf4" font-size="29" font-weight="700" font-family="Arial, sans-serif">Growth Engine</text>'
        '<text x="620" y="398" text-anchor="middle" fill="#bbf7d0" font-size="19" font-family="Arial, sans-serif">Events  •  Rules  •  Insights</text>'
        '<rect x="515" y="430" width="210" height="38" rx="12" fill="#a3e635"/>'
        '<text x="620" y="456" text-anchor="middle" fill="#10231d" font-size="17" font-weight="700" font-family="Arial, sans-serif">SMART AUTOMATION</text>'
        '<path d="M780 270 H860" stroke="url(#accent)" stroke-width="5"/>'
        '<path d="M845 257 L865 270 L845 283" fill="none" stroke="#a3e635" stroke-width="5"/>'
        '<path d="M780 410 H860" stroke="url(#accent)" stroke-width="5"/>'
        '<path d="M845 397 L865 410 L845 423" fill="none" stroke="#a3e635" stroke-width="5"/>'
        '<rect x="880" y="190" width="245" height="130" rx="20" fill="#102b23" stroke="#32654f" stroke-width="2"/>'
        '<text x="1002" y="242" text-anchor="middle" fill="#a3e635" font-size="21" font-family="Arial, sans-serif">CONVERSION</text>'
        '<text x="1002" y="282" text-anchor="middle" fill="#f0fdf4" font-size="27" font-weight="700" font-family="Arial, sans-serif">+18.6%</text>'
        '<rect x="880" y="350" width="245" height="130" rx="20" fill="#102b23" stroke="#32654f" stroke-width="2"/>'
        '<text x="1002" y="402" text-anchor="middle" fill="#6ee7b7" font-size="21" font-family="Arial, sans-serif">RECOVERED CARTS</text>'
        '<text x="1002" y="442" text-anchor="middle" fill="#f0fdf4" font-size="27" font-weight="700" font-family="Arial, sans-serif">1,284</text>'
        '<text x="600" y="590" text-anchor="middle" fill="#bbf7d0" font-size="21" font-family="Arial, sans-serif">'
        'DATA-DRIVEN MERCHANDISING  /  AUTOMATION  /  INTEGRATIONS</text>'
        '</svg>'
    ).encode('utf-8')


def _gallery_svg(kind):
    screens = {
        'analytics': (
            'STORE PERFORMANCE ANALYTICS',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<rect x="180" y="215" width="840" height="52" rx="12" fill="#f0fdf4"/>'
            '<text x="215" y="249" fill="#166534" font-size="20" font-family="Arial, sans-serif">Revenue Overview</text>'
            '<rect x="185" y="290" width="190" height="92" rx="14" fill="#dcfce7"/>'
            '<rect x="395" y="290" width="190" height="92" rx="14" fill="#ecfccb"/>'
            '<rect x="605" y="290" width="190" height="92" rx="14" fill="#d1fae5"/>'
            '<rect x="815" y="290" width="190" height="92" rx="14" fill="#f0fdf4"/>'
            '<text x="280" y="327" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">CONVERSION RATE</text>'
            '<text x="280" y="359" text-anchor="middle" fill="#166534" font-size="25" font-weight="700" font-family="Arial, sans-serif">4.82%</text>'
            '<text x="490" y="327" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">AVERAGE ORDER</text>'
            '<text x="490" y="359" text-anchor="middle" fill="#166534" font-size="25" font-weight="700" font-family="Arial, sans-serif">SAR 286</text>'
            '<text x="700" y="327" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">REPEAT CUSTOMERS</text>'
            '<text x="700" y="359" text-anchor="middle" fill="#166534" font-size="25" font-weight="700" font-family="Arial, sans-serif">32.4%</text>'
            '<text x="910" y="327" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">CART RECOVERY</text>'
            '<text x="910" y="359" text-anchor="middle" fill="#166534" font-size="25" font-weight="700" font-family="Arial, sans-serif">SAR 18.2k</text>'
            '<rect x="185" y="405" width="540" height="160" rx="14" fill="#f8fafc"/>'
            '<path d="M220 520 L300 490 L370 500 L450 455 L530 472 L610 430 L690 448" fill="none" stroke="#16a34a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
            '<path d="M220 520 L300 490 L370 500 L450 455 L530 472 L610 430 L690 448 L690 540 L220 540 Z" fill="#bbf7d0" opacity=".55"/>'
            '<rect x="745" y="405" width="260" height="160" rx="14" fill="#f8fafc"/>'
            '<rect x="785" y="470" width="30" height="60" rx="6" fill="#86efac"/><rect x="835" y="445" width="30" height="85" rx="6" fill="#4ade80"/><rect x="885" y="420" width="30" height="110" rx="6" fill="#22c55e"/><rect x="935" y="455" width="30" height="75" rx="6" fill="#16a34a"/>'
        ),
        'automation': (
            'ABANDONED CART RECOVERY FLOW',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<rect x="205" y="315" width="180" height="105" rx="18" fill="#f0fdf4" stroke="#86efac" stroke-width="2"/>'
            '<text x="295" y="355" text-anchor="middle" fill="#166534" font-size="20" font-family="Arial, sans-serif">Cart Abandoned</text>'
            '<text x="295" y="385" text-anchor="middle" fill="#64748b" font-size="16" font-family="Arial, sans-serif">Event Trigger</text>'
            '<path d="M390 367 H485" stroke="#22c55e" stroke-width="4"/><path d="M470 354 L490 367 L470 380" fill="none" stroke="#22c55e" stroke-width="4"/>'
            '<rect x="495" y="315" width="180" height="105" rx="18" fill="#f7fee7" stroke="#a3e635" stroke-width="2"/>'
            '<text x="585" y="355" text-anchor="middle" fill="#3f6212" font-size="20" font-family="Arial, sans-serif">Wait 60 min</text>'
            '<text x="585" y="385" text-anchor="middle" fill="#64748b" font-size="16" font-family="Arial, sans-serif">Delay Queue</text>'
            '<path d="M680 367 H775" stroke="#22c55e" stroke-width="4"/><path d="M760 354 L780 367 L760 380" fill="none" stroke="#22c55e" stroke-width="4"/>'
            '<path d="M865 300 L955 367 L865 434 L775 367 Z" fill="#ecfccb" stroke="#a3e635" stroke-width="2"/>'
            '<text x="865" y="360" text-anchor="middle" fill="#3f6212" font-size="18" font-family="Arial, sans-serif">Order</text>'
            '<text x="865" y="385" text-anchor="middle" fill="#3f6212" font-size="18" font-family="Arial, sans-serif">Completed?</text>'
            '<path d="M865 438 V500 H700" fill="none" stroke="#16a34a" stroke-width="4"/>'
            '<rect x="465" y="475" width="230" height="75" rx="16" fill="#dcfce7"/>'
            '<text x="580" y="507" text-anchor="middle" fill="#166534" font-size="18" font-family="Arial, sans-serif">Send Recovery</text>'
            '<text x="580" y="532" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">Email / SMS / Coupon</text>'
            '<text x="920" y="480" fill="#16a34a" font-size="16" font-family="Arial, sans-serif">NO</text>'
            '<rect x="205" y="220" width="790" height="56" rx="14" fill="#f8fafc"/>'
            '<text x="600" y="255" text-anchor="middle" fill="#334155" font-size="19" font-family="Arial, sans-serif">Idempotent workflows • Consent-aware messaging • Conversion attribution</text>'
        ),
        'integration': (
            'SALLA INTEGRATION ARCHITECTURE',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<rect x="490" y="320" width="220" height="120" rx="22" fill="#14532d"/>'
            '<text x="600" y="370" text-anchor="middle" fill="#f0fdf4" font-size="25" font-weight="700" font-family="Arial, sans-serif">Salla App</text>'
            '<text x="600" y="405" text-anchor="middle" fill="#bbf7d0" font-size="17" font-family="Arial, sans-serif">OAuth • Webhooks</text>'
            '<rect x="200" y="230" width="205" height="88" rx="16" fill="#f0fdf4" stroke="#86efac" stroke-width="2"/>'
            '<text x="302" y="266" text-anchor="middle" fill="#166534" font-size="19" font-family="Arial, sans-serif">Salla Store</text>'
            '<text x="302" y="293" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">Products • Orders</text>'
            '<rect x="795" y="230" width="205" height="88" rx="16" fill="#eff6ff" stroke="#93c5fd" stroke-width="2"/>'
            '<text x="897" y="266" text-anchor="middle" fill="#1d4ed8" font-size="19" font-family="Arial, sans-serif">CRM Platform</text>'
            '<text x="897" y="293" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">Customer Segments</text>'
            '<rect x="200" y="475" width="205" height="88" rx="16" fill="#fefce8" stroke="#fde047" stroke-width="2"/>'
            '<text x="302" y="511" text-anchor="middle" fill="#854d0e" font-size="19" font-family="Arial, sans-serif">Payment Gateway</text>'
            '<text x="302" y="538" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">Payment Events</text>'
            '<rect x="795" y="475" width="205" height="88" rx="16" fill="#fdf2f8" stroke="#f9a8d4" stroke-width="2"/>'
            '<text x="897" y="511" text-anchor="middle" fill="#9d174d" font-size="19" font-family="Arial, sans-serif">Analytics</text>'
            '<text x="897" y="538" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">Event Warehouse</text>'
            '<path d="M410 274 H480 M720 274 H790 M410 519 H480 M720 519 H790" stroke="#16a34a" stroke-width="4"/>'
            '<path d="M465 262 L485 274 L465 286 M775 262 L795 274 L775 286 M465 507 L485 519 L465 531 M775 507 L795 519 L775 531" fill="none" stroke="#16a34a" stroke-width="4"/>'
            '<text x="600" y="240" text-anchor="middle" fill="#64748b" font-size="16" font-family="Arial, sans-serif">Signed event delivery &amp; retry-safe processing</text>'
        ),
    }
    label, artwork = screens[kind]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#f0fdf4"/><stop offset="1" stop-color="#dcfce7"/>'
        '</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1080" cy="80" r="210" fill="#4ade80" opacity=".12"/>'
        '<text x="600" y="115" text-anchor="middle" fill="#14532d" font-size="29" '
        'font-family="Arial, sans-serif" letter-spacing="3">SALLA GROWTH INTELLIGENCE  /  '
        f'{label}</text>'
        f'{artwork}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع تكامل ذكي مع سلة للمدرب علاء وادي.'

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
                    'تطبيق ذكي لمتاجر سلة يحوّل بيانات الطلبات والعملاء إلى قرارات نمو قابلة للقياس، '
                    'مع أتمتة استعادة السلات وتحسين الترويج والتكاملات.'
                ),
                'category': 'برمجة',
                'role': 'Salla App Developer — E-Commerce Automation',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1490,
                'likes': 328,
            },
        )

        project.summary = (
            'تطبيق ذكي لمتاجر سلة يحوّل بيانات الطلبات والعملاء إلى قرارات نمو قابلة للقياس، '
            'مع أتمتة استعادة السلات وتحسين الترويج والتكاملات.'
        )
        project.category = 'برمجة'
        project.role = 'Salla App Developer — E-Commerce Automation'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>Salla Growth Intelligence تطبيق مخصص لمنصة سلة يساعد المتاجر على الانتقال من '
            'إدارة الطلبات اليومية إلى نمو قائم على البيانات. يجمع مؤشرات المتجر، ويكشف فرص التحسين، '
            'ثم يشغّل إجراءات آلية قابلة للقياس ضمن تجربة استخدام موحّدة.</p>'
            '<h2>قدرات ذكية للتاجر</h2>'
            '<ul>'
            '<li>لوحة تحليلات تجمع conversion rate وaverage order value وrepeat purchase rate '
            'ومصادر الإيراد في واجهة تشغيلية واضحة.</li>'
            '<li>محرك توصية merchandising يرتّب فرص بيع المنتجات والـ cross-sell اعتماداً على '
            'الأداء، المخزون، وسلوك شرائح العملاء.</li>'
            '<li>استعادة السلات المتروكة عبر workflows مشروطة: تأخير قابل للتهيئة، التحقق من اكتمال الطلب، '
            'ثم إرسال رسالة أو قسيمة مناسبة مع قياس attribution.</li>'
            '<li>تنبيهات استباقية لانخفاض المخزون، تراجع التحويل، أو ارتفاع إلغاء الطلبات.</li>'
            '<li>تقسيم العملاء إلى شرائح قابلة للتفعيل وفق قيمة العميل، تكرار الشراء، وتفاعل الحملات.</li>'
            '</ul>'
            '<h2>التكامل والمعمارية</h2>'
            '<p>تكامل قائم على Salla App APIs وOAuth scopes المناسبة، مع استقبال webhooks للأحداث '
            'المهمة مثل إنشاء الطلب وتحديث حالته. تتم معايرة معالجة الأحداث باستخدام signature verification، '
            'idempotency keys، retry policy، وdead-letter handling لتقليل التكرار وفقدان الأحداث. '
            'يمكن توصيل التطبيق بمنصات CRM، قنوات الرسائل، وبوابات الدفع والتحليلات.</p>'
            '<h2>الموثوقية والأمان</h2>'
            '<p>يتضمن التصميم عزل بيانات كل متجر عبر tenant-aware access control، إدارة آمنة للرموز '
            'والأذونات، سجلات تدقيق، ومراقبة للمهام. كما يدعم feature flags، حدود استدعاء API، '
            'ومعالجة graceful degradation عند تعذر خدمة خارجية.</p>'
            '<h2>القيمة التجارية</h2>'
            '<p>الهدف ليس عرض أرقام فقط، بل تحويل الإشارات التشغيلية إلى إجراءات: استعادة الإيراد المفقود، '
            'تحسين اكتشاف المنتجات، وتقليل القرارات اليدوية. صُممت المؤشرات والـ automation flows '
            'لتكون قابلة للتهيئة والقياس بما يناسب سياسات كل متجر.</p>'
        )
        project.save()

        if not project.cover:
            project.cover.save(
                'alaa-salla-growth-intelligence.svg',
                ContentFile(_cover_svg()),
                save=True,
            )

        tag_names = [
            'Salla', 'E-Commerce', 'API Integration', 'Webhooks', 'OAuth',
            'Automation', 'Analytics', 'Python', 'Django', 'Redis',
        ]
        tags = [ProjectTag.objects.get_or_create(name=name)[0] for name in tag_names]
        project.tags.set(tags)

        self._ensure_gallery(project)
        action = 'إنشاء' if created else 'تحديث'
        self.stdout.write(self.style.SUCCESS(
            f'تم {action} المشروع العام المنشور: {project.title} '
            f'(المالك: {owner.handle}, الظهور: {project.visibility})'
        ))

    @staticmethod
    def _ensure_gallery(project):
        if project.images.exists():
            return

        for order, kind in enumerate(('analytics', 'automation', 'integration')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-salla-{kind}.svg',
                ContentFile(_gallery_svg(kind)),
                save=True,
            )
