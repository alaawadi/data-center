import calendar

from django.db import migrations, models


def add_two_months(value):
    month_index = value.month - 1 + 2
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def backfill_online_subscription_expiry(apps, schema_editor):
    CourseProgress = apps.get_model('courses', 'CourseProgress')
    database = schema_editor.connection.alias
    online_progress = CourseProgress.objects.using(database).filter(
        course__course_type='online',
    ).select_related('course')
    for progress in online_progress.iterator():
        CourseProgress.objects.using(database).filter(pk=progress.pk).update(
            expires_at=add_two_months(progress.created_at),
        )


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0039_onlinecourseinvoice'),
    ]

    operations = [
        migrations.AddField(
            model_name='courseprogress',
            name='expires_at',
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                null=True,
                verbose_name='ينتهي الاشتراك في',
            ),
        ),
        migrations.RunPython(
            backfill_online_subscription_expiry,
            migrations.RunPython.noop,
        ),
    ]
