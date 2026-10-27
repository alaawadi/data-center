from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0016_course_version_history'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='display_order',
            field=models.PositiveIntegerField(
                blank=True,
                db_index=True,
                null=True,
                verbose_name='ترتيب العرض',
            ),
        ),
    ]
