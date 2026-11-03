from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0038_trainer_inperson_profile_only'),
    ]

    operations = [
        migrations.CreateModel(
            name='OnlineCourseInvoice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('course_price', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='سعر الدورة وقت إصدار الفاتورة')),
                ('discount_type', models.CharField(
                    choices=[('fixed', 'مبلغ ثابت'), ('percentage', 'نسبة مئوية')],
                    default='fixed',
                    max_length=12,
                    verbose_name='نوع الخصم',
                )),
                ('discount_value', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='قيمة الخصم')),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='قيمة الاشتراك بعد الخصم')),
                ('currency', models.CharField(
                    choices=[('ILS', 'شيكل'), ('USD', 'دولار')],
                    default='ILS',
                    max_length=3,
                    verbose_name='العملة',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاريخ إصدار الفاتورة')),
                ('progress', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='online_invoice',
                    to='courses.courseprogress',
                    verbose_name='تسجيل الدورة',
                )),
            ],
            options={
                'verbose_name': 'فاتورة دورة أونلاين',
                'verbose_name_plural': 'فواتير الدورات الأونلاين',
                'ordering': ['-created_at', '-pk'],
            },
        ),
        migrations.CreateModel(
            name='OnlineCourseInvoicePayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='المبلغ')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الدفعة')),
                ('invoice', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payments',
                    to='courses.onlinecourseinvoice',
                    verbose_name='الفاتورة',
                )),
            ],
            options={
                'verbose_name': 'دفعة فاتورة دورة أونلاين',
                'verbose_name_plural': 'دفعات فواتير الدورات الأونلاين',
                'ordering': ['created_at', 'pk'],
            },
        ),
    ]
