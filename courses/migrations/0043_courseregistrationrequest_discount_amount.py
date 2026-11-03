from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0042_payment_historical_balance'),
    ]

    operations = [
        migrations.AddField(
            model_name='courseregistrationrequest',
            name='discount_amount',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.00'),
                max_digits=10,
                verbose_name='قيمة الخصم',
            ),
        ),
    ]
