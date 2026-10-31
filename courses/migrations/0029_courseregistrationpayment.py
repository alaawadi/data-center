from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


def migrate_existing_paid_amounts(apps, schema_editor):
    Registration = apps.get_model('courses', 'CourseRegistrationRequest')
    Payment = apps.get_model('courses', 'CourseRegistrationPayment')
    database = schema_editor.connection.alias
    for registration in Registration.objects.using(database).exclude(
        paid_amount__isnull=True
    ).iterator():
        amount = Decimal(registration.paid_amount)
        if amount > 0:
            Payment.objects.using(database).create(
                registration_request_id=registration.pk,
                amount=amount,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0028_courseregistrationrequest_paid_amount'),
    ]

    operations = [
        migrations.CreateModel(
            name='CourseRegistrationPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='المبلغ')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الدفعة')),
                ('registration_request', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payments',
                    to='courses.courseregistrationrequest',
                    verbose_name='طلب التسجيل',
                )),
            ],
            options={
                'verbose_name': 'دفعة تسجيل دورة',
                'verbose_name_plural': 'دفعات تسجيل الدورات',
                'ordering': ['created_at', 'pk'],
            },
        ),
        migrations.RunPython(migrate_existing_paid_amounts, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='courseregistrationrequest',
            name='paid_amount',
        ),
    ]
