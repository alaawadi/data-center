from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0006_project_display_order'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='visibility',
            field=models.CharField(
                choices=[
                    ('public', 'عام'),
                    ('courses', 'مخصّص للدورات'),
                    ('personal', 'مشروع شخصي'),
                ],
                default='public',
                max_length=16,
                verbose_name='الظهور',
            ),
        ),
    ]
