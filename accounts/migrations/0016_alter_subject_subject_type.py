from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_alter_subject_subject_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='subject',
            name='subject_type',
            field=models.CharField(
                choices=[('THEORY', 'Theory'), ('THEORY_CUM_PRACTICAL', 'Theory Cum Practical'), ('PROFESSIONAL_ELECTIVE', 'Professional Elective'), ('OPEN_ELECTIVE', 'Open Elective')],
                default='THEORY',
                max_length=30
            ),
        ),
    ]
