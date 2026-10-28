from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0003_contacts_and_profile_photo")]
    operations = [
        migrations.AddField(
            model_name="member",
            name="last_active_at",
            field=models.DateTimeField(blank=True, editable=False, null=True),
        )
    ]
