from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'FleetFlow — تطبيق توصيل ذكي بـ React Native'


def _cover_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs>'
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#164e63"/>'
        '</linearGradient>'
        '<linearGradient id="route" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#34d399"/>'
        '</linearGradient>'
        '</defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1050" cy="85" r="220" fill="#22d3ee" opacity=".08"/>'
        '<circle cx="130" cy="640" r="280" fill="#34d399" opacity=".07"/>'
        '<text x="600" y="95" text-anchor="middle" fill="#cffafe" font-size="30" '
        'font-family="Arial, sans-serif" letter-spacing="4">FLEETFLOW  /  REACT NATIVE DELIVERY</text>'
        '<rect x="75" y="175" width="315" height="365" rx="34" fill="#0b1725" stroke="#31516c" stroke-width="3"/>'
        '<rect x="100" y="205" width="265" height="305" rx="22" fill="#e2e8f0"/>'
        '<rect x="125" y="230" width="215" height="46" rx="12" fill="#fff"/>'
        '<circle cx="150" cy="253" r="10" fill="#0ea5e9"/>'
        '<rect x="170" y="246" width="125" height="13" rx="6" fill="#cbd5e1"/>'
        '<path d="M135 340 L190 305 L245 335 L300 290 L330 310 M145 425 L195 390 L250 405 L310 355" fill="none" stroke="#bae6fd" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M140 390 C175 350 198 365 225 345 S272 320 315 300 C335 290 327 340 300 365 S270 410 242 422 S190 450 168 430" fill="none" stroke="url(#route)" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 2"/>'
        '<circle cx="140" cy="390" r="16" fill="#2563eb" stroke="#fff" stroke-width="5"/>'
        '<path d="M300 350 L315 322 L330 350 Z" fill="#16a34a" stroke="#fff" stroke-width="4"/>'
        '<rect x="123" y="450" width="220" height="43" rx="12" fill="#fff"/>'
        '<text x="233" y="478" text-anchor="middle" fill="#166534" font-size="16" font-family="Arial, sans-serif">3 drivers nearby • Live ETA</text>'
        '<text x="232" y="575" text-anchor="middle" fill="#cbd5e1" font-size="19" font-family="Arial, sans-serif">LIVE DRIVER TRACKING</text>'
        '<path d="M405 350 H480" stroke="url(#route)" stroke-width="5"/>'
        '<path d="M465 337 L485 350 L465 363" fill="none" stroke="#38bdf8" stroke-width="5"/>'
        '<rect x="505" y="180" width="300" height="340" rx="30" fill="#102c3b" stroke="#22d3ee" stroke-width="3"/>'
        '<text x="655" y="230" text-anchor="middle" fill="#67e8f9" font-size="21" font-family="Arial, sans-serif">FAIR DISPATCH ENGINE</text>'
        '<circle cx="655" cy="333" r="70" fill="#143d49" stroke="#34d399" stroke-width="3"/>'
        '<path d="M620 334 L645 359 L694 306" fill="none" stroke="#a3e635" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>'
        '<text x="655" y="438" text-anchor="middle" fill="#f0fdfa" font-size="20" font-family="Arial, sans-serif">ETA • Capacity • Fairness</text>'
        '<text x="655" y="472" text-anchor="middle" fill="#94a3b8" font-size="16" font-family="Arial, sans-serif">Feasible match, not nearest-only</text>'
        '<path d="M810 350 H875" stroke="url(#route)" stroke-width="5"/>'
        '<path d="M860 337 L880 350 L860 363" fill="none" stroke="#38bdf8" stroke-width="5"/>'
        '<rect x="900" y="205" width="230" height="135" rx="22" fill="#102c3b" stroke="#3b6471" stroke-width="2"/>'
        '<text x="1015" y="250" text-anchor="middle" fill="#6ee7b7" font-size="20" font-family="Arial, sans-serif">DRIVER APP</text>'
        '<path d="M965 290 H1000 L1015 270 H1055 L1072 290 H1085 V315 H965 Z" fill="#34d399"/>'
        '<circle cx="990" cy="315" r="11" fill="#0f172a"/><circle cx="1060" cy="315" r="11" fill="#0f172a"/>'
        '<rect x="900" y="370" width="230" height="135" rx="22" fill="#102c3b" stroke="#3b6471" stroke-width="2"/>'
        '<text x="1015" y="415" text-anchor="middle" fill="#93c5fd" font-size="20" font-family="Arial, sans-serif">CUSTOMER APP</text>'
        '<rect x="950" y="440" width="130" height="32" rx="10" fill="#1e3a8a"/>'
        '<text x="1015" y="462" text-anchor="middle" fill="#dbeafe" font-size="15" font-family="Arial, sans-serif">Order in transit</text>'
        '<rect x="440" y="565" width="570" height="55" rx="17" fill="#0b202b" stroke="#28515a"/>'
        '<text x="725" y="600" text-anchor="middle" fill="#cbd5e1" font-size="19" font-family="Arial, sans-serif">'
        'REAL-TIME LOCATION  /  FAIR ALLOCATION  /  DELIVERY VISIBILITY</text>'
        '</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع تطبيق توصيل React Native عام للمدرب علاء وادي.'

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
                    'منظومة توصيل متعددة الأطراف بتطبيق React Native، تتبع مباشر للسائق، '
                    'ومحرك توزيع يوازن بين زمن الوصول والحمولة والإنصاف بين السائقين.'
                ),
                'category': 'تطبيقات الجوال',
                'role': 'Mobile / Full Stack Engineer',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1670,
                'likes': 359,
            },
        )

        project.summary = (
            'منظومة توصيل متعددة الأطراف بتطبيق React Native، تتبع مباشر للسائق، '
            'ومحرك توزيع يوازن بين زمن الوصول والحمولة والإنصاف بين السائقين.'
        )
        project.category = 'تطبيقات الجوال'
        project.role = 'Mobile / Full Stack Engineer'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>نظرة عامة</h2>'
            '<p>FleetFlow منصة توصيل تربط العميل والمطعم أو المتجر والسائق وفريق العمليات في رحلة واحدة. '
            'تتضمن تطبيقات React Native للعميل والسائق، ولوحة تشغيل للمشرفين، وخدمات Backend لإدارة الطلبات '
            'والتوزيع والموقع المباشر.</p>'
            '<h2>توزيع ذكي وعادل للطلبات</h2>'
            '<p>لا يعتمد الإسناد على أقرب سائق جغرافياً فقط. يجمع Dispatch Engine المرشحين القادرين '
            'على تنفيذ الطلب، ويقيّمهم وفق ETA المتوقع من شبكة الطرق، المسافة، نوع المركبة، سعة الحمولة، '
            'حالة السائق، اتجاهه الحالي، ومعدل الطلبات النشطة.</p>'
            '<ul>'
            '<li>استبعاد السائقين غير المتاحين أو غير المؤهلين لنوع الطلب قبل احتساب الترتيب.</li>'
            '<li>احتساب درجة مركبة تجمع زمن الوصول المتوقع وملاءمة الطلب والحمولة الحالية.</li>'
            '<li>عامل إنصاف يراعي توزيع فرص العمل والدخل والوقت منذ آخر إسناد، ضمن حدود الخدمة المتفق عليها.</li>'
            '<li>إرسال عرض محدد المهلة، ثم إعادة التوزيع تلقائياً وفق سياسة موثوقة عند عدم القبول أو انتهاء المهلة.</li>'
            '<li>منع الإسناد المكرر باستخدام معاملات ذرية وidempotency keys، مع سجل واضح لسبب الاختيار.</li>'
            '</ul>'
            '<h2>تتبع مباشر وتجربة تشغيلية</h2>'
            '<p>يعرض التطبيق موقع السائق على الخريطة بعد قبول الطلب، مع تحديثات موقع دورية وETA ديناميكي '
            'وحالات رحلة واضحة. تستخدم خدمة الموقع WebSocket أو قنوات realtime مناسبة، وتحدّث وتيرة الإرسال '
            'بحسب حركة السائق وحالة الرحلة للموازنة بين دقة التتبع واستهلاك البطارية والبيانات.</p>'
            '<h2>المعمارية والتقنيات</h2>'
            '<p>React Native وTypeScript لتطبيقات iOS وAndroid، مع إدارة حالة منظمة، deep linking، '
            'إشعارات push، ومعالجة الاتصال المتقطع. يدعم Backend واجهات REST versioned، '
            'PostgreSQL للطلبات والمستخدمين، Redis لحالة التوزيع والبيانات قصيرة العمر، '
            'وCelery للمهام الخلفية والإشعارات. يمكن توصيل خرائط ومزودي توجيه خارجيين عبر طبقة تكامل قابلة للاستبدال.</p>'
            '<h2>الاعتمادية والخصوصية</h2>'
            '<p>تتضمن المنصة صلاحيات مبنية على الأدوار، تحققاً من انتقالات حالة الطلب، سجلات تدقيق، '
            'مراقبة زمن الإسناد ونجاح التسليم، وسياسات احتفاظ محدودة لبيانات الموقع. '
            'لا يُشارك موقع السائق الدقيق إلا مع الأطراف المخولة وخلال نافذة تنفيذ الطلب، '
            'مع آلية واضحة لإيقاف التتبع بعد إتمامه.</p>'
        )
        project.save()

        if not project.cover:
            project.cover.save(
                'alaa-fleetflow-react-native-delivery.svg',
                ContentFile(_cover_svg()),
                save=True,
            )

        tag_names = [
            'React Native', 'TypeScript', 'Mobile App', 'Delivery',
            'Real-Time Tracking', 'Dispatch Optimization', 'Maps API',
            'REST API', 'WebSocket', 'Redis',
        ]
        tags = [ProjectTag.objects.get_or_create(name=name)[0] for name in tag_names]
        project.tags.set(tags)

        action = 'إنشاء' if created else 'تحديث'
        self.stdout.write(self.style.SUCCESS(
            f'تم {action} المشروع العام المنشور: {project.title} '
            f'(المالك: {owner.handle}, الظهور: {project.visibility})'
        ))
