from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("negotiations", "0001_initial")]
    operations = [
        migrations.AddField(
            model_name="attendance", name="lobby_seen_at", field=models.DateTimeField(null=True)
        )
    ]
