from django.db import migrations


FREELANCER_CATEGORY_NAMES = (
    'مصمم',
    'مبرمج',
    'مسوق',
    'كاتب محتوى',
    'مترجم',
    'مصور',
    'مونتاج',
    'محاسب',
    'تخصص طبي',
    'مهندس',
    'محامي',
)


def create_freelancer_categories(apps, schema_editor):
    FreelancerCategory = apps.get_model('users', 'FreelancerCategory')
    manager = FreelancerCategory.objects.using(schema_editor.connection.alias)
    next_order = (
        manager.order_by('-display_order')
        .values_list('display_order', flat=True)
        .first()
        or 0
    )

    for offset, name in enumerate(FREELANCER_CATEGORY_NAMES, start=1):
        manager.get_or_create(
            name=name,
            defaults={
                'is_active': True,
                'display_order': next_order + offset,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0015_default_student_category'),
    ]

    operations = [
        migrations.RunPython(
            create_freelancer_categories,
            migrations.RunPython.noop,
        ),
    ]
