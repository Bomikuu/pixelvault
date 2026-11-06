import math
from collections.abc import Mapping
from rest_framework import serializers


class StrictInput(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, Mapping):
            raise serializers.ValidationError("Send an object with named fields.")
        extra = set(data) - set(self.fields)
        if extra:
            raise serializers.ValidationError({key: "This field is not accepted." for key in extra})
        return super().to_internal_value(data)


class JoinInput(StrictInput):
    instance_id = serializers.UUIDField()
    operation_id = serializers.UUIDField()


class TargetInput(StrictInput):
    x = serializers.FloatField(min_value=0, max_value=1000)
    y = serializers.FloatField(min_value=0, max_value=700)

    def validate(self, data):
        if not all(math.isfinite(v) for v in data.values()):
            raise serializers.ValidationError("Choose a finite point inside the room.")
        return data


class CommandInput(StrictInput):
    instance_id = serializers.UUIDField()
    lease = serializers.CharField(max_length=128)
    action = serializers.ChoiceField(choices=("heartbeat", "move", "stop", "bubble", "clear_bubble", "leave"))
    sequence = serializers.IntegerField(min_value=1, max_value=2147483647, required=False)
    target = TargetInput(required=False)
    body = serializers.CharField(max_length=240, required=False, trim_whitespace=False)
    offer_id = serializers.UUIDField(required=False, allow_null=True)
    operation_id = serializers.UUIDField(required=False)

    def validate(self, data):
        fields = {"move": {"sequence", "target"}, "stop": {"sequence"}, "bubble": {"body", "operation_id", "offer_id"}}.get(data["action"], set())
        required = fields - {"offer_id"}
        missing = required - set(data)
        extra = set(data) - {"instance_id", "lease", "action"} - fields
        if missing or extra:
            raise serializers.ValidationError({key: "Required for this command." for key in missing} | {key: "Not accepted for this command." for key in extra})
        return data


class ReportInput(StrictInput):
    reason = serializers.CharField(max_length=2000)


class DecisionInput(ReportInput):
    expected_version = serializers.IntegerField(min_value=1)
    decision = serializers.ChoiceField(choices=("remove", "keep"))
