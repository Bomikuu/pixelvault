from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser


class ObjectJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        value = super().parse(stream, media_type, parser_context)
        if not isinstance(value, dict):
            raise ParseError(
                {"code": "INVALID_BODY", "message": "Send a JSON object for this operation."}
            )
        return value
