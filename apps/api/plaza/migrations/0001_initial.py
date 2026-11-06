import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL), ("marketplace", "0001_initial")]
    operations = [migrations.CreateModel(name="Bubble", fields=[
        ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
        ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
        ("room_slug", models.CharField(max_length=40)), ("body", models.CharField(max_length=120)),
        ("operation_id", models.UUIDField()), ("fingerprint", models.CharField(max_length=64)),
        ("visible_until", models.DateTimeField()), ("status", models.CharField(default="visible", max_length=16)),
        ("version", models.PositiveIntegerField(default=1)),
        ("author", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
        ("offer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="marketplace.lendingoffer")),
    ], options={"indexes": [models.Index(fields=["room_slug", "status", "visible_until"], name="plaza_bubble_visibility")],
        "constraints": [models.UniqueConstraint(fields=("author", "operation_id"), name="plaza_bubble_operation")]})]
