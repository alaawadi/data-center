from django.db import migrations


COURSE_SLUG = 'vibe-coding-ai-assisted-development-alaa-wadi'


def set_course_online(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    Course.objects.using(schema_editor.connection.alias).filter(
        slug=COURSE_SLUG,
    ).update(course_type='online')


def set_course_in_person(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    Course.objects.using(schema_editor.connection.alias).filter(
        slug=COURSE_SLUG,
    ).update(course_type='in_person')


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0059_add_online_registration_governorate'),
    ]

    operations = [
        migrations.RunPython(set_course_online, set_course_in_person),
    ]