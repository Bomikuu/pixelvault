"""Authored release coverage; not executed under the visual-only task policy."""

import pytest
from plaza.serializers import TargetInput


@pytest.mark.parametrize("value", [[], [{"x": 1}], None, "point", 1])
def test_nested_target_requires_an_object(value):
    serializer = TargetInput(data=value)
    assert not serializer.is_valid()
    assert serializer.errors


def test_target_rejects_unknown_fields():
    serializer = TargetInput(data={"x": 1, "y": 2, "speed": 999})
    assert not serializer.is_valid()
    assert "speed" in serializer.errors
