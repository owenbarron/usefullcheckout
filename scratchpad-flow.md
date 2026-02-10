# USEFULL Kiosk Flow Scratchpad

## Canonical flow contract

1. Scan screen is the default entry point.
2. Container scans are triggered from the hidden left-edge hotspot while on scan screen.
3. ID taps are triggered from the hidden right-edge hotspot while on scan screen.
4. ID tap at zero containers shows inline warning:
`Scan containers first, then tap your ID`
5. Once an ID tap is accepted with `containerCount > 0`, checkout is locked and additional scans are blocked until reset.
6. Reset paths that clear lock and return to scan:
`success auto-reset`, `error auto-reset`, `manual reset/exit`.
7. Terms modal is reachable only from Program Overview in new-user onboarding.

## Runtime invariants

- Hidden hotspot handlers are active only when all are true:
`appState === scan`, `demo modal closed`, `terms modal closed`, `checkoutLocked === false`.
- Debug rails and `DEBUG ON` badge are debug-only and enabled by `?debugViewport=1` or `toggleDebugHotspots(true)`.
- Status tile in scan state is anchored to viewport midpoint (`top: 50%`) and must not shift center content.

## Notes for future edits

- Do not nest hotspot/debug nodes inside modal containers.
- Keep scan precondition and post-ID lock behavior aligned with the above contract.
