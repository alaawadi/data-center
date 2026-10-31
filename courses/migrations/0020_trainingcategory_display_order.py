from django.db import migrations, models


def backfill_training_category_display_order(apps, schema_editor):
    TrainingCategory = apps.get_model('courses', 'TrainingCategory')
    categories = list(TrainingCategory.objects.order_by('name'))
    for index, category in enumerate(categories):
        category.display_order = index
    TrainingCategory.objects.bulk_update(categories, ['display_order'])


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0019_trainingcategory'),
    ]

    operations = [
        migrations.AddField(
            model_name='trainingcategory',
            name='display_order',
            field=models.PositiveIntegerField(blank=True, db_index=True, null=True, verbose_name='ترتيب العرض'),
        ),
        migrations.RunPython(
            backfill_training_category_display_order,
            migrations.RunPython.noop,
        ),
    ]
