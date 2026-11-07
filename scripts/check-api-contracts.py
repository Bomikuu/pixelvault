"""Deferred automated release gate. Run only when automated checks are authorized."""
import json
from pathlib import Path
import yaml

root = Path(__file__).resolve().parents[1]
inventory = json.loads((root / "docs/api/contract-coverage.json").read_text())["operations"]
schema = yaml.safe_load((root / "docs/api/openapi.yaml").read_text())
actual = {op["operationId"]: (method.upper(), path, op) for path, methods in schema["paths"].items() for method, op in methods.items() if isinstance(op, dict) and "operationId" in op}
assert len(actual) == sum("operationId" in op for methods in schema["paths"].values() for op in methods.values() if isinstance(op, dict)), "Duplicate operation IDs"
assert len({row["operation_id"] for row in inventory}) == len(inventory), "Duplicate inventory identities"
for row in inventory:
    assert row["operation_id"] in actual, f'Missing schema operation: {row["operation_id"]}'
    method, path, operation = actual[row["operation_id"]]
    assert (method, path) == (row["method"], row["path"])
    if row["contract_status"] == "typed":
        success = [v for k,v in operation["responses"].items() if str(k).startswith("2")]
        assert success and all("content" in value for value in success), row["operation_id"]
        for response in success:
            for media in response["content"].values():
                assert media.get("schema") not in ({}, {"type":"object","additionalProperties":True}), row["operation_id"]
gaps = [row for row in inventory if row["contract_status"] != "typed"]
assert not gaps, f'{len(gaps)} partial/generic contracts remain; consult operations.md'
print(f'{len(inventory)} explicit operations covered. Permission/projection tests remain separate.')
