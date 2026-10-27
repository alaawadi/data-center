from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0005_projectfile_downloads_alter_project_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='display_order',
            field=models.PositiveIntegerField(
                blank=True,
                db_index=True,
                null=True,
                verbose_name='ترتيب العرض',
            ),
        ),
    ]
