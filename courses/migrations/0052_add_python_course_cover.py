from django.db import migrations


def add_python_course_cover(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    Course.objects.using(schema_editor.connection.alias).filter(
        slug='inperson-visual-identity',
        course_type='in_person',
    ).update(cover='courses/covers/2026/11/python-programming-course.jpg')


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0051_convert_inperson_canva_course_to_python'),
    ]

    operations = [
        migrations.RunPython(add_python_course_cover, migrations.RunPython.noop),
    ]
