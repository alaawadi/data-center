"""تعبئة المنصة ببيانات واقعية للعرض والتجربة.

ينشئ:
  - 4 مدرّبين جدد مع بروفايلات مكتملة.
  - 10 دورات كاملة (أقسام + دروس + اختبارات) موزّعة على المدرّبين.
  - 20 طالباً جديداً مع بروفايلاتهم.
  - شهادات ومشاريع لكل طالب مرتبطة بالدورات.
  - 3 منشورات لكل مستخدم جديد.

الاستخدام:
    python manage.py seed_showcase
    python manage.py seed_showcase --flush     # يحذف بيانات هذا السكربت أولاً

كل الحسابات كلمة مرورها: Showcase#2026
"""
import io
import random
from datetime import date, timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from courses.models import (
    Course,
    CourseCertificate,
    CourseProgress,
    CourseSection,
    CourseStatus,
    Lesson,
    LessonType,
    Quiz,
    QuizChoice,
    QuizQuestion,
)
from posts.models import Post, PostStatus, PostTag
from projects.models import Project, ProjectStatus, ProjectTag, ProjectVisibility
from users.models import (
    Availability,
    Interest,
    Language,
    ProfileLanguage,
    ProfileSkill,
    Skill,
    SocialLink,
    User,
    UserRole,
)

PASSWORD = 'Showcase#2026'
TAG = '_showcase'  # يُستخدم في handles/phones لتمييز بيانات هذا السكربت

# ---------------------------------------------------------------------------
# مولّدات وسائط (SVG) لتظهر البطاقات بصور جاهزة
# ---------------------------------------------------------------------------

_PALETTE = [
    ('#1d4ed8', '#3b82f6'), ('#0f766e', '#14b8a6'), ('#7c3aed', '#a78bfa'),
    ('#b45309', '#f59e0b'), ('#be123c', '#fb7185'), ('#0369a1', '#38bdf8'),
    ('#4338ca', '#818cf8'), ('#047857', '#34d399'), ('#9a3412', '#fb923c'),
    ('#6d28d9', '#c4b5fd'),
]

_EMOJI = ['💻', '🎨', '📊', '🚀', '🧠', '🏢', '📱', '⚙️', '🔍', '🎓']


def _cover_svg(label, index):
    c1, c2 = _PALETTE[index % len(_PALETTE)]
    emoji = _EMOJI[index % len(_EMOJI)]
    label = (label or '')[:28]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>'
        '</linearGradient></defs>'
        '<rect width="1200" height="675" fill="url(#g)"/>'
        '<circle cx="1020" cy="120" r="220" fill="rgba(255,255,255,.10)"/>'
        '<circle cx="160" cy="600" r="260" fill="rgba(0,0,0,.10)"/>'
        f'<text x="600" y="330" text-anchor="middle" font-size="170">{emoji}</text>'
        f'<text x="600" y="470" text-anchor="middle" font-size="44" fill="#fff" '
        f'font-family="sans-serif">{label}</text>'
        '</svg>'
    ).encode('utf-8')


# ---------------------------------------------------------------------------
# بيانات المدرّبين
# ---------------------------------------------------------------------------

TRAINERS = [
    {
        'phone': '0562000001', 'handle': 'lina.dev', 'full_name': 'لينا عبد الرحمن',
        'email': 'lina@datacenter.dev',
        'headline': 'مهندسة برمجيات ومدربة تطوير الويب',
        'bio': 'مهندسة برمجيات بخبرة 9 سنوات في بناء تطبيقات الويب، أدرّب على JavaScript وReact وبنية الواجهات الحديثة.',
        'specialization': 'تطوير الويب', 'experience_years': 9, 'hourly_rate': 140,
        'city': 'رام الله', 'availability': Availability.AVAILABLE,
        'skills': [('JavaScript', 95), ('React', 92), ('TypeScript', 85), ('Node.js', 82)],
        'socials': [('github', 'https://github.com/linadev'), ('linkedin', 'https://linkedin.com/in/linadev')],
    },
    {
        'phone': '0562000002', 'handle': 'omar.data', 'full_name': 'عمر الشريف',
        'email': 'omar@datacenter.dev',
        'headline': 'عالِم بيانات ومدرب تحليل البيانات',
        'bio': 'خبير في تحليل البيانات وعلومها، أعمل مع الفرق على تحويل البيانات إلى قرارات، وأدرّب على Python وSQL وتمثيل البيانات.',
        'specialization': 'علم البيانات', 'experience_years': 8, 'hourly_rate': 160,
        'city': 'غزة', 'availability': Availability.OPEN,
        'skills': [('Python', 96), ('Pandas', 93), ('SQL', 90), ('Data Visualization', 88)],
        'socials': [('linkedin', 'https://linkedin.com/in/omardata')],
    },
    {
        'phone': '0562000003', 'handle': 'rana.design', 'full_name': 'رنا حمدان',
        'email': 'rana@datacenter.dev',
        'headline': 'مدربة تصميم تجربة المستخدم والواجهات',
        'bio': 'مصمّمة تجربة مستخدم بخبرة 7 سنوات، أدرّب على المنهجيات العملية في التصميم وبناء أنظمة التصميم واختبار قابلية الاستخدام.',
        'specialization': 'تصميم تجربة المستخدم', 'experience_years': 7, 'hourly_rate': 130,
        'city': 'نابلس', 'availability': Availability.AVAILABLE,
        'skills': [('Figma', 96), ('UX Research', 92), ('Design Systems', 88), ('Prototyping', 90)],
        'socials': [('behance', 'https://behance.net/ranadesign'), ('linkedin', 'https://linkedin.com/in/ranadesign')],
    },
    {
        'phone': '0562000004', 'handle': 'yousef.mobile', 'full_name': 'يوسف النجار',
        'email': 'yousef@datacenter.dev',
        'headline': 'مدرب تطوير تطبيقات الجوال',
        'bio': 'مطوّر تطبيقات جوال بخبرة 10 سنوات، أدرّب على Flutter وبناء التطبيقات المتقاطعة المنصات وربطها بالخدمات السحابية.',
        'specialization': 'تطوير التطبيقات', 'experience_years': 10, 'hourly_rate': 150,
        'city': 'الخليل', 'availability': Availability.BUSY,
        'skills': [('Flutter', 95), ('Dart', 93), ('Firebase', 88), ('REST API', 86)],
        'socials': [('github', 'https://github.com/yousefmobile')],
    },
]

# ---------------------------------------------------------------------------
# بيانات الدورات (10) — كل دورة ترتبط بفهرس مدرب
# ---------------------------------------------------------------------------

COURSES = [
    {
        'trainer': 0, 'title': 'أساسيات تطوير الواجهات الأمامية',
        'category': 'برمجة', 'price': '₪180', 'duration': '36 ساعة', 'period': '12 لقاءات',
        'summary': 'برنامج مكثّف يغطي HTML5 وCSS3 وJavaScript الحديثة وبناء واجهات متجاوبة مع مشروع تخرّج.',
        'content': 'برنامج تدريبي عملي يمتد على 12 لقاءً، يبدأ من أساسيات بناء صفحات الويب وينتهي ببناء واجهة تفاعلية متكاملة. يعتمد على التطبيق المباشر والتمارين الأسبوعية.',
        'skills': ['HTML', 'CSS', 'JavaScript', 'Responsive Design'],
        'sections': [
            ('البداية مع HTML', [
                ('مقدمة في تطوير الواجهات', 'video', True, 'نظرة عامة على مسار تطوير الواجهات الأمامية وما ستبنيه خطوة بخطوة.'),
                ('بنية صفحة HTML5', 'video', False, 'الوسوم الأساسية والعناصر الدلالية وبنية المستند الصحيح.'),
                ('النصوص والروابط والصور', 'video', False, 'التعامل مع المحتوى النصي والروابط والصور والوسائط.'),
            ]),
            ('التنسيق بـ CSS3', [
                ('أساسيات CSS والمحددات', 'video', False, 'المحددات والتسلسل والألوان والمسافات وخصائص التخطيط.'),
                ('Flexbox والشبكات', 'video', False, 'بناء تخطيطات مرنة باستخدام Flexbox وGrid بأمثلة عملية.'),
                ('التصميم المتجاوب', 'video', True, 'جعل الواجهة تتكيف مع الشاشات المختلفة.'),
            ]),
            ('JavaScript الحديثة', [
                ('المتغيرات والدوال', 'video', False, 'أساسيات اللغة والكائنات والمصفوفات.'),
                ('التفاعل مع DOM', 'video', False, 'اختيار العناصر ومستمعي الأحداث وتحديث الصفحة ديناميكياً.'),
                ('مشروع: صفحة تسجيل تفاعلية', 'video', False, 'نبني صفحة تسجيل كاملة مع تحقق من المدخلات.'),
            ]),
            ('الخاتمة والاختبار', [
                ('إتاحة الوصول وتحسين الظهور', 'article', False, 'معايير WAI-ARIA وأساسيات تحسين الظهور.'),
                ('الاختبار النهائي', 'quiz', False, 'قيّم ما تعلمته عبر أسئلة شاملة على كامل مسار الدورة.'),
            ]),
        ],
        'quiz': [
            ('ما الوسم الدلالي المناسب لرأس الصفحة في HTML5؟',
             ['<header>', '<div>', '<section>', '<span>'], 0,
             'الوسم <header> مخصّص لرأس الصفحة أو القسم.'),
            ('أي خصيصة CSS تُستخدم لبناء تخطيط أحادي البعد؟',
             ['display:flex', 'display:grid', 'position:fixed', 'float:none'], 0,
             'Flexbox مصمّم للتخطيطات أحادية البعد.'),
            ('كيف نختار عنصراً بمعرّف id في JavaScript؟',
             ['document.getElementById()', 'document.querySelectorAll()', 'document.getElementsByClassName()', 'document.create()'], 0,
             'getElementById تُرجع عنصراً واحداً بالمعرّف.'),
            ('ما وحدة القياس الأنسب للتصميم المتجاوب؟',
             ['rem', 'pt', 'cm', 'in'], 0,
             'rem نسبية وتتكيف مع حجم الخط الأساسي.'),
            ('أي حدث يُستخدم لتنفيذ كود عند النقر؟',
             ['click', 'change', 'keyup', 'load'], 0,
             'click هو حدث النقر الأساسي.'),
        ],
    },
    {
        'trainer': 0, 'title': 'React لبناء تطبيقات الويب الحديثة',
        'category': 'برمجة', 'price': '₪220', 'duration': '40 ساعة', 'period': '14 لقاءً',
        'summary': 'تعلّم React من الصفر: المكوّنات، الحالة، الخطّافات، وتنظيم التطبيقات الكبيرة.',
        'content': 'دورة عملية متقدمة على React تبدأ بمفاهيم المكوّنات والخصائص وتنتقل إلى إدارة الحالة والخطّافات وبناء تطبيق كامل مع تكامل API.',
        'skills': ['React', 'Hooks', 'State Management', 'REST API'],
        'sections': [
            ('الأساسيات', [
                ('ما هي React ولماذا؟', 'video', True, 'مقدمة عن المكتبة ونموذج المكوّنات.'),
                ('المكوّنات والخصائص', 'video', False, 'بناء المكوّنات وتمرير الخصائص بينها.'),
                ('JSX والتنسيق الشرطي', 'video', False, 'كتابة JSX والعرض الشرطي والقوائم.'),
            ]),
            ('الحالة والخطّافات', [
                ('useState وإدارة الحالة', 'video', False, 'التعامل مع الحالة المحلية.'),
                ('useEffect ودورة الحياة', 'video', False, 'التأثيرات الجانبية ومزامنة البيانات.'),
                ('رفع الحالة والسياق', 'video', False, 'مشاركة الحالة عبر المكوّنات.'),
            ]),
            ('بناء تطبيق كامل', [
                ('تكامل REST API', 'video', False, 'جلب البيانات وعرضها ومعالجة الأخطاء.'),
                ('التوجيه وحماية المسارات', 'video', False, 'التنقل بين الصفحات وحماية المسارات.'),
                ('النشر والاختبار', 'video', False, 'اختبار التطبيق ونشره.'),
                ('الاختبار النهائي', 'quiz', False, 'أسئلة شاملة على مسار React.'),
            ]),
        ],
        'quiz': [
            ('ما الخطّاف المستخدم لإدارة الحالة المحلية في المكوّن الدالّي؟',
             ['useState', 'useEffect', 'useRef', 'useMemo'], 0, 'useState يدير الحالة المحلية.'),
            ('متى يُنفَّذ الكود داخل useEffect بدون مصفوفة اعتماديات؟',
             ['بعد كل تصيير', 'مرة واحدة فقط', 'عند التدمير فقط', 'لا يُنفَّذ'], 0, 'بدون اعتماديات يُنفَّذ بعد كل تصيير.'),
            ('كيف نمرّر البيانات من الأب إلى الابن؟',
             ['عبر الخصائص props', 'عبر الحالة state', 'عبر الأحداث', 'عبر المفاتيح'], 0, 'الخصائص props للتمرير للأسفل.'),
            ('ما العنصر المناسب لقالب يحتوي عدة أبناء؟',
             ['<React.Fragment>', '<div>', '<span>', '<section>'], 0, 'Fragment يجمع دون عنصر إضافي.'),
        ],
    },
    {
        'trainer': 1, 'title': 'تحليل البيانات باستخدام Python',
        'category': 'بيانات', 'price': '₪200', 'duration': '34 ساعة', 'period': '11 لقاءً',
        'summary': 'من أساسيات Python إلى تحليل البيانات باستخدام Pandas وتمثيل النتائج بصرياً.',
        'content': 'مسار تحليلي متكامل يعلّمك تنظيف البيانات وتحليلها واستخلاص الرؤى وتمثيلها بصرياً باستخدام مكتبات Python الحديثة.',
        'skills': ['Python', 'Pandas', 'NumPy', 'Data Visualization'],
        'sections': [
            ('أساسيات Python', [
                ('المتغيرات وأنواع البيانات', 'video', True, 'الأساسيات التي ستبني عليها التحليل.'),
                ('الدوال والقوائم والقواميس', 'video', False, 'بناء الدوال والتعامل مع التراكيب.'),
            ]),
            ('تحليل البيانات', [
                ('مقدمة في Pandas', 'video', False, 'DataFrame وSeries والعمليات الأساسية.'),
                ('تنظيف البيانات', 'video', False, 'معالجة القيم المفقودة والتكرارات.'),
                ('التجميع والتحليل', 'video', False, 'groupby والتجميع والإحصاءات الوصفية.'),
            ]),
            ('التمثيل البصري', [
                ('الرسوم البيانية', 'video', False, 'Matplotlib وSeaborn لتمثيل النتائج.'),
                ('مشروع تحليلي متكامل', 'video', False, 'تحليل مجموعة بيانات واقعية من البداية للنهاية.'),
                ('الاختبار النهائي', 'quiz', False, 'أسئلة على مسار التحليل.'),
            ]),
        ],
        'quiz': [
            ('ما المكتبة الأساسية لتحليل البيانات في Python؟',
             ['Pandas', 'Flask', 'Django', 'Requests'], 0, 'Pandas هي الأساس لتحليل البيانات.'),
            ('ما التركيب الأساسي في Pandas؟',
             ['DataFrame', 'Array', 'List', 'Dict'], 0, 'DataFrame هو التركيب الجدولي.'),
            ('أي دالة تُستخدم لتجميع البيانات حسب عمود؟',
             ['groupby', 'merge', 'concat', 'pivot_index'], 0, 'groupby للتجميع.'),
            ('كيف نعالج القيم المفقودة؟',
             ['fillna/dropna', 'print()', 'input()', 'len()'], 0, 'fillna أو dropna للقيم المفقودة.'),
        ],
    },
    {
        'trainer': 1, 'title': 'SQL وقواعد البيانات العلائقية',
        'category': 'بيانات', 'price': '₪160', 'duration': '28 ساعة', 'period': '9 لقاءات',
        'summary': 'إتقان استعلامات SQL وتصميم قواعد البيانات وربط الجداول والتحسين.',
        'content': 'دورة عملية على قواعد البيانات العلائقية تبدأ بتصميم الجداول وتنتقل إلى الاستعلامات المتقدمة والفهارس وتحسين الأداء.',
        'skills': ['SQL', 'Database Design', 'Joins', 'Indexing'],
        'sections': [
            ('الأساسيات', [
                ('مفاهيم قواعد البيانات', 'video', True, 'ما هي قواعد البيانات العلائقية.'),
                ('SELECT وWHERE', 'video', False, 'استرجاع البيانات وتصفيتها.'),
            ]),
            ('الاستعلامات المتقدمة', [
                ('JOINs وربط الجداول', 'video', False, 'أنواع الربط واستخداماتها.'),
                ('التجميع والمسندات', 'video', False, 'GROUP BY وHAVING والدوال التجميعية.'),
                ('الاستعلامات الفرعية', 'video', False, 'Subqueries وCTE.'),
            ]),
            ('التصميم والتحسين', [
                ('التطبيع والفهارس', 'video', False, 'تصميم الجداول والفهارس.'),
                ('الاختبار النهائي', 'quiz', False, 'أسئلة على مسار SQL.'),
            ]),
        ],
        'quiz': [
            ('أي أمر يُستخدم لاسترجاع البيانات؟',
             ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 0, 'SELECT للاسترجاع.'),
            ('ما نوع الربط الذي يُرجع الصفوف المتطابقة فقط؟',
             ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN'], 0, 'INNER JOIN يرجّع المتطابق فقط.'),
            ('أي جملة تُستخدم لتصفية نتائج التجميع؟',
             ['HAVING', 'WHERE', 'ORDER BY', 'LIMIT'], 0, 'HAVING تُصفّي بعد GROUP BY.'),
        ],
    },
    {
        'trainer': 2, 'title': 'تصميم تجربة المستخدم — المستوى الأول',
        'category': 'تصميم', 'price': '₪150', 'duration': '18 ساعة', 'period': '6 لقاءات',
        'summary': 'مبادئ UX وبناء النماذج التفاعلية وأبحاث المستخدم واختبار قابلية الاستخدام.',
        'content': 'دورة تصميم تجربة المستخدم تعلّمك التفكير التصميمي وأبحاث المستخدم والرسم الأولي وبناء النماذج واختبارها مع المستخدمين.',
        'skills': ['UX Research', 'Wireframing', 'Prototyping', 'Figma'],
        'sections': [
            ('مبادئ التصميم', [
                ('ما هي تجربة المستخدم؟', 'video', True, 'مقدمة في UX والفرق عن UI.'),
                ('التفكير التصميمي', 'video', False, 'المراحل الخمس للتفكير التصميمي.'),
            ]),
            ('الأبحاث والتخطيط', [
                ('أبحاث المستخدم', 'video', False, 'المقابلات والاستبيانات وبناء الشخصيات.'),
                ('خرائط تدفق المستخدم', 'video', False, 'رسم رحلة المستخدم وتحديد نقاط الألم.'),
            ]),
            ('النماذج والاختبار', [
                ('الرسم الأولي والنماذج', 'video', False, 'Wireframes والنماذج التفاعلية في Figma.'),
                ('الاختبار النهائي', 'quiz', False, 'أسئلة على مسار UX.'),
            ]),
        ],
        'quiz': [
            ('ما الفرق الجوهري بين UX وUI؟',
             ['UX تجربة شاملة وUI الواجهة البصرية', 'لا فرق', 'UX للجوال فقط', 'UI للبيانات'], 0, 'UX أشمل، UI الواجهة البصرية.'),
            ('ما أول مرحلة في التفكير التصميمي؟',
             ['التعاطف/Empathize', 'النموذج', 'الاختبار', 'التنفيذ'], 0, 'التعاطف أولاً لفهم المستخدم.'),
            ('ما الهدف من اختبار قابلية الاستخدام؟',
             ['قياس سهولة الاستخدام مع مستخدمين حقيقيين', 'زيادة الألوان', 'كتابة الكود', 'التسويق'], 0, 'قياس سهولة الاستخدام فعلياً.'),
        ],
    },
    {
        'trainer': 2, 'title': 'أنظمة التصميم في Figma',
        'category': 'تصميم', 'price': '₪190', 'duration': '24 ساعة', 'period': '8 لقاءات',
        'summary': 'بناء أنظمة تصميم متكاملة: الرموز، المتغيّرات، المكوّنات، والتوثيق.',
        'content': 'دورة متخصصة في بناء أنظمة التصميم القابلة للتوسّع داخل Figma، من الألوان والطباعة إلى المكوّنات والمتغيّرات الافتراضية.',
        'skills': ['Figma', 'Design Systems', 'Components', 'Design Tokens'],
        'sections': [
            ('الأساسيات', [
                ('مفهوم نظام التصميم', 'video', True, 'لماذا تحتاج الفرق لنظام تصميم.'),
                ('الألوان والطباعة كرموز', 'video', False, 'تحويل التصميم إلى رموز قابلة للتوسّع.'),
            ]),
            ('المكوّنات', [
                ('المكوّنات والمتغيّرات', 'video', False, 'بناء مكوّنات مرنة بالمتغيّرات.'),
                ('مكتبة مشتركة', 'video', False, 'نشر مكتبة مشتركة للفريق.'),
                ('التوثيق والاختبار', 'video', False, 'توثيق النظام واختبار اتساقه.'),
                ('الاختبار النهائي', 'quiz', False, 'أسئلة على أنظمة التصميم.'),
            ]),
        ],
        'quiz': [
            ('ما فائدة رموز التصميم (Design Tokens)؟',
             ['توحيد القيم وتبسيط التغيير', 'زيادة حجم الملف', 'تعقيد العمل', 'لا فائدة'], 0, 'توحّد القيم وتُسهّل التغيير.'),
            ('ما الميزة الأساسية للمكوّنات في Figma؟',
             ['إعادة الاستخدام والاتساق', 'الألوان', 'الطباعة', 'التصدير'], 0, 'إعادة الاستخدام والاتساق.'),
        ],
    },
    {
        'trainer': 3, 'title': 'تطوير تطبيقات الجوال بـ Flutter',
        'category': 'برمجة', 'price': '₪240', 'duration': '45 ساعة', 'period': '15 لقاءً',
        'summary': 'بناء تطبيقات جوال متقاطعة المنصات بـ Flutter وربطها بـ Firebase.',
        'content': 'دورة عملية شاملة تعلّمك Dart وFlutter وبناء واجهات الجوال والمصادقة وقواعد البيانات والنشر على المتاجر.',
        'skills': ['Flutter', 'Dart', 'Firebase', 'Mobile UI'],
        'sections': [
            ('الأساسيات', [
                ('مقدمة في Flutter وDart', 'video', True, 'نظرة عامة على الإطار واللغة.'),
                ('الويدجت والتخطيطات', 'video', False, 'Widgets وبناء التخطيطات.'),
                ('التنقل بين الشاشات', 'video', False, 'المسارات والتنقل.'),
            ]),
            ('البيانات والخدمات', [
                ('إدارة الحالة', 'video', False, 'Provider وإدارة الحالة.'),
                ('Firebase والمصادقة', 'video', False, 'ربط التطبيق بقواعد Firebase والمصادقة.'),
                ('تطبيق عملي متكامل', 'video', False, 'بناء تطبيق كامل من الصفر.'),
            ]),
            ('النشر', [
                ('الاختبار والنشر', 'video', False, 'اختبار التطبيق ونشره على المتاجر.'),
                ('الاختبار النهائي', 'quiz', False, 'أسئلة على مسار Flutter.'),
            ]),
        ],
        'quiz': [
            ('بأي لغة يُكتب Flutter؟',
             ['Dart', 'Kotlin', 'Swift', 'JavaScript'], 0, 'Flutter مبني على Dart.'),
            ('ما الأساسي لبناء واجهة في Flutter؟',
             ['Widget', 'Div', 'View', 'Element'], 0, 'كل شيء Widget في Flutter.'),
            ('أي خدمة تُستخدم لقاعدة بيانات سحابية شائعة؟',
             ['Firebase', 'PostgreSQL', 'Redis', 'Nginx'], 0, 'Firebase شائعة مع Flutter.'),
        ],
    },
    {
        'trainer': 3, 'title': 'أمن التطبيقات وأساسيات الحماية',
        'category': 'أمن', 'price': '₪210', 'duration': '30 ساعة', 'period': '10 لقاءات',
        'summary': 'مبادئ أمن التطبيقات الشائعة: المصادقة، التشفير، وحماية البيانات.',
        'content': 'دورة تعرّفك على أهم ثغرات أمن التطبيقات وسبل الحماية، من المصادقة الآمنة إلى تشفير البيانات ومعالجة المدخلات.',
        'skills': ['App Security', 'Authentication', 'Encryption', 'OWASP'],
        'sections': [
            ('المبادئ', [
                ('مقدمة في أمن التطبيقات', 'video', True, 'لماذا الأمن مسؤولية الجميع.'),
                ('أهم ثغرات OWASP', 'video', False, 'جولة على أكثر الثغرات شيوعاً.'),
            ]),
            ('الحماية العملية', [
                ('المصادقة والجلسات', 'video', False, 'بناء مصادقة آمنة وإدارة الجلسات.'),
                ('التشفير وحماية البيانات', 'video', False, 'التشفير والتخزين الآمن.'),
                ('معالجة المدخلات', 'video', False, 'منع حقن SQL وXSS.'),
                ('الاختبار النهائي', 'quiz', False, 'أسئلة على مسار الأمن.'),
            ]),
        ],
        'quiz': [
            ('ما الحل الأساسي لمنع حقن SQL؟',
             ['الاستعلامات المُعدّة (Prepared Statements)', 'تشفير الألوان', 'الطباعة', 'الحذف'], 0, 'الاستعلامات المُعدّة تمنع الحقن.'),
            ('ما أهمية تشفير البيانات الحساسة؟',
             ['حمايتها عند التسريب', 'زيادة السرعة', 'تقليل الحجم', 'لا أهمية'], 0, 'لحمايتها عند التسريب.'),
        ],
    },
    {
        'trainer': 1, 'title': 'لوحات المعلومات وتمثيل البيانات',
        'category': 'بيانات', 'price': '₪175', 'duration': '22 ساعة', 'period': '7 لقاءات',
        'summary': 'بناء لوحات معلومات تفاعلية تحوّل البيانات إلى قرارات بصرية واضحة.',
        'content': 'دورة عملية لبناء لوحات معلومات احترافية، من اختيار الرسوم المناسبة إلى تصميم لوحة كاملة وتوصيلها بالبيانات.',
        'skills': ['Data Visualization', 'Dashboards', 'BI', 'Storytelling'],
        'sections': [
            ('الأساسيات', [
                ('مبادئ التمثيل البصري', 'video', True, 'كيف تختار الرسم المناسب.'),
                ('أنواع الرسوم البيانية', 'video', False, 'خطي، عمودي، دائري، وخريطة حرارية.'),
            ]),
            ('بناء اللوحة', [
                ('تصميم لوحة فعّالة', 'video', False, 'تنظيم المؤشرات والتخطيط.'),
                ('الربط بالبيانات', 'video', False, 'توصيل اللوحة بمصادر البيانات.'),
                ('سرد القصة بالبيانات', 'video', False, 'تحويل اللوحة إلى قصة مقنعة.'),
                ('الاختبار النهائي', 'quiz', False, 'أسئلة على مسار التمثيل البصري.'),
            ]),
        ],
        'quiz': [
            ('أي رسم يناسب إظهار الاتجاه عبر الزمن؟',
             ['الرسم الخطي', 'الدائري', 'الشبكي', 'النقطي'], 0, 'الخطي يُظهر الاتجاه الزمني.'),
            ('ما الهدف من لوحة المعلومات؟',
             ['دعم القرار بشكل بصري سريع', 'زيادة الألوان', 'كتابة النصوص', 'الحفظ'], 0, 'دعم القرار السريع.'),
        ],
    },
    {
        'trainer': 0, 'title': 'TypeScript للمطورين',
        'category': 'برمجة', 'price': '₪195', 'duration': '26 ساعة', 'period': '9 لقاءات',
        'summary': 'انتقل بتطوير JavaScript إلى مستوى احترافي مع TypeScript والأنواع.',
        'content': 'دورة تعلّمك TypeScript من الأساسيات إلى الأنواع المتقدمة والجنيريكس والتكامل مع المشاريع الحديثة.',
        'skills': ['TypeScript', 'Types', 'Generics', 'Tooling'],
        'sections': [
            ('الأساسيات', [
                ('لماذا TypeScript؟', 'video', True, 'فوائد الأنواع في المشاريع الكبيرة.'),
                ('التنصيب والإعداد', 'video', False, 'تهيئة المشروع والأدوات.'),
                ('الأنواع الأساسية', 'video', False, 'الأنواع البدائية والاتحادات.'),
            ]),
            ('المتقدم', [
                ('الواجهات والأنواع المخصّصة', 'video', False, 'Interfaces وType Aliases.'),
                ('الجنيريكس', 'video', False, 'Generics وإعادة الاستخدام.'),
                ('التكامل مع المشاريع', 'video', False, 'دمج TypeScript مع مكتبات الويب.'),
                ('الاختبار النهائي', 'quiz', False, 'أسئلة على مسار TypeScript.'),
            ]),
        ],
        'quiz': [
            ('ما الفائدة الأساسية من TypeScript؟',
             ['التحقق من الأنواع وقت التطوير', 'زيادة السرعة', 'تصغير الملفات', 'الألوان'], 0, 'التحقق من الأنواع يقلّل الأخطاء.'),
            ('ما الكلمة المفتاحية لتعريف نوع صريح؟',
             ['interface/type', 'var', 'function', 'return'], 0, 'interface وtype لتعريف الأنواع.'),
            ('ماذا تفعل الجنيريكس؟',
             ['تتيح إعادة استخدام الكود بأنواع مرنة', 'تحذف الكود', 'تلوّن الكود', 'تسرّع التنزيل'], 0, 'Generics لإعادة الاستخدام بأنواع مرنة.'),
        ],
    },
]

# ---------------------------------------------------------------------------
# أسماء الطلاب (20)
# ---------------------------------------------------------------------------

STUDENT_NAMES = [
    ('طالب إبراهيم', 'student.ibrahim'), ('مريم سعيد', 'maryam.s'), ('حسن رجب', 'hasan.r'),
    ('دعاء ياسين', 'doaa.y'), ('كريم منصور', 'karim.m'), ('سلمى فؤاد', 'salma.f'),
    ('أنس زيدان', 'anas.z'), ('أمل ناصر', 'amal.n'), ('بلال شعبان', 'bilal.sh'),
    ('هبة عوض', 'heba.a'), ('زياد كميل', 'ziad.k'), ('لبنى الحاج', 'lubna.h'),
    ('نور الدين', 'noor.d'), ('رغد مصطفى', 'raghad.m'), ('تامر خليل', 'tamer.kh'),
    ('إسراء فتحي', 'israa.f'), ('محمود درويش', 'mahmoud.d'), ('آية سمير', 'aya.s'),
    ('جمال عودة', 'jamal.o'), ('سناء بركات', 'sanaa.b'),
]

STUDENT_CITIES = [
    ('رام الله', 'فلسطين'), ('غزة', 'فلسطين'), ('نابلس', 'فلسطين'), ('الخليل', 'فلسطين'),
    ('بيت لحم', 'فلسطين'), ('جنين', 'فلسطين'), ('طولكرم', 'فلسطين'), ('أريحا', 'فلسطين'),
]

PROJECT_IDEAS = [
    ('منصة حجز مواعيد', 'تطبيق ويب لحجز المواعيد مع لوحة تحكم للأطباء وتقويم تفاعلي.'),
    ('متجر إلكتروني صغير', 'متجر إلكتروني كامل مع سلة تسوّق ودفع ومتابعة طلبات.'),
    ('لوحة تحليلات مبيعات', 'لوحة معلومات لعرض مؤشرات المبيعات والاتجاهات بشكل بصري.'),
    ('تطبيق مهام يومية', 'تطبيق لإدارة المهام اليومية مع تذكيرات ومزامنة سحابية.'),
    ('موقع شخصي تفاعلي', 'موقع بورتفوليو تفاعلي لعرض المشاريع والمهارات.'),
    ('نظام إدارة محتوى', 'نظام لإدارة المقالات والوسائط مع صلاحيات متعددة.'),
    ('تطبيق طقس', 'تطبيق يعرض حالة الطقس لعدة مدن مع رسوم بيانية.'),
    ('منصة كورسات مصغّرة', 'منصة بسيطة للدورات المصغّرة مع تسجيل تقدّم.'),
    ('بوت خدمة عملاء', 'بوت محادثة يجيب على استفسارات العملاء الشائعة.'),
    ('مذكرة تعليمية', 'تطبيق لتدوين الملاحظات الدراسية وتنظيمها بالوسوم.'),
    ('لوحة إدارة مشاريع', 'لوحة لكانبان لإدارة المهام بين أعضاء الفريق.'),
    ('موقع وصفات طعام', 'موقع لعرض الوصفات مع بحث وتصنيفات وحفظ المفضلة.'),
]

POST_IDEAS = [
    'أنجزت اليوم مشروعاً جديداً وأضفته إلى بورتفوليوي! تجربة ممتعة وتعلّمت أشياء كثيرة.',
    'نصيحة لمن يبدأ التعلّم: الاستمرارية اليومية أهم من الجلسات الطويلة المتقطّعة.',
    'شاركت في ورشة عمل هذا الأسبوع وكانت مليئة بالأفكار العملية. أنصح الجميع بالتجربة.',
    'أخيراً أكملت وحدتين من الدورة وأشعر بالتقدّم! السرّ في الممارسة العملية.',
    'قرأت مقالاً رائعاً عن تجربة المستخدم وغيّر طريقة تفكيري في تصميم الواجهات.',
    'بدأت مشروعاً جانبياً جديداً لتطبيق الفكرة التي فكّرت بها طويلاً. أتمنى التوفيق.',
    'معلومة اليوم: تنظيم الكود يوفّر ساعات لاحقاً. لا تتجاهلوا إعادة الهيكلة المبكّرة.',
    'شاركوا معي: ما أفضل مصدر تعلّم استفدتم منه في مجالك؟',
    'قمت بمراجعة مشروع قديم وأعدت بناءه بمعمارية أنظف — فرق كبير في الأداء.',
    'تحدّثت مع زميل عن مسار التعلّم الصحيح وحمّسني للمزيد. التعلّم رحلة جماعية!',
]

PROJECT_TAGS = ['ويب', 'React', 'Python', 'تصميم', 'Flutter', 'بيانات', 'واجهات', 'API', 'UI/UX', 'تعلّم آلي']
POST_TAGS = ['تعلّم', 'برمجة', 'تصميم', 'إنجاز', 'نصيحة', 'التزام', 'مشروع', 'بيانات']

# مشاريع المدرّبين المنشورة (تظهر في صفحة /projects/)
TRAINER_PROJECTS = [
    {'trainer': 0, 'title': 'منصة تعليمية متكاملة بـ React', 'summary': 'منصة تعليمية تفاعلية مع لوحة تحكم للطلاب وتتبّع التقدّم.', 'category': 'ويب', 'role': 'مهندسة برمجيات', 'tags': ['React', 'ويب', 'API']},
    {'trainer': 0, 'title': 'مكتبة مكوّنات واجهة مفتوحة المصدر', 'summary': 'مكتبة مكوّنات قابلة لإعادة الاستخدام مبنية بـ TypeScript.', 'category': 'ويب', 'role': 'مهندسة برمجيات', 'tags': ['TypeScript', 'UI/UX', 'واجهات']},
    {'trainer': 1, 'title': 'لوحة تحليلات بيانات المبيعات', 'summary': 'لوحة معلومات تفاعلية لتحليل مبيعات متجر إلكتروني.', 'category': 'بيانات', 'role': 'عالِم بيانات', 'tags': ['Python', 'بيانات', 'API']},
    {'trainer': 1, 'title': 'نظام توصية ذكي للعملاء', 'summary': 'نموذج توصية يقترح منتجات بناءً على سلوك العملاء.', 'category': 'بيانات', 'role': 'عالِم بيانات', 'tags': ['Python', 'تعلّم آلي', 'بيانات']},
    {'trainer': 2, 'title': 'نظام تصميم لتطبيق مصرفي', 'summary': 'نظام تصميم كامل لبنك رقمي مع مكتبة مكوّنات في Figma.', 'category': 'تصميم', 'role': 'مصمّمة تجربة مستخدم', 'tags': ['UI/UX', 'تصميم', 'واجهات']},
    {'trainer': 2, 'title': 'إعادة تصميم تجربة حجز الرحلات', 'summary': 'إعادة تصميم رحلة حجز متكاملة لتحسين معدّل الإتمام.', 'category': 'تصميم', 'role': 'مصمّمة تجربة مستخدم', 'tags': ['UI/UX', 'تصميم']},
    {'trainer': 3, 'title': 'تطبيق توصيل طلبات بـ Flutter', 'summary': 'تطبيق جوال لتوصيل الطلبات مع تتبّع مباشر وتقييم.', 'category': 'تطبيقات', 'role': 'مطوّر تطبيقات', 'tags': ['Flutter', 'API']},
    {'trainer': 3, 'title': 'تطبيق لياقة وتتبّع صحي', 'summary': 'تطبيق لمتابعة التمارين والتغذية مع لوحات إحصائية.', 'category': 'تطبيقات', 'role': 'مطوّر تطبيقات', 'tags': ['Flutter', 'واجهات']},
]


class Command(BaseCommand):
    help = 'تعبئة المنصة ببيانات واقعية: مدرّبون ودورات وطلاب وشهادات ومشاريع ومنشورات'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true',
                            help='حذف بيانات هذا السكربت قبل إعادة الإنشاء')

    @transaction.atomic
    def handle(self, *args, **options):
        rng = random.Random(2026)
        if options['flush']:
            self._flush()

        trainers = self._create_trainers(rng)
        courses = self._create_courses(trainers, rng)
        students = self._create_students(rng)
        self._create_trainer_projects(trainers, rng)
        self._create_certificates_and_projects(students, courses, rng)
        self._create_posts(list(trainers) + list(students), rng)

        self.stdout.write(self.style.SUCCESS(
            f'تمّت التعبئة: {len(trainers)} مدرّبين، {len(courses)} دورات، '
            f'{len(students)} طالباً، ومنشورات. كلمة المرور: {PASSWORD}'
        ))

    # ------------------------------------------------------------------
    def _flush(self):
        phones = [t['phone'] for t in TRAINERS] + [self._student_phone(i) for i in range(1, 21)]
        users = User.objects.filter(phone__in=phones)
        Course.objects.filter(owner__in=users).delete()
        Project.objects.filter(owner__in=users).delete()
        Post.objects.filter(owner__in=users).delete()
        users.delete()
        self.stdout.write('تم حذف بيانات العرض السابقة.')

    @staticmethod
    def _student_phone(i):
        return f'0563{i:06d}'

    # ------------------------------------------------------------------
    def _apply_profile(self, user, data, rng):
        p = user.profile
        p.headline = data.get('headline', '')
        p.bio = data.get('bio', '')
        p.city = data.get('city', '')
        p.country = data.get('country', 'فلسطين')
        p.specialization = data.get('specialization', '')
        p.experience_years = data.get('experience_years')
        p.hourly_rate = data.get('hourly_rate')
        p.availability = data.get('availability', '')
        p.education_stage = data.get('education_stage', '')
        p.school = data.get('school', '')
        p.grade = data.get('grade', '')
        p.learning_goals = data.get('learning_goals', '')
        p.is_public = True
        p.save()

        for name, level in data.get('skills', []):
            skill, _ = Skill.objects.get_or_create(name=name)
            ProfileSkill.objects.update_or_create(
                profile=p, skill=skill, defaults={'level': level})
        for name, level in data.get('languages', [('العربية', 'native'), ('الإنجليزية', 'fluent')]):
            language, _ = Language.objects.get_or_create(name=name)
            ProfileLanguage.objects.update_or_create(
                profile=p, language=language, defaults={'level': level})
        for name in data.get('interests', []):
            interest, _ = Interest.objects.get_or_create(name=name)
            p.interests.add(interest)
        for platform, url in data.get('socials', []):
            SocialLink.objects.update_or_create(
                profile=p, platform=platform, defaults={'url': url})

    # ------------------------------------------------------------------
    def _create_trainers(self, rng):
        trainers = []
        for data in TRAINERS:
            user, created = User.objects.get_or_create(
                phone=data['phone'],
                defaults={
                    'full_name': data['full_name'],
                    'handle': data['handle'],
                    'role': UserRole.TRAINER,
                    'is_verified': True,
                    'email': data['email'],
                },
            )
            if created:
                user.set_password(PASSWORD)
                user.save()
            self._apply_profile(user, data, rng)
            trainers.append(user)
        return trainers

    # ------------------------------------------------------------------
    def _create_courses(self, trainers, rng):
        admin = User.objects.filter(role=UserRole.ADMIN).first() or trainers[0]
        courses = []
        for idx, cdata in enumerate(COURSES):
            owner = trainers[cdata['trainer']]
            course, created = Course.objects.get_or_create(
                title=cdata['title'],
                owner=owner,
                defaults={
                    'category': cdata['category'],
                    'summary': cdata['summary'],
                    'content': cdata['content'],
                    'price': cdata['price'],
                    'duration': cdata['duration'],
                    'period': cdata['period'],
                    'skills': cdata['skills'],
                    'status': CourseStatus.PUBLISHED,
                    'credential_id': f'DC-{idx + 1:03d}-2026',
                },
            )
            if not created:
                courses.append(course)
                continue

            course.cover.save(f'showcase-course-{course.pk}.svg',
                              ContentFile(_cover_svg(cdata['title'], idx)), save=True)

            for s_idx, (section_title, lessons) in enumerate(cdata['sections']):
                section = CourseSection.objects.create(
                    course=course, title=section_title, order=s_idx)
                for l_idx, (l_title, l_type, free, content) in enumerate(lessons):
                    lesson = Lesson.objects.create(
                        section=section, title=l_title, order=l_idx,
                        type=l_type, is_free=free, content=content,
                        duration=f"{rng.randint(6, 28):02d}:{rng.randint(0, 59):02d}",
                    )
                    if l_type == LessonType.QUIZ:
                        self._create_quiz(lesson, cdata.get('quiz', []))
            courses.append(course)
        return courses

    def _create_quiz(self, lesson, questions):
        quiz, _ = Quiz.objects.get_or_create(lesson=lesson)
        if quiz.questions.exists():
            return
        for q_idx, (q_text, choices, correct_idx, explanation) in enumerate(questions):
            question = QuizQuestion.objects.create(
                quiz=quiz, text=q_text, explanation=explanation, order=q_idx)
            for c_idx, c_text in enumerate(choices):
                QuizChoice.objects.create(
                    question=question, text=c_text,
                    is_correct=(c_idx == correct_idx), order=c_idx)

    # ------------------------------------------------------------------
    def _create_students(self, rng):
        students = []
        schools = ['جامعة بيرزيت', 'الجامعة الإسلامية', 'جامعة النجاح', 'جامعة الأقصى',
                   'الكلية الجامعية', 'جامعة بوليتكنك فلسطين']
        for i, (full_name, handle) in enumerate(STUDENT_NAMES, start=1):
            city, country = STUDENT_CITIES[i % len(STUDENT_CITIES)]
            data = {
                'headline': rng.choice([
                    'طالب هندسة برمجيات', 'طالبة تحليل بيانات', 'طالب تصميم واجهات',
                    'طالب أمن سيبراني', 'طالبة تطوير تطبيقات', 'طالب تطوير ويب',
                ]),
                'bio': 'طالب شغوف بالتعلّم العملي، أوثّق رحلتي عبر الشهادات والمشاريع اليومية.',
                'city': city, 'country': country,
                'education_stage': rng.choice(['bachelor', 'diploma', 'graduate']),
                'school': rng.choice(schools),
                'grade': rng.choice(['السنة الأولى', 'السنة الثانية', 'السنة الثالثة', 'خرّيج']),
                'learning_goals': 'إتقان المهارات التقنية وبناء بورتفوليو قوي للالتحاق بسوق العمل.',
                'skills': rng.sample([
                    ('JavaScript', 70), ('Python', 68), ('React', 65), ('Figma', 72),
                    ('SQL', 60), ('Flutter', 64), ('HTML & CSS', 78), ('Git & GitHub', 66),
                ], k=4),
                'languages': [('العربية', 'native'), ('الإنجليزية', rng.choice(['fluent', 'conversational']))],
                'interests': rng.sample(['تطوير الويب', 'البيانات', 'التصميم', 'التطبيقات', 'التعلّم الذاتي'], k=2),
            }
            user, created = User.objects.get_or_create(
                phone=self._student_phone(i),
                defaults={
                    'full_name': full_name, 'handle': handle,
                    'role': UserRole.STUDENT, 'is_verified': (i % 3 == 0),
                    'email': f'{handle}@example.com',
                },
            )
            if created:
                user.set_password(PASSWORD)
                user.save()
            self._apply_profile(user, data, rng)
            students.append(user)
        return students

    # ------------------------------------------------------------------
    def _create_trainer_projects(self, trainers, rng):
        all_tags = {name: ProjectTag.objects.get_or_create(name=name)[0] for name in PROJECT_TAGS}
        count = 0
        for data in TRAINER_PROJECTS:
            owner = trainers[data['trainer']]
            if Project.objects.filter(owner=owner, title=data['title']).exists():
                continue
            proj = Project.objects.create(
                owner=owner, title=data['title'], summary=data['summary'],
                content=f'<p>{data["summary"]}</p><p>مشروع احترافي من إعداد {owner.display_name} ضمن أعماله التدريبية والتطويرية.</p>',
                category=data['category'], role=data['role'],
                project_date=date.today() - timedelta(days=rng.randint(30, 500)),
                status=ProjectStatus.PUBLISHED,
                visibility=ProjectVisibility.PUBLIC,
                views=rng.randint(200, 2500), likes=rng.randint(30, 400),
            )
            proj.cover.save(f'showcase-trainer-project-{proj.pk}.svg',
                            ContentFile(_cover_svg(data['title'], count)), save=True)
            proj.tags.set([all_tags[t] for t in data['tags'] if t in all_tags])
            count += 1
        if count:
            self.stdout.write(f'أُنشئ {count} مشروعاً منشوراً للمدرّبين.')

    # ------------------------------------------------------------------
    def _create_certificates_and_projects(self, students, courses, rng):
        all_tags = {name: ProjectTag.objects.get_or_create(name=name)[0] for name in PROJECT_TAGS}
        for i, student in enumerate(students):
            urng = random.Random(1000 + i)
            chosen = urng.sample(courses, k=urng.randint(1, 3))
            for course in chosen:
                certificate, created = CourseCertificate.objects.get_or_create(
                    student=student, course=course)
                if created:
                    lesson_ids = list(
                        Lesson.objects.filter(section__course=course).values_list('id', flat=True))
                    CourseProgress.objects.get_or_create(
                        student=student, course=course,
                        defaults={'completed_ids': lesson_ids, 'completed': True})

            ideas = urng.sample(PROJECT_IDEAS, k=urng.randint(1, 2))
            for j, (title, summary) in enumerate(ideas):
                if Project.objects.filter(owner=student, title=title).exists():
                    continue
                proj = Project.objects.create(
                    owner=student, title=title, summary=summary,
                    content=f'<p>{summary}</p><p>مشروع طُوّر كجزء من رحلة التعلّم، مع التركيز على جودة الكود وتجربة المستخدم.</p>',
                    category=urng.choice(['ويب', 'بيانات', 'تصميم', 'تطبيقات']),
                    role=urng.choice(['مطوّر', 'مصمّم', 'محلّل بيانات', 'مطوّر واجهات']),
                    project_date=date.today() - timedelta(days=urng.randint(20, 400)),
                    status=ProjectStatus.PUBLISHED,
                    visibility=ProjectVisibility.PUBLIC,
                    views=urng.randint(40, 900), likes=urng.randint(5, 220),
                )
                proj.cover.save(f'showcase-project-{proj.pk}.svg',
                                ContentFile(_cover_svg(title, i + j)), save=True)
                proj.tags.set(urng.sample(list(all_tags.values()), k=urng.randint(1, 3)))

        self.stdout.write(f'أُنشئت الشهادات والمشاريع لـ {len(students)} طالباً.')

    # ------------------------------------------------------------------
    def _create_posts(self, users, rng):
        all_tags = {name: PostTag.objects.get_or_create(name=name)[0] for name in POST_TAGS}
        total = 0
        for i, user in enumerate(users):
            urng = random.Random(7000 + i)
            for j in range(3):
                content = POST_IDEAS[(i * 3 + j) % len(POST_IDEAS)]
                if Post.objects.filter(owner=user, content=content).exists():
                    continue
                post = Post.objects.create(
                    owner=user, content=content,
                    status=PostStatus.PUBLISHED,
                    likes=urng.randint(3, 160), saves=urng.randint(0, 40), shares=urng.randint(0, 15),
                )
                post.tags.set(urng.sample(list(all_tags.values()), k=urng.randint(1, 2)))
                total += 1
        self.stdout.write(f'أُنشئ {total} منشوراً.')
