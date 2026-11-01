from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0003_datacourse_source_course_datarecord_is_demo'),
    ]

    operations = [
        migrations.DeleteModel(name='DataCommunicationLog'),
        migrations.DeleteModel(name='DataRecord'),
        migrations.DeleteModel(name='DataUpload'),
        migrations.DeleteModel(name='DataEmployee'),
        migrations.DeleteModel(name='DataCourse'),
        migrations.DeleteModel(name='DataCampaign'),
    ]
