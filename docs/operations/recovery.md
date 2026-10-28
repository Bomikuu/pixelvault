# Financial and operational recovery

Persisted operation IDs, immutable payable snapshots, event inbox IDs and unique collection/refund source references survive retries. Retry the same operation; do not create a new payable to bypass an uncertain collection. Reconciliation must keep provider collection separate from individual-lender settlement.

`payments.recovery.recover_events` uses server-authenticated paginated PixelFlow events with the same validation and deduplication as webhooks. A webhook awaiting its local mapping and an orphan refund remain pending rather than being lost or posted as phantom money. A stale display version does not erase a financial fact. Complex historical payment ordering may require an explicit reconciliation exception; staff cannot silently rewrite the ledger.

`audit.outbox.recover_pending_work` replays known local achievement handlers idempotently. `community.tasks.publish_reviews` and `cases.tasks.capture_due_notices` support scheduled local work; notices are captured, not delivered through unconfigured SMS/email. Broker failure never turns a missing notification into a financial failure by the member.

Before an approved deployment, exercise backup/restore with a separate PostgreSQL instance and private encrypted document backup, retain the required encryption keys, replay the inbox/outbox, compare ledger/collection/fee totals, and record actual evidence. No destructive restore or real-money recovery test has been run here.
