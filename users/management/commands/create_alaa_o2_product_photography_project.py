from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'O2 Food Stories — تصوير منتجات لمطعم O2 في غزة'


def _artwork(kind):
    designs = {
        'cover': (
            '<rect x="70" y="175" width="360" height="385" rx="26" fill="#171717" stroke="#84cc16" stroke-width="3"/>'
            '<rect x="92" y="198" width="316" height="338" rx="16" fill="#1f2937"/>'
            '<circle cx="250" cy="350" r="118" fill="#f3e8d0"/>'
            '<circle cx="250" cy="350" r="95" fill="#365314"/>'
            '<circle cx="250" cy="350" r="78" fill="#d97706"/>'
            '<path d="M183 360 Q193 310 235 314 Q276 278 314 328 Q327 371 290 396 Q235 426 183 360Z" fill="#7c2d12"/>'
            '<path d="M202 342 Q242 315 284 340 M218 374 Q254 391 294 360" fill="none" stroke="#fbbf24" stroke-width="8" stroke-linecap="round"/>'
            '<circle cx="201" cy="387" r="8" fill="#22c55e"/><circle cx="302" cy="316" r="8" fill="#84cc16"/>'
            '<text x="250" y="480" text-anchor="middle" fill="#f7fee7" font-size="25" font-weight="700" font-family="Arial, sans-serif">O2 • طعم من غزة</text>'
            '<text x="250" y="515" text-anchor="middle" fill="#d9f99d" font-size="15" font-family="Arial, sans-serif">PRODUCT PHOTOGRAPHY</text>'
            '<rect x="475" y="190" width="310" height="345" rx="25" fill="#17220f" stroke="#65a30d" stroke-width="2"/>'
            '<text x="630" y="240" text-anchor="middle" fill="#bef264" font-size="20" font-family="Arial, sans-serif">VISUAL DIRECTION</text>'
            '<circle cx="630" cy="350" r="84" fill="#365314" stroke="#a3e635" stroke-width="4"/>'
            '<path d="M630 277 L646 326 L698 326 L656 357 L672 408 L630 378 L588 408 L604 357 L562 326 L614 326 Z" fill="#fbbf24"/>'
            '<text x="630" y="475" text-anchor="middle" fill="#f7fee7" font-size="19" font-family="Arial, sans-serif">LIGHT • TEXTURE • STORY</text>'
            '<rect x="830" y="205" width="300" height="150" rx="22" fill="#17220f" stroke="#4d7c0f" stroke-width="2"/>'
            '<text x="980" y="250" text-anchor="middle" fill="#bef264" font-size="19" font-family="Arial, sans-serif">HERO SHOT</text>'
            '<circle cx="980" cy="302" r="35" fill="#d97706"/><path d="M953 305 Q980 270 1007 300 Q1002 331 980 337 Q958 331 953 305Z" fill="#7c2d12"/>'
            '<rect x="830" y="385" width="300" height="150" rx="22" fill="#17220f" stroke="#4d7c0f" stroke-width="2"/>'
            '<text x="980" y="430" text-anchor="middle" fill="#bef264" font-size="19" font-family="Arial, sans-serif">SOCIAL-FIRST CROPS</text>'
            '<rect x="890" y="458" width="62" height="55" rx="8" fill="#365314"/><rect x="964" y="458" width="45" height="55" rx="8" fill="#4d7c0f"/><rect x="1021" y="458" width="70" height="55" rx="8" fill="#365314"/>'
            '<rect x="260" y="580" width="680" height="52" rx="16" fill="#11180c" stroke="#365314"/>'
            '<text x="600" y="613" text-anchor="middle" fill="#d9f99d" font-size="18" font-family="Arial, sans-serif">FOOD STYLING  /  LIGHTING  /  CAMPAIGN ASSETS</text>'
        ),
        'hero': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#17220f"/>'
            '<circle cx="600" cy="395" r="166" fill="#e9ddc7"/>'
            '<circle cx="600" cy="395" r="138" fill="#365314"/>'
            '<circle cx="600" cy="395" r="112" fill="#d97706"/>'
            '<path d="M513 403 Q535 337 590 342 Q642 296 696 361 Q713 417 665 449 Q592 484 513 403Z" fill="#7c2d12"/>'
            '<path d="M535 378 Q595 340 657 377 M549 424 Q606 455 673 405" fill="none" stroke="#fbbf24" stroke-width="10" stroke-linecap="round"/>'
            '<circle cx="535" cy="438" r="9" fill="#22c55e"/><circle cx="675" cy="350" r="9" fill="#84cc16"/><circle cx="620" cy="330" r="7" fill="#fef3c7"/>'
            '<path d="M300 275 L410 340 M900 275 L790 340" stroke="#fef3c7" stroke-width="5" opacity=".8"/>'
            '<text x="600" y="245" text-anchor="middle" fill="#ecfccb" font-size="22" font-family="Arial, sans-serif">HERO PRODUCT SHOT • NATURAL TEXTURE</text>'
            '<text x="600" y="575" text-anchor="middle" fill="#bef264" font-size="18" font-family="Arial, sans-serif">Directional key light • controlled highlights • appetizing color</text>'
        ),
        'lighting': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#111827"/>'
            '<rect x="220" y="265" width="390" height="260" rx="18" fill="#1f2937"/>'
            '<circle cx="415" cy="395" r="102" fill="#f3e8d0"/><circle cx="415" cy="395" r="80" fill="#d97706"/>'
            '<path d="M357 405 Q380 350 420 355 Q465 335 480 395 Q468 435 425 445 Q382 445 357 405Z" fill="#7c2d12"/>'
            '<path d="M375 380 Q420 360 458 386" fill="none" stroke="#fbbf24" stroke-width="8" stroke-linecap="round"/>'
            '<path d="M250 290 L330 325 L290 390 L230 365Z" fill="#bef264" opacity=".9"/>'
            '<path d="M545 300 L600 320 L555 405 L515 380Z" fill="#67e8f9" opacity=".55"/>'
            '<rect x="680" y="255" width="300" height="85" rx="15" fill="#365314"/>'
            '<text x="830" y="290" text-anchor="middle" fill="#ecfccb" font-size="19" font-family="Arial, sans-serif">KEY LIGHT</text>'
            '<text x="830" y="320" text-anchor="middle" fill="#d9f99d" font-size="16" font-family="Arial, sans-serif">Shape the hero texture</text>'
            '<rect x="680" y="365" width="300" height="85" rx="15" fill="#164e63"/>'
            '<text x="830" y="400" text-anchor="middle" fill="#cffafe" font-size="19" font-family="Arial, sans-serif">FILL / BOUNCE</text>'
            '<text x="830" y="430" text-anchor="middle" fill="#a5f3fc" font-size="16" font-family="Arial, sans-serif">Preserve detail in shadows</text>'
            '<rect x="680" y="475" width="300" height="70" rx="15" fill="#422006"/>'
            '<text x="830" y="518" text-anchor="middle" fill="#fde68a" font-size="18" font-family="Arial, sans-serif">WARM WHITE BALANCE</text>'
            '<text x="600" y="575" text-anchor="middle" fill="#d9f99d" font-size="17" font-family="Arial, sans-serif">LIGHTING DIAGRAM • ILLUSTRATIVE SETUP</text>'
        ),
        'campaign': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#f7fee7"/>'
            '<rect x="195" y="225" width="240" height="320" rx="18" fill="#365314"/>'
            '<circle cx="315" cy="335" r="76" fill="#f3e8d0"/><circle cx="315" cy="335" r="59" fill="#d97706"/>'
            '<path d="M274 341 Q293 300 325 307 Q355 300 360 341 Q347 375 317 382 Q287 375 274 341Z" fill="#7c2d12"/>'
            '<text x="315" y="450" text-anchor="middle" fill="#f7fee7" font-size="19" font-family="Arial, sans-serif">FEED • 4:5</text>'
            '<text x="315" y="485" text-anchor="middle" fill="#d9f99d" font-size="15" font-family="Arial, sans-serif">DISCOVERY</text>'
            '<rect x="480" y="225" width="240" height="320" rx="18" fill="#4d7c0f"/>'
            '<rect x="505" y="250" width="190" height="190" rx="14" fill="#fef3c7"/>'
            '<circle cx="600" cy="345" r="62" fill="#d97706"/><path d="M565 350 Q588 310 620 321 Q643 340 619 372 Q586 380 565 350Z" fill="#7c2d12"/>'
            '<text x="600" y="475" text-anchor="middle" fill="#f7fee7" font-size="19" font-family="Arial, sans-serif">STORY • 9:16</text>'
            '<text x="600" y="510" text-anchor="middle" fill="#ecfccb" font-size="15" font-family="Arial, sans-serif">OFFER / CTA</text>'
            '<rect x="765" y="225" width="240" height="320" rx="18" fill="#365314"/>'
            '<rect x="790" y="255" width="190" height="180" rx="14" fill="#1f2937"/>'
            '<circle cx="885" cy="342" r="57" fill="#fbbf24"/><path d="M852 345 Q875 310 908 322 Q930 348 905 372 Q872 380 852 345Z" fill="#7c2d12"/>'
            '<circle cx="885" cy="342" r="28" fill="none" stroke="#fff" stroke-width="3"/><path d="M878 327 V357 L901 342Z" fill="#fff"/>'
            '<text x="885" y="475" text-anchor="middle" fill="#f7fee7" font-size="19" font-family="Arial, sans-serif">REEL • 9:16</text>'
            '<text x="885" y="510" text-anchor="middle" fill="#d9f99d" font-size="15" font-family="Arial, sans-serif">MOTION / STORY</text>'
            '<text x="600" y="575" text-anchor="middle" fill="#365314" font-size="17" font-family="Arial, sans-serif">ONE VISUAL LANGUAGE • MULTIPLE PLATFORMS &amp; FORMATS</text>'
        ),
        'details': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#17220f"/>'
            '<rect x="200" y="235" width="360" height="300" rx="18" fill="#365314"/>'
            '<circle cx="380" cy="385" r="120" fill="#e9ddc7"/><circle cx="380" cy="385" r="94" fill="#d97706"/>'
            '<path d="M314 390 Q340 330 380 340 Q435 318 451 383 Q437 432 387 445 Q337 440 314 390Z" fill="#7c2d12"/>'
            '<circle cx="330" cy="415" r="9" fill="#22c55e"/><circle cx="426" cy="355" r="8" fill="#84cc16"/>'
            '<rect x="610" y="245" width="360" height="85" rx="16" fill="#1f2937"/>'
            '<circle cx="657" cy="288" r="18" fill="#fbbf24"/><text x="705" y="296" fill="#ecfccb" font-size="19" font-family="Arial, sans-serif">GARNISH / COLOR ACCENT</text>'
            '<rect x="610" y="355" width="360" height="85" rx="16" fill="#1f2937"/>'
            '<path d="M635 413 Q665 365 695 410" fill="none" stroke="#67e8f9" stroke-width="7"/><text x="720" y="406" fill="#cffafe" font-size="19" font-family="Arial, sans-serif">PLATE / SURFACE CONTRAST</text>'
            '<rect x="610" y="465" width="360" height="70" rx="16" fill="#1f2937"/>'
            '<circle cx="655" cy="500" r="17" fill="#84cc16"/><text x="690" y="507" fill="#d9f99d" font-size="18" font-family="Arial, sans-serif">FRESHNESS &amp; TEXTURE</text>'
            '<text x="600" y="575" text-anchor="middle" fill="#d9f99d" font-size="17" font-family="Arial, sans-serif">FOOD STYLING • INGREDIENT ACCENTS • CLEAN COMPOSITION</text>'
        ),
    }
    labels = {
        'cover': 'O2 FOOD STORIES  /  PRODUCT PHOTOGRAPHY',
        'hero': 'O2 GAZA  /  SIGNATURE HERO IMAGE',
        'lighting': 'O2 GAZA  /  LIGHTING &amp; FOOD STYLING',
        'campaign': 'O2 GAZA  /  SOCIAL CAMPAIGN FORMATS',
        'details': 'O2 GAZA  /  DETAIL &amp; TEXTURE STUDY',
    }
    if kind == 'campaign':
        gradient = '<stop offset="0" stop-color="#f7fee7"/><stop offset="1" stop-color="#d9f99d"/>'
        title_color = '#365314'
    else:
        gradient = '<stop offset="0" stop-color="#17220f"/><stop offset="1" stop-color="#365314"/>'
        title_color = '#ecfccb'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">{gradient}</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        f'<text x="600" y="115" text-anchor="middle" fill="{title_color}" font-size="28" '
        f'font-family="Arial, sans-serif" letter-spacing="3">{labels[kind]}</text>'
        f'{designs[kind]}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع تصوير منتجات لمطعم O2 في غزة للمدرب علاء وادي.'

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
                    'تصور إبداعي لتصوير منتجات مطعم O2 في غزة، يجمع التصوير الشهي وتنسيق الطعام '
                    'مع مخرجات متعددة جاهزة لمنصات التواصل والحملات الرقمية.'
                ),
                'category': 'تصوير منتجات',
                'role': 'Product Photographer / Food Art Director',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1060,
                'likes': 231,
            },
        )
        project.summary = (
            'تصور إبداعي لتصوير منتجات مطعم O2 في غزة، يجمع التصوير الشهي وتنسيق الطعام '
            'مع مخرجات متعددة جاهزة لمنصات التواصل والحملات الرقمية.'
        )
        project.category = 'تصوير منتجات'
        project.role = 'Product Photographer / Food Art Director'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>تصور بصري لتصوير منتجات مطعم O2 في غزة، يقدّم الأطباق بطريقة شهية ومتناسقة '
            'مع شخصية المطعم. الفكرة تتجاوز صورة المنتج المفردة إلى مكتبة صور مرنة تخدم القائمة '
            'والمنشورات والقصص والإعلانات.</p>'
            '<h2>المعالجة الإبداعية</h2>'
            '<ul>'
            '<li>Hero shot لكل طبق يبرز المكونات والملمس والتقديم ضمن تكوين واضح.</li>'
            '<li>تنسيق طعام food styling بعناصر مرافقة مختارة بعناية دون حجب المنتج.</li>'
            '<li>لوحة ألوان دافئة وتباين مضبوط يعكسان نضارة المكونات ويحافظان على واقعية الطعام.</li>'
            '<li>لقطات تفصيلية macro للقوام والمكونات، ولقطات lifestyle توضح حجم الوجبة وتجربة تقديمها.</li>'
            '<li>نسخ عمودية 9:16 للقصص والريلز، وصور 4:5 للـ feed، وأصول أفقية للقوائم والعروض.</li>'
            '</ul>'
            '<h2>الإضاءة وسير التصوير</h2>'
            '<p>يبدأ الإنتاج بقائمة الأطباق والأهداف، ثم shot list وmoodboard وتحديد الخلفيات. '
            'تُستخدم إضاءة رئيسية موجهة لإظهار البنية واللمعان الطبيعي، مع fill أو bounce للتحكم '
            'بالظلال، وwhite balance ثابت لضمان اتساق مجموعة الصور. تشمل المعالجة اختيار اللقطات، '
            'تصحيح اللون، إزالة المشتتات المحدودة، والتصدير بمقاسات ومنهجية تسمية منظمة.</p>'
            '<h2>مكتبة محتوى قابلة لإعادة الاستخدام</h2>'
            '<p>تُنظم الأصول حسب فئة المنتج والحملة والمقاس، مع نسخة master عالية الدقة ونسخ محسّنة '
            'للويب والمنصات الاجتماعية. يتيح ذلك إعادة تركيب الصور مع عناوين وعروض مختلفة دون إعادة '
            'التصوير كل مرة، مع الحفاظ على سلامة المنتج وعدم إجراء تعديلات مضللة عليه.</p>'
            '<h2>ملاحظة حول حالة المشروع</h2>'
            '<p>هذه صفحة تصور إبداعي/نموذج عرض لتصوير منتجات مطعم O2، ولا تؤكد تنفيذ جلسة تصوير '
            'فعلية أو اعتماد العمل من المطعم ما لم يتم الاتفاق والتنسيق معه.</p>'
        )
        project.save()
        if not project.cover:
            project.cover.save(
                'alaa-o2-product-photography.svg',
                ContentFile(_artwork('cover')),
                save=True,
            )

        names = [
            'تصوير منتجات', 'Food Photography', 'Food Styling', 'Product Photography',
            'تصحيح الألوان', 'Social Media Content', 'Restaurant Branding',
            'Lighting', 'Gaza',
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
        for order, kind in enumerate(('hero', 'lighting', 'campaign', 'details')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-o2-product-{kind}.svg',
                ContentFile(_artwork(kind)),
                save=True,
            )
