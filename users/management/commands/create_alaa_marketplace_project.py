from datetime import date, timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projects.models import Project, ProjectImage, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import User


def _cover_svg(title: str) -> bytes:
    safe_title = (title or '')[:26]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs>'
        '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#0f172a"/>'
        '<stop offset="0.5" stop-color="#1d4ed8"/>'
        '<stop offset="1" stop-color="#06b6d4"/>'
        '</linearGradient>'
        '</defs>'
        '<rect width="1200" height="675" fill="url(#g)"/>'
        '<circle cx="1030" cy="120" r="220" fill="rgba(255,255,255,0.08)"/>'
        '<circle cx="160" cy="610" r="270" fill="rgba(15,23,42,0.22)"/>'
        '<text x="600" y="320" text-anchor="middle" font-size="170">🛒</text>'
        '<text x="600" y="470" text-anchor="middle" font-size="44" fill="#fff" font-family="Arial, sans-serif">'
        f'{safe_title}'
        '</text>'
        '</svg>'
    ).encode('utf-8')


def _gallery_svg(kind: str) -> bytes:
    screens = {
        'storefront': (
            'واجهة المتجر',
            '<rect x="150" y="185" width="900" height="420" rx="20" fill="#fff"/>'
            '<rect x="180" y="215" width="840" height="52" rx="12" fill="#f1f5f9"/>'
            '<circle cx="215" cy="241" r="13" fill="#2563eb"/>'
            '<rect x="250" y="232" width="180" height="17" rx="8" fill="#cbd5e1"/>'
            '<rect x="180" y="295" width="250" height="270" rx="14" fill="#dbeafe"/>'
            '<rect x="455" y="295" width="250" height="270" rx="14" fill="#ccfbf1"/>'
            '<rect x="730" y="295" width="290" height="270" rx="14" fill="#fef3c7"/>'
            '<circle cx="305" cy="405" r="56" fill="#60a5fa"/>'
            '<circle cx="580" cy="405" r="56" fill="#2dd4bf"/>'
            '<circle cx="875" cy="405" r="56" fill="#fbbf24"/>'
            '<rect x="210" y="490" width="150" height="15" rx="7" fill="#64748b"/>'
            '<rect x="485" y="490" width="150" height="15" rx="7" fill="#64748b"/>'
            '<rect x="800" y="490" width="150" height="15" rx="7" fill="#64748b"/>'
        ),
        'delivery': (
            'تتبّع التوصيل',
            '<rect x="150" y="185" width="900" height="420" rx="20" fill="#fff"/>'
            '<rect x="180" y="215" width="840" height="360" rx="14" fill="#e0f2fe"/>'
            '<path d="M205 490 C330 430 360 310 500 360 S700 500 810 365 S930 300 995 330" fill="none" stroke="#38bdf8" stroke-width="20" stroke-linecap="round"/>'
            '<path d="M205 490 C330 430 360 310 500 360 S700 500 810 365 S930 300 995 330" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="14 18"/>'
            '<circle cx="205" cy="490" r="22" fill="#16a34a" stroke="#fff" stroke-width="8"/>'
            '<circle cx="995" cy="330" r="24" fill="#2563eb" stroke="#fff" stroke-width="8"/>'
            '<rect x="745" y="225" width="245" height="78" rx="14" fill="#fff"/>'
            '<circle cx="775" cy="264" r="18" fill="#2563eb"/>'
            '<rect x="807" y="250" width="150" height="13" rx="6" fill="#64748b"/>'
            '<rect x="807" y="273" width="105" height="10" rx="5" fill="#cbd5e1"/>'
        ),
        'dashboard': (
            'لوحة تحكم التاجر',
            '<rect x="150" y="185" width="900" height="420" rx="20" fill="#fff"/>'
            '<rect x="150" y="185" width="170" height="420" rx="20" fill="#0f172a"/>'
            '<rect x="180" y="225" width="105" height="13" rx="6" fill="#93c5fd"/>'
            '<rect x="180" y="270" width="95" height="10" rx="5" fill="#64748b"/>'
            '<rect x="180" y="305" width="95" height="10" rx="5" fill="#64748b"/>'
            '<rect x="180" y="340" width="95" height="10" rx="5" fill="#64748b"/>'
            '<rect x="350" y="220" width="190" height="100" rx="14" fill="#dbeafe"/>'
            '<rect x="560" y="220" width="190" height="100" rx="14" fill="#ccfbf1"/>'
            '<rect x="770" y="220" width="230" height="100" rx="14" fill="#fef3c7"/>'
            '<rect x="380" y="260" width="105" height="20" rx="9" fill="#2563eb"/>'
            '<rect x="590" y="260" width="105" height="20" rx="9" fill="#0f766e"/>'
            '<rect x="805" y="260" width="145" height="20" rx="9" fill="#b45309"/>'
            '<rect x="350" y="345" width="650" height="220" rx="14" fill="#f8fafc"/>'
            '<path d="M390 510 L485 460 L575 485 L670 405 L760 440 L850 370 L950 400" fill="none" stroke="#2563eb" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
            '<path d="M390 510 L485 460 L575 485 L670 405 L760 440 L850 370 L950 400 L950 535 L390 535 Z" fill="#bfdbfe" opacity=".55"/>'
        ),
    }
    label, artwork = screens[kind]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#eff6ff"/><stop offset="1" stop-color="#cffafe"/>'
        '</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#bg)"/>'
        '<text x="600" y="110" text-anchor="middle" font-size="38" fill="#0f172a" font-family="Arial, sans-serif">'
        f'{label}</text>'
        f'{artwork}</svg>'
    ).encode('utf-8')


class Command(BaseCommand):
    help = 'إنشاء مشروع عام ومنشور للمدرب علاء وادي في مجال متجر إلكتروني متعدد التجار بتقنية Next.js.'

    def add_arguments(self, parser):
        parser.add_argument('--title', default='منصة متجر إلكتروني متعدد التجار', help='عنوان المشروع')
        parser.add_argument('--force', action='store_true', help='إعادة إنشاء المشروع إن وُجد سابقاً')

    def handle(self, *args, **options):
        owner = User.objects.filter(handle='alaawadi').first()
        if not owner:
            self.stderr.write(self.style.ERROR("لم يتم العثور على حساب المدرب alaawadi"))
            return

        title = options['title']
        project = Project.objects.filter(owner=owner, title=title).first()

        if project and not options['force']:
            self._ensure_gallery(project)
            self.stdout.write(self.style.WARNING(f'المشروع موجود بالفعل: {title}'))
            return

        if project is None:
            project = Project.objects.create(
                owner=owner,
                title=title,
                summary='منصة متجر إلكتروني متعدد التجار مبنية على Next.js مع نظام طلبات، دفع، توصيل، وتتبّع السائق الأقرب.',
                category='برمجة',
                role='Full Stack Developer',
                project_date=date.today() - timedelta(days=90),
                status=ProjectStatus.PUBLISHED,
                visibility=ProjectVisibility.PUBLIC,
                views=1840,
                likes=412,
            )

        project.summary = 'منصة متجر إلكتروني متعدد التجار مبنية على Next.js مع نظام طلبات، دفع، توصيل، وتتبّع السائق الأقرب.'
        project.category = 'برمجة'
        project.role = 'Full Stack Developer'
        project.project_date = date.today() - timedelta(days=90)
        project.status = ProjectStatus.PUBLISHED
        project.visibility = ProjectVisibility.PUBLIC
        project.github_url = ''
        project.demo_url = ''
        project.content = (
            '<p>منصة متجر إلكتروني متقدمة تم تصميمها كحلّ كامل للتجارة الرقمية، مع دعم التجار المتعددين والتجربة المخصصة لكل عميل.</p>'
            '<p>يوفّر النظام واجهة متجاوبة في Next.js، لوحة تحكم إدارية متكاملة، وإدارة منتجات، طلبات، دفع، وعربات تسوق في وقتٍ واحد، مع دعم عمليات الشحن وتتبّعها.</p>'
            '<ul>'
            '<li>متعدد التجار: لكل متجر لوحة تحكم خاصة، منتجاته، وأوامر عملائه.</li>'
            '<li>تجربة عملاء سريعة: فئات، فلترة، بحث ذكي، وسلة مشتريات متكاملة.</li>'
            '<li>دفع آمن: دعم قسائم، خصومات، وعملية دفع موثوقة.</li>'
            '<li>توصيل ذكي: حساب أقرب سائق، متابعة الطلب عبر الخريطة، وربط حالة التوصيل في الوقت الفعلي.</li>'
            '<li>لوحة إدارية: إدارة الطلبات، التاجر، التحليلات، والاسترجاعات.</li>'
            '<li>تجربة مستخدم احترافية: تصميم متقدم وموجه للهواتف والأجهزة اللوحية.</li>'
            '</ul>'
            '<p>تم تنفيذ المشروع باستخدام Next.js في الواجهة الأمامية، مع بنية Backend قوية لإدارة البيانات والتخزين، مع تركيز على الأداء وقابلية التوسع.</p>'
        )
        project.save()

        if not project.cover:
            project.cover.save('alaa-marketplace-cover.svg', ContentFile(_cover_svg(title)), save=True)

        tag_names = ['Next.js', 'React', 'Node.js', 'E-Commerce', 'Multi-vendor', 'Delivery', 'Map', 'Dashboard']
        tags = []
        for tag_name in tag_names:
            tag, _ = ProjectTag.objects.get_or_create(name=tag_name)
            tags.append(tag)
        project.tags.set(tags)
        self._ensure_gallery(project)

        self.stdout.write(self.style.SUCCESS(
            f'تم إنشاء/تحديث المشروع: {project.title} (المالك: {owner.handle}) '
            f'| visibility={project.visibility} | status={project.status}'
        ))

    @staticmethod
    def _ensure_gallery(project):
        if project.images.exists():
            return

        for order, kind in enumerate(('storefront', 'delivery', 'dashboard')):
            image = ProjectImage(project=project, order=order)
            image.image.save(
                f'alaa-marketplace-{kind}.svg',
                ContentFile(_gallery_svg(kind)),
                save=True,
            )
