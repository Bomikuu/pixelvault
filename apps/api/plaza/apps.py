from django.apps import AppConfig


class PlazaConfig(AppConfig):
    name = "plaza"

    def ready(self):
        from . import signals  # noqa: F401
