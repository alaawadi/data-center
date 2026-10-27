from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0017_course_display_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='is_coming_soon',
            field=models.BooleanField(default=False, verbose_name='متاحة قريبًا'),
        ),
    ]
