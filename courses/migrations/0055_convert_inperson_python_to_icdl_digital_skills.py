from django.db import migrations


CATEGORY_NAME = 'المهارات الرقمية المكتبية'
COURSE_CONTENT = {
    'title': 'مهارات الحاسوب وتطبيقات المكتب (ICDL)',
    'title_en': 'ICDL Digital Skills & Office Applications',
    'category': CATEGORY_NAME,
    'summary': (
        'طوّر مهاراتك الرقمية بالتطبيق العملي على إدارة الملفات، إعداد '
        'المستندات والجداول والعروض، واستخدام الإنترنت والبريد بأمان وثقة.'
    ),
    'content': (
        '<p>اجعل الحاسوب أداة عملية لإنجاز الدراسة والعمل. في هذه الدورة '
        'الوجاهية، تتدرّب خطوةً خطوة على المهارات الرقمية الأساسية وتطبيقات '
        'المكتب، من تنظيم الملفات إلى إعداد مستند وجداول بيانات وعرض تقديمي '
        'بأسلوب واضح ومنظم.</p>'
        '<h3>ماذا ستتعلّم؟</h3>'
        '<ul>'
        '<li>التعامل مع الحاسوب وإدارة الملفات والمجلدات وحفظها وتنظيمها والعثور عليها.</li>'
        '<li>إنشاء المستندات وتنسيق النصوص والفقرات والجداول وتجهيزها للطباعة أو المشاركة.</li>'
        '<li>إعداد جداول البيانات، وإدخال البيانات وفرزها، واستخدام صيغ ودوال أساسية وإنشاء مخططات مناسبة.</li>'
        '<li>تصميم عروض تقديمية مرتبة، واستخدام التخطيطات والصور والعناصر البصرية لشرح الأفكار.</li>'
        '<li>البحث الفعّال على الإنترنت، واستخدام البريد الإلكتروني وإدارة المرفقات والتواصل باحتراف.</li>'
        '<li>اتباع ممارسات السلامة الرقمية، وحماية الحسابات والبيانات، وتمييز الروابط والرسائل المشبوهة.</li>'
        '<li>اختيار التطبيق المناسب للمهمة وتجميع المهارات في تمارين تحاكي احتياجات الدراسة والعمل.</li>'
        '</ul>'
        '<h3>تطبيقات عملية قابلة للاستخدام</h3>'
        '<p>تطبّق المهارات على مهام واقعية مثل إعداد مستند منسق، وتنظيم '
        'ميزانية أو سجل بيانات في جدول، وبناء عرض موجز، وإرسال الملفات '
        'ومشاركتها بطريقة مناسبة. تساعدك الممارسة والتغذية الراجعة على إنجاز '
        'المهام الرقمية اليومية بدقة واستقلالية أكبر.</p>'
        '<p>تتناول الدورة مهارات رقمية وتطبيقات مكتبية متوافقة مع المحاور '
        'التأسيسية المعروفة باسم ICDL. وهي دورة تدريبية تعليمية؛ لا تمثل '
        'اختبارًا رسميًا ولا تمنح شهادة ICDL معتمدة أو ضمانًا لاجتيازها، '
        'إلا إذا أعلن مركز اختبار معتمد ذلك صراحةً. قد تختلف أسماء القوائم '
        'والخصائص بحسب البرنامج والإصدار المستخدم في التدريب.</p>'
    ),
    'skills': [
        'المهارات الرقمية الأساسية',
        'إدارة الملفات والمجلدات',
        'معالجة النصوص والمستندات',
        'جداول البيانات والصيغ الأساسية',
        'العروض التقديمية',
        'الإنترنت والبريد الإلكتروني',
        'السلامة والأمن الرقمي',
    ],
    'cover': 'courses/covers/2026/11/icdl-digital-skills-course.jpg',
}


def convert_python_course_to_icdl(apps, schema_editor):
    database = schema_editor.connection.alias
    TrainingCategory = apps.get_model('courses', 'TrainingCategory')
    category, _ = TrainingCategory.objects.using(database).get_or_create(
        name=CATEGORY_NAME,
        defaults={
            'display_order': (
                TrainingCategory.objects.using(database)
                .order_by('-display_order')
                .values_list('display_order', flat=True)
                .first() or 0
            ) + 1,
        },
    )
    if not category.is_active:
        TrainingCategory.objects.using(database).filter(pk=category.pk).update(is_active=True)

    Course = apps.get_model('courses', 'Course')
    Course.objects.using(database).filter(
        slug='inperson-visual-identity',
        course_type='in_person',
    ).update(**COURSE_CONTENT)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0054_convert_inperson_video_course_to_aseel_accounting'),
    ]

    operations = [
        migrations.RunPython(
            convert_python_course_to_icdl,
            migrations.RunPython.noop,
        ),
    ]
