from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_subject_accepted_classes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='subject',
            name='subject_type',
            field=models.CharField(
                choices=[('REGULAR', 'Regular'), ('OPEN_ELECTIVE', 'Open Elective'), ('PROFESSIONAL_ELECTIVE', 'Professional Elective')],
                default='REGULAR',
                max_length=30
            ),
        ),
    ]
