from django.db import migrations


COURSE_TITLE_TRANSLATIONS = {
    'دورة برمجة المواقع FrontEnd': 'Front-End Website Development',
    'دورة اختبار إكمال الدروس': 'Lesson Completion Test Course',
    'أساسيات تطوير الواجهات الأمامية': 'Front-End Development Fundamentals',
    'React لبناء تطبيقات الويب الحديثة': 'Building Modern Web Applications with React',
    'تحليل البيانات باستخدام Python': 'Data Analysis with Python',
    'SQL وقواعد البيانات العلائقية': 'SQL and Relational Databases',
    'تصميم تجربة المستخدم — المستوى الأول': 'User Experience Design — Level One',
    'أنظمة التصميم في Figma': 'Design Systems in Figma',
    'تطوير تطبيقات الجوال بـ Flutter': 'Mobile App Development with Flutter',
    'أمن التطبيقات وأساسيات الحماية': 'Application Security and Protection Fundamentals',
    'لوحات المعلومات وتمثيل البيانات': 'Dashboards and Data Visualization',
    'TypeScript للمطورين': 'TypeScript for Developers',
    'دورة بدون عنوان': 'Untitled Course',
    'فقثفقثف': 'Course title requires review',
    'قثفقث فثقفقصثف': 'Course title requires review',
}


def translate_existing_course_titles(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    database = schema_editor.connection.alias
    for arabic_title, english_title in COURSE_TITLE_TRANSLATIONS.items():
        Course.objects.using(database).filter(
            title=arabic_title,
            title_en='',
        ).update(title_en=english_title)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0014_inpersonworkshop_description_en_and_more'),
    ]

    operations = [
        migrations.RunPython(
            translate_existing_course_titles,
            migrations.RunPython.noop,
        ),
    ]
