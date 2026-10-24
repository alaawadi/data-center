from django.db import migrations


def use_current_palette(apps, schema_editor):
    PlatformSettings = apps.get_model('core', 'PlatformSettings')
    settings_record = PlatformSettings.objects.using(schema_editor.connection.alias).filter(pk=1).first()
    if not settings_record or not isinstance(settings_record.data, dict):
        return

    data = settings_record.data.copy()
    if data.get('brandPalette') == 'ocean':
        data['brandPalette'] = 'current'
        PlatformSettings.objects.using(schema_editor.connection.alias).filter(pk=1).update(data=data)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_platformsettings'),
    ]

    operations = [
        migrations.RunPython(use_current_palette, migrations.RunPython.noop),
    ]
