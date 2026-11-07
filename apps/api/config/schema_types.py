"""OpenAPI vocabulary for explicit hand-written view projections (no runtime validation)."""
from copy import deepcopy
from importlib import import_module
from functools import lru_cache

TEXT = {"type": "string"}
BOOL = {"type": "boolean"}
INT = {"type": "integer"}
UUID = {"type": "string", "format": "uuid"}
DATE = {"type": "string", "format": "date"}
TIME = {"type": "string", "format": "date-time"}
CENTS = {"type": "integer", "format": "int64", "description": "Exact PHP centavos. Never a floating-point peso amount.", "minimum": 0, "maximum": 9007199254740991}
MONEY_STRING = {"type": "string", "pattern": "^-?[0-9]+$", "description": "Exact PHP centavos serialized as a decimal integer string."}
JSON_MAP = {"type": "object", "additionalProperties": {}, "description": "Domain metadata; inspect the owning operation's description. These fields are not fully typed."}


def ref(name):
    return {"$ref": f"#/components/schemas/{name}"}


def nullable(schema):
    return {"allOf": [schema], "nullable": True} if "$ref" in schema else {**schema, "nullable": True}


def array(schema):
    return {"type": "array", "items": schema}


def obj(fields, required=None, description=None):
    result = {"type": "object", "properties": fields, "required": list(fields) if required is None else required}
    if description:
        result["description"] = description
    return result


def choice(*values):
    return {"type": "string", "enum": list(values)}


def parameter(name, schema=TEXT, description="", required=False):
    return {"name": name, "in": "query", "required": required, "schema": schema, "description": description}


def op(response, request=None, *, status=200, summary="", description="", parameters=(), media="application/json", partial=False):
    return dict(response=response, request=request, status=status, summary=summary, description=description,
                parameters=list(parameters), media=media, partial=partial)


SCHEMAS = {
    "DomainError": {**obj({"code": TEXT, "message": TEXT}), "example":{"code":"stale_revision","message":"Refresh this record before continuing."}},
    "DetailError": obj({"detail": TEXT}),
    "FieldErrors": {"type": "object", "additionalProperties": {"oneOf": [TEXT, array(TEXT), JSON_MAP]}, "description": "DRF field errors. This deliberately retains the existing error format."},
    "Recorded": obj({"recorded": BOOL}),
    "Person": obj({"id": UUID, "handle": TEXT, "display_name": TEXT, "area": TEXT, "avatar_key": TEXT, "photo_url": nullable(TEXT), "reputation": ref("Reputation")}),
    "PublicIdentity": obj({"handle": TEXT, "display_name": TEXT, "avatar_key": TEXT, "photo_url": nullable(TEXT), "reputation": ref("Reputation")}),
    "Award": obj({"id": UUID, "key": TEXT, "name": TEXT, "criteria": TEXT, "earned_at": TIME, "rule_version": TEXT, "eligible": BOOL, "private": BOOL, "public": BOOL}, ["id", "key", "name", "criteria", "earned_at", "rule_version"]),

    "PublicAward": obj({"id":UUID,"key":TEXT,"name":TEXT,"criteria":TEXT,"earned_at":TIME,"rule_version":TEXT}),
    "AwardDefinition": obj({"key": TEXT, "name": TEXT, "criteria": TEXT, "private": BOOL}),
    "Reputation": obj({"points": INT, "level": TEXT, "frame": TEXT, "flair": nullable(ref("PublicAward")), "show_points": BOOL}),
    "XpProgress": obj({"current_level": TEXT, "current_level_points": nullable(INT), "next_level": nullable(TEXT), "next_level_points": nullable(INT), "points_in_level": nullable(INT), "points_to_next": nullable(INT), "progress_percent": nullable({"type": "number"})}),
    "Area": obj({"code": TEXT, "name": TEXT, "latitude": {"type": "number"}, "longitude": {"type": "number"}, "approximate": BOOL, "source": TEXT}),
    "Fee": obj({"code": TEXT, "amount": CENTS, "timing": TEXT}),
    "Installment": obj({"sequence": INT, "due_date": DATE, "principal": CENTS, "interest": CENTS, "charges": CENTS, "total": CENTS}, ["due_date", "principal", "interest", "total"]),
    "Terms": obj({"principal": CENTS, "currency": choice("PHP"), "annual_rate_bps": INT, "frequency": choice("weekly", "twice_monthly", "monthly", "maturity"), "installment_count": INT, "effective_date": DATE, "due_dates": array(DATE), "borrower_fees": array(ref("Fee")), "lender_fees": array(ref("Fee")), "policy_version": TEXT}, ["principal", "annual_rate_bps", "frequency", "installment_count", "effective_date", "due_dates"]),
    "Disclosure": obj({"principal": CENTS, "currency": choice("PHP"), "net_proceeds": CENTS, "total_repayment": CENTS, "total_interest": CENTS, "annual_rate_bps": INT, "rate_basis": TEXT, "effective_annual_rate": TEXT, "effective_annual_percentage": TEXT, "borrower_fees": array(ref("Fee")), "lender_fees": array(ref("Fee")), "schedule": array(ref("Installment")), "grace_days": INT, "late_fee": CENTS, "post_maturity_interest": BOOL, "test_mode": BOOL}),
}
DOMAINS = ("accounts", "marketplace", "community", "engagement", "memberhub", "agreements", "servicing", "negotiations", "connections", "documents", "payments", "verification", "investments", "cases", "reporting", "plaza")


@lru_cache(maxsize=1)
def catalog():
    schemas, operations = deepcopy(SCHEMAS), {}
    for domain in DOMAINS:
        module = import_module(f"{domain}.schema")
        schemas.update(module.SCHEMAS)
        operations.update({(domain, cls, method): spec for (cls, method), spec in module.OPERATIONS.items()})
    return schemas, operations


def contract(view, method):
    return catalog()[1].get((view.__class__.__module__.split(".")[0], view.__class__.__name__, method.upper()))


def enrich_schema(result, generator, request, public):
    from .api_docs import reference_description

    result.setdefault("components", {}).setdefault("schemas", {}).update(deepcopy(catalog()[0]))
    from .schema_examples import add_examples
    add_examples(result["components"]["schemas"])
    result["info"]["description"] = reference_description()
    names=("Authentication","Community","Offers and applications","Agreements","Loans","Payments","Member tools","Meetings","Investments","Co-borrower invitations","Verification","Documents","Engagement","Marketplace","Analytics and exports","Private support","Administration")
    result["tags"]=[{"name":name,"description":"Every operation checks its own role, object permission and domain policy. Reference access grants no invocation permission."} for name in names]
    result["info"]["x-contract-note"] = "Only operations marked typed have explicit source-reviewed contracts. Partial operations remain visible and require source review."
    return result
