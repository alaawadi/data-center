import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0029_courseregistrationpayment'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='studentpointtransaction',
            name='reset_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='student_point_resets',
                to=settings.AUTH_USER_MODEL,
                verbose_name='صفّر النقاط بواسطة',
            ),
        ),
    ]
