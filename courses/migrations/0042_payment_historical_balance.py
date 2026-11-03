from django.db import migrations, models


def mark_existing_payments_as_historical_balances(apps, schema_editor):
    database = schema_editor.connection.alias
    for model_name in ('CourseRegistrationPayment', 'OnlineCourseInvoicePayment'):
        Payment = apps.get_model('courses', model_name)
        Payment.objects.using(database).all().update(is_historical_balance=True)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0041_courseregistrationrequest_course_price_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='courseregistrationpayment',
            name='is_historical_balance',
            field=models.BooleanField(
                default=False,
                verbose_name='رصيد تاريخي دون تفاصيل دفعة موثوقة',
            ),
        ),
        migrations.AddField(
            model_name='onlinecourseinvoicepayment',
            name='is_historical_balance',
            field=models.BooleanField(
                default=False,
                verbose_name='رصيد تاريخي دون تفاصيل دفعة موثوقة',
            ),
        ),
        migrations.RunPython(
            mark_existing_payments_as_historical_balances,
            migrations.RunPython.noop,
        ),
    ]
