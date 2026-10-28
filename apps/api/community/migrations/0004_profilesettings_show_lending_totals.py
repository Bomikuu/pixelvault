from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("community", "0003_review_recommendation")]

    operations = [
        migrations.AddField(
            model_name="profilesettings",
            name="show_lending_totals",
            field=models.BooleanField(default=False),
        ),
    ]
