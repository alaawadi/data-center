from django.db import migrations, models


INPERSON_COURSES = (
    {
        'slug': 'inperson-photography-video',
        'title': 'التصوير الفوتوغرافي وصناعة الفيديو',
        'title_en': 'Photography and Video Production',
        'category': 'تصميم',
        'summary': 'تعلّم أساسيات التصوير والإضاءة وتكوين الصورة، ثم طبّقها في إنتاج صور وفيديوهات احترافية.',
        'content': 'دورة عملية وجاهية في أساسيات الكاميرا، تكوين الصورة، الإضاءة، تصوير الفيديو، وإعداد المواد المصورة للنشر.',
        'price': '150',
        'duration': '21 ساعة',
        'period': '7 لقاءات',
        'skills': ['التصوير', 'الإضاءة', 'إنتاج الفيديو'],
    },
    {
        'slug': 'inperson-capcut-editing',
        'title': 'المونتاج وصناعة الفيديو باستخدام CapCut',
        'title_en': 'Video Editing with CapCut',
        'category': 'تصميم',
        'summary': 'أنشئ مقاطع قصيرة جذابة وتعلّم المونتاج، الانتقالات، النصوص، والصوت على CapCut.',
        'content': 'تدريب تطبيقي وجاهي على تنظيم اللقطات، المونتاج، تصحيح الألوان، إضافة النصوص والمؤثرات، وتصدير فيديوهات مناسبة لمنصات التواصل.',
        'price': '150',
        'duration': '21 ساعة',
        'period': '7 لقاءات',
        'skills': ['CapCut', 'المونتاج', 'صناعة المحتوى'],
    },
    {
        'slug': 'inperson-visual-identity',
        'title': 'تصميم الهوية البصرية باستخدام Canva',
        'title_en': 'Visual Identity Design with Canva',
        'category': 'تصميم',
        'summary': 'صمّم هوية متناسقة ومحتوى بصرياً للعلامات التجارية باستخدام أدوات Canva.',
        'content': 'دورة وجاهية تطبيقية تبدأ بمبادئ الألوان والخطوط وبناء الهوية البصرية، ثم تنتقل إلى تصميم منشورات وقوالب عملية باستخدام Canva.',
        'price': '120',
        'duration': '18 ساعة',
        'period': '6 لقاءات',
        'skills': ['Canva', 'الهوية البصرية', 'التصميم'],
    },
    {
        'slug': 'inperson-digital-marketing',
        'title': 'التسويق الرقمي وصناعة المحتوى',
        'title_en': 'Digital Marketing and Content Creation',
        'category': 'تسويق رقمي',
        'summary': 'خطّط لحملات رقمية عملية، وحدّد جمهورك، وأنشئ محتوى مناسباً لمنصات التواصل.',
        'content': 'تعلّم في لقاءات تطبيقية تحديد الجمهور والأهداف، إعداد خطة محتوى، كتابة الرسائل التسويقية، وقياس نتائج الحملات الرقمية.',
        'price': '150',
        'duration': '21 ساعة',
        'period': '7 لقاءات',
        'skills': ['التسويق الرقمي', 'كتابة المحتوى', 'تحليل الحملات'],
    },
    {
        'slug': 'inperson-trainer-tot',
        'title': 'إعداد مدرب محترف TOT',
        'title_en': 'Training of Trainers',
        'category': 'تدريب',
        'summary': 'اكتسب مهارات تصميم الحقائب التدريبية وإدارة الجلسات وتقديم المحتوى بثقة.',
        'content': 'برنامج وجاهي لإعداد المدربين يشمل تحليل الاحتياجات، تصميم الجلسات والأنشطة، مهارات العرض، إدارة النقاش، وتقييم أثر التدريب.',
        'price': '180',
        'duration': '24 ساعة',
        'period': '8 لقاءات',
        'skills': ['إعداد المدربين', 'تصميم التدريب', 'مهارات العرض'],
    },
    {
        'slug': 'inperson-ai-web-development',
        'title': 'برمجة المواقع بالذكاء الاصطناعي',
        'title_en': 'AI-Assisted Web Development',
        'category': 'برمجة',
        'summary': 'ابنِ صفحات ويب تفاعلية وتعلّم توظيف أدوات الذكاء الاصطناعي في تطويرها.',
        'content': 'تدريب وجاهي عملي على أساسيات HTML وCSS وJavaScript، بناء واجهات متجاوبة، واستخدام أدوات الذكاء الاصطناعي للمساعدة في التطوير وفحص النتائج.',
        'price': '200',
        'duration': '30 ساعة',
        'period': '10 لقاءات',
        'skills': ['HTML', 'CSS', 'JavaScript', 'الذكاء الاصطناعي'],
    },
)


def seed_inperson_courses(apps, schema_editor):
    database = schema_editor.connection.alias
    User = apps.get_model('users', 'User')
    Course = apps.get_model('courses', 'Course')
    TrainingCategory = apps.get_model('courses', 'TrainingCategory')
    trainer = (
        User.objects.using(database)
        .filter(role='trainer', is_active=True)
        .order_by('pk')
        .first()
    )
    if trainer is None:
        return

    for index, course_data in enumerate(INPERSON_COURSES):
        category = course_data['category']
        TrainingCategory.objects.using(database).get_or_create(name=category)
        Course.objects.using(database).get_or_create(
            slug=course_data['slug'],
            defaults={
                **course_data,
                'owner_id': trainer.pk,
                'status': 'published',
                'course_type': 'in_person',
                'display_order': index,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0020_trainingcategory_display_order'),
        ('users', '0009_profile_display_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='course_type',
            field=models.CharField(
                choices=[('online', 'أونلاين'), ('in_person', 'وجاهي')],
                default='online',
                max_length=16,
                verbose_name='نوع الدورة',
            ),
        ),
        migrations.RunPython(seed_inperson_courses, migrations.RunPython.noop),
    ]
