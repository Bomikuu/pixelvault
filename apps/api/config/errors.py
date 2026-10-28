from rest_framework.exceptions import APIException


class DomainError(APIException):
    def __init__(self, code, message, status=400):
        self.status_code = status
        self.detail = {"code": code, "message": message}
