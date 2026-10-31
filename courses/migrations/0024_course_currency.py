from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0023_courseregistrationrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='currency',
            field=models.CharField(
                choices=[('ILS', 'شيكل'), ('USD', 'دولار')],
                default='ILS',
                max_length=3,
                verbose_name='العملة',
            ),
        ),
    ]
