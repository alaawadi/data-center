from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0033_courseregistrationrequest_study_year_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='courseregistrationrequest',
            name='student_status',
            field=models.CharField(
                blank=True,
                choices=[('student', 'طالب'), ('graduate', 'خريج')],
                default='',
                max_length=16,
                verbose_name='الحالة الدراسية',
            ),
        ),
    ]
