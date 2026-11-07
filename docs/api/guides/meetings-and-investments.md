## Mutual rooms and simulated investment

Create an investment room with `kind: "investment"`, `offer_id`, integer-centavo `amount`, `share_bps` from 0 to 10000 and a UUID operation ID. The minimum proposed contribution is 10000 centavos. Borrowing rooms instead include `application_id`. Creation is a pitch, not an investment acceptance.

The lender proposes a timezone-aware schedule. Both people accept the current schedule version, then explicitly check in within one hour either side of that time. Lobby activity, room attendance and optional public profile activity are separate. Ping is a private in-app reminder with a 60-second cooldown. Opening a record must not check in, capture media, upload evidence or execute financial commands.

Every room command has `action` and `operation_id`. All except heartbeat, lobby_heartbeat, leave, ping, message and counter need the current `expected_revision`. Lender-only schedule/agenda/propose/prepare actions do not authorize the other participant. Messages/counters can suggest changes; only a new proposal changes negotiated terms.

- `approve` uses `expected_hash: proposal_hash`, current mutual attendance and the current proposal.
- `review_evidence` uses `expected_hash: evidence_hash`. A scan or acknowledgment never certifies authenticity.
- `prepare` freezes a contract after both proposal approvals and evidence acknowledgments.
- `accept_contract` needs `accepted: true`, mutual attendance and the frozen agreement hash. Each person accepts separately.
- `confirm_test_funding` needs `confirmed_simulation: true`, that same investment hash, accepted terms, current eligibility and both present. Only both funding acknowledgments increase the simulated pot.

The investor receives a negotiated share of **interest actually collected from loans allocated to their contribution**, excluding principal, late fees and uncollected interest. They bear allocated losses. The separate **2% lender-paid demonstration fee** is test policy, added separately so the contribution enters the pot in full; it is not an approved live tariff. FIFO allocation and subsequent collections/reversals/losses drive the private position.

Payout preparation, participant receipt confirmation and cancellation are distinct commands referencing a current payout ID. A prepared payout is not received money. There are no real investment transfers or withdrawable balances in this implementation. Public contributor circles contain at most five unique people, preserve anonymity and never reveal individual positions or amounts.
