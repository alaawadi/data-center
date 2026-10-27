from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'SERA ProjectOps — نظام إدارة ومتابعة المشاريع الإنشائية'


def _artwork(kind):
    boards = {
        'cover': (
            '<rect x="70" y="175" width="320" height="385" rx="26" fill="#111827" stroke="#38bdf8" stroke-width="3"/>'
            '<rect x="92" y="198" width="276" height="338" rx="16" fill="#1e293b"/>'
            '<rect x="120" y="225" width="220" height="170" rx="13" fill="#334155"/>'
            '<path d="M140 380 V305 L180 275 L220 315 L260 260 L320 310 V380Z" fill="#0f766e"/>'
            '<rect x="170" y="325" width="24" height="55" fill="#cbd5e1"/><rect x="225" y="330" width="24" height="50" fill="#cbd5e1"/><rect x="275" y="325" width="23" height="55" fill="#cbd5e1"/>'
            '<text x="230" y="445" text-anchor="middle" fill="#f8fafc" font-size="24" font-weight="700" font-family="Arial, sans-serif">SERA</text>'
            '<text x="230" y="480" text-anchor="middle" fill="#bae6fd" font-size="15" font-family="Arial, sans-serif">PROJECT OPERATIONS</text>'
            '<rect x="435" y="190" width="320" height="345" rx="25" fill="#111827" stroke="#38bdf8" stroke-width="2"/>'
            '<text x="595" y="240" text-anchor="middle" fill="#7dd3fc" font-size="20" font-family="Arial, sans-serif">CONTROL CENTER</text>'
            '<rect x="475" y="270" width="240" height="70" rx="14" fill="#1e3a5f"/>'
            '<text x="500" y="300" fill="#bae6fd" font-size="15" font-family="Arial, sans-serif">ACTIVE PROJECTS</text>'
            '<text x="680" y="320" text-anchor="end" fill="#fff" font-size="28" font-weight="700" font-family="Arial, sans-serif">12</text>'
            '<rect x="475" y="355" width="240" height="70" rx="14" fill="#14532d"/>'
            '<text x="500" y="385" fill="#bbf7d0" font-size="15" font-family="Arial, sans-serif">ON SCHEDULE</text>'
            '<text x="680" y="405" text-anchor="end" fill="#fff" font-size="28" font-weight="700" font-family="Arial, sans-serif">83%</text>'
            '<rect x="475" y="440" width="240" height="55" rx="13" fill="#334155"/>'
            '<path d="M495 470 H530 L543 455 L560 482 L580 463 L605 470 L630 455 L650 472 L690 462" fill="none" stroke="#38bdf8" stroke-width="4"/>'
            '<rect x="800" y="205" width="310" height="150" rx="22" fill="#111827" stroke="#334155" stroke-width="2"/>'
            '<text x="955" y="250" text-anchor="middle" fill="#bae6fd" font-size="19" font-family="Arial, sans-serif">SCHEDULE / GANTT</text>'
            '<rect x="850" y="275" width="170" height="13" rx="6" fill="#1d4ed8"/><rect x="890" y="298" width="150" height="13" rx="6" fill="#0f766e"/><rect x="930" y="321" width="110" height="13" rx="6" fill="#f59e0b"/>'
            '<rect x="800" y="385" width="310" height="150" rx="22" fill="#111827" stroke="#334155" stroke-width="2"/>'
            '<text x="955" y="430" text-anchor="middle" fill="#bae6fd" font-size="19" font-family="Arial, sans-serif">FIELD PROGRESS</text>'
            '<circle cx="870" cy="480" r="25" fill="#14532d"/><path d="M859 480 L868 489 L883 470" fill="none" stroke="#bbf7d0" stroke-width="5"/>'
            '<rect x="910" y="462" width="150" height="12" rx="6" fill="#334155"/><rect x="910" y="462" width="112" height="12" rx="6" fill="#22c55e"/>'
            '<rect x="260" y="580" width="680" height="52" rx="16" fill="#0b1220" stroke="#1e3a5f"/>'
            '<text x="600" y="613" text-anchor="middle" fill="#bae6fd" font-size="18" font-family="Arial, sans-serif">PORTFOLIO • SCHEDULE • COST • FIELD REPORTING</text>'
        ),
        'dashboard': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#f8fafc"/>'
            '<rect x="180" y="215" width="840" height="48" rx="12" fill="#e2e8f0"/>'
            '<text x="220" y="247" fill="#0f172a" font-size="20" font-family="Arial, sans-serif">SERA / Project Portfolio Dashboard</text>'
            '<rect x="185" y="285" width="190" height="88" rx="14" fill="#dbeafe"/><text x="280" y="319" text-anchor="middle" fill="#1e40af" font-size="15" font-family="Arial, sans-serif">ACTIVE PROJECTS</text><text x="280" y="354" text-anchor="middle" fill="#0f172a" font-size="27" font-family="Arial, sans-serif">12</text>'
            '<rect x="395" y="285" width="190" height="88" rx="14" fill="#dcfce7"/><text x="490" y="319" text-anchor="middle" fill="#166534" font-size="15" font-family="Arial, sans-serif">SCHEDULE HEALTH</text><text x="490" y="354" text-anchor="middle" fill="#0f172a" font-size="27" font-family="Arial, sans-serif">83%</text>'
            '<rect x="605" y="285" width="190" height="88" rx="14" fill="#fef3c7"/><text x="700" y="319" text-anchor="middle" fill="#92400e" font-size="15" font-family="Arial, sans-serif">OPEN RISKS</text><text x="700" y="354" text-anchor="middle" fill="#0f172a" font-size="27" font-family="Arial, sans-serif">07</text>'
            '<rect x="815" y="285" width="190" height="88" rx="14" fill="#fee2e2"/><text x="910" y="319" text-anchor="middle" fill="#991b1b" font-size="15" font-family="Arial, sans-serif">OVERDUE TASKS</text><text x="910" y="354" text-anchor="middle" fill="#0f172a" font-size="27" font-family="Arial, sans-serif">04</text>'
            '<rect x="185" y="395" width="500" height="165" rx="14" fill="#fff"/>'
            '<path d="M220 520 L290 490 L370 500 L445 450 L520 475 L600 430 L650 445" fill="none" stroke="#2563eb" stroke-width="7" stroke-linecap="round"/>'
            '<path d="M220 520 L290 490 L370 500 L445 450 L520 475 L600 430 L650 445" fill="none" stroke="#93c5fd" stroke-width="18" opacity=".18"/>'
            '<text x="435" y="430" text-anchor="middle" fill="#334155" font-size="17" font-family="Arial, sans-serif">Planned vs. Actual Progress</text>'
            '<rect x="705" y="395" width="300" height="165" rx="14" fill="#fff"/>'
            '<text x="855" y="432" text-anchor="middle" fill="#334155" font-size="17" font-family="Arial, sans-serif">PROJECT HEALTH</text>'
            '<circle cx="855" cy="490" r="42" fill="none" stroke="#e2e8f0" stroke-width="14"/><path d="M855 448 A42 42 0 1 1 817 508" fill="none" stroke="#16a34a" stroke-width="14" stroke-linecap="round"/>'
            '<text x="855" y="497" text-anchor="middle" fill="#166534" font-size="20" font-family="Arial, sans-serif">GOOD</text>'
        ),
        'schedule': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<text x="600" y="235" text-anchor="middle" fill="#0f172a" font-size="22" font-family="Arial, sans-serif">SCHEDULE BASELINE / GANTT VIEW</text>'
            '<path d="M355 265 V555 M485 265 V555 M615 265 V555 M745 265 V555 M875 265 V555" stroke="#e2e8f0" stroke-width="2"/>'
            '<text x="420" y="292" text-anchor="middle" fill="#64748b" font-size="14" font-family="Arial, sans-serif">WEEK 01</text><text x="550" y="292" text-anchor="middle" fill="#64748b" font-size="14" font-family="Arial, sans-serif">WEEK 02</text><text x="680" y="292" text-anchor="middle" fill="#64748b" font-size="14" font-family="Arial, sans-serif">WEEK 03</text><text x="810" y="292" text-anchor="middle" fill="#64748b" font-size="14" font-family="Arial, sans-serif">WEEK 04</text>'
            '<text x="185" y="340" fill="#334155" font-size="16" font-family="Arial, sans-serif">Site preparation</text><rect x="360" y="320" width="205" height="30" rx="8" fill="#2563eb"/>'
            '<text x="185" y="395" fill="#334155" font-size="16" font-family="Arial, sans-serif">Foundation works</text><rect x="460" y="375" width="245" height="30" rx="8" fill="#0f766e"/>'
            '<text x="185" y="450" fill="#334155" font-size="16" font-family="Arial, sans-serif">Structural frame</text><rect x="600" y="430" width="270" height="30" rx="8" fill="#f59e0b"/>'
            '<text x="185" y="505" fill="#334155" font-size="16" font-family="Arial, sans-serif">MEP coordination</text><rect x="700" y="485" width="220" height="30" rx="8" fill="#7c3aed"/>'
            '<path d="M615 300 V540" stroke="#dc2626" stroke-width="3" stroke-dasharray="7 6"/><text x="615" y="565" text-anchor="middle" fill="#b91c1c" font-size="14" font-family="Arial, sans-serif">TODAY</text>'
        ),
        'field': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#0f172a"/>'
            '<rect x="190" y="225" width="480" height="300" rx="18" fill="#334155"/>'
            '<path d="M210 460 L330 350 L410 420 L505 300 L650 430 V525 H210Z" fill="#475569"/>'
            '<rect x="290" y="365" width="60" height="100" fill="#cbd5e1"/><rect x="390" y="385" width="60" height="80" fill="#cbd5e1"/><rect x="505" y="340" width="65" height="125" fill="#cbd5e1"/>'
            '<rect x="220" y="245" width="155" height="40" rx="10" fill="#0f766e"/><text x="297" y="272" text-anchor="middle" fill="#fff" font-size="16" font-family="Arial, sans-serif">SITE UPDATE</text>'
            '<rect x="700" y="225" width="300" height="90" rx="16" fill="#1e293b"/><text x="850" y="260" text-anchor="middle" fill="#7dd3fc" font-size="18" font-family="Arial, sans-serif">FIELD REPORT</text><text x="850" y="292" text-anchor="middle" fill="#e2e8f0" font-size="16" font-family="Arial, sans-serif">Progress • Issue • Evidence</text>'
            '<rect x="700" y="335" width="300" height="90" rx="16" fill="#1e293b"/><text x="850" y="370" text-anchor="middle" fill="#86efac" font-size="18" font-family="Arial, sans-serif">DAILY LOG</text><text x="850" y="402" text-anchor="middle" fill="#e2e8f0" font-size="16" font-family="Arial, sans-serif">Crew • Activity • Quantity</text>'
            '<rect x="700" y="445" width="300" height="80" rx="16" fill="#1e293b"/><text x="850" y="480" text-anchor="middle" fill="#fcd34d" font-size="18" font-family="Arial, sans-serif">RISK / BLOCKER</text><text x="850" y="508" text-anchor="middle" fill="#e2e8f0" font-size="16" font-family="Arial, sans-serif">Owner • Due date • Status</text>'
            '<text x="600" y="570" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">MOBILE FIELD INPUT → REVIEWED PROJECT RECORD</text>'
        ),
        'workflow': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#f8fafc"/>'
            '<rect x="205" y="300" width="180" height="105" rx="18" fill="#dbeafe" stroke="#60a5fa" stroke-width="2"/><text x="295" y="342" text-anchor="middle" fill="#1e40af" font-size="18" font-family="Arial, sans-serif">Plan &amp; Baseline</text><text x="295" y="373" text-anchor="middle" fill="#475569" font-size="15" font-family="Arial, sans-serif">Scope • Schedule</text>'
            '<path d="M390 352 H455" stroke="#2563eb" stroke-width="4"/><path d="M440 339 L460 352 L440 365" fill="none" stroke="#2563eb" stroke-width="4"/>'
            '<rect x="465" y="300" width="180" height="105" rx="18" fill="#dcfce7" stroke="#4ade80" stroke-width="2"/><text x="555" y="342" text-anchor="middle" fill="#166534" font-size="18" font-family="Arial, sans-serif">Execute</text><text x="555" y="373" text-anchor="middle" fill="#475569" font-size="15" font-family="Arial, sans-serif">Tasks • Field Logs</text>'
            '<path d="M650 352 H715" stroke="#16a34a" stroke-width="4"/><path d="M700 339 L720 352 L700 365" fill="none" stroke="#16a34a" stroke-width="4"/>'
            '<rect x="725" y="300" width="180" height="105" rx="18" fill="#fef3c7" stroke="#fbbf24" stroke-width="2"/><text x="815" y="342" text-anchor="middle" fill="#92400e" font-size="18" font-family="Arial, sans-serif">Review</text><text x="815" y="373" text-anchor="middle" fill="#475569" font-size="15" font-family="Arial, sans-serif">Variance • Risks</text>'
            '<path d="M910 352 H960 V465 H905" fill="none" stroke="#7c3aed" stroke-width="4"/><path d="M920 452 L900 465 L920 478" fill="none" stroke="#7c3aed" stroke-width="4"/>'
            '<rect x="725" y="445" width="180" height="80" rx="17" fill="#ede9fe" stroke="#a78bfa" stroke-width="2"/><text x="815" y="478" text-anchor="middle" fill="#5b21b6" font-size="18" font-family="Arial, sans-serif">Corrective Action</text><text x="815" y="505" text-anchor="middle" fill="#475569" font-size="14" font-family="Arial, sans-serif">Assign • Track</text>'
            '<path d="M720 485 H655 V405" fill="none" stroke="#7c3aed" stroke-width="3" stroke-dasharray="7 6"/>'
            '<text x="600" y="245" text-anchor="middle" fill="#334155" font-size="19" font-family="Arial, sans-serif">CLOSED-LOOP PROJECT GOVERNANCE</text>'
            '<text x="600" y="565" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">DECISIONS • OWNERSHIP • AUDITABLE CHANGE HISTORY</text>'
        ),
    }
    labels = {
        'cover': 'SERA PROJECTOPS  /  CONSTRUCTION MANAGEMENT',
        'dashboard': 'SERA PROJECTOPS  /  PORTFOLIO DASHBOARD',
        'schedule': 'SERA PROJECTOPS  /  SCHEDULE CONTROL',
        'field': 'SERA PROJECTOPS  /  FIELD REPORTING',
        'workflow': 'SERA PROJECTOPS  /  GOVERNANCE WORKFLOW',
    }
    light = kind == 'dashboard' or kind == 'schedule' or kind == 'workflow'
    if light:
        gradient = '<stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#dbeafe"/>'
        title_color = '#0f172a'
    else:
        gradient = '<stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e3a5f"/>'
        title_color = '#dbeafe'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">{gradient}</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        f'<text x="600" y="115" text-anchor="middle" fill="{title_color}" font-size="28" '
        f'font-family="Arial, sans-serif" letter-spacing="3">{labels[kind]}</text>'
        f'{boards[kind]}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع نظام إدارة ومتابعة مشاريع لشركة SERA للمقاولات للمدرب أبو كريم.'

    def handle(self, *args, **options):
        owner = User.objects.filter(handle='abokareem').first()
        if owner is None:
            self.stderr.write(self.style.ERROR('لم يتم العثور على حساب المدرب abokareem.'))
            return

        project, created = Project.objects.get_or_create(
            owner=owner,
            title=TITLE,
            defaults={
                'summary': (
                    'تصور نظام إداري ولوحة تحكم لمتابعة محفظة مشاريع SERA للمقاولات، '
                    'يربط الجدول والتكلفة والتقدم الميداني والمخاطر ضمن مصدر بيانات موحد.'
                ),
                'category': 'تطوير أنظمة إدارية',
                'role': 'Product Designer / Full Stack Developer',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1210,
                'likes': 254,
            },
        )
        project.summary = (
            'تصور نظام إداري ولوحة تحكم لمتابعة محفظة مشاريع SERA للمقاولات، '
            'يربط الجدول والتكلفة والتقدم الميداني والمخاطر ضمن مصدر بيانات موحد.'
        )
        project.category = 'تطوير أنظمة إدارية'
        project.role = 'Product Designer / Full Stack Developer'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>تصور نظام إداري ولوحة تحكم لشركة SERA للمقاولات لمتابعة مشاريعها من التخطيط '
            'إلى التسليم. يجمع النظام بيانات النطاق والجدول والتكلفة والموارد والتقدم الميداني '
            'في مساحة تشغيلية واحدة، لتسهيل اكتشاف الانحرافات وتنسيق القرارات بين المكتب والموقع.</p>'
            '<h2>الوحدات الرئيسية</h2>'
            '<ul>'
            '<li>محفظة مشاريع تعرض الحالة العامة، milestones، مؤشرات الجدول والتكلفة، والتنبيهات المفتوحة.</li>'
            '<li>WBS لإدارة نطاق العمل والمهام والمسؤوليات والاعتماديات بين فرق التنفيذ.</li>'
            '<li>Schedule baseline وGantt view لمقارنة المخطط بالفعلي ورصد التأخيرات والمسار الحرج.</li>'
            '<li>إدارة التكاليف والمستخلصات والتغييرات مع سجل موافقات وتوثيق أسباب الانحراف.</li>'
            '<li>Daily site reports لإدخال تقدم الأعمال والكميات والعمالة والمعدات والملاحظات الميدانية.</li>'
            '<li>Risk &amp; issue register مع مالك لكل خطر، مستوى الأثر، خطة الاستجابة، وتاريخ الاستحقاق.</li>'
            '<li>إدارة الوثائق والمخططات والإصدارات وطلبات المعلومات RFI وسجل الاعتمادات.</li>'
            '</ul>'
            '<h2>لوحة معلومات استباقية</h2>'
            '<p>تعرض مؤشرات SPI وCPI عند توافر بيانات موثوقة ومناسبة، وانحرافات الجدول والتكلفة، '
            'والقرارات المتأخرة والمخاطر ذات الأولوية. يمكن إضافة تنبيهات rule-based عند تجاوز '
            'عتبات تعتمدها الإدارة، مع تفسير واضح لمصدر المؤشر بدلاً من توصيات غامضة.</p>'
            '<h2>الصلاحيات وسير العمل</h2>'
            '<p>تفصل الأدوار بين إدارة الشركة ومدير المشروع والمهندس المشرف ومراقب الموقع '
            'والمالية، مع صلاحيات حسب المشروع والوحدة. تُسجل التغييرات والموافقات في audit trail، '
            'وتُدار حالات الطلبات عبر workflow محدد يمنع تجاوز الاعتمادات.</p>'
            '<h2>التصور التقني</h2>'
            '<p>واجهة ويب متجاوبة ولوحة تشغيل قابلة للاستخدام ميدانياً، REST API versioned، '
            'قاعدة بيانات علائقية، رفع مستندات آمن، إشعارات وتنبيهات، وتقارير قابلة للتصدير. '
            'يراعي التصميم صلاحيات الوصول، نسخ الوثائق، النسخ الاحتياطي، وسجل التغييرات.</p>'
            '<h2>حالة المشروع</h2>'
            '<p>هذا تصور Portfolio لنظام إدارة مشاريع إنشائية لصالح SERA، ولا يعني أن النظام '
            'تم بناؤه أو اعتماده أو استخدامه من الشركة رسمياً ما لم يتم الاتفاق والتنسيق معها.</p>'
        )
        project.save()
        if not project.cover:
            project.cover.save(
                'abokareem-sera-projectops.svg',
                ContentFile(_artwork('cover')),
                save=True,
            )

        names = [
            'Project Management', 'Construction', 'Dashboard', 'Progress Tracking',
            'Cost Control', 'Risk Management', 'Field Reporting',
            'Workflow Automation', 'Document Control', 'Business System',
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
        for order, kind in enumerate(('dashboard', 'schedule', 'field', 'workflow')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'abokareem-sera-projectops-{kind}.svg',
                ContentFile(_artwork(kind)),
                save=True,
            )
