## Money, dates, errors and retries

PHP money is exact integer **centavos**: `800000` means ₱8,000.00. Aggregate investment/reporting amounts can be signed decimal **strings**; format with integer arithmetic. Rates and investment shares use basis points: `900` is 9%, `2000` is 20%. Never send a floating-point peso amount. Instants use ISO-8601 offsets/UTC; display meetings in Asia/Manila. Loan due dates are calendar dates, not UTC midnight instants.

Principal, collected interest, accrued interest, contractual future interest, platform fees, reversals, losses and lender settlement are different facts. A checkout, receipt image or collection does not establish lender settlement. Unknown settlement must stay unknown. Calculator results are estimates and never amend a submitted application or frozen agreement.

The existing error formats remain: domain `{code, message}`, framework `{detail}`, or field errors such as `{principal: ["…"]}`. Handle 400 validation, 401 invalid sign-in, 403 access/CSRF/step-up, 404 missing-or-inaccessible, 409 stale hash/version/state, 429 throttling, network failure and provider unavailability separately. A 404 is not evidence that a private object never existed.

Many financial POSTs require a UUID `operation_id`; others require `expected_revision`, `expected_offer_version`, `expected_version` or `expected_hash` as documented. There is no universal idempotency header. An exact retry keeps both the original operation ID and exact body. Never reuse an ID with changed terms. An uncertain network/5xx result needs a fresh authoritative record before offering a deliberate retry; do not automatically retry or queue financial writes offline. Endpoints without operation IDs need endpoint-specific reconciliation.
