"""Author the API inventory from registered routes and explicit domain metadata.

This does not execute endpoint methods, query member data or validate contracts.
"""
import inspect
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()
from drf_spectacular.generators import EndpointEnumerator
from config.schema_types import catalog

rows = []
for path, path_regex, method, callback in EndpointEnumerator().get_api_endpoints():
    if not path.startswith("/api/v1/"):
        continue
    cls = callback.cls
    domain = cls.__module__.split(".")[0]
    spec = catalog()[1].get((domain, cls.__name__, method))
    permissions = [p.__name__ for p in cls.permission_classes]
    access = "public" if "AllowAny" in permissions else "member + object/domain policy"
    if "/admin/" in path:
        access = "staff + role/assignment/step-up policy (source)"
    if "/integrations/" in path:
        access = "signed service callback"
    owner = Path(inspect.getsourcefile(cls)).relative_to(ROOT).as_posix()
    operation_id = method.lower() + "_" + re.sub(r"[^a-zA-Z0-9]+", "_", path).strip("_")
    rows.append(dict(operation_id=operation_id, method=method, path=path, tag=domain, access=access,
                     owner=owner, view=cls.__name__, contract_status="typed" if spec and not spec["partial"] else "partial" if spec else "generic",
                     status=spec["status"] if spec else None, media=spec["media"] if spec else None,
                     reason="" if spec and not spec["partial"] else "Explicitly incomplete variants/fields; read source before integrating." if spec else "No domain declaration yet; generated fallback is not a usable typed contract."))
rows.sort(key=lambda r: (r["path"], r["method"]))
output = ROOT / "docs/api"
payload = {"generated_from": "Django registered methods + config.schema_types catalog", "verification": "Source inventory only; runtime projection/permission checks deferred under visual-only instruction.", "operations": rows}
(output / "contract-coverage.json").write_text(json.dumps(payload, indent=2) + "\n")
counts = {kind: sum(r["contract_status"] == kind for r in rows) for kind in ("typed", "partial", "generic")}
lines = ["# API operation inventory", "", f"{len(rows)} registered operations: " + ", ".join(f"{v} {k}" for k,v in counts.items()) + ".", "", "Source metadata is not runtime validation. `typed` describes concrete declarations; partial/generic operations remain release gaps. Documentation access never grants operation access. Methods, ownership checks and serializer details are linked below.", "", "| Method | Path | Access | Contract | Source |", "| --- | --- | --- | --- | --- |"]
for row in rows:
    lines.append(f'| {row["method"]} | `{row["path"]}` | {row["access"]} | {row["contract_status"]} | [{row["view"]}](../../{row["owner"]}) |')
(output / "operations.md").write_text("\n".join(lines) + "\n")
print(f"Authored {len(rows)} operation entries: {counts}")
