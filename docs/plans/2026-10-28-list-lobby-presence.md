# Distinct list, meeting lobby and activity

Implement natively in the existing PixelVault flows; do not spawn agents. Preserve the user's visual-only verification preference, no builds or automated check/test runs.

1. Keep the immersive compact map; restore a separate scrolling card list with the previous financial preview, ordinary labeled likes and a full-width filter/search toolbar.
2. Add a participant-scoped lobby before every room entry. Reuse lender scheduling, mutual time acceptance and the server check-in window. Add durable private conversation pings, one per sender/room/minute, without external push/email claims. Lobby attendance differs from checked-in room attendance.
3. Add explicit, optional local mic/camera preview and an illustrated schedule/preview/join guide. Joining text chat never requires device permission. Stop tracks on leaving, unmount or hiding; do not imply a peer call provider exists.
4. Record foreground authenticated activity; expose only coarse profile activity under the user-approved, off-by-default sharing setting. Private room presence retains its own short-lived attendance semantics.
5. Apply additive migrations, restart local services and visually inspect desktop/mobile and light/dark once in a batch; repair observed defects in one batch. Document actual verification and unexercised media/security/concurrency paths, then commit the focused changes.


Completed all five implementation steps. The additive migrations are applied locally; visual evidence and runtime limits are recorded in `docs/IMPLEMENTATION.md` and the three affected surface records. The original light theme and Maya synthetic session were restored, and viewport overrides reset. No build or automated checks ran; no device permissions, contract acceptance or money movement occurred.
