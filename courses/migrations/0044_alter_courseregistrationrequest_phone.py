from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0043_courseregistrationrequest_discount_amount'),
    ]

    operations = [
        migrations.AlterField(
            model_name='courseregistrationrequest',
            name='phone',
            field=models.CharField(max_length=16, verbose_name='الهاتف / واتساب'),
        ),
    ]
