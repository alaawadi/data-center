from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'عشاكة Studio — تصوير ومونتاج لحملات الأزياء'


def _artwork(kind):
    scenes = {
        'cover': (
            '<rect x="70" y="175" width="320" height="385" rx="26" fill="#171717" stroke="#f59e0b" stroke-width="3"/>'
            '<rect x="92" y="198" width="276" height="340" rx="16" fill="#1c1917"/>'
            '<rect x="120" y="225" width="220" height="175" rx="14" fill="#44403c"/>'
            '<circle cx="230" cy="275" r="44" fill="#d6a77a"/>'
            '<path d="M170 395 Q175 320 230 320 Q285 320 290 395Z" fill="#78350f"/>'
            '<path d="M195 335 L230 365 L265 335" fill="none" stroke="#fbbf24" stroke-width="6"/>'
            '<text x="230" y="450" text-anchor="middle" fill="#fef3c7" font-size="24" font-weight="700" font-family="Arial, sans-serif">عشاكة</text>'
            '<text x="230" y="488" text-anchor="middle" fill="#fcd34d" font-size="15" font-family="Arial, sans-serif">FASHION FILM</text>'
            '<rect x="151" y="505" width="158" height="10" rx="5" fill="#a8a29e"/>'
            '<rect x="435" y="190" width="320" height="345" rx="25" fill="#211915" stroke="#f59e0b" stroke-width="2"/>'
            '<text x="595" y="240" text-anchor="middle" fill="#fcd34d" font-size="20" font-family="Arial, sans-serif">VISUAL STORY</text>'
            '<circle cx="595" cy="350" r="77" fill="#44403c"/>'
            '<path d="M548 350 Q560 290 595 290 Q630 290 642 350 L628 420 H562Z" fill="#b45309"/>'
            '<path d="M558 330 L595 365 L632 330" fill="none" stroke="#fde68a" stroke-width="6"/>'
            '<text x="595" y="465" text-anchor="middle" fill="#fff7ed" font-size="18" font-family="Arial, sans-serif">DETAIL • MOTION • MOOD</text>'
            '<rect x="800" y="205" width="310" height="150" rx="22" fill="#211915" stroke="#78716c" stroke-width="2"/>'
            '<text x="955" y="250" text-anchor="middle" fill="#e7e5e4" font-size="19" font-family="Arial, sans-serif">CAMERA / EDIT</text>'
            '<circle cx="910" cy="300" r="24" fill="#292524" stroke="#fbbf24" stroke-width="4"/><circle cx="910" cy="300" r="10" fill="#f59e0b"/>'
            '<rect x="950" y="285" width="120" height="28" rx="8" fill="#44403c"/>'
            '<rect x="800" y="385" width="310" height="150" rx="22" fill="#211915" stroke="#78716c" stroke-width="2"/>'
            '<text x="955" y="430" text-anchor="middle" fill="#e7e5e4" font-size="19" font-family="Arial, sans-serif">SOCIAL CUTDOWNS</text>'
            '<rect x="850" y="455" width="56" height="56" rx="10" fill="#78350f"/><rect x="920" y="455" width="56" height="56" rx="10" fill="#92400e"/><rect x="990" y="455" width="56" height="56" rx="10" fill="#b45309"/>'
            '<rect x="260" y="580" width="680" height="52" rx="16" fill="#17110e" stroke="#78350f"/>'
            '<text x="600" y="613" text-anchor="middle" fill="#fed7aa" font-size="18" font-family="Arial, sans-serif">FASHION FILM  /  PRODUCT DETAIL  /  VERTICAL SOCIAL CONTENT</text>'
        ),
        'editorial': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#1c1917"/>'
            '<rect x="195" y="225" width="350" height="330" rx="18" fill="#44403c"/>'
            '<circle cx="370" cy="315" r="62" fill="#d6a77a"/>'
            '<path d="M290 520 Q300 390 370 390 Q440 390 450 520Z" fill="#78350f"/>'
            '<path d="M318 420 L370 460 L422 420" fill="none" stroke="#fbbf24" stroke-width="8"/>'
            '<path d="M280 490 H460" stroke="#fef3c7" stroke-width="2" opacity=".7"/>'
            '<text x="370" y="535" text-anchor="middle" fill="#fff7ed" font-size="16" font-family="Arial, sans-serif">EDITORIAL LOOK</text>'
            '<rect x="585" y="245" width="390" height="80" rx="16" fill="#292524"/>'
            '<text x="780" y="278" text-anchor="middle" fill="#fcd34d" font-size="19" font-family="Arial, sans-serif">MOOD &amp; ART DIRECTION</text>'
            '<text x="780" y="307" text-anchor="middle" fill="#d6d3d1" font-size="16" font-family="Arial, sans-serif">Wardrobe • Palette • Location</text>'
            '<rect x="585" y="350" width="390" height="80" rx="16" fill="#292524"/>'
            '<text x="780" y="383" text-anchor="middle" fill="#fed7aa" font-size="19" font-family="Arial, sans-serif">LIGHTING &amp; COMPOSITION</text>'
            '<text x="780" y="412" text-anchor="middle" fill="#d6d3d1" font-size="16" font-family="Arial, sans-serif">Shape • Texture • Silhouette</text>'
            '<rect x="585" y="455" width="390" height="80" rx="16" fill="#292524"/>'
            '<text x="780" y="488" text-anchor="middle" fill="#fde68a" font-size="19" font-family="Arial, sans-serif">BRAND STORY</text>'
            '<text x="780" y="517" text-anchor="middle" fill="#d6d3d1" font-size="16" font-family="Arial, sans-serif">A look that feels like the label</text>'
        ),
        'editing': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#1c1917"/>'
            '<rect x="190" y="225" width="820" height="205" rx="18" fill="#292524"/>'
            '<rect x="215" y="250" width="175" height="150" rx="12" fill="#44403c"/>'
            '<circle cx="302" cy="300" r="30" fill="#d6a77a"/><path d="M260 390 Q265 335 302 335 Q339 335 345 390Z" fill="#78350f"/>'
            '<rect x="410" y="250" width="175" height="150" rx="12" fill="#57534e"/>'
            '<circle cx="497" cy="300" r="30" fill="#d6a77a"/><path d="M455 390 Q460 335 497 335 Q534 335 540 390Z" fill="#b45309"/>'
            '<rect x="605" y="250" width="175" height="150" rx="12" fill="#44403c"/>'
            '<circle cx="692" cy="300" r="30" fill="#d6a77a"/><path d="M650 390 Q655 335 692 335 Q729 335 735 390Z" fill="#92400e"/>'
            '<rect x="800" y="250" width="175" height="150" rx="12" fill="#57534e"/>'
            '<circle cx="887" cy="300" r="30" fill="#d6a77a"/><path d="M845 390 Q850 335 887 335 Q924 335 930 390Z" fill="#78350f"/>'
            '<rect x="190" y="450" width="820" height="55" rx="12" fill="#292524"/>'
            '<rect x="220" y="465" width="220" height="24" rx="6" fill="#b45309"/>'
            '<rect x="440" y="465" width="180" height="24" rx="6" fill="#f59e0b"/>'
            '<rect x="620" y="465" width="245" height="24" rx="6" fill="#78350f"/>'
            '<rect x="865" y="465" width="105" height="24" rx="6" fill="#d97706"/>'
            '<rect x="190" y="520" width="820" height="45" rx="12" fill="#292524"/>'
            '<path d="M220 543 L240 543 L253 527 L270 555 L290 536 L315 543 L335 530 L350 550 L380 543 L405 543 L420 530 L438 552 L460 543 L500 543 L520 526 L540 555 L558 543 L590 543 L610 531 L630 552 L655 543 L690 543 L710 528 L730 553 L750 543 L785 543 L805 532 L825 553 L850 543 L885 543 L905 527 L925 555 L950 543 L980 543" fill="none" stroke="#fcd34d" stroke-width="3"/>'
            '<text x="600" y="590" text-anchor="middle" fill="#fed7aa" font-size="17" font-family="Arial, sans-serif">EDIT RHYTHM • COLOR GRADE • SOUND DESIGN</text>'
        ),
        'social': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#f5f5f4"/>'
            '<rect x="195" y="225" width="235" height="315" rx="18" fill="#78350f"/>'
            '<circle cx="312" cy="325" r="61" fill="#d6a77a"/><path d="M265 510 Q272 395 312 395 Q352 395 360 510Z" fill="#b45309"/>'
            '<text x="312" y="495" text-anchor="middle" fill="#fff7ed" font-size="17" font-family="Arial, sans-serif">REEL COVER</text>'
            '<rect x="483" y="225" width="235" height="315" rx="18" fill="#292524"/>'
            '<circle cx="600" cy="325" r="61" fill="#d6a77a"/><path d="M553 510 Q560 395 600 395 Q640 395 647 510Z" fill="#92400e"/>'
            '<circle cx="600" cy="325" r="25" fill="none" stroke="#fff" stroke-width="3"/><path d="M594 309 V341 L618 325Z" fill="#fff"/>'
            '<text x="600" y="495" text-anchor="middle" fill="#fff7ed" font-size="17" font-family="Arial, sans-serif">MOTION CUT</text>'
            '<rect x="770" y="225" width="235" height="315" rx="18" fill="#b45309"/>'
            '<rect x="795" y="255" width="185" height="145" rx="12" fill="#fef3c7"/>'
            '<text x="887" y="300" text-anchor="middle" fill="#78350f" font-size="17" font-family="Arial, sans-serif">NEW SEASON</text>'
            '<text x="887" y="345" text-anchor="middle" fill="#451a03" font-size="27" font-family="Arial, sans-serif">اكتشف إطلالتك</text>'
            '<rect x="825" y="425" width="125" height="38" rx="12" fill="#451a03"/>'
            '<text x="887" y="450" text-anchor="middle" fill="#fff7ed" font-size="15" font-family="Arial, sans-serif">تسوّق الآن</text>'
            '<text x="887" y="495" text-anchor="middle" fill="#fff7ed" font-size="17" font-family="Arial, sans-serif">CAMPAIGN FRAME</text>'
            '<text x="600" y="575" text-anchor="middle" fill="#44403c" font-size="17" font-family="Arial, sans-serif">VERTICAL 9:16 • FEED • REELS • STORY ADS</text>'
        ),
        'details': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#292524"/>'
            '<rect x="195" y="225" width="385" height="310" rx="18" fill="#57534e"/>'
            '<circle cx="385" cy="315" r="58" fill="#d6a77a"/>'
            '<path d="M315 510 Q325 390 385 390 Q445 390 455 510Z" fill="#78350f"/>'
            '<path d="M330 430 L385 470 L440 430" fill="none" stroke="#fbbf24" stroke-width="7"/>'
            '<circle cx="385" cy="315" r="75" fill="none" stroke="#fef3c7" stroke-width="2" opacity=".8"/>'
            '<rect x="625" y="245" width="340" height="75" rx="15" fill="#1c1917"/>'
            '<text x="795" y="275" text-anchor="middle" fill="#fcd34d" font-size="18" font-family="Arial, sans-serif">FABRIC &amp; FINISH</text>'
            '<text x="795" y="302" text-anchor="middle" fill="#d6d3d1" font-size="15" font-family="Arial, sans-serif">Texture • seams • garment detail</text>'
            '<rect x="625" y="345" width="340" height="75" rx="15" fill="#1c1917"/>'
            '<text x="795" y="375" text-anchor="middle" fill="#fed7aa" font-size="18" font-family="Arial, sans-serif">FIT &amp; SILHOUETTE</text>'
            '<text x="795" y="402" text-anchor="middle" fill="#d6d3d1" font-size="15" font-family="Arial, sans-serif">Movement • drape • proportion</text>'
            '<rect x="625" y="445" width="340" height="75" rx="15" fill="#1c1917"/>'
            '<text x="795" y="475" text-anchor="middle" fill="#fde68a" font-size="18" font-family="Arial, sans-serif">COLOR &amp; LIGHT</text>'
            '<text x="795" y="502" text-anchor="middle" fill="#d6d3d1" font-size="15" font-family="Arial, sans-serif">Accurate tone • controlled contrast</text>'
            '<text x="600" y="575" text-anchor="middle" fill="#fed7aa" font-size="17" font-family="Arial, sans-serif">PRODUCT DETAIL • AUTHENTIC COLOR • CLEAN RETOUCH</text>'
        ),
    }
    labels = {
        'cover': 'ASHAAKA STUDIO  /  FASHION FILM &amp; EDIT',
        'editorial': 'ASHAAKA  /  EDITORIAL ART DIRECTION',
        'editing': 'ASHAAKA  /  POST-PRODUCTION TIMELINE',
        'social': 'ASHAAKA  /  SOCIAL CAMPAIGN CUTDOWNS',
        'details': 'ASHAAKA  /  GARMENT DETAIL &amp; TEXTURE',
    }
    if kind == 'social':
        gradient = '<stop offset="0" stop-color="#f5f5f4"/><stop offset="1" stop-color="#e7e5e4"/>'
        title_color = '#292524'
    else:
        gradient = '<stop offset="0" stop-color="#1c1917"/><stop offset="1" stop-color="#78350f"/>'
        title_color = '#fef3c7'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">{gradient}</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        f'<text x="600" y="115" text-anchor="middle" fill="{title_color}" font-size="28" '
        f'font-family="Arial, sans-serif" letter-spacing="3">{labels[kind]}</text>'
        f'{scenes[kind]}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع تصوير ومونتاج لمحلات عشاكة للملابس للمدرب أبو كريم.'

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
                    'تصور إنتاج بصري لمحلات عشاكة للملابس، يجمع تصوير الأزياء وفيلم قصير '
                    'ومحتوى عمودي يبرز الخامات والتفاصيل والحركة ضمن هوية متناسقة.'
                ),
                'category': 'تصوير ومونتاج',
                'role': 'Fashion Photographer / Video Editor',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1050,
                'likes': 229,
            },
        )
        project.summary = (
            'تصور إنتاج بصري لمحلات عشاكة للملابس، يجمع تصوير الأزياء وفيلم قصير '
            'ومحتوى عمودي يبرز الخامات والتفاصيل والحركة ضمن هوية متناسقة.'
        )
        project.category = 'تصوير ومونتاج'
        project.role = 'Fashion Photographer / Video Editor'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>تصور إنتاج تصوير ومونتاج لمحلات عشاكة للملابس، يقدّم مجموعة الأزياء في سياق بصري '
            'يعكس أسلوب العلامة ويجعل تفاصيل المنتج واضحة. يقوم المفهوم على Fashion Film قصير '
            'ومكتبة صور ومقاطع قابلة لإعادة الاستخدام في الحملات والمنصات الاجتماعية.</p>'
            '<h2>المعالجة الإبداعية</h2>'
            '<ul>'
            '<li>تطوير moodboard ولوحة ألوان ومراجع للإضاءة والموقع بما يلائم أسلوب المجموعة.</li>'
            '<li>توجيه بصري يوازن بين editorial portraits ولقطات المنتج القريبة لبيان الخامة والتفصيل.</li>'
            '<li>لقطات حركة تظهر fit وdrape وسلوك القماش أثناء الاستخدام، دون مبالغة في retouch.</li>'
            '<li>تكوينات متعددة للقطعة الواحدة تساعد على عرضها في المتجر الرقمي والحملات الاجتماعية.</li>'
            '</ul>'
            '<h2>التصوير والمونتاج</h2>'
            '<p>يشمل التخطيط shot list وstoryboard، تنسيق الملابس والإكسسوارات، ضبط الإضاءة '
            'والتعريض وتوازن اللون الأبيض، ثم اختيار اللقطات والمونتاج الإيقاعي وتصحيح الألوان '
            'ومعالجة الصوت والعناوين. تُجهز نسخة رئيسية ونسخ قصيرة عمودية للـ Reels وStories '
            'ومقاسات مناسبة للـ Feed.</p>'
            '<h2>منظومة الأصول الإبداعية</h2>'
            '<p>تُنظم الصور والفيديوهات حسب المجموعة والقطعة والمقاس، مع master exports ونسخ '
            'مضغوطة للمنصات، وقواعد تسمية وتسليم واضحة. يسمح ذلك بتحديث الحملات وإعادة استخدام '
            'الأصول مع الحفاظ على اتساق اللون والهوية.</p>'
            '<h2>الخصوصية وحقوق الاستخدام</h2>'
            '<p>يتطلب التصوير موافقة المشاركين على استخدام الصورة، وتحديد نطاق الاستخدام ومدته '
            'مع الجهة، واحترام حقوق الموسيقى والمواقع والعلامات. هذا التصور لا يعني أن العمل نُفذ '
            'أو اعتُمد رسمياً من محلات عشاكة دون اتفاق وتنسيق مباشر.</p>'
        )
        project.save()
        if not project.cover:
            project.cover.save(
                'abokareem-ashaka-fashion-film.svg',
                ContentFile(_artwork('cover')),
                save=True,
            )

        names = [
            'تصوير أزياء', 'Fashion Photography', 'Video Editing', 'Fashion Film',
            'Product Photography', 'Art Direction', 'Color Grading',
            'Reels', 'Social Media Content',
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
        for order, kind in enumerate(('editorial', 'editing', 'social', 'details')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'abokareem-ashaka-fashion-{kind}.svg',
                ContentFile(_artwork(kind)),
                save=True,
            )
