from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'Fahd Shawarma Growth Campaign — Meta Ads'


def _artwork(kind):
    boards = {
        'cover': (
            '<rect x="70" y="165" width="300" height="385" rx="26" fill="#171717" stroke="#f97316" stroke-width="3"/>'
            '<rect x="92" y="188" width="256" height="337" rx="14" fill="#431407"/>'
            '<circle cx="220" cy="320" r="95" fill="#f5deb3"/><circle cx="220" cy="320" r="73" fill="#d97706"/>'
            '<path d="M170 325 Q188 270 230 280 L275 266 Q300 300 290 342 L250 375 L205 366Z" fill="#7c2d12"/>'
            '<circle cx="185" cy="355" r="7" fill="#16a34a"/><circle cx="274" cy="290" r="7" fill="#16a34a"/>'
            '<text x="220" y="455" text-anchor="middle" fill="#fff7ed" font-size="24" font-family="Arial, sans-serif">لفّة على مزاجك</text>'
            '<text x="220" y="493" text-anchor="middle" fill="#fed7aa" font-size="16" font-family="Arial, sans-serif">CREATIVE DIRECTION</text>'
            '<rect x="420" y="190" width="320" height="320" rx="26" fill="#1f1b1a" stroke="#f97316" stroke-width="3"/>'
            '<text x="580" y="238" text-anchor="middle" fill="#fdba74" font-size="20" font-family="Arial, sans-serif">CAMPAIGN ENGINE</text>'
            '<circle cx="580" cy="335" r="74" fill="#431407" stroke="#fb923c" stroke-width="3"/>'
            '<path d="M535 335 A45 45 0 1 1 580 380" fill="none" stroke="#fbbf24" stroke-width="9"/>'
            '<path d="M580 335 L621 305" stroke="#fff7ed" stroke-width="6"/><circle cx="580" cy="335" r="8" fill="#fff"/>'
            '<text x="580" y="455" text-anchor="middle" fill="#fff7ed" font-size="22" font-family="Arial, sans-serif">TEST • LEARN • SCALE</text>'
            '<rect x="790" y="190" width="330" height="145" rx="22" fill="#1f1b1a" stroke="#9a3412" stroke-width="2"/>'
            '<text x="955" y="232" text-anchor="middle" fill="#fdba74" font-size="18" font-family="Arial, sans-serif">ILLUSTRATIVE ROAS</text>'
            '<text x="955" y="295" text-anchor="middle" fill="#fef3c7" font-size="48" font-weight="700" font-family="Arial, sans-serif">4.1x</text>'
            '<rect x="790" y="360" width="330" height="145" rx="22" fill="#1f1b1a" stroke="#9a3412" stroke-width="2"/>'
            '<text x="955" y="402" text-anchor="middle" fill="#fdba74" font-size="18" font-family="Arial, sans-serif">ILLUSTRATIVE COST / MESSAGE</text>'
            '<text x="955" y="465" text-anchor="middle" fill="#fef3c7" font-size="43" font-weight="700" font-family="Arial, sans-serif">$0.58</text>'
            '<text x="600" y="590" text-anchor="middle" fill="#fed7aa" font-size="17" font-family="Arial, sans-serif">SIMULATED PORTFOLIO RESULTS — NOT VERIFIED CLIENT PERFORMANCE</text>'
        ),
        'dashboard': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fffaf5"/>'
            '<text x="600" y="240" text-anchor="middle" fill="#431407" font-size="24" font-family="Arial, sans-serif">ILLUSTRATIVE 30-DAY CAMPAIGN REPORT</text>'
            '<rect x="190" y="275" width="190" height="100" rx="15" fill="#ffedd5"/><text x="285" y="315" text-anchor="middle" fill="#9a3412" font-size="15" font-family="Arial, sans-serif">SPEND</text><text x="285" y="352" text-anchor="middle" fill="#431407" font-size="27" font-family="Arial, sans-serif">$3,000</text>'
            '<rect x="400" y="275" width="190" height="100" rx="15" fill="#fef3c7"/><text x="495" y="315" text-anchor="middle" fill="#92400e" font-size="15" font-family="Arial, sans-serif">REACH</text><text x="495" y="352" text-anchor="middle" fill="#431407" font-size="27" font-family="Arial, sans-serif">540K</text>'
            '<rect x="610" y="275" width="190" height="100" rx="15" fill="#ffedd5"/><text x="705" y="315" text-anchor="middle" fill="#9a3412" font-size="15" font-family="Arial, sans-serif">MESSAGES</text><text x="705" y="352" text-anchor="middle" fill="#431407" font-size="27" font-family="Arial, sans-serif">5,200</text>'
            '<rect x="820" y="275" width="190" height="100" rx="15" fill="#fef3c7"/><text x="915" y="315" text-anchor="middle" fill="#92400e" font-size="15" font-family="Arial, sans-serif">SAMPLE ROAS</text><text x="915" y="352" text-anchor="middle" fill="#431407" font-size="27" font-family="Arial, sans-serif">4.1x</text>'
            '<rect x="190" y="400" width="820" height="145" rx="14" fill="#fff7ed"/>'
            '<path d="M230 510 L320 480 L410 495 L510 450 L610 468 L720 425 L810 442 L960 410" fill="none" stroke="#ea580c" stroke-width="8" stroke-linecap="round"/>'
            '<text x="600" y="575" text-anchor="middle" fill="#9a3412" font-size="17" font-family="Arial, sans-serif">SIMULATED METRICS ONLY • NOT ACTUAL CAMPAIGN DATA</text>'
        ),
        'creative': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#2b1710"/>'
            '<rect x="200" y="230" width="245" height="300" rx="18" fill="#7c2d12"/><circle cx="322" cy="340" r="80" fill="#f5deb3"/><circle cx="322" cy="340" r="60" fill="#d97706"/><text x="322" y="470" text-anchor="middle" fill="#fff7ed" font-size="19" font-family="Arial, sans-serif">A / PRODUCT HERO</text>'
            '<rect x="478" y="230" width="245" height="300" rx="18" fill="#431407"/><circle cx="600" cy="330" r="59" fill="#fbbf24"/><path d="M582 303 L582 357 L630 330Z" fill="#7c2d12"/><text x="600" y="470" text-anchor="middle" fill="#fff7ed" font-size="19" font-family="Arial, sans-serif">B / SHORT VIDEO</text>'
            '<rect x="755" y="230" width="245" height="300" rx="18" fill="#7c2d12"/><rect x="785" y="270" width="185" height="125" rx="12" fill="#fef3c7"/><text x="877" y="325" text-anchor="middle" fill="#431407" font-size="25" font-family="Arial, sans-serif">عرض اليوم</text><rect x="815" y="415" width="125" height="40" rx="12" fill="#fbbf24"/><text x="877" y="442" text-anchor="middle" fill="#451a03" font-size="16" font-family="Arial, sans-serif">اطلب الآن</text><text x="877" y="490" text-anchor="middle" fill="#fff7ed" font-size="19" font-family="Arial, sans-serif">C / OFFER</text>'
            '<text x="600" y="570" text-anchor="middle" fill="#fed7aa" font-size="17" font-family="Arial, sans-serif">SAMPLE A/B TEST: HOOK • FORMAT • CTA</text>'
        ),
        'funnel': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fffaf5"/>'
            '<path d="M250 255 H950 L880 340 H320Z" fill="#fed7aa"/><text x="600" y="310" text-anchor="middle" fill="#7c2d12" font-size="23" font-family="Arial, sans-serif">AWARENESS • Reach &amp; video views</text>'
            '<path d="M320 355 H880 L815 440 H385Z" fill="#fdba74"/><text x="600" y="410" text-anchor="middle" fill="#7c2d12" font-size="22" font-family="Arial, sans-serif">CONSIDERATION • Engagement &amp; messages</text>'
            '<path d="M390 455 H810 L760 530 H440Z" fill="#fb923c"/><text x="600" y="508" text-anchor="middle" fill="#431407" font-size="21" font-family="Arial, sans-serif">CONVERSION • Orders &amp; store visits</text>'
            '<text x="600" y="570" text-anchor="middle" fill="#7c2d12" font-size="17" font-family="Arial, sans-serif">RETARGETING • Engaged viewers • Menu visitors • Consent-aware audiences</text>'
        ),
        'markets': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fffaf5"/>'
            '<rect x="195" y="240" width="370" height="260" rx="22" fill="#fff1e6" stroke="#fdba74" stroke-width="2"/><circle cx="380" cy="330" r="55" fill="#fed7aa"/><path d="M350 340 L380 285 L410 340Z" fill="#c2410c"/><text x="380" y="425" text-anchor="middle" fill="#7c2d12" font-size="26" font-family="Arial, sans-serif">GAZA</text><text x="380" y="462" text-anchor="middle" fill="#9a3412" font-size="17" font-family="Arial, sans-serif">Local radius • Store hours • Messages</text>'
            '<rect x="635" y="240" width="370" height="260" rx="22" fill="#fff1e6" stroke="#fdba74" stroke-width="2"/><circle cx="820" cy="330" r="55" fill="#fed7aa"/><path d="M785 340 Q820 285 855 340 Q845 365 820 374 Q795 365 785 340Z" fill="#c2410c"/><text x="820" y="425" text-anchor="middle" fill="#7c2d12" font-size="26" font-family="Arial, sans-serif">EGYPT</text><text x="820" y="462" text-anchor="middle" fill="#9a3412" font-size="17" font-family="Arial, sans-serif">City-specific sets • Local offers</text>'
            '<text x="600" y="555" text-anchor="middle" fill="#7c2d12" font-size="17" font-family="Arial, sans-serif">Separate market reporting prevents blended performance claims</text>'
        ),
    }
    bg = '<stop offset="0" stop-color="#24130d"/><stop offset="1" stop-color="#7c2d12"/>'
    if kind == 'dashboard' or kind == 'funnel' or kind == 'markets':
        bg = '<stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#fed7aa"/>'
    title = {
        'cover': 'FAHD SHAWARMA  /  META ADS CASE STUDY',
        'dashboard': 'ILLUSTRATIVE CAMPAIGN PERFORMANCE',
        'creative': 'CREATIVE TESTING  /  HOOK &amp; FORMAT',
        'funnel': 'FULL-FUNNEL CAMPAIGN STRUCTURE',
        'markets': 'MARKET SEGMENTATION  /  GAZA &amp; EGYPT',
    }[kind]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">{bg}</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        f'<text x="600" y="115" text-anchor="middle" fill="#431407" font-size="28" font-family="Arial, sans-serif" letter-spacing="3">{title}</text>'
        f'{boards[kind]}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع توضيحي لحملة Meta Ads لمطعم فهد للشاورما.'

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
                    'تصور حملة Meta Ads متعددة الأسواق لمطعم فهد للشاورما في قطاع غزة ومصر، '
                    'مع تقسيم الجمهور واختبار الكرياتيف وإعادة الاستهداف. النتائج رقمية نموذجية ومحاكاة.'
                ),
                'category': 'التسويق الرقمي',
                'role': 'Meta Ads Strategist / Performance Marketer',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1590,
                'likes': 344,
            },
        )
        project.summary = (
            'تصور حملة Meta Ads متعددة الأسواق لمطعم فهد للشاورما في قطاع غزة ومصر، '
            'مع تقسيم الجمهور واختبار الكرياتيف وإعادة الاستهداف. النتائج رقمية نموذجية ومحاكاة.'
        )
        project.category = 'التسويق الرقمي'
        project.role = 'Meta Ads Strategist / Performance Marketer'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>ملخص دراسة الحالة</h2>'
            '<p>تصور لحملة تسويق عبر Facebook وInstagram لمطعم فهد للشاورما، مع فصل إعدادات قطاع غزة عن السوق المصري '
            'حتى لا تختلط اختلافات التوصيل والجمهور والعروض ونتائج المزاد. يركز التصميم على تحويل الاهتمام إلى رسائل '
            'أو طلبات قابلة للقياس، مع كرياتيف محلي مناسب لكل منطقة.</p>'
            '<h2>استراتيجية الحملة</h2>'
            '<ul><li>Awareness عبر فيديوهات قصيرة لعرض التحضير والوجبات المميزة.</li>'
            '<li>Consideration لاستهداف المتفاعلين ومشاهدي الفيديو بعروض القائمة والموقع.</li>'
            '<li>Conversion عبر حملات رسائل أو طلبات حسب القنوات المتاحة لكل موقع.</li>'
            '<li>تقسيم ad sets حسب المنطقة ونطاق الخدمة والوقت، واستبعاد المناطق غير المخدومة.</li>'
            '<li>A/B testing للـ hook والصورة/الفيديو وCTA والعرض، وتوسيع الميزانية للفائزين تدريجياً.</li>'
            '<li>Retargeting لمشاهدي الفيديو والمتفاعلين وزوار القائمة ضمن إعدادات موافقة وقياس مناسبة.</li></ul>'
            '<h2>نتائج نموذجية توضيحية — غير فعلية</h2>'
            '<p><strong>تنبيه:</strong> جميع الأرقام أدناه محاكاة أنشئت لغرض عرض المشروع، وليست نتائج فعلية أو موثقة '
            'لحملة نفذها المطعم أو المدرب. لا يجوز نسبتها كإنجاز حقيقي؛ يجب استبدالها بتقرير Ads Manager '
            'وبيانات الطلبات المعتمدة قبل النشر كأداء فعلي.</p>'
            '<ul><li>مدة نموذجية 30 يوماً وإنفاق افتراضي 3,000 دولار موزع على السوقين.</li>'
            '<li>Reach تقديري 540,000، وImpressions مقدارها 1,240,000، وFrequency يقارب 2.3.</li>'
            '<li>18,600 نقرة افتراضية، CTR تقديري 1.5%، وCPC نموذجي 0.16 دولار.</li>'
            '<li>5,200 محادثة/استفسار افتراضي بتكلفة 0.58 دولار للمحادثة.</li>'
            '<li>ROAS توضيحي 4.1x يفترض إيراداً منسوباً قدره 12,300 دولار، وليس إثباتاً لمبيعات فعلية.</li></ul>'
            '<h2>القياس والتحسين</h2>'
            '<p>يستخدم التصور Meta Pixel وConversions API عند توافر مسار طلب مناسب، مع UTM conventions '
            'ومنع ازدواجية الأحداث. تتم مراجعة CPM وCTR وCPC وتكلفة المحادثة ومعدل التحول من الاستفسار للطلب، '
            'وفصل النتائج حسب السوق والمنطقة والكرياتيف. لا يُعتمد ROAS إلا بعد مطابقته مع الطلبات والإيرادات الفعلية.</p>'
            '<h2>المواد الإبداعية</h2>'
            '<p>Reels عمودية قصيرة، صور منتجات، إعلانات عروض، ونصوص CTA محلية. ترتبط الحملة بساعات العمل '
            'وتوفر المنتجات والقدرة التشغيلية، وتراجع العروض والأسعار مع المطعم.</p>'
            '<h2>حالة المشروع</h2>'
            '<p>هذه دراسة حالة مفاهيمية Portfolio concept، وليست تأكيداً على إطلاق الحملة أو اعتمادها من مطعم فهد. '
            'النتائج افتراضية بوضوح ويجب عدم تقديمها كأداء فعلي قبل التحقق من تقارير الحملة وموافقة العميل.</p>'
        )
        project.save()
        if not project.cover:
            project.cover.save(
                'alaa-fahd-meta-ads-campaign.svg',
                ContentFile(_artwork('cover')),
                save=True,
            )

        names = [
            'Meta Ads', 'Facebook Ads', 'Instagram Ads', 'Digital Marketing',
            'Performance Marketing', 'Campaign Strategy', 'A/B Testing',
            'Retargeting', 'Restaurant Marketing', 'Analytics',
        ]
        project.tags.set([ProjectTag.objects.get_or_create(name=name)[0] for name in names])
        self._ensure_gallery(project)
        action = 'إنشاء' if created else 'تحديث'
        self.stdout.write(self.style.SUCCESS(
            f'تم {action} المشروع العام المنشور: {project.title} (المالك: {owner.handle})'
        ))

    @staticmethod
    def _ensure_gallery(project):
        if project.images.exists():
            return
        for order, kind in enumerate(('dashboard', 'creative', 'funnel', 'markets')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-fahd-meta-ads-{kind}.svg',
                ContentFile(_artwork(kind)),
                save=True,
            )