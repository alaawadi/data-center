from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'بوابة دخول ذكية لاكتشاف الكمامة — VisionGate CV'


def _cover_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs>'
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#10172a"/><stop offset="1" stop-color="#173b45"/>'
        '</linearGradient>'
        '<linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#34d399"/>'
        '</linearGradient>'
        '</defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1050" cy="90" r="220" fill="#22d3ee" opacity=".07"/>'
        '<circle cx="130" cy="640" r="280" fill="#34d399" opacity=".07"/>'
        '<text x="600" y="100" text-anchor="middle" fill="#d1fae5" font-size="29" '
        'font-family="Arial, sans-serif" letter-spacing="4">VISIONGATE  /  COMPUTER VISION</text>'
        '<rect x="95" y="205" width="180" height="205" rx="24" fill="#132b39" stroke="#3b6471" stroke-width="2"/>'
        '<circle cx="185" cy="285" r="45" fill="#0b1725" stroke="#67e8f9" stroke-width="5"/>'
        '<circle cx="185" cy="285" r="23" fill="#164e63"/>'
        '<circle cx="185" cy="285" r="9" fill="#a5f3fc"/>'
        '<text x="185" y="375" text-anchor="middle" fill="#cbd5e1" font-size="19" font-family="Arial, sans-serif">EDGE CAMERA</text>'
        '<path d="M280 305 H390" stroke="url(#beam)" stroke-width="5"/>'
        '<path d="M375 292 L395 305 L375 318" fill="none" stroke="#22d3ee" stroke-width="5"/>'
        '<rect x="415" y="170" width="355" height="290" rx="28" fill="#102b37" stroke="#22d3ee" stroke-width="3"/>'
        '<text x="592" y="220" text-anchor="middle" fill="#67e8f9" font-size="21" font-family="Arial, sans-serif">ON-DEVICE INFERENCE</text>'
        '<rect x="500" y="250" width="185" height="150" rx="22" fill="#173b45" stroke="#34d399" stroke-width="3"/>'
        '<circle cx="592" cy="307" r="37" fill="#d6a77a"/>'
        '<path d="M554 324 Q592 343 630 324 L625 348 Q592 362 559 348 Z" fill="#34d399"/>'
        '<rect x="535" y="260" width="115" height="112" rx="18" fill="none" stroke="#a3e635" stroke-width="3" stroke-dasharray="8 6"/>'
        '<rect x="534" y="375" width="118" height="26" rx="8" fill="#14532d"/>'
        '<text x="593" y="394" text-anchor="middle" fill="#d9f99d" font-size="15" font-weight="700" font-family="Arial, sans-serif">MASK DETECTED</text>'
        '<text x="592" y="435" text-anchor="middle" fill="#cbd5e1" font-size="17" font-family="Arial, sans-serif">Detect • Validate • Decide</text>'
        '<path d="M775 305 H870" stroke="url(#beam)" stroke-width="5"/>'
        '<path d="M855 292 L875 305 L855 318" fill="none" stroke="#22d3ee" stroke-width="5"/>'
        '<rect x="895" y="205" width="215" height="205" rx="24" fill="#132b39" stroke="#3b6471" stroke-width="2"/>'
        '<rect x="945" y="245" width="115" height="115" rx="16" fill="#102b37" stroke="#34d399" stroke-width="3"/>'
        '<path d="M960 304 H1045" stroke="#a3e635" stroke-width="9" stroke-linecap="round"/>'
        '<circle cx="1003" cy="304" r="18" fill="#34d399"/>'
        '<text x="1002" y="389" text-anchor="middle" fill="#d1fae5" font-size="19" font-family="Arial, sans-serif">GATE CONTROL</text>'
        '<rect x="295" y="515" width="610" height="65" rx="18" fill="#0c202a" stroke="#28515a"/>'
        '<text x="600" y="556" text-anchor="middle" fill="#cbd5e1" font-size="20" font-family="Arial, sans-serif">'
        'PRIVACY-FIRST  /  UNCERTAINTY REVIEW  /  SAFE MANUAL OVERRIDE</text>'
        '</svg>'
    ).encode('utf-8')


def _gallery_svg(kind):
    screens = {
        'pipeline': (
            'REAL-TIME DETECTION PIPELINE',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#0e1b2b" stroke="#334155" stroke-width="2"/>'
            '<rect x="195" y="310" width="170" height="100" rx="17" fill="#132b39" stroke="#22d3ee" stroke-width="2"/>'
            '<text x="280" y="350" text-anchor="middle" fill="#67e8f9" font-size="20" font-family="Arial, sans-serif">Camera Frame</text>'
            '<text x="280" y="380" text-anchor="middle" fill="#94a3b8" font-size="15" font-family="Arial, sans-serif">Local Capture</text>'
            '<path d="M370 360 H440" stroke="#22d3ee" stroke-width="4"/><path d="M425 347 L445 360 L425 373" fill="none" stroke="#22d3ee" stroke-width="4"/>'
            '<rect x="450" y="310" width="190" height="100" rx="17" fill="#132b39" stroke="#3b82f6" stroke-width="2"/>'
            '<text x="545" y="350" text-anchor="middle" fill="#93c5fd" font-size="20" font-family="Arial, sans-serif">Face / Mask</text>'
            '<text x="545" y="380" text-anchor="middle" fill="#94a3b8" font-size="15" font-family="Arial, sans-serif">Detection Model</text>'
            '<path d="M645 360 H715" stroke="#22d3ee" stroke-width="4"/><path d="M700 347 L720 360 L700 373" fill="none" stroke="#22d3ee" stroke-width="4"/>'
            '<path d="M810 295 L900 360 L810 425 L720 360 Z" fill="#173b45" stroke="#a3e635" stroke-width="2"/>'
            '<text x="810" y="354" text-anchor="middle" fill="#d9f99d" font-size="18" font-family="Arial, sans-serif">Confidence</text>'
            '<text x="810" y="381" text-anchor="middle" fill="#d9f99d" font-size="18" font-family="Arial, sans-serif">Threshold?</text>'
            '<path d="M900 360 H970" stroke="#34d399" stroke-width="4"/><path d="M955 347 L975 360 L955 373" fill="none" stroke="#34d399" stroke-width="4"/>'
            '<rect x="775" y="475" width="270" height="65" rx="15" fill="#132b39"/>'
            '<text x="910" y="514" text-anchor="middle" fill="#cbd5e1" font-size="18" font-family="Arial, sans-serif">Manual Review on Low Confidence</text>'
            '<path d="M810 430 V470" stroke="#94a3b8" stroke-width="3" stroke-dasharray="7 6"/>'
            '<text x="600" y="245" text-anchor="middle" fill="#cbd5e1" font-size="20" font-family="Arial, sans-serif">Edge inference — frames processed locally and discarded</text>'
        ),
        'dashboard': (
            'GATE OPERATIONS DASHBOARD',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<rect x="180" y="215" width="840" height="48" rx="12" fill="#f1f5f9"/>'
            '<text x="215" y="247" fill="#0f172a" font-size="20" font-family="Arial, sans-serif">Entrance Control — Live Status</text>'
            '<rect x="190" y="285" width="250" height="110" rx="16" fill="#ecfdf5"/>'
            '<text x="315" y="325" text-anchor="middle" fill="#64748b" font-size="16" font-family="Arial, sans-serif">GATE STATE</text>'
            '<text x="315" y="365" text-anchor="middle" fill="#047857" font-size="27" font-weight="700" font-family="Arial, sans-serif">READY</text>'
            '<rect x="465" y="285" width="250" height="110" rx="16" fill="#eff6ff"/>'
            '<text x="590" y="325" text-anchor="middle" fill="#64748b" font-size="16" font-family="Arial, sans-serif">MODEL CONFIDENCE</text>'
            '<text x="590" y="365" text-anchor="middle" fill="#1d4ed8" font-size="27" font-weight="700" font-family="Arial, sans-serif">0.94</text>'
            '<rect x="740" y="285" width="250" height="110" rx="16" fill="#f7fee7"/>'
            '<text x="865" y="325" text-anchor="middle" fill="#64748b" font-size="16" font-family="Arial, sans-serif">MANUAL OVERRIDE</text>'
            '<text x="865" y="365" text-anchor="middle" fill="#4d7c0f" font-size="25" font-weight="700" font-family="Arial, sans-serif">AVAILABLE</text>'
            '<rect x="190" y="420" width="800" height="145" rx="14" fill="#f8fafc"/>'
            '<text x="225" y="455" fill="#334155" font-size="18" font-family="Arial, sans-serif">Recent anonymized events</text>'
            '<circle cx="235" cy="490" r="7" fill="#10b981"/><text x="255" y="496" fill="#475569" font-size="16" font-family="Arial, sans-serif">Mask detected — access request accepted</text>'
            '<circle cx="235" cy="525" r="7" fill="#f59e0b"/><text x="255" y="531" fill="#475569" font-size="16" font-family="Arial, sans-serif">Low confidence — sent to attendant review</text>'
            '<rect x="785" y="474" width="175" height="55" rx="12" fill="#dcfce7"/><text x="872" y="508" text-anchor="middle" fill="#166534" font-size="16" font-family="Arial, sans-serif">No face images stored</text>'
        ),
        'edge': (
            'PRIVACY-FIRST EDGE ARCHITECTURE',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff"/>'
            '<rect x="205" y="260" width="220" height="250" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>'
            '<text x="315" y="300" text-anchor="middle" fill="#0f172a" font-size="21" font-family="Arial, sans-serif">LOCAL EDGE DEVICE</text>'
            '<rect x="240" y="330" width="150" height="55" rx="12" fill="#e0f2fe"/><text x="315" y="365" text-anchor="middle" fill="#075985" font-size="17" font-family="Arial, sans-serif">CV Inference</text>'
            '<rect x="240" y="400" width="150" height="55" rx="12" fill="#ecfccb"/><text x="315" y="435" text-anchor="middle" fill="#3f6212" font-size="17" font-family="Arial, sans-serif">Decision Logic</text>'
            '<path d="M430 385 H515" stroke="#16a34a" stroke-width="4"/><path d="M500 372 L520 385 L500 398" fill="none" stroke="#16a34a" stroke-width="4"/>'
            '<rect x="530" y="300" width="210" height="170" rx="20" fill="#f0fdf4" stroke="#86efac" stroke-width="2"/>'
            '<text x="635" y="345" text-anchor="middle" fill="#166534" font-size="21" font-family="Arial, sans-serif">Relay Controller</text>'
            '<text x="635" y="385" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">Short-lived signal</text>'
            '<text x="635" y="415" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">Safety interlocks</text>'
            '<path d="M745 385 H825" stroke="#16a34a" stroke-width="4"/><path d="M810 372 L830 385 L810 398" fill="none" stroke="#16a34a" stroke-width="4"/>'
            '<rect x="840" y="315" width="155" height="140" rx="20" fill="#f7fee7" stroke="#a3e635" stroke-width="2"/>'
            '<text x="917" y="365" text-anchor="middle" fill="#3f6212" font-size="21" font-family="Arial, sans-serif">Gate</text>'
            '<text x="917" y="400" text-anchor="middle" fill="#475569" font-size="16" font-family="Arial, sans-serif">Safe operation</text>'
            '<path d="M315 515 V550 H635 V475" fill="none" stroke="#64748b" stroke-width="3" stroke-dasharray="8 7"/>'
            '<rect x="405" y="520" width="440" height="55" rx="13" fill="#f1f5f9"/>'
            '<text x="625" y="555" text-anchor="middle" fill="#334155" font-size="17" font-family="Arial, sans-serif">Human override • Emergency egress remains independent</text>'
            '<text x="600" y="235" text-anchor="middle" fill="#64748b" font-size="18" font-family="Arial, sans-serif">Only anonymized operational metrics leave the device</text>'
        ),
    }
    label, artwork = screens[kind]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#f0fdfa"/><stop offset="1" stop-color="#dbeafe"/>'
        '</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1080" cy="80" r="210" fill="#22d3ee" opacity=".12"/>'
        '<text x="600" y="115" text-anchor="middle" fill="#102a43" font-size="29" '
        'font-family="Arial, sans-serif" letter-spacing="3">VISIONGATE CV  /  '
        f'{label}</text>'
        f'{artwork}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع رؤية حاسوبية عام للمدرب علاء وادي.'

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
                    'نموذج Edge AI يكتشف ارتداء الكمامة لحظياً من بث الكاميرا، '
                    'ويصدر إشارة تحكم للبوابة عند تحقق الثقة المطلوبة، دون تعرّف على الهوية أو حفظ الصور.'
                ),
                'category': 'رؤية حاسوبية',
                'role': 'Computer Vision / Edge AI Engineer',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1380,
                'likes': 304,
            },
        )

        project.summary = (
            'نموذج Edge AI يكتشف ارتداء الكمامة لحظياً من بث الكاميرا، '
            'ويصدر إشارة تحكم للبوابة عند تحقق الثقة المطلوبة، دون تعرّف على الهوية أو حفظ الصور.'
        )
        project.category = 'رؤية حاسوبية'
        project.role = 'Computer Vision / Edge AI Engineer'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>VisionGate CV نموذج أولي لنظام دخول يعتمد على الرؤية الحاسوبية للتحقق من ارتداء الكمامة '
            'قبل إرسال طلب فتح البوابة. يعالج الجهاز الصور محلياً ويصنف حالة الكمامة، من دون محاولة '
            'التعرّف على هوية الشخص أو إنشاء قاعدة بيانات للوجوه.</p>'
            '<h2>مسار الرؤية الحاسوبية</h2>'
            '<ul>'
            '<li>التقاط إطار من كاميرا ثابتة ضمن منطقة دخول محددة، مع فحص جودة الصورة والإضاءة.</li>'
            '<li>اكتشاف الوجه ومنطقة الكمامة، ثم تصنيف الحالة إلى: كمامة، دون كمامة، أو غير مؤكدة.</li>'
            '<li>استخدام confidence threshold وtemporal smoothing عبر عدة إطارات لتقليل القرارات المتذبذبة.</li>'
            '<li>إرسال إشارة قصيرة العمر إلى relay controller عند تحقق شروط القبول فقط.</li>'
            '<li>تحويل الحالات منخفضة الثقة إلى مراجعة بشرية بدلاً من اتخاذ قرار آلي قاطع.</li>'
            '</ul>'
            '<h2>البنية التقنية</h2>'
            '<p>Python، OpenCV، PyTorch، ونموذج object detection خفيف قابل للتحويل إلى ONNX أو TensorRT '
            'للتشغيل على Edge device. تتضمن البنية فصل inference عن منطق القرار، health checks للكاميرا، '
            'مراقبة زمن الاستجابة، وسجلات تشغيل لا تتضمن الصور الخام.</p>'
            '<h2>الخصوصية والأمان</h2>'
            '<p>المعالجة محلية افتراضياً، ولا يتم حفظ أو رفع إطارات الكاميرا أو قوالب الوجه. '
            'تُحتفظ فقط بمؤشرات تشغيل مجمّعة مثل عدد المحاولات وحالات الثقة، وفق سياسة الاحتفاظ المعتمدة. '
            'تُحمى قناة التحكم وتُقيّد صلاحياتها، مع سجل تدقيق لإجراءات المشرفين.</p>'
            '<h2>السلامة والتعامل مع الاستثناءات</h2>'
            '<p>النظام نموذج مساعد للتحقق من الكمامة وليس نظاماً أمنياً لتحديد الأشخاص. '
            'يتضمن تجاوزاً يدوياً للمشرف، ومساراً مستقلاً وآمناً للخروج الطارئ؛ ولا يجوز أن يمنع الخروج '
            'أو يحل محل متطلبات السلامة والأنظمة المحلية. يجب اختبار الدقة والانحياز تحت ظروف إضاءة وزوايا '
            'وأغطية وجه متنوعة قبل أي استخدام تشغيلي، مع توفير بديل وصول ومراجعة بشرية.</p>'
        )
        project.save()

        if not project.cover:
            project.cover.save(
                'alaa-visiongate-mask-detection.svg',
                ContentFile(_cover_svg()),
                save=True,
            )

        tag_names = [
            'Computer Vision', 'OpenCV', 'PyTorch', 'Edge AI', 'Object Detection',
            'Python', 'ONNX', 'Image Classification', 'Privacy by Design', 'IoT',
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

        for order, kind in enumerate(('pipeline', 'dashboard', 'edge')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-visiongate-{kind}.svg',
                ContentFile(_gallery_svg(kind)),
                save=True,
            )
