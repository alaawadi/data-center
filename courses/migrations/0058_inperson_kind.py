from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0057_inperson_progress_no_expiry'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='in_person_kind',
            field=models.CharField(
                choices=[('course', 'دورة وجاهية'), ('workshop', 'ورشة وجاهية')],
                default='course',
                max_length=16,
                verbose_name='نوع النشاط الوجاهي',
            ),
        ),
    ]
