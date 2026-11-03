from django.db import migrations


DEFAULT_CATEGORY_NAME = 'طالب'


def ensure_default_student_category(apps, schema_editor):
    FreelancerCategory = apps.get_model('users', 'FreelancerCategory')
    FreelancerCategory.objects.using(schema_editor.connection.alias).update_or_create(
        name=DEFAULT_CATEGORY_NAME,
        defaults={'is_active': True},
    )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0014_freelancercategory'),
    ]

    operations = [
        migrations.RunPython(
            ensure_default_student_category,
            migrations.RunPython.noop,
        ),
    ]
