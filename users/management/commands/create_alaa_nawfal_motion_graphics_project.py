from datetime import date

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


TITLE = 'نوفل Motion Lab — هوية موشن جرافيك للتعلّم الرقمي'


def _cover_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs>'
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#11133b"/><stop offset="1" stop-color="#3b1b78"/>'
        '</linearGradient>'
        '<linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/>'
        '</linearGradient>'
        '</defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1060" cy="85" r="220" fill="#a78bfa" opacity=".10"/>'
        '<circle cx="130" cy="650" r="290" fill="#22d3ee" opacity=".08"/>'
        '<text x="600" y="95" text-anchor="middle" fill="#e9d5ff" font-size="29" '
        'font-family="Arial, sans-serif" letter-spacing="4">NAWFAL  /  MOTION FOR LEARNING</text>'
        '<rect x="95" y="190" width="330" height="305" rx="26" fill="#181847" stroke="#6366f1" stroke-width="2"/>'
        '<circle cx="260" cy="335" r="105" fill="#24245e"/>'
        '<circle cx="260" cy="335" r="74" fill="none" stroke="#22d3ee" stroke-width="8" stroke-dasharray="70 20"/>'
        '<circle cx="260" cy="335" r="48" fill="#7c3aed"/>'
        '<path d="M245 305 L245 365 L293 335 Z" fill="#fff"/>'
        '<circle cx="148" cy="245" r="12" fill="#a78bfa"/><circle cx="375" cy="270" r="9" fill="#22d3ee"/>'
        '<rect x="145" y="450" width="230" height="14" rx="7" fill="#818cf8" opacity=".75"/>'
        '<text x="260" y="535" text-anchor="middle" fill="#c4b5fd" font-size="18" font-family="Arial, sans-serif">LEARNING BRAND INTRO</text>'
        '<path d="M435 340 H510" stroke="url(#accent)" stroke-width="5"/>'
        '<path d="M495 327 L515 340 L495 353" fill="none" stroke="#22d3ee" stroke-width="5"/>'
        '<rect x="535" y="165" width="275" height="355" rx="25" fill="#161642" stroke="#8b5cf6" stroke-width="3"/>'
        '<text x="672" y="220" text-anchor="middle" fill="#c4b5fd" font-size="19" font-family="Arial, sans-serif">MOTION SYSTEM</text>'
        '<rect x="575" y="260" width="195" height="70" rx="16" fill="#312e81"/>'
        '<circle cx="610" cy="295" r="15" fill="#22d3ee"/><rect x="638" y="285" width="105" height="18" rx="8" fill="#c4b5fd"/>'
        '<rect x="575" y="350" width="195" height="70" rx="16" fill="#4c1d95"/>'
        '<path d="M598 384 L612 398 L635 368" fill="none" stroke="#a5f3fc" stroke-width="7" stroke-linecap="round"/>'
        '<rect x="650" y="377" width="90" height="14" rx="7" fill="#ddd6fe"/>'
        '<rect x="575" y="440" width="195" height="42" rx="12" fill="#0e7490"/>'
        '<text x="672" y="467" text-anchor="middle" fill="#ecfeff" font-size="16" font-family="Arial, sans-serif">LEARN • PRACTICE • GROW</text>'
        '<path d="M815 340 H885" stroke="url(#accent)" stroke-width="5"/>'
        '<path d="M870 327 L890 340 L870 353" fill="none" stroke="#a78bfa" stroke-width="5"/>'
        '<rect x="910" y="195" width="220" height="130" rx="21" fill="#161642" stroke="#6366f1" stroke-width="2"/>'
        '<text x="1020" y="240" text-anchor="middle" fill="#67e8f9" font-size="19" font-family="Arial, sans-serif">COURSE TEASER</text>'
        '<path d="M970 280 H1070" stroke="#22d3ee" stroke-width="6" stroke-linecap="round"/>'
        '<path d="M970 300 H1035" stroke="#818cf8" stroke-width="6" stroke-linecap="round"/>'
        '<rect x="910" y="355" width="220" height="130" rx="21" fill="#161642" stroke="#6366f1" stroke-width="2"/>'
        '<text x="1020" y="400" text-anchor="middle" fill="#c4b5fd" font-size="19" font-family="Arial, sans-serif">MICRO-LESSON</text>'
        '<circle cx="972" cy="445" r="15" fill="#a78bfa"/><rect x="1000" y="437" width="95" height="16" rx="8" fill="#ddd6fe"/>'
        '<rect x="300" y="565" width="600" height="55" rx="17" fill="#101231" stroke="#4338ca"/>'
        '<text x="600" y="600" text-anchor="middle" fill="#e0e7ff" font-size="19" font-family="Arial, sans-serif">'
        'ANIMATION  /  EXPLAINERS  /  MICRO-LEARNING  /  ACCESSIBILITY</text>'
        '</svg>'
    ).encode('utf-8')


def _gallery_svg(kind):
    boards = {
        'storyboard': (
            'STORYBOARD  /  FROM IDEA TO LEARNING',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#101231" stroke="#4338ca" stroke-width="2"/>'
            '<rect x="190" y="235" width="235" height="285" rx="18" fill="#1e1b4b"/>'
            '<circle cx="307" cy="320" r="55" fill="#312e81"/><circle cx="307" cy="320" r="30" fill="#22d3ee"/>'
            '<text x="307" y="420" text-anchor="middle" fill="#e0e7ff" font-size="20" font-family="Arial, sans-serif">01 / HOOK</text>'
            '<text x="307" y="455" text-anchor="middle" fill="#a5b4fc" font-size="15" font-family="Arial, sans-serif">Grab attention</text>'
            '<rect x="483" y="235" width="235" height="285" rx="18" fill="#1e1b4b"/>'
            '<rect x="525" y="285" width="150" height="90" rx="15" fill="#4c1d95"/>'
            '<path d="M550 338 L580 305 L607 335 L642 300" fill="none" stroke="#a78bfa" stroke-width="8" stroke-linecap="round"/>'
            '<text x="600" y="420" text-anchor="middle" fill="#e0e7ff" font-size="20" font-family="Arial, sans-serif">02 / CONCEPT</text>'
            '<text x="600" y="455" text-anchor="middle" fill="#a5b4fc" font-size="15" font-family="Arial, sans-serif">Explain simply</text>'
            '<rect x="775" y="235" width="235" height="285" rx="18" fill="#1e1b4b"/>'
            '<circle cx="892" cy="325" r="48" fill="#7c3aed"/>'
            '<path d="M875 305 L875 345 L907 325 Z" fill="#fff"/>'
            '<rect x="825" y="390" width="135" height="10" rx="5" fill="#22d3ee"/>'
            '<rect x="845" y="412" width="95" height="9" rx="4" fill="#818cf8"/>'
            '<text x="892" y="465" text-anchor="middle" fill="#e0e7ff" font-size="20" font-family="Arial, sans-serif">03 / ACTION</text>'
            '<path d="M435 375 H472 M728 375 H765" stroke="#22d3ee" stroke-width="4"/>'
            '<path d="M459 363 L477 375 L459 387 M752 363 L770 375 L752 387" fill="none" stroke="#22d3ee" stroke-width="4"/>'
        ),
        'templates': (
            'MOTION TOOLKIT  /  REUSABLE COMPONENTS',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#101231" stroke="#4338ca" stroke-width="2"/>'
            '<rect x="195" y="235" width="250" height="285" rx="18" fill="#1e1b4b"/>'
            '<rect x="225" y="270" width="190" height="105" rx="14" fill="#312e81"/>'
            '<circle cx="275" cy="322" r="27" fill="#22d3ee"/><rect x="318" y="305" width="72" height="14" rx="7" fill="#ddd6fe"/>'
            '<rect x="318" y="330" width="55" height="10" rx="5" fill="#818cf8"/>'
            '<text x="320" y="420" text-anchor="middle" fill="#e0e7ff" font-size="19" font-family="Arial, sans-serif">TITLE CARD</text>'
            '<text x="320" y="455" text-anchor="middle" fill="#a5b4fc" font-size="15" font-family="Arial, sans-serif">Animated typography</text>'
            '<rect x="475" y="235" width="250" height="285" rx="18" fill="#1e1b4b"/>'
            '<rect x="505" y="270" width="190" height="105" rx="14" fill="#164e63"/>'
            '<path d="M530 350 L570 300 L600 335 L635 290 L670 325" fill="none" stroke="#67e8f9" stroke-width="7" stroke-linecap="round"/>'
            '<text x="600" y="420" text-anchor="middle" fill="#e0e7ff" font-size="19" font-family="Arial, sans-serif">EXPLAINER</text>'
            '<text x="600" y="455" text-anchor="middle" fill="#a5b4fc" font-size="15" font-family="Arial, sans-serif">Icons • diagrams • labels</text>'
            '<rect x="755" y="235" width="250" height="285" rx="18" fill="#1e1b4b"/>'
            '<rect x="785" y="270" width="190" height="105" rx="14" fill="#4c1d95"/>'
            '<circle cx="850" cy="322" r="29" fill="#a78bfa"/><path d="M840 305 L840 339 L867 322 Z" fill="#fff"/>'
            '<rect x="890" y="310" width="62" height="12" rx="6" fill="#ddd6fe"/>'
            '<rect x="890" y="332" width="48" height="9" rx="4" fill="#818cf8"/>'
            '<text x="880" y="420" text-anchor="middle" fill="#e0e7ff" font-size="19" font-family="Arial, sans-serif">MICRO-LESSON</text>'
            '<text x="880" y="455" text-anchor="middle" fill="#a5b4fc" font-size="15" font-family="Arial, sans-serif">Short-form learning</text>'
            '<text x="600" y="565" text-anchor="middle" fill="#c4b5fd" font-size="17" font-family="Arial, sans-serif">CONSISTENT MOTION LANGUAGE ACROSS EVERY COURSE</text>'
        ),
        'learning': (
            'LEARNING JOURNEY  /  MICRO-MOTION',
            '<rect x="150" y="185" width="900" height="420" rx="22" fill="#101231" stroke="#4338ca" stroke-width="2"/>'
            '<path d="M250 395 C350 280 450 500 550 380 S750 275 850 390 S950 480 990 340" fill="none" stroke="#4f46e5" stroke-width="10" stroke-linecap="round"/>'
            '<circle cx="250" cy="395" r="44" fill="#312e81" stroke="#22d3ee" stroke-width="4"/>'
            '<text x="250" y="402" text-anchor="middle" fill="#fff" font-size="17" font-family="Arial, sans-serif">START</text>'
            '<circle cx="480" cy="425" r="44" fill="#4c1d95" stroke="#a78bfa" stroke-width="4"/>'
            '<path d="M465 405 L465 445 L500 425 Z" fill="#fff"/>'
            '<circle cx="700" cy="330" r="44" fill="#164e63" stroke="#67e8f9" stroke-width="4"/>'
            '<path d="M680 330 L695 345 L722 313" fill="none" stroke="#cffafe" stroke-width="6" stroke-linecap="round"/>'
            '<circle cx="935" cy="375" r="44" fill="#365314" stroke="#a3e635" stroke-width="4"/>'
            '<text x="935" y="382" text-anchor="middle" fill="#fff" font-size="17" font-family="Arial, sans-serif">DONE</text>'
            '<rect x="185" y="485" width="155" height="48" rx="13" fill="#1e1b4b"/>'
            '<text x="262" y="515" text-anchor="middle" fill="#c4b5fd" font-size="16" font-family="Arial, sans-serif">Curiosity hook</text>'
            '<rect x="405" y="485" width="155" height="48" rx="13" fill="#1e1b4b"/>'
            '<text x="482" y="515" text-anchor="middle" fill="#c4b5fd" font-size="16" font-family="Arial, sans-serif">Key concept</text>'
            '<rect x="625" y="485" width="155" height="48" rx="13" fill="#1e1b4b"/>'
            '<text x="702" y="515" text-anchor="middle" fill="#c4b5fd" font-size="16" font-family="Arial, sans-serif">Practice step</text>'
            '<rect x="855" y="485" width="155" height="48" rx="13" fill="#1e1b4b"/>'
            '<text x="932" y="515" text-anchor="middle" fill="#c4b5fd" font-size="16" font-family="Arial, sans-serif">Knowledge check</text>'
        ),
    }
    label, artwork = boards[kind]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#11133b"/><stop offset="1" stop-color="#3b1b78"/>'
        '</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<circle cx="1080" cy="80" r="210" fill="#a78bfa" opacity=".09"/>'
        '<text x="600" y="115" text-anchor="middle" fill="#e9d5ff" font-size="28" '
        'font-family="Arial, sans-serif" letter-spacing="3">NAWFAL MOTION LAB  /  '
        f'{label}</text>'
        f'{artwork}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع موشن جرافيك لمنصة نوفل للمدرب علاء وادي.'

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
                    'نظام موشن جرافيك متكامل لمنصة نوفل للتعلم عن بعد، يحوّل الأفكار التعليمية '
                    'إلى مشاهد قصيرة وواضحة ومتسقة عبر الدورات والريلز والمقاطع التعريفية.'
                ),
                'category': 'موشن جرافيك',
                'role': 'Motion Graphics Designer / Art Director',
                'project_date': date.today(),
                'status': ProjectStatus.PUBLISHED,
                'visibility': ProjectVisibility.PUBLIC,
                'views': 1370,
                'likes': 293,
            },
        )

        project.summary = (
            'نظام موشن جرافيك متكامل لمنصة نوفل للتعلم عن بعد، يحوّل الأفكار التعليمية '
            'إلى مشاهد قصيرة وواضحة ومتسقة عبر الدورات والريلز والمقاطع التعريفية.'
        )
        project.category = 'موشن جرافيك'
        project.role = 'Motion Graphics Designer / Art Director'
        project.project_date = project.project_date or date.today()
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<h2>فكرة المشروع</h2>'
            '<p>تصور لنظام موشن جرافيك لمنصة نوفل للدورات التدريبية والتعلم عن بعد، '
            'يحوّل هوية المنصة إلى لغة حركة موحدة تسهّل فهم المحتوى وتزيد وضوح التجربة التعليمية. '
            'بدلاً من إنتاج مقطع منفصل بلا ترابط لكل دورة، يبني المشروع toolkit مرناً '
            'للعناوين والشرح والانتقالات والمقدمات القصيرة.</p>'
            '<h2>مكونات نظام الحركة</h2>'
            '<ul>'
            '<li>Brand intro وoutro قصيران قابلان للتكييف مع صيغ الفيديو المختلفة.</li>'
            '<li>قوالب animated typography للعناوين والمفاهيم والمصطلحات الرئيسية.</li>'
            '<li>مشاهد explainer تستخدم الأيقونات والمخططات والرسوم لتبسيط المفاهيم المجردة.</li>'
            '<li>Micro-learning clips وريلز تعليمية بهيكل hook، concept، example، ثم knowledge check.</li>'
            '<li>حزم lower thirds، شارات المسارات، مؤشرات التقدم، وعناصر انتقال موحدة.</li>'
            '</ul>'
            '<h2>تصميم ذكي للتعلم</h2>'
            '<p>يُضبط إيقاع الحركة لخدمة الحمل المعرفي: إبراز معلومة واحدة في كل لقطة، '
            'توجيه الانتباه دون تشتيت، وربط الحركة بتسلسل الفكرة. تُستخدم قوالب modular '
            'تسمح بتغيير العناوين والألوان والأيقونات مع الحفاظ على الهوية وتقليل وقت الإنتاج '
            'وتسهيل تحديث المحتوى عند تغيير مادة الدورة.</p>'
            '<h2>سير العمل والمخرجات</h2>'
            '<p>يمر الإنتاج من brief تعليمي وstoryboard إلى animatic، ثم التصميم والتحريك والمكساج '
            'والتصدير. تُجهز نسخ 16:9 للدروس، و9:16 للمقاطع العمودية، ونسخ خفيفة للمنصات '
            'مع ملفات مصدر منظمة ومكونات قابلة لإعادة الاستخدام.</p>'
            '<h2>الإتاحة والاتساق</h2>'
            '<p>يشمل النظام تسلسلاً بصرياً واضحاً، تبايناً مناسباً، ترجمة نصية عند الحاجة، '
            'ومراعاة أن تبقى الرسالة مفهومة دون الاعتماد على اللون أو الصوت وحدهما. '
            'هذا المشروع تصور إبداعي لمنصة نوفل، ولا يعني اعتماد المنصة له أو تنفيذه رسمياً '
            'ما لم يتم الاتفاق والتنسيق مع الجهة.</p>'
        )
        project.save()

        if not project.cover:
            project.cover.save(
                'alaa-nawfal-motion-learning-cover.svg',
                ContentFile(_cover_svg()),
                save=True,
            )

        tag_names = [
            'موشن جرافيك', 'Motion Design', 'After Effects', 'تعليم إلكتروني',
            'Explainer Video', 'Micro Learning', 'Storyboarding', 'Typography',
            'Video Production',
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

        for order, kind in enumerate(('storyboard', 'templates', 'learning')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-nawfal-motion-{kind}.svg',
                ContentFile(_gallery_svg(kind)),
                save=True,
            )
