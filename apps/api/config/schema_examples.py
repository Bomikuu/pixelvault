"""Synthetic authoring examples and browser-correct session snippets.

No endpoint is called and no member or provider credential is loaded here.
"""
from datetime import date


def samples(path, method, spec):
    if "/integrations/" in path:
        return [{"lang": "bash", "label": "Provider callback (placeholders)", "source":
                 "# Provider/server integration only. Use an already signed raw event.\n"
                 f"curl --request {method} 'https://YOUR_HOST{path}' \\\n"
                 "  --header 'Content-Type: application/json' \\\n"
                 "  --header 'Pixelflow-Signature: PROVIDER_GENERATED_SIGNATURE' \\\n"
                 "  --header 'Pixelflow-Event-ID: MATCHING_EVENT_ID' \\\n"
                 "  --data-binary @provider-signed-event.json"}]
    media = spec["media"]
    stream = media == "text/event-stream"
    binary = media != "application/json" and not stream
    unsafe = method not in ("GET", "HEAD", "OPTIONS")
    multipart = spec["request"] and "multipart/form-data" in spec["request"]
    form_fields = spec["request"]["multipart/form-data"].get("properties", {}) if multipart else {}
    file_field = next((key for key,value in form_fields.items() if value.get("format")=="binary"), "file")
    query = "?principal=800000&frequency=monthly&installment_count=3" if path.endswith("/calculator") else ""
    target = path + query
    lead = "// Replace path placeholders with records this account may access.\n// Complete browser sign-in first; never set or paste the HttpOnly session cookie.\n"
    if stream:
        js = lead + f"const source = new EventSource('{target}', {{withCredentials: true}});\n" \
             + "// Listen for the named events in this operation; refetch an authorized snapshot.\n// Close on leave/background. Reconnect does not promise full event replay.\nsource.addEventListener('room.expired', () => source.close());"
    else:
        args = "path, reviewedFormData" if multipart else "path, reviewedPayload" if unsafe else "path"
        js = lead + f"// Operation path: {target}\nasync function requestPixelVault({args}) {{\n"
        if unsafe:
            js += "  const session = await fetch('/api/v1/auth/session', {credentials: 'same-origin', cache: 'no-store'}).then(r => r.json());\n"
        headers = "{ 'X-CSRFToken': session.csrf_token" + (" }" if multipart else ", 'Content-Type': 'application/json' }")
        js += f"  const response = await fetch(path, {{method: '{method}', credentials: 'same-origin', cache: 'no-store'"
        if unsafe:
            js += f",\n    headers: {headers},\n    body: " + ("reviewedFormData" if multipart else "JSON.stringify(reviewedPayload)")
        js += "});\n  if (!response.ok) throw await response.json();\n  return " + ("response.blob();" if binary else "response.json();") + "\n}\n// Call only after filling the operation's schema and reviewing the current record.\n// No automatic mutation retries or offline queue."
    curl = "# Use a local cookie jar from the documented sign-in flow. Replace placeholders.\n" \
           + f"curl {'--no-buffer ' if stream else ''}--request {method} --cookie session.cookies 'https://YOUR_HOST{target}'"
    if unsafe:
        curl += " \\\n  --header 'Origin: https://YOUR_HOST' \\\n  --header 'X-CSRFToken: CURRENT_CSRF_TOKEN'"
        if multipart:
            curl += f" \\\n  --form '{file_field}=@SELECTED_FILE' # Add other required form fields from the schema."
        else:
            curl += " \\\n  --header 'Content-Type: application/json' \\\n  --data @reviewed-payload.json"
    if binary:
        curl += " \\\n  --output authorized-document"
    py = "# session is an authenticated requests.Session from the browser-sessions guide.\n# Replace path placeholders; keep credentials out of source and logs.\n" \
         + f"path = '{target}'\n"
    if unsafe:
        py += "bootstrap = session.get(origin + '/api/v1/auth/session').json()\nheaders = {'X-CSRFToken': bootstrap['csrf_token'], 'Origin': origin}\n"
    py += f"response = session.request('{method}', origin + path"
    if unsafe:
        py += ", headers=headers, " + ("files=reviewed_files, data=reviewed_form_fields" if multipart else "json=reviewed_payload")
    if stream:
        py += ", stream=True"
    py += ")\nresponse.raise_for_status()\n"
    py += "events = response.iter_lines()" if stream else "content = response.content" if binary else "result = response.json()"
    return [{"lang": "javascript", "label": "Browser session / CSRF", "source": js},
            {"lang": "bash", "label": "cURL cookie jar", "source": curl},
            {"lang": "python", "label": "Python session", "source": py}]


def add_examples(schemas):
    from agreements.types import LoanTerms
    from agreements.disclosures import build_disclosure
    terms = LoanTerms(principal=800000, currency="PHP", annual_rate_bps=900,
                      frequency="monthly", installment_count=3, effective_date=date(2026, 10, 30),
                      due_dates=(date(2026, 11, 30), date(2026, 12, 30), date(2027, 1, 30)))
    disclosure = build_disclosure(terms)
    examples = {
        "Terms": terms.to_dict(), "Disclosure": disclosure,
        "Session": {"member": None, "environment": "test", "csrf_token": "CURRENT_CSRF_TOKEN"},
        "CalculatorPreview": {"terms": terms.to_dict(), "disclosure": disclosure, "simulation_only": False,
                              "application_uses_original_terms": True, "original_terms": {"frequency": "monthly", "installment_count": 3},
                              "limits": {"min_amount": 10000, "max_amount": 800000, "max_installments": 24,
                                         "frequencies": ["weekly", "twice_monthly", "monthly", "maturity"]},
                              "notice": "Synthetic documentation example. Request a fresh dated calculation; this is not an available offer or promised rate."},
        "OfferSocial": {"offer_id": "00000000-0000-4000-8000-000000000001", "likes": {"count": 0, "liked": False},
                        "reactions": [], "my_reaction": None, "reaction_choices": [], "comments": [], "comments_next_cursor": None},
        "Reputation": {"points": 0, "level": "Newcomer", "frame": "plain", "flair": None, "show_points": True},
    }
    for name, example in examples.items():
        schemas[name]["example"] = example
