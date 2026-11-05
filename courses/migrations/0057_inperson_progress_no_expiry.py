from django.db import migrations


def clear_inperson_progress_expiry(apps, schema_editor):
    CourseProgress = apps.get_model('courses', 'CourseProgress')
    database = schema_editor.connection.alias
    CourseProgress.objects.using(database).filter(
        course__course_type='in_person',
    ).exclude(
        expires_at__isnull=True,
    ).update(expires_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0056_refresh_inperson_meta_ads_campaign'),
    ]

    operations = [
        migrations.RunPython(
            clear_inperson_progress_expiry,
            migrations.RunPython.noop,
        ),
    ]
