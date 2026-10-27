from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'Ledgerly AI — نظام محاسبة سحابي ذكي'


def _artwork(kind):
    boards = {
        'cover': (
            '<rect x="70" y="175" width="330" height="385" rx="26" fill="#111827" stroke="#38bdf8" stroke-width="3"/>'
            '<rect x="92" y="198" width="286" height="338" rx="16" fill="#f8fafc"/>'
            '<rect x="112" y="220" width="246" height="54" rx="12" fill="#0f172a"/>'
            '<circle cx="140" cy="247" r="11" fill="#22d3ee"/><rect x="162" y="240" width="130" height="14" rx="7" fill="#cbd5e1"/>'
            '<rect x="115" y="295" width="108" height="80" rx="12" fill="#dbeafe"/><text x="169" y="327" text-anchor="middle" fill="#1d4ed8" font-size="14" font-family="Arial, sans-serif">NET PROFIT</text><text x="169" y="359" text-anchor="middle" fill="#0f172a" font-size="23" font-family="Arial, sans-serif">$8.4K</text>'
            '<rect x="237" y="295" width="108" height="80" rx="12" fill="#dcfce7"/><text x="291" y="327" text-anchor="middle" fill="#166534" font-size="14" font-family="Arial, sans-serif">INVENTORY</text><text x="291" y="359" text-anchor="middle" fill="#0f172a" font-size="23" font-family="Arial, sans-serif">1,284</text>'
            '<rect x="115" y="395" width="230" height="105" rx="12" fill="#eff6ff"/>'
            '<path d="M135 470 L170 450 L205 462 L245 430 L280 442 L325 410" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/>'
            '<text x="235" y="530" text-anchor="middle" fill="#0f172a" font-size="20" font-weight="700" font-family="Arial, sans-serif">LEDGERLY AI</text>'
            '<text x="235" y="600" text-anchor="middle" fill="#bae6fd" font-size="17" font-family="Arial, sans-serif">CLOUD ACCOUNTING</text>'
            '<rect x="440" y="190" width="320" height="345" rx="25" fill="#111827" stroke="#22d3ee" stroke-width="2"/>'
            '<text x="600" y="240" text-anchor="middle" fill="#67e8f9" font-size="20" font-family="Arial, sans-serif">AI FINANCE ASSISTANT</text>'
            '<circle cx="600" cy="335" r="72" fill="#164e63" stroke="#22d3ee" stroke-width="3"/>'
            '<path d="M600 285 L613 321 L651 321 L620 344 L632 380 L600 358 L568 380 L580 344 L549 321 L587 321Z" fill="#a5f3fc"/>'
            '<rect x="490" y="430" width="220" height="48" rx="13" fill="#0f766e"/>'
            '<text x="600" y="460" text-anchor="middle" fill="#ecfeff" font-size="16" font-family="Arial, sans-serif">OCR • INSIGHTS • FORECASTS</text>'
            '<text x="600" y="505" text-anchor="middle" fill="#cbd5e1" font-size="15" font-family="Arial, sans-serif">Human-reviewed suggestions</text>'
            '<rect x="800" y="205" width="310" height="150" rx="22" fill="#111827" stroke="#334155" stroke-width="2"/>'
            '<text x="955" y="250" text-anchor="middle" fill="#7dd3fc" font-size="19" font-family="Arial, sans-serif">CLOUD SYNC</text>'
            '<rect x="850" y="277" width="78" height="45" rx="10" fill="#1e3a5f"/><text x="889" y="306" text-anchor="middle" fill="#dbeafe" font-size="15" font-family="Arial, sans-serif">LAPTOP</text>'
            '<rect x="946" y="277" width="64" height="45" rx="10" fill="#164e63"/><text x="978" y="306" text-anchor="middle" fill="#cffafe" font-size="15" font-family="Arial, sans-serif">MOBILE</text>'
            '<path d="M930 300 H943" stroke="#38bdf8" stroke-width="4"/>'
            '<rect x="800" y="385" width="310" height="150" rx="22" fill="#111827" stroke="#334155" stroke-width="2"/>'
            '<text x="955" y="430" text-anchor="middle" fill="#86efac" font-size="19" font-family="Arial, sans-serif">INVENTORY &amp; PROFIT</text>'
            '<rect x="850" y="460" width="205" height="12" rx="6" fill="#334155"/><rect x="850" y="460" width="155" height="12" rx="6" fill="#22c55e"/>'
            '<rect x="850" y="485" width="160" height="12" rx="6" fill="#334155"/><rect x="850" y="485" width="115" height="12" rx="6" fill="#38bdf8"/>'
            '<rect x="260" y="580" width="680" height="52" rx="16" fill="#0b1220" stroke="#1e3a5f"/>'
            '<text x="600" y="613" text-anchor="middle" fill="#bae6fd" font-size="18" font-family="Arial, sans-serif">ACCOUNTING • STOCK • PROFIT • REPORTING • AI</text>'
        ),
        'dashboard': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#f8fafc"/>'
            '<rect x="180" y="215" width="840" height="48" rx="12" fill="#e2e8f0"/><text x="220" y="247" fill="#0f172a" font-size="20" font-family="Arial, sans-serif">Business Overview / Monthly</text>'
            '<rect x="185" y="285" width="190" height="85" rx="14" fill="#dbeafe"/><text x="280" y="318" text-anchor="middle" fill="#1e40af" font-size="14" font-family="Arial, sans-serif">REVENUE</text><text x="280" y="350" text-anchor="middle" fill="#0f172a" font-size="25" font-family="Arial, sans-serif">$24,860</text>'
            '<rect x="395" y="285" width="190" height="85" rx="14" fill="#dcfce7"/><text x="490" y="318" text-anchor="middle" fill="#166534" font-size="14" font-family="Arial, sans-serif">GROSS PROFIT</text><text x="490" y="350" text-anchor="middle" fill="#0f172a" font-size="25" font-family="Arial, sans-serif">$8,420</text>'
            '<rect x="605" y="285" width="190" height="85" rx="14" fill="#fef3c7"/><text x="700" y="318" text-anchor="middle" fill="#92400e" font-size="14" font-family="Arial, sans-serif">EXPENSES</text><text x="700" y="350" text-anchor="middle" fill="#0f172a" font-size="25" font-family="Arial, sans-serif">$5,230</text>'
            '<rect x="815" y="285" width="190" height="85" rx="14" fill="#ede9fe"/><text x="910" y="318" text-anchor="middle" fill="#5b21b6" font-size="14" font-family="Arial, sans-serif">CASH FLOW</text><text x="910" y="350" text-anchor="middle" fill="#0f172a" font-size="25" font-family="Arial, sans-serif">$3,190</text>'
            '<rect x="185" y="395" width="525" height="165" rx="14" fill="#fff"/><text x="445" y="428" text-anchor="middle" fill="#334155" font-size="17" font-family="Arial, sans-serif">Revenue &amp; Margin Trend</text>'
            '<path d="M220 520 L290 492 L360 500 L430 460 L500 475 L575 438 L675 450" fill="none" stroke="#2563eb" stroke-width="7" stroke-linecap="round"/>'
            '<path d="M220 535 L290 520 L360 525 L430 505 L500 510 L575 490 L675 500" fill="none" stroke="#16a34a" stroke-width="5" stroke-linecap="round"/>'
            '<rect x="730" y="395" width="275" height="165" rx="14" fill="#fff"/><text x="867" y="430" text-anchor="middle" fill="#334155" font-size="17" font-family="Arial, sans-serif">AI INSIGHT</text>'
            '<rect x="760" y="452" width="215" height="78" rx="12" fill="#eff6ff"/><text x="867" y="482" text-anchor="middle" fill="#1e40af" font-size="15" font-family="Arial, sans-serif">Margin changed in 2 categories</text><text x="867" y="508" text-anchor="middle" fill="#64748b" font-size="14" font-family="Arial, sans-serif">Review suggested • not auto-posted</text>'
        ),
        'inventory': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<text x="600" y="235" text-anchor="middle" fill="#0f172a" font-size="22" font-family="Arial, sans-serif">INVENTORY VALUATION &amp; REORDER SIGNALS</text>'
            '<rect x="190" y="260" width="820" height="46" rx="10" fill="#e2e8f0"/>'
            '<text x="220" y="289" fill="#334155" font-size="15" font-family="Arial, sans-serif">SKU / ITEM</text><text x="500" y="289" fill="#334155" font-size="15" font-family="Arial, sans-serif">ON HAND</text><text x="650" y="289" fill="#334155" font-size="15" font-family="Arial, sans-serif">UNIT COST</text><text x="815" y="289" fill="#334155" font-size="15" font-family="Arial, sans-serif">STOCK VALUE</text>'
            '<rect x="190" y="318" width="820" height="58" rx="9" fill="#f8fafc"/><text x="220" y="354" fill="#0f172a" font-size="16" font-family="Arial, sans-serif">Product A</text><text x="500" y="354" fill="#334155" font-size="16" font-family="Arial, sans-serif">148</text><text x="650" y="354" fill="#334155" font-size="16" font-family="Arial, sans-serif">$12.50</text><text x="815" y="354" fill="#0f172a" font-size="16" font-family="Arial, sans-serif">$1,850</text>'
            '<rect x="190" y="386" width="820" height="58" rx="9" fill="#fff"/> <text x="220" y="422" fill="#0f172a" font-size="16" font-family="Arial, sans-serif">Product B</text><text x="500" y="422" fill="#334155" font-size="16" font-family="Arial, sans-serif">24</text><text x="650" y="422" fill="#334155" font-size="16" font-family="Arial, sans-serif">$8.00</text><text x="815" y="422" fill="#0f172a" font-size="16" font-family="Arial, sans-serif">$192</text>'
            '<rect x="190" y="454" width="820" height="58" rx="9" fill="#fff7ed"/> <text x="220" y="490" fill="#0f172a" font-size="16" font-family="Arial, sans-serif">Product C • Reorder alert</text><text x="500" y="490" fill="#b45309" font-size="16" font-family="Arial, sans-serif">5</text><text x="650" y="490" fill="#334155" font-size="16" font-family="Arial, sans-serif">$21.00</text><text x="815" y="490" fill="#0f172a" font-size="16" font-family="Arial, sans-serif">$105</text>'
            '<rect x="190" y="530" width="820" height="38" rx="10" fill="#ecfdf5"/><text x="600" y="555" text-anchor="middle" fill="#166534" font-size="15" font-family="Arial, sans-serif">FIFO / weighted-average costing • Stock movements are auditable</text>'
        ),
        'ai': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#0f172a"/>'
            '<rect x="190" y="230" width="230" height="275" rx="18" fill="#1e293b"/>'
            '<rect x="220" y="265" width="170" height="85" rx="12" fill="#334155"/><text x="305" y="300" text-anchor="middle" fill="#bae6fd" font-size="17" font-family="Arial, sans-serif">INVOICE IMAGE</text><path d="M260 320 H350 M260 335 H330" stroke="#cbd5e1" stroke-width="4"/>'
            '<text x="305" y="390" text-anchor="middle" fill="#e2e8f0" font-size="16" font-family="Arial, sans-serif">OCR + Extraction</text>'
            '<text x="305" y="430" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="Arial, sans-serif">Draft only</text>'
            '<path d="M425 365 H485" stroke="#38bdf8" stroke-width="4"/><path d="M470 352 L490 365 L470 378" fill="none" stroke="#38bdf8" stroke-width="4"/>'
            '<rect x="495" y="230" width="230" height="275" rx="18" fill="#1e293b"/>'
            '<text x="610" y="275" text-anchor="middle" fill="#67e8f9" font-size="18" font-family="Arial, sans-serif">AI VALIDATION</text>'
            '<rect x="530" y="300" width="160" height="48" rx="10" fill="#164e63"/><text x="610" y="330" text-anchor="middle" fill="#cffafe" font-size="15" font-family="Arial, sans-serif">Supplier match</text>'
            '<rect x="530" y="360" width="160" height="48" rx="10" fill="#164e63"/><text x="610" y="390" text-anchor="middle" fill="#cffafe" font-size="15" font-family="Arial, sans-serif">Category suggestion</text>'
            '<rect x="530" y="420" width="160" height="48" rx="10" fill="#713f12"/><text x="610" y="450" text-anchor="middle" fill="#fef3c7" font-size="15" font-family="Arial, sans-serif">Needs review</text>'
            '<path d="M730 365 H790" stroke="#38bdf8" stroke-width="4"/><path d="M775 352 L795 365 L775 378" fill="none" stroke="#38bdf8" stroke-width="4"/>'
            '<rect x="800" y="230" width="210" height="275" rx="18" fill="#1e293b"/>'
            '<text x="905" y="275" text-anchor="middle" fill="#86efac" font-size="18" font-family="Arial, sans-serif">HUMAN APPROVAL</text>'
            '<circle cx="905" cy="355" r="42" fill="#14532d"/><path d="M884 355 L899 370 L928 337" fill="none" stroke="#bbf7d0" stroke-width="7"/>'
            '<text x="905" y="430" text-anchor="middle" fill="#e2e8f0" font-size="16" font-family="Arial, sans-serif">Post to ledger</text>'
            '<text x="600" y="555" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">AI proposes • User verifies • Accounting records stay explainable</text>'
        ),
    }
    labels = {
        'cover': 'LEDGERLY AI  /  CLOUD ACCOUNTING',
        'dashboard': 'LEDGERLY  /  FINANCIAL OVERVIEW',
        'inventory': 'LEDGERLY  /  INVENTORY VALUATION',
        'ai': 'LEDGERLY AI  /  ASSISTED BOOKKEEPING',
    }
    if kind == 'dashboard' or kind == 'inventory':
        gradient = '<stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#dbeafe"/>'
        title_color = '#0f172a'
    else:
        gradient = '<stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#164e63"/>'
        title_color = '#cffafe'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">{gradient}</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        f'<text x="600" y="115" text-anchor="middle" fill="{title_color}" font-size="28" '
        f'font-family="Arial, sans-serif" letter-spacing="3">{labels[kind]}</text>'
        f'{boards[kind]}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع محاسبة سحابي ذكي عام للمدرب علاء وادي.'

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
                    'نظام محاسبة سحابي متجاوب للابتوب والهاتف، يجمع القيود والفواتير والمخزون '
                    'والأرباح والتقارير مع مساعد ذكاء اصطناعي لإدخال البيانات واستخلاص المؤشرات.'
                ),
                'category': 'برمجة',
                'role': 'Full Stack Developer / Cloud Accounting',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1740,
                'likes': 371,
            },
        )
        project.summary = (
            'نظام محاسبة سحابي متجاوب للابتوب والهاتف، يجمع القيود والفواتير والمخزون '
            'والأرباح والتقارير مع مساعد ذكاء اصطناعي لإدخال البيانات واستخلاص المؤشرات.'
        )
        project.category = 'برمجة'
        project.role = 'Full Stack Developer / Cloud Accounting'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>نظرة عامة</h2>'
            '<p>منصة محاسبة سحابية مصممة لإدارة العمليات المالية والمخزون من واجهة واحدة، '
            'مع تجربة متجاوبة تعمل على اللابتوب والهاتف. تجمع المنصة القيود والفواتير وحركة الأصناف '
            'والتقارير لتمنح أصحاب الأعمال رؤية أوضح للتدفق المالي والأداء التشغيلي.</p>'
            '<h2>الوحدات الأساسية</h2>'
            '<ul>'
            '<li>دفتر أستاذ وقيود مزدوجة مع شجرة حسابات، فترات مالية، وسجل تدقيق للتعديلات.</li>'
            '<li>فواتير المبيعات والمشتريات، العملاء والموردون، المصروفات، وحالة التحصيل والسداد.</li>'
            '<li>إدارة مخزون متعدد الأصناف والمستودعات مع حركات وارد وصادر وتسويات ونقاط إعادة طلب.</li>'
            '<li>احتساب تكلفة البضاعة المباعة والهامش والربح وفق سياسة costing محددة وقابلة للتدقيق.</li>'
            '<li>تقارير مالية وتشغيلية قابلة للتصفية والتصدير: الأرباح والخسائر، التدفق النقدي، '
            'أعمار الذمم، تقييم المخزون، ومقارنة الفترات.</li>'
            '</ul>'
            '<h2>مساعد الذكاء الاصطناعي</h2>'
            '<p>يساعد AI في OCR واستخراج حقول الفواتير، اقتراح تصنيف المصروفات، كشف التكرارات '
            'والشذوذات المحتملة، وتلخيص اتجاهات الإيراد والمخزون. تظهر الاقتراحات مع مصدرها '
            'ومستوى الثقة، وتبقى القيود المالية مسودات لا تُرحّل إلى دفتر الأستاذ إلا بعد مراجعة '
            'وموافقة المستخدم المخول.</p>'
            '<h2>السحابة وتجربة الأجهزة</h2>'
            '<p>تصميم responsive وPWA-friendly للوصول من متصفح الهاتف واللابتوب، مع مزامنة آمنة '
            'للبيانات، تنبيهات لحالة المزامنة، واستعادة واضحة عند انقطاع الاتصال. تُحمى بيانات الشركات '
            'بعزل tenant-aware، صلاحيات حسب الدور، تشفير أثناء النقل، نسخ احتياطية، وسجل تدقيق '
            'للعمليات المالية الحساسة.</p>'
            '<h2>التحليلات والقرارات</h2>'
            '<p>تجمع لوحات المعلومات مؤشرات الإيراد والهامش والمصروفات والسيولة وقيمة المخزون. '
            'يمكن إضافة توقعات مبنية على بيانات تاريخية كإشارات تخطيطية، مع إظهار الافتراضات '
            'ومدى عدم اليقين وعدم التعامل معها كضمان للأرباح أو بديلاً للمحاسب.</p>'
            '<h2>حالة المشروع</h2>'
            '<p>هذا وصف Portfolio للمشروع ومزاياه المقصودة، ولا يتضمن أرقام أداء أو نتائج مالية '
            'مختلقة. يجب مواءمة التطبيق الفعلي مع متطلبات المحاسبة والضرائب والخصوصية والأنظمة '
            'المحلية في كل سوق قبل الاستخدام التجاري.</p>'
        )
        project.save()
        if not project.cover:
            project.cover.save(
                'alaa-ledgerly-cloud-accounting.svg',
                ContentFile(_artwork('cover')),
                save=True,
            )

        names = [
            'Python', 'Django', 'Cloud Accounting', 'AI', 'OCR',
            'Inventory Management', 'Financial Reporting', 'Profit Analytics',
            'Responsive Web App', 'SaaS',
        ]
        project.tags.set([ProjectTag.objects.get_or_create(name=name)[0] for name in names])
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
        for order, kind in enumerate(('dashboard', 'inventory', 'ai')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-ledgerly-{kind}.svg',
                ContentFile(_artwork(kind)),
                save=True,
            )
