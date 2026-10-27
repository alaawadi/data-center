from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'VisionPark AI — كراج ذكي بالتعرّف على اللوحات وإدارة المواقف'


def _cover_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs>'
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#164e63"/>'
        '</linearGradient>'
        '<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">'
        '<stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#34d399"/>'
        '</linearGradient>'
        '</defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1050" cy="85" r="220" fill="#22d3ee" opacity=".08"/>'
        '<circle cx="130" cy="640" r="280" fill="#34d399" opacity=".07"/>'
        '<text x="600" y="95" text-anchor="middle" fill="#cffafe" font-size="29" '
        'font-family="Arial, sans-serif" letter-spacing="4">VISIONPARK AI  /  SMART PARKING</text>'
        '<rect x="65" y="210" width="180" height="195" rx="22" fill="#142b3a" stroke="#3b6471" stroke-width="2"/>'
        '<circle cx="155" cy="275" r="38" fill="#0b1725" stroke="#67e8f9" stroke-width="5"/>'
        '<circle cx="155" cy="275" r="18" fill="#164e63"/><circle cx="155" cy="275" r="7" fill="#a5f3fc"/>'
        '<text x="155" y="355" text-anchor="middle" fill="#cbd5e1" font-size="17" font-family="Arial, sans-serif">ANPR CAMERA</text>'
        '<path d="M250 305 H335" stroke="url(#beam)" stroke-width="5"/>'
        '<path d="M320 292 L340 305 L320 318" fill="none" stroke="#22d3ee" stroke-width="5"/>'
        '<rect x="355" y="185" width="260" height="210" rx="24" fill="#102c3b" stroke="#22d3ee" stroke-width="3"/>'
        '<text x="485" y="232" text-anchor="middle" fill="#67e8f9" font-size="20" font-family="Arial, sans-serif">LICENSE PLATE OCR</text>'
        '<rect x="400" y="260" width="170" height="58" rx="12" fill="#e2e8f0"/>'
        '<rect x="420" y="276" width="12" height="28" rx="3" fill="#334155"/>'
        '<rect x="443" y="276" width="12" height="28" rx="3" fill="#334155"/>'
        '<rect x="466" y="276" width="12" height="28" rx="3" fill="#334155"/>'
        '<rect x="489" y="276" width="12" height="28" rx="3" fill="#334155"/>'
        '<rect x="512" y="276" width="12" height="28" rx="3" fill="#334155"/>'
        '<rect x="535" y="276" width="12" height="28" rx="3" fill="#334155"/>'
        '<text x="485" y="355" text-anchor="middle" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">OCR • SUBSCRIPTION CHECK</text>'
        '<path d="M620 292 H682" stroke="url(#beam)" stroke-width="5"/>'
        '<path d="M667 279 L687 292 L667 305" fill="none" stroke="#22d3ee" stroke-width="5"/>'
        '<rect x="700" y="215" width="170" height="155" rx="22" fill="#102c3b" stroke="#34d399" stroke-width="2"/>'
        '<text x="785" y="260" text-anchor="middle" fill="#6ee7b7" font-size="19" font-family="Arial, sans-serif">ACCESS</text>'
        '<circle cx="785" cy="310" r="29" fill="#14532d"/>'
        '<path d="M770 310 L781 321 L802 297" fill="none" stroke="#bbf7d0" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M875 292 H925" stroke="url(#beam)" stroke-width="5"/>'
        '<path d="M910 279 L930 292 L910 305" fill="none" stroke="#22d3ee" stroke-width="5"/>'
        '<rect x="945" y="205" width="190" height="190" rx="22" fill="#102c3b" stroke="#3b6471" stroke-width="2"/>'
        '<text x="1040" y="247" text-anchor="middle" fill="#cbd5e1" font-size="18" font-family="Arial, sans-serif">LIVE CAPACITY</text>'
        '<rect x="980" y="278" width="48" height="72" rx="8" fill="#14532d" stroke="#4ade80"/>'
        '<rect x="1040" y="278" width="48" height="72" rx="8" fill="#14532d" stroke="#4ade80"/>'
        '<rect x="1100" y="278" width="25" height="72" rx="6" fill="#7f1d1d" stroke="#f87171"/>'
        '<text x="1040" y="379" text-anchor="middle" fill="#86efac" font-size="16" font-family="Arial, sans-serif">2 SPACES AVAILABLE</text>'
        '<rect x="180" y="465" width="840" height="105" rx="22" fill="#0b202b" stroke="#28515a"/>'
        '<text x="600" y="508" text-anchor="middle" fill="#cffafe" font-size="21" font-family="Arial, sans-serif">'
        'ANPR  /  SUBSCRIPTION AUTHORIZATION  /  REAL-TIME SPACE GUIDANCE</text>'
        '<text x="600" y="544" text-anchor="middle" fill="#94a3b8" font-size="17" font-family="Arial, sans-serif">'
        'Privacy-aware retention • Human review • Safe manual override</text>'
        '</svg>'
    ).encode('utf-8')


def _gallery_svg(kind):
    screens = {
        'occupancy': (
            'REAL-TIME PARKING OCCUPANCY',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<rect x="190" y="220" width="820" height="60" rx="14" fill="#f1f5f9"/>'
            '<text x="225" y="258" fill="#0f172a" font-size="21" font-family="Arial, sans-serif">Garage Level B1 — Occupancy Map</text>'
            '<rect x="205" y="310" width="790" height="235" rx="18" fill="#e2e8f0"/>'
            '<path d="M450 310 V545 M720 310 V545" stroke="#fff" stroke-width="8" stroke-dasharray="14 12"/>'
            '<rect x="245" y="350" width="165" height="145" rx="16" fill="#dcfce7" stroke="#22c55e" stroke-width="3"/>'
            '<text x="327" y="410" text-anchor="middle" fill="#166534" font-size="20" font-family="Arial, sans-serif">A-12</text>'
            '<text x="327" y="450" text-anchor="middle" fill="#15803d" font-size="17" font-family="Arial, sans-serif">AVAILABLE</text>'
            '<rect x="475" y="350" width="205" height="145" rx="16" fill="#dbeafe" stroke="#3b82f6" stroke-width="3"/>'
            '<path d="M515 425 Q530 380 577 380 H610 Q643 380 660 425 L668 458 H507 Z" fill="#3b82f6"/>'
            '<circle cx="535" cy="455" r="13" fill="#1e293b"/><circle cx="640" cy="455" r="13" fill="#1e293b"/>'
            '<text x="578" y="520" text-anchor="middle" fill="#1d4ed8" font-size="16" font-family="Arial, sans-serif">OCCUPIED</text>'
            '<rect x="750" y="350" width="205" height="145" rx="16" fill="#dcfce7" stroke="#22c55e" stroke-width="3"/>'
            '<text x="852" y="410" text-anchor="middle" fill="#166534" font-size="20" font-family="Arial, sans-serif">A-14</text>'
            '<text x="852" y="450" text-anchor="middle" fill="#15803d" font-size="17" font-family="Arial, sans-serif">AVAILABLE</text>'
            '<rect x="785" y="302" width="140" height="38" rx="12" fill="#166534"/>'
            '<text x="855" y="328" text-anchor="middle" fill="#fff" font-size="15" font-family="Arial, sans-serif">SUGGESTED SPACE</text>'
        ),
        'authorization': (
            'SUBSCRIPTION-AWARE ACCESS FLOW',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<rect x="200" y="315" width="170" height="100" rx="17" fill="#eff6ff" stroke="#93c5fd" stroke-width="2"/>'
            '<text x="285" y="355" text-anchor="middle" fill="#1d4ed8" font-size="19" font-family="Arial, sans-serif">Plate Capture</text>'
            '<text x="285" y="385" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">Edge Camera</text>'
            '<path d="M375 365 H440" stroke="#2563eb" stroke-width="4"/><path d="M425 352 L445 365 L425 378" fill="none" stroke="#2563eb" stroke-width="4"/>'
            '<rect x="450" y="315" width="175" height="100" rx="17" fill="#f0fdf4" stroke="#86efac" stroke-width="2"/>'
            '<text x="537" y="355" text-anchor="middle" fill="#166534" font-size="19" font-family="Arial, sans-serif">Normalize &amp; OCR</text>'
            '<text x="537" y="385" text-anchor="middle" fill="#64748b" font-size="15" font-family="Arial, sans-serif">Confidence Check</text>'
            '<path d="M630 365 H695" stroke="#16a34a" stroke-width="4"/><path d="M680 352 L700 365 L680 378" fill="none" stroke="#16a34a" stroke-width="4"/>'
            '<path d="M785 285 L870 365 L785 445 L700 365 Z" fill="#f7fee7" stroke="#84cc16" stroke-width="2"/>'
            '<text x="785" y="355" text-anchor="middle" fill="#3f6212" font-size="17" font-family="Arial, sans-serif">Active</text>'
            '<text x="785" y="380" text-anchor="middle" fill="#3f6212" font-size="17" font-family="Arial, sans-serif">Subscription?</text>'
            '<path d="M870 365 H945" stroke="#16a34a" stroke-width="4"/><path d="M930 352 L950 365 L930 378" fill="none" stroke="#16a34a" stroke-width="4"/>'
            '<rect x="850" y="465" width="160" height="68" rx="15" fill="#ecfdf5"/>'
            '<text x="930" y="495" text-anchor="middle" fill="#166534" font-size="17" font-family="Arial, sans-serif">Open Gate</text>'
            '<text x="930" y="518" text-anchor="middle" fill="#64748b" font-size="14" font-family="Arial, sans-serif">Authorized only</text>'
            '<path d="M785 450 V500 H695" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="7 6"/>'
            '<rect x="465" y="465" width="225" height="68" rx="15" fill="#fffbeb"/>'
            '<text x="577" y="495" text-anchor="middle" fill="#92400e" font-size="17" font-family="Arial, sans-serif">Staff Review</text>'
            '<text x="577" y="518" text-anchor="middle" fill="#64748b" font-size="14" font-family="Arial, sans-serif">Low OCR confidence</text>'
            '<text x="600" y="245" text-anchor="middle" fill="#475569" font-size="18" font-family="Arial, sans-serif">No automatic denial based on uncertain reads</text>'
        ),
        'architecture': (
            'PRIVACY-AWARE EDGE ARCHITECTURE',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<rect x="200" y="265" width="220" height="225" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>'
            '<text x="310" y="305" text-anchor="middle" fill="#0f172a" font-size="20" font-family="Arial, sans-serif">EDGE GATEWAY</text>'
            '<rect x="235" y="330" width="150" height="52" rx="12" fill="#e0f2fe"/><text x="310" y="363" text-anchor="middle" fill="#075985" font-size="16" font-family="Arial, sans-serif">ANPR Inference</text>'
            '<rect x="235" y="395" width="150" height="52" rx="12" fill="#dcfce7"/><text x="310" y="428" text-anchor="middle" fill="#166534" font-size="16" font-family="Arial, sans-serif">Local Cache</text>'
            '<path d="M425 377 H500" stroke="#16a34a" stroke-width="4"/><path d="M485 364 L505 377 L485 390" fill="none" stroke="#16a34a" stroke-width="4"/>'
            '<rect x="515" y="285" width="210" height="185" rx="20" fill="#f0fdf4" stroke="#86efac" stroke-width="2"/>'
            '<text x="620" y="325" text-anchor="middle" fill="#166534" font-size="20" font-family="Arial, sans-serif">Access Service</text>'
            '<text x="620" y="365" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">Entitlement Check</text>'
            '<text x="620" y="397" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">Audit Event</text>'
            '<text x="620" y="429" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">Rate Limits</text>'
            '<path d="M730 377 H805" stroke="#16a34a" stroke-width="4"/><path d="M790 364 L810 377 L790 390" fill="none" stroke="#16a34a" stroke-width="4"/>'
            '<rect x="820" y="285" width="170" height="185" rx="20" fill="#f7fee7" stroke="#a3e635" stroke-width="2"/>'
            '<text x="905" y="325" text-anchor="middle" fill="#3f6212" font-size="20" font-family="Arial, sans-serif">Parking API</text>'
            '<text x="905" y="365" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">Space State</text>'
            '<text x="905" y="397" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">Reservation</text>'
            '<text x="905" y="429" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">Guidance</text>'
            '<rect x="250" y="520" width="700" height="52" rx="14" fill="#f1f5f9"/>'
            '<text x="600" y="553" text-anchor="middle" fill="#334155" font-size="17" font-family="Arial, sans-serif">Encrypted plate data • Short retention • Role-based audit access</text>'
            '<text x="600" y="235" text-anchor="middle" fill="#64748b" font-size="18" font-family="Arial, sans-serif">Raw frames are processed locally and discarded by default</text>'
        ),
    }
    label, artwork = screens[kind]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#eff6ff"/><stop offset="1" stop-color="#ccfbf1"/>'
        '</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1080" cy="80" r="210" fill="#22d3ee" opacity=".12"/>'
        '<text x="600" y="115" text-anchor="middle" fill="#102a43" font-size="29" '
        'font-family="Arial, sans-serif" letter-spacing="3">VISIONPARK AI  /  '
        f'{label}</text>'
        f'{artwork}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع كراج ذكي بالرؤية الحاسوبية للمدرب علاء وادي.'

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
                    'منظومة كراج ذكي تستخدم ANPR للتحقق من اشتراك المركبة، '
                    'وتحليل إشغال المواقف لتوجيه السائق مباشرة إلى مكان متاح.'
                ),
                'category': 'رؤية حاسوبية',
                'role': 'Computer Vision / Smart Parking Engineer',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1520,
                'likes': 336,
            },
        )

        project.summary = (
            'منظومة كراج ذكي تستخدم ANPR للتحقق من اشتراك المركبة، '
            'وتحليل إشغال المواقف لتوجيه السائق مباشرة إلى مكان متاح.'
        )
        project.category = 'رؤية حاسوبية'
        project.role = 'Computer Vision / Smart Parking Engineer'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>VisionPark AI منصة ذكية لإدارة دخول المركبات إلى الكراجات. تقرأ كاميرا المدخل لوحة المركبة '
            'باستخدام Automatic Number Plate Recognition (ANPR)، ثم تتحقق خدمة الوصول من صلاحية الاشتراك '
            'قبل إرسال أمر فتح البوابة. بعد الدخول، تحدد الرؤية الحاسوبية حالة المواقف وتوجه السائق '
            'إلى مكان متاح بدلاً من الدوران والبحث داخلياً.</p>'
            '<h2>تسجيل المركبات والتحقق</h2>'
            '<ul>'
            '<li>قراءة اللوحة عبر اكتشاف موقعها وتصحيح المنظور، ثم OCR متعدد المراحل للأحرف والأرقام.</li>'
            '<li>تطبيع النص والتحقق من confidence score، مع مطابقة المركبة بسجل الاشتراك النشط.</li>'
            '<li>حفظ أقل قدر لازم من بيانات الاشتراك: معرف المركبة، رقم اللوحة المشفر، حالة الاشتراك، '
            'الفترة الزمنية، ونوع/لون المركبة اختيارياً للمساعدة التشغيلية.</li>'
            '<li>عدم حفظ إطارات الكاميرا الخام افتراضياً؛ والقراءات غير الواثقة تُحال إلى الموظف للمراجعة.</li>'
            '</ul>'
            '<h2>رؤية المواقف والتوجيه</h2>'
            '<p>تعالج كاميرات داخلية أو حساسات مواقف صوراً/إشارات المناطق المحددة مسبقاً، '
            'وتصنف كل مساحة إلى متاحة أو مشغولة أو غير مؤكدة. يدمج Parking Occupancy Service '
            'الحالة الآنية مع خريطة الطوابق والمسارات، ويقترح أقرب موقف متاح مع تحديث الحالة عند الحجز '
            'أو الدخول لتجنب double booking.</p>'
            '<h2>المعمارية والتقنيات</h2>'
            '<p>Python، OpenCV، PyTorch، ونماذج ANPR خفيفة قابلة للتشغيل على Edge devices، '
            'مع خدمة Django REST API لإدارة المركبات والاشتراكات والإشغال والتوجيه. '
            'يمكن استخدام PostgreSQL للبيانات التشغيلية، Redis للحالة المؤقتة، وWebSocket '
            'لتحديث خريطة الإشغال، مع Docker للنشر والمراقبة والسجلات المنظمة.</p>'
            '<h2>الأمان والخصوصية والسلامة</h2>'
            '<p>تُشفّر بيانات اللوحات أثناء النقل والتخزين، وتُقيد صلاحية الاطلاع عليها حسب الدور، '
            'مع سجل تدقيق وسياسة حذف ومدة احتفاظ محدودة متوافقة مع الأنظمة المحلية. '
            'لا يعتمد النظام على قراءة غير مؤكدة لرفض المركبة آلياً؛ بل يوفر مراجعة بشرية ومساراً بديلاً. '
            'كما يتضمن تحكماً يدوياً وإجراءات آمنة للبوابة ومخرج الطوارئ وفق متطلبات السلامة المحلية.</p>'
        )
        project.save()

        if not project.cover:
            project.cover.save(
                'alaa-visionpark-smart-garage.svg',
                ContentFile(_cover_svg()),
                save=True,
            )

        tag_names = [
            'Computer Vision', 'ANPR', 'OCR', 'OpenCV', 'PyTorch',
            'Smart Parking', 'Edge AI', 'Django REST Framework',
            'PostgreSQL', 'Privacy by Design',
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

        for order, kind in enumerate(('occupancy', 'authorization', 'architecture')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-visionpark-{kind}.svg',
                ContentFile(_gallery_svg(kind)),
                save=True,
            )
