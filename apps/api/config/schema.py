from drf_spectacular.openapi import AutoSchema

JSON_VALUE = {
    "oneOf": [
        {"type": "object", "additionalProperties": True},
        {"type": "array", "items": {"type": "object", "additionalProperties": True}},
    ]
}


class PixelVaultSchema(AutoSchema):
    """Document hand-written APIViews without pretending unknown JSON fields are typed.

    Domain DTOs are maintained in the client contracts and checked by API integration
    tests. Endpoints with serializers keep their explicit schemas.
    """

    def get_request_serializer(self):
        if hasattr(self.view, "serializer_class"):
            return super().get_request_serializer()
        if self.view.__class__.__name__ == "UploadView":
            return {
                "multipart/form-data": {
                    "type": "object",
                    "properties": {
                        "file": {"type": "string", "format": "binary"},
                        "purpose": {
                            "type": "string",
                            "enum": [
                                "identity",
                                "income",
                                "address",
                                "funding_account",
                                "registration",
                            ],
                        },
                    },
                    "required": ["file", "purpose"],
                }
            }
        return {"application/json": {"type": "object", "additionalProperties": True}}

    def get_response_serializers(self):
        if hasattr(self.view, "serializer_class"):
            return super().get_response_serializers()
        if self.view.__class__.__name__ in {
            "ContentView",
            "AgreementDocumentView",
            "ExportDownloadView",
        }:
            return {200: {"type": "string", "format": "binary"}}
        return {200: JSON_VALUE}

    def get_operation_id(self):
        # Path parameters remain in the identity, so collection/detail IDs cannot collide.
        import re

        return self.method.lower() + "_" + re.sub(r"[^a-zA-Z0-9]+", "_", self.path).strip("_")
