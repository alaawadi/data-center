from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0027_studentpointtransaction_registration_request_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='courseregistrationrequest',
            name='paid_amount',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
                verbose_name='المبلغ المدفوع',
            ),
        ),
    ]
