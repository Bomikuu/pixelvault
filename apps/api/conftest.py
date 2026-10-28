import pytest


@pytest.fixture(autouse=True)
def isolated_private_media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "private-media"
