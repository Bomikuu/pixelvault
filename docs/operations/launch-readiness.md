# Live launch readiness

The implemented product is test-only. The following remain unresolved and cannot be inferred from passing automated tests:

- Lawful classification of the mandatory individual-to-individual platform and eligibility/authorization for each intended lender.
- Applicable rate, all-in cost, fee, tax, advertising and contractual disclosure rules.
- Reviewed privacy/retention and complaint operations; incident ownership and actual backup/restore evidence.
- Real identity/liveness/income review, private production storage/scanning, staff MFA, lawyer-reviewed template and appropriate signing evidence.
- Approved individual-lender funding, disbursement, repayment settlement and platform service-fee routing. A PixelFlow payment success still does not establish lender settlement.
- Actual provider sandbox/live acceptance under the approved arrangement, secrets/key rotation and operational reconciliation ownership.
- Production hosting/TLS/origin settings, Mapbox public-token/account/origin/usage configuration and provider acceptance, and approved final asset exports. Mapbox SDK/geocoder integration is implemented; no public token is currently configured.

No item above is marked complete by this implementation. `config.live_policy.assert_live_origination_allowed` fails closed, and lending eligibility independently rejects live originations. This does not change the required P2P model or suggest that registering later permits operating now.
