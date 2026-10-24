from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_project_source_lesson'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='visibility',
            field=models.CharField(
                choices=[('public', 'عام'), ('courses', 'مخصّص للدورات')],
                default='public',
                max_length=16,
                verbose_name='الظهور',
            ),
        ),
    ]
