from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_userrole_call_center'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='show_referral_stats',
            field=models.BooleanField(default=False, verbose_name='إظهار إحصاءات الإحالة'),
        ),
    ]
