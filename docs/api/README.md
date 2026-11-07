# PixelVault developer reference

Open `/api/docs/` on the API origin, or through the web/mobile development proxy. Both the reference and `/api/schema` require an active, unsuspended staff member whose role is `developer` or `admin`. Access to documentation grants no permission to perform other staff operations. The renderer is Scalar 1.76.2, served locally with the existing brand and Manrope font; no CDN, hosted proxy or request playground is enabled.

Run `npm run assets:api-docs` after installing locked Node dependencies. Package `apps/api/config/templates`, `apps/api/config/static/api-docs`, and the six fixed files in `docs/api/guides` with the API deployment. These reference assets are served through staff-guarded Django routes, not a public static alias. Do not publish the authoring schema, inventory or guides as public static files. `collectstatic` alone does not package the guarded renderer or guides.

Domain declarations live in `apps/api/<domain>/schema.py`; `config/schema.py` preserves existing operation IDs. The generated YAML and TypeScript are authoring artifacts, not independent runtime validators. `operations.md` and `contract-coverage.json` explicitly identify typed, partial and generic operations. A partial operation remains a release gap even if its reference page renders well.

Regenerate without executing the application workflows:

```sh
npm run assets:api-docs
uv run python apps/api/manage.py spectacular --file docs/api/openapi.yaml
npm run generate:api
uv run python scripts/inventory-api.py
```

Authorized release verification remains pending: PostgreSQL permission and projection fixtures; schema validation; operation-ID/coverage check; TypeScript and UI-boundary checks for consumers. No automated tests or builds were run for this visual-only implementation task. Authenticated access, role refusal, binary authorization and CSRF correctness cannot be certified by a visual review.

The focused checker can be run when authorized: `uv run python scripts/check-api-contracts.py`. It checks inventory identities and required mobile declarations, without calling financial endpoints. Native delivery has its separate gate in [Android compatibility](../mobile/android-compatibility.md).

The renderer hides automatic client snippets in favor of authored browser-session/CSRF, cURL-cookie-jar and Python-session samples ([Scalar custom examples](https://scalar.com/products/api-client/code-generation)). Browser JavaScript never sets an HttpOnly cookie or `Set-Cookie` header. Calculator examples are produced by the pure disclosure engine from explicitly synthetic terms, with no member lookup or endpoint call.
