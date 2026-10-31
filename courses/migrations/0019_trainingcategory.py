from django.db import migrations, models


def seed_training_categories(apps, schema_editor):
    database = schema_editor.connection.alias
    TrainingCategory = apps.get_model('courses', 'TrainingCategory')
    sources = (
        (apps.get_model('courses', 'Course'), 'category'),
        (apps.get_model('projects', 'Project'), 'category'),
        (apps.get_model('users', 'Profile'), 'specialization'),
    )
    existing_names = set(
        TrainingCategory.objects.using(database).values_list('name', flat=True)
    )
    for model, field_name in sources:
        names = (
            model.objects.using(database)
            .exclude(**{field_name: ''})
            .values_list(field_name, flat=True)
            .distinct()
        )
        for value in names.iterator():
            name = (value or '').strip()
            if name and len(name) <= 120 and name not in existing_names:
                TrainingCategory.objects.using(database).create(name=name)
                existing_names.add(name)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0018_course_is_coming_soon'),
        ('projects', '0006_project_display_order'),
        ('users', '0009_profile_display_order'),
    ]

    operations = [
        migrations.CreateModel(
            name='TrainingCategory',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('name', models.CharField(max_length=120, unique=True, verbose_name='المجال التدريبي')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='أُنشئ في')),
            ],
            options={
                'verbose_name': 'مجال تدريبي',
                'verbose_name_plural': 'المجالات التدريبية',
                'ordering': ['name'],
            },
        ),
        migrations.RunPython(seed_training_categories, migrations.RunPython.noop),
    ]
