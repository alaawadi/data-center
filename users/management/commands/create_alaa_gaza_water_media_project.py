from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'حكاية قطرة — إنتاج مرئي لمصلحة مياه مدينة غزة'


def _cover_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs>'
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#082f49"/><stop offset="1" stop-color="#0f766e"/>'
        '</linearGradient>'
        '<linearGradient id="water" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#67e8f9"/><stop offset="1" stop-color="#38bdf8"/>'
        '</linearGradient>'
        '</defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1050" cy="90" r="220" fill="#67e8f9" opacity=".08"/>'
        '<circle cx="140" cy="640" r="290" fill="#2dd4bf" opacity=".08"/>'
        '<text x="600" y="95" text-anchor="middle" fill="#cffafe" font-size="29" '
        'font-family="Arial, sans-serif" letter-spacing="4">WATER STORIES  /  CITY OF GAZA</text>'
        '<path d="M600 165 C600 165 490 300 490 380 C490 445 540 485 600 485 C660 485 710 445 710 380 C710 300 600 165 600 165Z" '
        'fill="url(#water)" opacity=".95"/>'
        '<path d="M530 390 C560 370 590 408 620 390 C650 372 670 392 685 380" fill="none" stroke="#ecfeff" stroke-width="8" stroke-linecap="round" opacity=".8"/>'
        '<circle cx="600" cy="363" r="38" fill="#e0f2fe" opacity=".55"/>'
        '<rect x="95" y="230" width="245" height="160" rx="22" fill="#0b3b50" stroke="#38bdf8" stroke-width="2"/>'
        '<rect x="125" y="265" width="185" height="95" rx="14" fill="#155e75"/>'
        '<circle cx="160" cy="300" r="13" fill="#bae6fd"/><circle cx="204" cy="300" r="13" fill="#7dd3fc"/>'
        '<rect x="143" y="327" width="150" height="13" rx="6" fill="#67e8f9" opacity=".7"/>'
        '<text x="217" y="425" text-anchor="middle" fill="#cffafe" font-size="18" font-family="Arial, sans-serif">FIELD DOCUMENTARY</text>'
        '<rect x="860" y="230" width="245" height="160" rx="22" fill="#0b3b50" stroke="#5eead4" stroke-width="2"/>'
        '<rect x="890" y="265" width="185" height="95" rx="14" fill="#155e75"/>'
        '<path d="M910 335 L950 300 L980 322 L1015 285 L1055 315" fill="none" stroke="#99f6e4" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
        '<text x="982" y="425" text-anchor="middle" fill="#ccfbf1" font-size="18" font-family="Arial, sans-serif">COMMUNITY IMPACT</text>'
        '<rect x="230" y="540" width="740" height="66" rx="18" fill="#062b3c" stroke="#155e75"/>'
        '<text x="600" y="582" text-anchor="middle" fill="#cffafe" font-size="21" font-family="Arial, sans-serif">'
        'FILMING  /  EDITING  /  STORYTELLING  /  ACCESSIBILITY</text>'
        '</svg>'
    ).encode('utf-8')


def _gallery_svg(kind):
    scenes = {
        'field': (
            'FIELD DOCUMENTARY  /  WATER JOURNEY',
            '<rect x="145" y="185" width="910" height="420" rx="22" fill="#0b2738" stroke="#155e75" stroke-width="2"/>'
            '<rect x="185" y="230" width="550" height="320" rx="18" fill="#164e63"/>'
            '<circle cx="300" cy="315" r="70" fill="#0e7490" opacity=".8"/>'
            '<path d="M185 455 L300 380 L390 435 L510 340 L610 420 L735 350 V550 H185 Z" fill="#0f766e"/>'
            '<path d="M185 485 Q280 455 375 485 T565 485 T735 480 V550 H185Z" fill="#38bdf8" opacity=".8"/>'
            '<path d="M190 500 Q280 478 375 500 T565 500 T735 495" fill="none" stroke="#cffafe" stroke-width="5" opacity=".8"/>'
            '<rect x="775" y="230" width="240" height="320" rx="18" fill="#12384a"/>'
            '<circle cx="895" cy="320" r="53" fill="#0e7490"/>'
            '<path d="M825 465 Q835 390 895 390 Q955 390 965 465 V500 H825Z" fill="#0f766e"/>'
            '<rect x="820" y="485" width="150" height="34" rx="10" fill="#062b3c"/>'
            '<text x="895" y="508" text-anchor="middle" fill="#cffafe" font-size="16" font-family="Arial, sans-serif">HUMAN STORY</text>'
            '<circle cx="605" cy="270" r="25" fill="#111827"/><rect x="582" y="293" width="48" height="32" rx="8" fill="#111827"/>'
            '<rect x="575" y="285" width="65" height="42" rx="7" fill="#1e293b" stroke="#67e8f9" stroke-width="2"/>'
            '<circle cx="608" cy="306" r="13" fill="#38bdf8"/>'
        ),
        'edit': (
            'POST-PRODUCTION  /  EDIT & SOUND',
            '<rect x="145" y="185" width="910" height="420" rx="22" fill="#0b2738" stroke="#155e75" stroke-width="2"/>'
            '<rect x="185" y="225" width="830" height="180" rx="16" fill="#102f43"/>'
            '<rect x="210" y="250" width="170" height="125" rx="12" fill="#164e63"/>'
            '<path d="M210 340 L260 300 L305 330 L340 275 L380 325 V375 H210Z" fill="#0f766e"/>'
            '<rect x="400" y="250" width="170" height="125" rx="12" fill="#155e75"/>'
            '<path d="M400 345 Q455 300 505 340 T570 315 V375 H400Z" fill="#38bdf8"/>'
            '<rect x="590" y="250" width="170" height="125" rx="12" fill="#164e63"/>'
            '<circle cx="675" cy="300" r="34" fill="#67e8f9" opacity=".8"/>'
            '<path d="M610 375 Q620 330 675 330 Q730 330 740 375Z" fill="#0f766e"/>'
            '<rect x="780" y="250" width="210" height="125" rx="12" fill="#155e75"/>'
            '<path d="M800 320 Q820 275 840 320 T880 320 T920 320 T960 320" fill="none" stroke="#99f6e4" stroke-width="6"/>'
            '<rect x="185" y="430" width="830" height="54" rx="12" fill="#132f40"/>'
            '<rect x="210" y="445" width="220" height="23" rx="6" fill="#0ea5e9"/>'
            '<rect x="430" y="445" width="260" height="23" rx="6" fill="#14b8a6"/>'
            '<rect x="690" y="445" width="180" height="23" rx="6" fill="#a3e635"/>'
            '<rect x="870" y="445" width="120" height="23" rx="6" fill="#38bdf8"/>'
            '<rect x="185" y="505" width="830" height="55" rx="12" fill="#132f40"/>'
            '<path d="M210 533 L230 533 L245 515 L260 548 L280 525 L300 538 L320 510 L340 540 L365 533 L390 533 L410 518 L430 545 L450 530 L475 533 L500 533 L520 515 L540 548 L560 533 L585 533 L605 518 L625 541 L650 533 L680 533 L700 516 L720 545 L740 533 L770 533 L790 520 L810 542 L835 533 L860 533 L880 515 L900 548 L925 533 L970 533" fill="none" stroke="#67e8f9" stroke-width="3"/>'
        ),
        'storyboard': (
            'STORYBOARD  /  COMMUNITY WATER AWARENESS',
            '<rect x="145" y="185" width="910" height="420" rx="22" fill="#0b2738" stroke="#155e75" stroke-width="2"/>'
            '<rect x="185" y="230" width="245" height="300" rx="17" fill="#12384a"/>'
            '<circle cx="307" cy="310" r="54" fill="#155e75"/>'
            '<path d="M230 465 Q242 385 307 385 Q372 385 384 465 V500 H230Z" fill="#0f766e"/>'
            '<text x="307" y="510" text-anchor="middle" fill="#cffafe" font-size="16" font-family="Arial, sans-serif">PEOPLE &amp; DAILY LIFE</text>'
            '<rect x="477" y="230" width="245" height="300" rx="17" fill="#12384a"/>'
            '<path d="M520 420 Q600 365 680 420 V485 H520Z" fill="#0e7490"/>'
            '<path d="M535 435 Q600 410 665 435" fill="none" stroke="#a5f3fc" stroke-width="6"/>'
            '<path d="M600 280 C600 280 550 340 550 370 C550 402 572 420 600 420 C628 420 650 402 650 370 C650 340 600 280 600 280Z" fill="#38bdf8"/>'
            '<text x="600" y="510" text-anchor="middle" fill="#cffafe" font-size="16" font-family="Arial, sans-serif">WATER SERVICE</text>'
            '<rect x="770" y="230" width="245" height="300" rx="17" fill="#12384a"/>'
            '<rect x="815" y="300" width="155" height="120" rx="14" fill="#164e63"/>'
            '<path d="M835 390 L870 355 L900 374 L945 330" fill="none" stroke="#5eead4" stroke-width="7" stroke-linecap="round"/>'
            '<rect x="830" y="440" width="125" height="12" rx="6" fill="#38bdf8"/>'
            '<rect x="850" y="465" width="85" height="10" rx="5" fill="#94a3b8"/>'
            '<text x="892" y="510" text-anchor="middle" fill="#cffafe" font-size="16" font-family="Arial, sans-serif">IMPACT &amp; ACTION</text>'
            '<path d="M440 380 H470 M732 380 H762" stroke="#67e8f9" stroke-width="4"/>'
            '<path d="M457 368 L475 380 L457 392 M749 368 L767 380 L749 392" fill="none" stroke="#67e8f9" stroke-width="4"/>'
        ),
    }
    label, artwork = scenes[kind]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#082f49"/><stop offset="1" stop-color="#0f766e"/>'
        '</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1080" cy="80" r="210" fill="#67e8f9" opacity=".09"/>'
        '<text x="600" y="115" text-anchor="middle" fill="#cffafe" font-size="28" '
        'font-family="Arial, sans-serif" letter-spacing="3">WATER STORIES  /  '
        f'{label}</text>'
        f'{artwork}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع إنتاج مرئي لمصلحة مياه مدينة غزة للمدرب علاء وادي.'

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
                    'مشروع إنتاج مرئي توعوي لمصلحة مياه مدينة غزة، يحوّل رحلة المياه والخدمة المجتمعية '
                    'إلى قصة بصرية إنسانية تجمع التصوير الميداني والمونتاج والسرد الواضح.'
                ),
                'category': 'مونتاج وتصوير',
                'role': 'مصور ومونتير / منتج محتوى مرئي',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1140,
                'likes': 247,
            },
        )

        project.summary = (
            'مشروع إنتاج مرئي توعوي لمصلحة مياه مدينة غزة، يحوّل رحلة المياه والخدمة المجتمعية '
            'إلى قصة بصرية إنسانية تجمع التصوير الميداني والمونتاج والسرد الواضح.'
        )
        project.category = 'مونتاج وتصوير'
        project.role = 'مصور ومونتير / منتج محتوى مرئي'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>تصور إنتاج مرئي مؤسسي لمصلحة مياه مدينة غزة، يروي رحلة المياه والخدمات المرتبطة بها '
            'من منظور مجتمعي واضح ومحترم. يجمع المشروع بين التصوير والمونتاج والتصميم الصوتي '
            'لإنتاج مادة مناسبة للتوعية والتعريف بالخدمات عبر المنصات الرقمية.</p>'
            '<h2>المعالجة الإبداعية</h2>'
            '<ul>'
            '<li>بناء قصة قصيرة تبدأ من احتياج الناس للمياه، ثم تشرح الخدمة ودور المؤسسة، وتنتهي برسالة توعوية عملية.</li>'
            '<li>تصوير لقطات عامة ومقابلات بموافقة المشاركين، مع تجنب إظهار بيانات شخصية أو مواقع حساسة دون إذن.</li>'
            '<li>استخدام لقطات تفصيلية للمياه والأدوات والبيئة اليومية، ورسوم توضيحية مبسطة لشرح رحلة الخدمة.</li>'
            '<li>صياغة نسخة رئيسية للقصة، ومقاطع قصيرة عمودية للمنصات الاجتماعية، ونسخة صامتة بعناوين واضحة.</li>'
            '</ul>'
            '<h2>التصوير والمونتاج</h2>'
            '<p>يشمل التخطيط البصري shot list وstoryboard، ضبط التعريض وتوازن اللون الأبيض، '
            'تسجيل صوت مقابلات نظيف، ثم المونتاج الإيقاعي وتصحيح الألوان وموازنة الصوت. '
            'تُستخدم lower thirds والعناوين والخرائط/الرسوم التوضيحية عند الحاجة، مع ترجمة عربية '
            'وتصميم مناسب لسهولة الوصول والمشاهدة على الهاتف.</p>'
            '<h2>مخرجات الإنتاج</h2>'
            '<ul>'
            '<li>فيلم تعريفي رئيسي بصيغ مناسبة للعرض الرقمي.</li>'
            '<li>مجموعة Reels/Shorts مختصرة برسائل مستقلة قابلة للنشر.</li>'
            '<li>نسخة بعناوين مدمجة، وصور ثابتة مختارة، وملفات مشروع منظمة للأرشفة.</li>'
            '</ul>'
            '<h2>النهج التحريري</h2>'
            '<p>يعتمد التصور على معلومات معتمدة من الجهة، وتدقيق الأسماء والأرقام قبل النشر، '
            'واحترام خصوصية الأشخاص وكرامتهم. هذه صفحة عرض لفكرة إنتاجية؛ ولا تدّعي تنفيذ تصوير ميداني '
            'أو تمثيل الجهة رسمياً ما لم يتم اعتماده وتنفيذه بالتنسيق معها.</p>'
        )
        project.save()

        if not project.cover:
            project.cover.save(
                'alaa-gaza-water-stories-cover.svg',
                ContentFile(_cover_svg()),
                save=True,
            )

        tag_names = [
            'تصوير', 'مونتاج', 'إنتاج مرئي', 'تصحيح الألوان', 'سرد بصري',
            'محتوى توعوي', 'تصميم صوتي', 'ترجمة وSubtitles', 'Gaza Water',
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

        for order, kind in enumerate(('field', 'edit', 'storyboard')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-gaza-water-{kind}.svg',
                ContentFile(_gallery_svg(kind)),
                save=True,
            )
