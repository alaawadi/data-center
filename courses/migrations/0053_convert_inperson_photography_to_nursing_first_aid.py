from django.db import migrations


CATEGORY_NAME = 'التمريض والإسعافات الأولية'
COVER_NAME = 'courses/covers/2026/11/nursing-first-aid-course.jpg'
COURSE_CONTENT = {
    'title': 'مهارات التمريض الأساسية والإسعافات الأولية',
    'title_en': 'Nursing Fundamentals & First Aid Essentials',
    'category': CATEGORY_NAME,
    'summary': (
        'اكتسب أساسيات الرعاية الآمنة والتواصل مع المريض، وتعرّف على مبادئ '
        'الإسعافات الأولية والاستجابة للطوارئ من خلال تدريب وجاهي تطبيقي.'
    ),
    'content': (
        '<p>تعلّم أساسيات الرعاية الصحية الأولية في تدريب وجاهي يجمع بين '
        'المعرفة والتطبيق المنضبط. تتعرّف على مبادئ السلامة ومكافحة العدوى '
        'والتواصل الإنساني مع المريض، وتتمرّن على مواقف تعليمية تساعدك على '
        'التصرف بهدوء وطلب المساندة المناسبة عند الحاجة.</p>'
        '<h3>ماذا ستتعلّم؟</h3>'
        '<ul>'
        '<li>مبادئ نظافة اليدين والوقاية من العدوى والاستخدام الآمن لمعدات الحماية.</li>'
        '<li>أساسيات التواصل باحترام مع المريض ومراعاة الخصوصية والكرامة.</li>'
        '<li>التعرّف إلى بعض المؤشرات الحيوية وطرق ملاحظتها وتسجيلها ضمن حدود التدريب.</li>'
        '<li>ملاحظة علامات الخطر، وتقييم سلامة المكان، وطلب خدمات الطوارئ والمساعدة المختصة.</li>'
        '<li>مبادئ الاستجابة الأولية لحالات شائعة مثل النزيف والحروق والاختناق، ضمن تدريب وإشراف مناسبين.</li>'
        '<li>التعرّف إلى الإنعاش القلبي الرئوي ومزيل الرجفان الآلي من خلال شرح وتدريب عملي يقدمه مدرب مؤهل وفق إرشادات حديثة.</li>'
        '<li>التعامل مع السيناريوهات التدريبية، وإيصال الملاحظات المهمة بوضوح إلى الفريق المختص.</li>'
        '</ul>'
        '<h3>تعلّم بالممارسة والمسؤولية</h3>'
        '<p>تدعمك الأنشطة والمحاكاة على فهم خطوات الاستجابة، والتواصل الفعّال، '
        'والتمييز بين ما يمكن فعله ضمن حدود المعرفة وما يتطلب تدخل مختص. '
        'ويركّز التدريب على السلامة واتباع توجيهات المدرب والجهات الصحية '
        'المعتمدة، لا على تشخيص الحالات أو تقديم علاج مستقل.</p>'
        '<p>الدورة تعليمية تأسيسية، ولا تُعدّ مؤهلاً لمزاولة مهنة التمريض، '
        'ولا تمنح ترخيصاً أو شهادة مهنية معتمدة ما لم يُذكر ذلك صراحة من '
        'الجهة المنظمة. اتصل بخدمات الطوارئ المحلية فوراً عند وقوع حالة طارئة.</p>'
    ),
    'skills': [
        'أساسيات الرعاية الآمنة',
        'الوقاية من العدوى',
        'التواصل مع المريض',
        'مبادئ الإسعافات الأولية',
        'التعرّف إلى مؤشرات الخطر',
        'التعرّف إلى CPR وAED',
        'التواصل وطلب المساعدة',
    ],
    'cover': COVER_NAME,
}


def convert_photography_course(apps, schema_editor):
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
        slug='inperson-photography-video',
        course_type='in_person',
    ).update(**COURSE_CONTENT)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0052_add_python_course_cover'),
    ]

    operations = [
        migrations.RunPython(
            convert_photography_course,
            migrations.RunPython.noop,
        ),
    ]
