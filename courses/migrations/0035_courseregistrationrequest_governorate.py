from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0034_alter_courseregistrationrequest_student_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='courseregistrationrequest',
            name='governorate',
            field=models.CharField(
                blank=True,
                choices=[('gaza', 'غزة'), ('central', 'الوسطى')],
                default='',
                max_length=16,
                verbose_name='المحافظة',
            ),
        ),
    ]
