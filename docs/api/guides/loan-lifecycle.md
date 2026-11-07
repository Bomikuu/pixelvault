## Synthetic loan lifecycle

Use two eligible synthetic accounts, with current contact/identity/income checks and the required lender evidence. Their presence in a demonstration does not authorize live lending.

1. Discover published offers through `GET /community/discovery`; page with the returned cursor. Only approximate public areas are exposed. Member-only `GET /offers/{offer_id}` supplies current terms and permitted application data.
2. Inspect `GET /engagement/offers/{offer_id}/calculator?principal=800000&frequency=monthly&installment_count=3`. The server supplies a reducing-balance disclosure. Variant plans are simulations; applications use the lender's original terms.
3. Borrower explicitly posts `/offers/{offer_id}/applications` with principal, purpose and operation ID. An optional co-borrower invitation must already be accepted and ready. This grants no document access and creates no joint liability by itself.
4. Create the borrowing meeting with offer/application IDs, agree on a schedule, check in, and review proposal/evidence. The lender's preparation selects the application and reserves capacity using current server state. A stale reservation/version returns a conflict.
5. Each person reviews the full frozen agreement and its PDF/hash. Their individual `accept_contract` commands accept that same version. Proposal approvals and chat messages are separate from acceptance.
6. Use the shared loan record to inspect funding status. Disbursement is a separate lender action, with eligibility/date/acceptance/fee policy rechecks. No UI navigation funds a loan.
7. The borrower reads `/loans/{loan_id}/payment-preview` and explicitly requests `/loans/{loan_id}/checkout`. Only signed provider events and server reconciliation establish collection. Current accrued payoff differs from a schedule containing future interest.
8. Read servicing timeline, payments, private documents and receipts. Commission accrual/collection and lender settlement remain distinct. If a date/contract must change, use the versioned renewal process and both parties' new acceptance rather than editing a signed row.

Paths above are relative to `/api/v1`. Each endpoint's ownership and policy are checked independently; document access to this reference is not application authorization.
