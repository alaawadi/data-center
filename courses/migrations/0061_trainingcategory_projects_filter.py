from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0060_set_vibe_coding_course_online'),
    ]

    operations = [
        migrations.AddField(
            model_name='trainingcategory',
            name='show_in_projects_filter',
            field=models.BooleanField(default=True, verbose_name='يظهر في فلتر المشاريع'),
        ),
    ]
