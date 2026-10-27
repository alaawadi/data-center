from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'ابتسامة بثقة — محتوى إنستغرام لعيادة الأمل للأسنان'


def _artwork(kind):
    boards = {
        'cover': (
            '<rect x="70" y="175" width="320" height="385" rx="26" fill="#172b35" stroke="#5eead4" stroke-width="3"/>'
            '<rect x="92" y="197" width="276" height="340" rx="16" fill="#f0fdfa"/>'
            '<circle cx="230" cy="320" r="85" fill="#ccfbf1"/>'
            '<path d="M197 272 Q177 292 190 326 L207 380 Q213 398 224 380 L236 350 Q242 337 250 350 L265 381 Q277 399 284 378 L303 324 Q315 290 290 272 Q265 255 245 272 Q227 255 197 272Z" fill="#fff" stroke="#14b8a6" stroke-width="5"/>'
            '<path d="M201 420 Q230 446 261 420" fill="none" stroke="#0f766e" stroke-width="5" stroke-linecap="round"/>'
            '<text x="230" y="475" text-anchor="middle" fill="#134e4a" font-size="24" font-weight="700" font-family="Arial, sans-serif">ابتسامة بثقة</text>'
            '<text x="230" y="510" text-anchor="middle" fill="#0f766e" font-size="15" font-family="Arial, sans-serif">STORY • CAROUSEL</text>'
            '<rect x="435" y="190" width="320" height="345" rx="26" fill="#f0fdfa" stroke="#5eead4" stroke-width="2"/>'
            '<text x="595" y="240" text-anchor="middle" fill="#0f766e" font-size="20" font-family="Arial, sans-serif">CONTENT SYSTEM</text>'
            '<rect x="480" y="270" width="230" height="70" rx="15" fill="#ccfbf1"/>'
            '<circle cx="520" cy="305" r="19" fill="#14b8a6"/><path d="M512 305 L519 312 L531 297" fill="none" stroke="#fff" stroke-width="4"/>'
            '<rect x="552" y="295" width="130" height="14" rx="7" fill="#0f766e"/>'
            '<rect x="480" y="360" width="230" height="70" rx="15" fill="#ede9fe"/>'
            '<rect x="500" y="380" width="38" height="31" rx="8" fill="#8b5cf6"/>'
            '<rect x="552" y="385" width="130" height="14" rx="7" fill="#6d28d9"/>'
            '<rect x="480" y="450" width="230" height="44" rx="12" fill="#0f766e"/>'
            '<text x="595" y="478" text-anchor="middle" fill="#fff" font-size="16" font-family="Arial, sans-serif">EDUCATE • REASSURE • GUIDE</text>'
            '<rect x="800" y="205" width="310" height="150" rx="22" fill="#172b35" stroke="#5eead4" stroke-width="2"/>'
            '<text x="955" y="250" text-anchor="middle" fill="#99f6e4" font-size="19" font-family="Arial, sans-serif">CAROUSEL</text>'
            '<rect x="855" y="275" width="200" height="45" rx="12" fill="#ccfbf1"/>'
            '<text x="955" y="304" text-anchor="middle" fill="#134e4a" font-size="17" font-family="Arial, sans-serif">سؤال • معلومة • خطوة</text>'
            '<rect x="800" y="385" width="310" height="150" rx="22" fill="#172b35" stroke="#a78bfa" stroke-width="2"/>'
            '<text x="955" y="430" text-anchor="middle" fill="#c4b5fd" font-size="19" font-family="Arial, sans-serif">STORY SEQUENCE</text>'
            '<circle cx="880" cy="478" r="19" fill="#14b8a6"/><circle cx="955" cy="478" r="19" fill="#8b5cf6"/><circle cx="1030" cy="478" r="19" fill="#0f766e"/>'
            '<path d="M902 478 H930 M977 478 H1005" stroke="#fff" stroke-width="3"/>'
            '<rect x="260" y="580" width="680" height="52" rx="16" fill="#10232d" stroke="#28545b"/>'
            '<text x="600" y="613" text-anchor="middle" fill="#ccfbf1" font-size="18" font-family="Arial, sans-serif">HEALTH CONTENT  /  VISUAL DESIGN  /  PATIENT-FIRST COMMUNICATION</text>'
        ),
        'carousel': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#f0fdfa"/>'
            '<rect x="190" y="225" width="245" height="310" rx="18" fill="#ccfbf1"/>'
            '<circle cx="312" cy="315" r="52" fill="#99f6e4"/>'
            '<path d="M280 282 Q263 300 274 330 L289 368 Q295 382 304 367 L315 346 Q320 336 327 347 L340 369 Q350 383 357 366 L371 328 Q381 300 361 282 Q340 266 323 281 Q306 265 280 282Z" fill="#fff" stroke="#14b8a6" stroke-width="4"/>'
            '<text x="312" y="425" text-anchor="middle" fill="#134e4a" font-size="18" font-family="Arial, sans-serif">01 • سؤال شائع</text>'
            '<text x="312" y="460" text-anchor="middle" fill="#0f766e" font-size="15" font-family="Arial, sans-serif">متى أراجع طبيب الأسنان؟</text>'
            '<rect x="478" y="225" width="245" height="310" rx="18" fill="#ede9fe"/>'
            '<circle cx="600" cy="315" r="52" fill="#ddd6fe"/>'
            '<path d="M580 320 Q600 292 620 320" fill="none" stroke="#7c3aed" stroke-width="6" stroke-linecap="round"/>'
            '<circle cx="582" cy="300" r="5" fill="#7c3aed"/><circle cx="618" cy="300" r="5" fill="#7c3aed"/>'
            '<text x="600" y="425" text-anchor="middle" fill="#4c1d95" font-size="18" font-family="Arial, sans-serif">02 • معلومة موثوقة</text>'
            '<text x="600" y="460" text-anchor="middle" fill="#6d28d9" font-size="15" font-family="Arial, sans-serif">شرح مبسط ومعتمد</text>'
            '<rect x="765" y="225" width="245" height="310" rx="18" fill="#ccfbf1"/>'
            '<rect x="805" y="270" width="165" height="115" rx="14" fill="#fff"/>'
            '<path d="M830 330 H945" stroke="#5eead4" stroke-width="5"/>'
            '<text x="887" y="425" text-anchor="middle" fill="#134e4a" font-size="18" font-family="Arial, sans-serif">03 • خطوة تالية</text>'
            '<rect x="825" y="450" width="125" height="38" rx="12" fill="#0f766e"/>'
            '<text x="887" y="475" text-anchor="middle" fill="#fff" font-size="15" font-family="Arial, sans-serif">احجز استشارة</text>'
            '<text x="600" y="570" text-anchor="middle" fill="#134e4a" font-size="17" font-family="Arial, sans-serif">CAROUSEL FLOW: HOOK → APPROVED INFORMATION → CLEAR CTA</text>'
        ),
        'stories': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#172b35"/>'
            '<rect x="195" y="225" width="230" height="320" rx="18" fill="#ccfbf1"/>'
            '<circle cx="310" cy="320" r="48" fill="#99f6e4"/>'
            '<path d="M284 290 Q270 305 279 330 L291 364 Q297 378 305 362 L314 343 Q320 334 327 345 L337 365 Q347 378 353 361 L365 330 Q373 305 356 290 Q338 276 322 289 Q306 276 284 290Z" fill="#fff" stroke="#14b8a6" stroke-width="4"/>'
            '<text x="310" y="415" text-anchor="middle" fill="#134e4a" font-size="18" font-family="Arial, sans-serif">سؤال اليوم</text>'
            '<text x="310" y="453" text-anchor="middle" fill="#0f766e" font-size="15" font-family="Arial, sans-serif">تفاعل واستطلاع</text>'
            '<rect x="485" y="225" width="230" height="320" rx="18" fill="#ede9fe"/>'
            '<circle cx="600" cy="320" r="49" fill="#ddd6fe"/>'
            '<path d="M574 324 Q600 285 626 324" fill="none" stroke="#7c3aed" stroke-width="6" stroke-linecap="round"/>'
            '<circle cx="582" cy="305" r="5" fill="#7c3aed"/><circle cx="618" cy="305" r="5" fill="#7c3aed"/>'
            '<text x="600" y="415" text-anchor="middle" fill="#4c1d95" font-size="18" font-family="Arial, sans-serif">معلومة موثوقة</text>'
            '<text x="600" y="453" text-anchor="middle" fill="#6d28d9" font-size="15" font-family="Arial, sans-serif">من الفريق الطبي</text>'
            '<rect x="775" y="225" width="230" height="320" rx="18" fill="#ccfbf1"/>'
            '<path d="M887 270 C887 270 845 325 845 350 C845 377 864 393 887 393 C910 393 929 377 929 350 C929 325 887 270 887 270Z" fill="#14b8a6"/>'
            '<text x="890" y="435" text-anchor="middle" fill="#134e4a" font-size="18" font-family="Arial, sans-serif">تذكير لطيف</text>'
            '<rect x="820" y="460" width="140" height="38" rx="12" fill="#0f766e"/>'
            '<text x="890" y="485" text-anchor="middle" fill="#fff" font-size="15" font-family="Arial, sans-serif">تواصل معنا</text>'
            '<text x="600" y="575" text-anchor="middle" fill="#ccfbf1" font-size="17" font-family="Arial, sans-serif">STORY SEQUENCE • POLL • Q&amp;A • APPOINTMENT CTA</text>'
        ),
        'design-system': (
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#f0fdfa"/>'
            '<rect x="195" y="235" width="250" height="285" rx="18" fill="#fff"/>'
            '<circle cx="320" cy="330" r="63" fill="#ccfbf1"/>'
            '<path d="M293 295 Q278 311 288 337 L300 370 Q306 381 314 368 L322 350 Q328 341 334 351 L345 370 Q354 382 360 366 L372 336 Q380 310 362 295 Q344 280 328 294 Q310 280 293 295Z" fill="#fff" stroke="#14b8a6" stroke-width="4"/>'
            '<text x="320" y="440" text-anchor="middle" fill="#134e4a" font-size="20" font-family="Arial, sans-serif">AL AMAL</text>'
            '<text x="320" y="473" text-anchor="middle" fill="#0f766e" font-size="15" font-family="Arial, sans-serif">SMILE WITH CONFIDENCE</text>'
            '<rect x="485" y="245" width="210" height="50" rx="12" fill="#0f766e"/><text x="590" y="277" text-anchor="middle" fill="#fff" font-size="17" font-family="Arial, sans-serif">PRIMARY / TEAL</text>'
            '<rect x="485" y="310" width="210" height="50" rx="12" fill="#8b5cf6"/><text x="590" y="342" text-anchor="middle" fill="#fff" font-size="17" font-family="Arial, sans-serif">ACCENT / VIOLET</text>'
            '<rect x="485" y="375" width="210" height="50" rx="12" fill="#ccfbf1"/><text x="590" y="407" text-anchor="middle" fill="#134e4a" font-size="17" font-family="Arial, sans-serif">SOFT / MINT</text>'
            '<rect x="485" y="440" width="210" height="50" rx="12" fill="#ede9fe"/><text x="590" y="472" text-anchor="middle" fill="#4c1d95" font-size="17" font-family="Arial, sans-serif">INFO / LAVENDER</text>'
            '<rect x="735" y="245" width="250" height="245" rx="18" fill="#e6fffb"/>'
            '<text x="860" y="285" text-anchor="middle" fill="#134e4a" font-size="19" font-family="Arial, sans-serif">CONTENT PILLARS</text>'
            '<text x="860" y="330" text-anchor="middle" fill="#0f766e" font-size="16" font-family="Arial, sans-serif">Oral health education</text>'
            '<text x="860" y="365" text-anchor="middle" fill="#0f766e" font-size="16" font-family="Arial, sans-serif">Clinic experience</text>'
            '<text x="860" y="400" text-anchor="middle" fill="#0f766e" font-size="16" font-family="Arial, sans-serif">Team &amp; services</text>'
            '<text x="860" y="435" text-anchor="middle" fill="#0f766e" font-size="16" font-family="Arial, sans-serif">Appointment guidance</text>'
            '<text x="600" y="565" text-anchor="middle" fill="#134e4a" font-size="17" font-family="Arial, sans-serif">REUSABLE TEMPLATES • READABLE TYPE • CONSISTENT CTA</text>'
        ),
    }
    labels = {
        'cover': 'AL AMAL DENTAL  /  INSTAGRAM DESIGN',
        'carousel': 'AL AMAL CLINIC  /  EDUCATIONAL CAROUSEL',
        'stories': 'AL AMAL CLINIC  /  STORY SEQUENCE',
        'design-system': 'AL AMAL CLINIC  /  VISUAL SYSTEM',
    }
    if kind == 'carousel' or kind == 'design-system':
        gradient = '<stop offset="0" stop-color="#f0fdfa"/><stop offset="1" stop-color="#ccfbf1"/>'
        title_color = '#134e4a'
    else:
        gradient = '<stop offset="0" stop-color="#10232d"/><stop offset="1" stop-color="#0f766e"/>'
        title_color = '#ccfbf1'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">{gradient}</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        f'<text x="600" y="115" text-anchor="middle" fill="{title_color}" font-size="28" '
        f'font-family="Arial, sans-serif" letter-spacing="3">{labels[kind]}</text>'
        f'{boards[kind]}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع تصميم إنستغرام لعيادة الأمل للأسنان للمدربة شهد أبو حمد.'

    def handle(self, *args, **options):
        owner = User.objects.filter(handle='shahedabohamad').first()
        if owner is None:
            self.stderr.write(self.style.ERROR('لم يتم العثور على حساب المدربة shahedabohamad.'))
            return

        project, created = Project.objects.get_or_create(
            owner=owner,
            title=TITLE,
            defaults={
                'summary': (
                    'نظام تصميم جرافيكي متكامل لحساب عيادة الأمل للأسنان على إنستغرام، '
                    'يجمع Stories تفاعلية وCarousels تثقيفية بهوية هادئة ومحتوى يراعي دقة المعلومات الطبية.'
                ),
                'category': 'تصميم جرافيكي',
                'role': 'مصممة جرافيك / مصممة محتوى رقمي',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 980,
                'likes': 216,
            },
        )
        project.summary = (
            'نظام تصميم جرافيكي متكامل لحساب عيادة الأمل للأسنان على إنستغرام، '
            'يجمع Stories تفاعلية وCarousels تثقيفية بهوية هادئة ومحتوى يراعي دقة المعلومات الطبية.'
        )
        project.category = 'تصميم جرافيكي'
        project.role = 'مصممة جرافيك / مصممة محتوى رقمي'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>تصور لنظام تصميم ومحتوى لحساب إنستغرام لعيادة الأمل للأسنان، يقدّم المعلومات '
            'الصحية بأسلوب بصري مطمئن وسهل القراءة، ويعرّف بخدمات العيادة وتجربة المراجعين '
            'من دون مبالغة أو وعود علاجية غير موثقة.</p>'
            '<h2>محتوى Carousel تثقيفي</h2>'
            '<ul>'
            '<li>شريحة افتتاحية بسؤال واضح يجذب الانتباه دون تخويف أو إثارة للقلق.</li>'
            '<li>تقسيم المعلومة إلى خطوات قصيرة مع أيقونات ورسوم مبسطة ومساحة قراءة مريحة.</li>'
            '<li>شريحة ختامية بدعوة مناسبة مثل التواصل للاستفسار أو حجز موعد.</li>'
            '<li>قوالب قابلة للتعديل لموضوعات صحة الفم، العناية اليومية، والخدمات التي تعتمدها العيادة.</li>'
            '</ul>'
            '<h2>Stories تفاعلية</h2>'
            '<p>تسلسل قصير يتضمن سؤالاً أو استطلاعاً، معلومة مراجعة من الفريق الطبي، ثم CTA واضحاً '
            'للتواصل. صُممت العناصر لمقاس 9:16 مع مراعاة safe areas ووضوح النص على شاشة الهاتف.</p>'
            '<h2>نظام الهوية وسير العمل</h2>'
            '<p>يشمل المشروع لوحة ألوان هادئة، تسلسلاً طباعياً واضحاً، مكتبة أيقونات، أغلفة موحدة '
            'للخدمات، وقوالب قابلة لإعادة الاستخدام. يمر كل منشور بمراجعة لغوية وتصميمية، '
            'ثم اعتماد المحتوى الصحي من مختص مرخص لدى العيادة قبل النشر.</p>'
            '<h2>المعايير المهنية</h2>'
            '<p>يُتجنب ضمان النتائج أو تقديم تشخيص وعلاج عبر منشور عام. لا تُستخدم صور مرضى أو '
            'قبل/بعد دون موافقة صريحة ومستنيرة والتزام بالأنظمة المهنية، وتُراعى الخصوصية '
            'وسهولة الوصول والتباين المقروء. المعلومات المقترحة تحتاج مراجعة واعتماد العيادة.</p>'
            '<h2>حالة المشروع</h2>'
            '<p>هذا تصور إبداعي/نموذج عرض لعيادة الأمل للأسنان، ولا يعني اعتماد العيادة له '
            'أو تنفيذه رسمياً ما لم يتم الاتفاق والتنسيق معها.</p>'
        )
        project.save()
        if not project.cover:
            project.cover.save(
                'shahed-alamal-dental-instagram-cover.svg',
                ContentFile(_artwork('cover')),
                save=True,
            )

        names = [
            'تصميم جرافيكي', 'Instagram', 'Dental Clinic', 'Health Communication',
            'Carousel Design', 'Instagram Stories', 'Visual Identity',
            'Social Media Content', 'Accessibility',
        ]
        project.tags.set([ProjectTag.objects.get_or_create(name=name)[0] for name in names])
        self._ensure_gallery(project)
        action = 'إنشاء' if created else 'تحديث'
        self.stdout.write(self.style.SUCCESS(
            f'تم {action} المشروع العام المنشور: {project.title} '
            f'(المالكة: {owner.handle}, الظهور: {project.visibility})'
        ))

    @staticmethod
    def _ensure_gallery(project):
        if project.images.exists():
            return
        for order, kind in enumerate(('carousel', 'stories', 'design-system')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'shahed-alamal-dental-{kind}.svg',
                ContentFile(_artwork(kind)),
                save=True,
            )
