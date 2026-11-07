from drf_spectacular.openapi import AutoSchema

class PixelVaultSchema(AutoSchema):
    """Document hand-written APIViews without pretending unknown JSON fields are typed.

    Explicit domain declarations generate the compatible client contracts. Runtime
    projection and permission verification remain separate release gates.
    """

    def get_request_serializer(self):
        from .schema_types import contract
        spec = contract(self.view, self.method)
        if spec and spec["request"] is not None:
            body = spec["request"]
            return body if any("/" in key for key in body) else {"application/json": body}
        if self.method in ("GET", "HEAD", "DELETE"):
            return None
        if hasattr(self.view, "serializer_class"):
            return super().get_request_serializer()
        if spec:
            return {"application/json": {"type":"object","maxProperties":0}}
        raise RuntimeError(f"Add an explicit API request contract for {self.view.__class__.__name__} {self.method}.")

    def get_response_serializers(self):
        from .schema_types import contract, ref
        spec = contract(self.view, self.method)
        if spec:
            return {
                **{(spec["status"], media): spec["response"] for media in (spec["media"] if isinstance(spec["media"], list) else [spec["media"]])},
                400: {"oneOf": [ref("DomainError"), ref("DetailError"), ref("FieldErrors")]},
                403: {"oneOf":[ref("DetailError"),ref("DomainError")]},
                404: {"oneOf": [ref("DomainError"), ref("DetailError")]},
                409: ref("DomainError"),
                429: {"oneOf":[ref("DetailError"),ref("DomainError")]},
                410: ref("DomainError"),
                503: ref("DomainError"),
            }
        raise RuntimeError(f"Add an explicit API response contract for {self.view.__class__.__name__} {self.method}.")

    def get_operation(self, *args, **kwargs):
        from .schema_types import contract
        result = super().get_operation(*args, **kwargs)
        if result is None:
            return result
        domain = self.view.__class__.__module__.split(".")[0]
        tags = {"accounts": "Authentication", "community": "Community", "marketplace": "Offers and applications", "agreements": "Agreements", "servicing": "Loans", "payments": "Payments", "negotiations": "Meetings", "investments": "Investments", "memberhub": "Member tools", "connections": "Co-borrower invitations", "verification": "Verification", "documents": "Documents", "reporting": "Analytics and exports", "cases": "Private support", "plaza": "Marketplace"}
        result["tags"] = ["Administration" if "/admin/" in self.path else tags.get(domain, domain.title())]
        spec = contract(self.view, self.method)
        result["x-contract-status"] = "typed" if spec and not spec["partial"] else "partial" if spec else "generic"
        if spec:
            result["summary"] = spec["summary"] or self.view.__class__.__name__.replace("View", "")
            result["description"] = spec["description"] or "Authorization and domain policy are checked on every request."
            if spec["partial"]:
                result["description"] += "\n\n**Partial contract:** additional variants or fields still require source review."
            result.setdefault("parameters", []).extend(spec["parameters"])
            result.setdefault("parameters", []).extend(spec.get("headers", []))
        else:
            result["summary"] = self.view.__class__.__name__.replace("View", "")
            result["description"] = "**Partial contract:** this operation is inventoried but its request/response fields are not yet fully typed. Review the source before integrating."
        if self.method not in ("GET", "HEAD", "OPTIONS") and "/integrations/" not in self.path:
            result.setdefault("parameters", []).append({"name": "X-CSRFToken", "in": "header", "required": True, "schema": {"type": "string"}, "description": "Current CSRF token from session bootstrap. Browser session cookie is HttpOnly."})
        if spec:
            from .schema_examples import samples
            result["x-code-samples"] = samples(self.path,self.method,spec)
        if self.view.__class__.__name__ == "SignInView":
            result["responses"]["401"] = {"description": "Invalid credentials", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/DomainError"}}}}
        return result

    def get_operation_id(self):
        # Path parameters remain in the identity, so collection/detail IDs cannot collide.
        import re

        return self.method.lower() + "_" + re.sub(r"[^a-zA-Z0-9]+", "_", self.path).strip("_")
