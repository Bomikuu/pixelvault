from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("community", "0005_remove_thread_thread_single_context_and_more")]
    operations = [
        migrations.AddField(
            model_name="profilesettings",
            name="show_activity",
            field=models.BooleanField(default=False),
        )
    ]
