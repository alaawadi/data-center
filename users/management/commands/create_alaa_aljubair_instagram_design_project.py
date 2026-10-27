from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'مذاق الجبير — هوية ومحتوى إنستغرام لمطعم الجبير'


def _cover_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs>'
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#24150f"/><stop offset="1" stop-color="#6b2d17"/>'
        '</linearGradient>'
        '<linearGradient id="plate" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#f8e6c6"/><stop offset="1" stop-color="#e7c89a"/>'
        '</linearGradient>'
        '</defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1070" cy="90" r="220" fill="#fbbf24" opacity=".08"/>'
        '<circle cx="100" cy="650" r="290" fill="#fb923c" opacity=".08"/>'
        '<text x="600" y="92" text-anchor="middle" fill="#fde7c1" font-size="29" '
        'font-family="Arial, sans-serif" letter-spacing="4">ALJUBAIR  /  INSTAGRAM CONTENT SYSTEM</text>'
        '<rect x="95" y="160" width="330" height="415" rx="26" fill="#151515" stroke="#8a5a32" stroke-width="3"/>'
        '<rect x="118" y="193" width="284" height="345" rx="12" fill="#f7ead7"/>'
        '<rect x="118" y="193" width="284" height="155" rx="12" fill="#6b2d17"/>'
        '<circle cx="260" cy="270" r="58" fill="#d97706"/>'
        '<circle cx="260" cy="270" r="42" fill="#fbbf24"/>'
        '<path d="M225 278 Q260 230 295 278 Q285 310 260 316 Q235 310 225 278Z" fill="#7c2d12"/>'
        '<circle cx="240" cy="263" r="5" fill="#16a34a"/><circle cx="278" cy="250" r="5" fill="#16a34a"/>'
        '<text x="260" y="388" text-anchor="middle" fill="#78350f" font-size="21" font-family="Arial, sans-serif">نكهة تستحق التجربة</text>'
        '<rect x="155" y="415" width="210" height="5" rx="2" fill="#d6b98c"/>'
        '<text x="260" y="460" text-anchor="middle" fill="#451a03" font-size="16" font-family="Arial, sans-serif">قصة • طبق • دعوة للزيارة</text>'
        '<text x="260" y="505" text-anchor="middle" fill="#9a3412" font-size="15" font-family="Arial, sans-serif">INSTAGRAM STORY</text>'
        '<text x="260" y="615" text-anchor="middle" fill="#fef3c7" font-size="18" font-family="Arial, sans-serif">SOCIAL-FIRST DESIGN</text>'
        '<rect x="475" y="165" width="325" height="410" rx="25" fill="#f6eee1"/>'
        '<rect x="495" y="185" width="285" height="370" rx="14" fill="#7c2d12"/>'
        '<circle cx="637" cy="350" r="106" fill="url(#plate)"/>'
        '<circle cx="637" cy="350" r="82" fill="#9a3412"/>'
        '<circle cx="637" cy="350" r="67" fill="#d97706"/>'
        '<path d="M590 355 Q620 300 675 325 Q700 350 670 388 Q625 410 590 355Z" fill="#7c2d12"/>'
        '<circle cx="613" cy="335" r="7" fill="#facc15"/><circle cx="650" cy="320" r="7" fill="#facc15"/>'
        '<circle cx="668" cy="365" r="7" fill="#16a34a"/><circle cx="612" cy="380" r="7" fill="#16a34a"/>'
        '<text x="637" y="490" text-anchor="middle" fill="#fff7ed" font-size="23" font-family="Arial, sans-serif">الطبق له حكاية</text>'
        '<text x="637" y="525" text-anchor="middle" fill="#fed7aa" font-size="15" font-family="Arial, sans-serif">REEL COVER / FEED POST</text>'
        '<text x="637" y="615" text-anchor="middle" fill="#fde7c1" font-size="18" font-family="Arial, sans-serif">FOOD PHOTOGRAPHY DIRECTION</text>'
        '<rect x="850" y="190" width="255" height="365" rx="22" fill="#fef3c7"/>'
        '<rect x="870" y="210" width="215" height="165" rx="14" fill="#92400e"/>'
        '<path d="M890 340 Q930 255 980 310 T1065 275 V375 H890Z" fill="#b45309"/>'
        '<circle cx="945" cy="280" r="27" fill="#fbbf24"/><circle cx="1020" cy="320" r="21" fill="#fcd34d"/>'
        '<text x="978" y="415" text-anchor="middle" fill="#78350f" font-size="22" font-family="Arial, sans-serif">عرض الأسبوع</text>'
        '<text x="978" y="450" text-anchor="middle" fill="#92400e" font-size="16" font-family="Arial, sans-serif">مذاق يجمعنا</text>'
        '<rect x="905" y="478" width="145" height="38" rx="12" fill="#9a3412"/>'
        '<text x="978" y="503" text-anchor="middle" fill="#fff7ed" font-size="15" font-family="Arial, sans-serif">اطلب الآن</text>'
        '<text x="978" y="615" text-anchor="middle" fill="#fde7c1" font-size="18" font-family="Arial, sans-serif">CAMPAIGN VARIATIONS</text>'
        '</svg>'
    ).encode('utf-8')


def _gallery_svg(kind):
    designs = {
        'menu': (
            'SIGNATURE DISH  /  FEED CREATIVE',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff7ed"/>'
            '<rect x="185" y="220" width="390" height="350" rx="18" fill="#6b2d17"/>'
            '<circle cx="380" cy="390" r="142" fill="#f5e6cf"/>'
            '<circle cx="380" cy="390" r="114" fill="#9a3412"/>'
            '<circle cx="380" cy="390" r="92" fill="#d97706"/>'
            '<path d="M310 400 Q345 320 410 345 Q455 365 425 423 Q370 470 310 400Z" fill="#7c2d12"/>'
            '<circle cx="342" cy="365" r="8" fill="#facc15"/><circle cx="410" cy="360" r="8" fill="#facc15"/>'
            '<circle cx="425" cy="413" r="8" fill="#16a34a"/><circle cx="345" cy="430" r="8" fill="#16a34a"/>'
            '<text x="770" y="295" text-anchor="middle" fill="#7c2d12" font-size="22" font-family="Arial, sans-serif">من مطبخنا إلى مائدتكم</text>'
            '<text x="770" y="355" text-anchor="middle" fill="#431407" font-size="39" font-weight="700" font-family="Arial, sans-serif">نكهة الجبير</text>'
            '<path d="M650 382 H890" stroke="#d6b98c" stroke-width="3"/>'
            '<text x="770" y="430" text-anchor="middle" fill="#78350f" font-size="19" font-family="Arial, sans-serif">مكونات مختارة • تحضير يومي</text>'
            '<rect x="680" y="475" width="180" height="52" rx="15" fill="#9a3412"/>'
            '<text x="770" y="508" text-anchor="middle" fill="#fff7ed" font-size="18" font-family="Arial, sans-serif">اكتشف القائمة</text>'
        ),
        'story': (
            'WEEKLY OFFER  /  STORY SEQUENCE',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff7ed"/>'
            '<rect x="205" y="220" width="230" height="335" rx="18" fill="#7c2d12"/>'
            '<circle cx="320" cy="330" r="73" fill="#fbbf24"/><circle cx="320" cy="330" r="52" fill="#d97706"/>'
            '<path d="M280 338 Q320 285 360 330 Q350 365 320 372 Q290 365 280 338Z" fill="#7c2d12"/>'
            '<text x="320" y="445" text-anchor="middle" fill="#fff7ed" font-size="22" font-family="Arial, sans-serif">عرض الخميس</text>'
            '<text x="320" y="483" text-anchor="middle" fill="#fed7aa" font-size="17" font-family="Arial, sans-serif">وقت العائلة</text>'
            '<rect x="250" y="505" width="140" height="30" rx="10" fill="#fbbf24"/>'
            '<text x="320" y="526" text-anchor="middle" fill="#451a03" font-size="14" font-family="Arial, sans-serif">اسحب للمزيد</text>'
            '<rect x="485" y="220" width="230" height="335" rx="18" fill="#fef3c7"/>'
            '<rect x="510" y="250" width="180" height="120" rx="12" fill="#92400e"/>'
            '<path d="M520 350 Q565 285 610 335 T680 300 V370 H520Z" fill="#b45309"/>'
            '<text x="600" y="415" text-anchor="middle" fill="#78350f" font-size="20" font-family="Arial, sans-serif">اختاروا أطباقكم</text>'
            '<text x="600" y="451" text-anchor="middle" fill="#92400e" font-size="16" font-family="Arial, sans-serif">قائمة متنوعة للجميع</text>'
            '<rect x="530" y="480" width="140" height="42" rx="13" fill="#9a3412"/>'
            '<text x="600" y="507" text-anchor="middle" fill="#fff7ed" font-size="16" font-family="Arial, sans-serif">شاهد القائمة</text>'
            '<rect x="765" y="220" width="230" height="335" rx="18" fill="#6b2d17"/>'
            '<circle cx="880" cy="325" r="66" fill="#f5e6cf"/><circle cx="880" cy="325" r="47" fill="#d97706"/>'
            '<text x="880" y="425" text-anchor="middle" fill="#fff7ed" font-size="20" font-family="Arial, sans-serif">جاهزين لطلبكم</text>'
            '<text x="880" y="460" text-anchor="middle" fill="#fed7aa" font-size="15" font-family="Arial, sans-serif">زورونا اليوم</text>'
            '<rect x="810" y="480" width="140" height="42" rx="13" fill="#fbbf24"/>'
            '<text x="880" y="507" text-anchor="middle" fill="#451a03" font-size="16" font-family="Arial, sans-serif">اطلب الآن</text>'
        ),
        'reels': (
            'REELS COVER  /  BRAND STORY',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#2b1710"/>'
            '<rect x="195" y="220" width="275" height="345" rx="20" fill="#7c2d12"/>'
            '<circle cx="332" cy="360" r="102" fill="#f5e6cf"/>'
            '<circle cx="332" cy="360" r="80" fill="#d97706"/>'
            '<path d="M275 370 Q315 300 370 335 Q400 365 365 405 Q315 430 275 370Z" fill="#7c2d12"/>'
            '<circle cx="304" cy="340" r="7" fill="#facc15"/><circle cx="360" cy="350" r="7" fill="#16a34a"/>'
            '<circle cx="332" cy="360" r="31" fill="none" stroke="#fff7ed" stroke-width="3"/>'
            '<path d="M324 342 L324 378 L352 360 Z" fill="#fff7ed"/>'
            '<text x="332" y="500" text-anchor="middle" fill="#fff7ed" font-size="18" font-family="Arial, sans-serif">REEL COVER</text>'
            '<text x="750" y="300" text-anchor="middle" fill="#fed7aa" font-size="22" font-family="Arial, sans-serif">من أول لقمة</text>'
            '<text x="750" y="360" text-anchor="middle" fill="#fff7ed" font-size="42" font-weight="700" font-family="Arial, sans-serif">تبدأ الحكاية</text>'
            '<path d="M635 390 H865" stroke="#d97706" stroke-width="4"/>'
            '<text x="750" y="440" text-anchor="middle" fill="#fed7aa" font-size="18" font-family="Arial, sans-serif">لقطات قريبة • إيقاع دافئ • صوت شهي</text>'
            '<rect x="660" y="475" width="180" height="48" rx="14" fill="#fbbf24"/>'
            '<text x="750" y="506" text-anchor="middle" fill="#451a03" font-size="17" font-family="Arial, sans-serif">شاهدوا الفيديو</text>'
        ),
        'identity': (
            'VISUAL SYSTEM  /  BRAND CONSISTENCY',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#fff7ed"/>'
            '<rect x="190" y="220" width="820" height="315" rx="18" fill="#fef3c7"/>'
            '<circle cx="330" cy="365" r="82" fill="#7c2d12"/>'
            '<circle cx="330" cy="365" r="57" fill="#d97706"/>'
            '<path d="M295 370 Q330 320 365 360 Q355 395 330 400 Q305 395 295 370Z" fill="#7c2d12"/>'
            '<text x="330" y="482" text-anchor="middle" fill="#78350f" font-size="20" font-family="Arial, sans-serif">ALJUBAIR</text>'
            '<rect x="470" y="260" width="230" height="55" rx="12" fill="#7c2d12"/>'
            '<text x="585" y="296" text-anchor="middle" fill="#fff7ed" font-size="19" font-family="Arial, sans-serif">PRIMARY • #7C2D12</text>'
            '<rect x="470" y="330" width="230" height="55" rx="12" fill="#d97706"/>'
            '<text x="585" y="366" text-anchor="middle" fill="#fff7ed" font-size="19" font-family="Arial, sans-serif">ACCENT • #D97706</text>'
            '<rect x="470" y="400" width="230" height="55" rx="12" fill="#f5e6cf" stroke="#d6b98c"/>'
            '<text x="585" y="436" text-anchor="middle" fill="#78350f" font-size="19" font-family="Arial, sans-serif">NEUTRAL • #F5E6CF</text>'
            '<rect x="745" y="260" width="220" height="195" rx="14" fill="#fff"/>'
            '<text x="855" y="300" text-anchor="middle" fill="#78350f" font-size="18" font-family="Arial, sans-serif">CONTENT PILLARS</text>'
            '<text x="855" y="345" text-anchor="middle" fill="#92400e" font-size="16" font-family="Arial, sans-serif">الأطباق المميزة</text>'
            '<text x="855" y="380" text-anchor="middle" fill="#92400e" font-size="16" font-family="Arial, sans-serif">كواليس وتجربة</text>'
            '<text x="855" y="415" text-anchor="middle" fill="#92400e" font-size="16" font-family="Arial, sans-serif">عروض ومناسبات</text>'
            '<text x="600" y="575" text-anchor="middle" fill="#78350f" font-size="18" font-family="Arial, sans-serif">TEMPLATES • COLOR TOKENS • TYPE HIERARCHY • CTA RULES</text>'
        ),
    }
    label, artwork = designs[kind]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#fed7aa"/>'
        '</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1080" cy="80" r="210" fill="#f59e0b" opacity=".12"/>'
        '<text x="600" y="115" text-anchor="middle" fill="#431407" font-size="28" '
        'font-family="Arial, sans-serif" letter-spacing="3">ALJUBAIR  /  '
        f'{label}</text>'
        f'{artwork}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع تصميم محتوى إنستغرام لمطعم الجبير للمدرب علاء وادي.'

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
                    'نظام محتوى بصري متكامل لإنستغرام مطعم الجبير في السعودية، '
                    'يجمع هوية قابلة للتعرّف، تصوير أطباق جذاب، وقوالب ذكية للحملات والقصص والريلز.'
                ),
                'category': 'تصميم جرافيكي',
                'role': 'مصمم جرافيك ومخرج محتوى رقمي',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1280,
                'likes': 279,
            },
        )

        project.summary = (
            'نظام محتوى بصري متكامل لإنستغرام مطعم الجبير في السعودية، '
            'يجمع هوية قابلة للتعرّف، تصوير أطباق جذاب، وقوالب ذكية للحملات والقصص والريلز.'
        )
        project.category = 'تصميم جرافيكي'
        project.role = 'مصمم جرافيك ومخرج محتوى رقمي'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>تصور لنظام تصميم ومحتوى رقمي متكامل لحساب مطعم الجبير على إنستغرام في السعودية. '
            'الهدف هو بناء حضور بصري متناسق يبرز الأطباق والتجربة والعروض، مع تنويع المحتوى '
            'بحيث يخدم التعريف بالمطعم والتفاعل والتحويل إلى زيارة أو طلب.</p>'
            '<h2>أعمدة المحتوى</h2>'
            '<ul>'
            '<li>الأطباق المميزة: صور قريبة بتكوين وإضاءة دافئة، وصف قصير، ومعلومة تساعد على الاختيار.</li>'
            '<li>كواليس وتجربة: التحضير، تفاصيل المكونات، أجواء المكان، وقصص الفريق بإذن المشاركين.</li>'
            '<li>العروض والمناسبات: قوالب قابلة للتحديث للعروض الموسمية والمناسبات المحلية.</li>'
            '<li>محتوى تفاعلي: استطلاعات، أسئلة، اختيارات الجمهور، ومقاطع Reels قصيرة بإيقاع واضح.</li>'
            '<li>دعوات إجراء مناسبة: زيارة الفرع، الاطلاع على القائمة، أو الطلب عبر القنوات الرسمية المعتمدة.</li>'
            '</ul>'
            '<h2>نظام التصميم الذكي</h2>'
            '<p>يشمل المشروع visual direction، لوحة ألوان وخطوط، شبكة تخطيط للمنشورات، '
            'قوالب Feed وStories وReels covers، ومكونات قابلة لإعادة الاستخدام. '
            'تُكيّف القوالب بحسب نوع الرسالة مع الحفاظ على التعرف السريع على العلامة وتوازن النص والصورة.</p>'
            '<h2>التخطيط والإنتاج</h2>'
            '<p>يُنظّم المحتوى ضمن content calendar ويربط كل قطعة بهدف وجمهور وCTA واضح. '
            'تتضمن دورة العمل موجزاً إبداعياً، shot list، توجيه تصوير الأطباق، اختيار اللقطات، '
            'معالجة الصور، ضبط المقاسات ومناطق الأمان، تدقيق النصوص، ثم تجهيز الملفات للنشر.</p>'
            '<h2>قياس الأداء والتحسين</h2>'
            '<p>تُراجع مؤشرات reach وsaves وshares وprofile visits ونقرات الطلب، مع اختبارات '
            'محدودة لصور الغلاف والرسائل وتوقيت النشر. تُستخدم النتائج لتحسين المحتوى اللاحق '
            'دون التضحية باتساق الهوية أو جودة العرض.</p>'
            '<h2>ملاحظة حول حالة العمل</h2>'
            '<p>هذا المشروع تصور إبداعي/نموذج عرض لمحتوى مطعم الجبير، ولا يعني اعتماد المطعم له '
            'أو تنفيذه رسمياً ما لم يتم الاتفاق والتنسيق مع الجهة.</p>'
        )
        project.save()

        if not project.cover:
            project.cover.save(
                'alaa-aljubair-instagram-content-cover.svg',
                ContentFile(_cover_svg()),
                save=True,
            )

        tag_names = [
            'تصميم جرافيكي', 'Instagram', 'Social Media', 'هوية بصرية',
            'تصوير أطعمة', 'محتوى رقمي', 'Reels', 'Stories', 'Content Strategy',
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

        for order, kind in enumerate(('menu', 'story', 'reels', 'identity')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-aljubair-instagram-{kind}.svg',
                ContentFile(_gallery_svg(kind)),
                save=True,
            )
