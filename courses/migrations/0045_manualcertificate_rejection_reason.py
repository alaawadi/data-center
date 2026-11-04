from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0044_alter_courseregistrationrequest_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='manualcertificate',
            name='rejection_reason',
            field=models.TextField(blank=True, verbose_name='سبب الرفض'),
        ),
    ]
