from django.db import migrations, models


def seed_freelancer_categories(apps, schema_editor):
    Profile = apps.get_model('users', 'Profile')
    FreelancerCategory = apps.get_model('users', 'FreelancerCategory')
    database = schema_editor.connection.alias
    names = (
        Profile.objects.using(database)
        .exclude(specialization='')
        .values_list('specialization', flat=True)
        .distinct()
    )
    categories = [
        FreelancerCategory(name=name, display_order=index)
        for index, name in enumerate(sorted(set(names), key=str.casefold))
        if name and len(name) <= 120
    ]
    FreelancerCategory.objects.using(database).bulk_create(categories)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0037_trainingcategory_is_active'),
        ('users', '0013_profile_show_referral_stats'),
    ]

    operations = [
        migrations.CreateModel(
            name='FreelancerCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120, unique=True, verbose_name='فئة المستقل')),
                ('is_active', models.BooleanField(default=True, verbose_name='نشطة')),
                ('display_order', models.PositiveIntegerField(blank=True, db_index=True, null=True, verbose_name='ترتيب العرض')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='أُنشئت في')),
            ],
            options={
                'verbose_name': 'فئة مستقل',
                'verbose_name_plural': 'فئات المستقلين',
                'ordering': ['display_order', 'name'],
            },
        ),
        migrations.RunPython(seed_freelancer_categories, migrations.RunPython.noop),
    ]
