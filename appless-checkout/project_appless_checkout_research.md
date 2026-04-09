---
name: Appless checkout research and presentation
description: CC/Clover integration research for CU Boulder and Holy Cross — findings, decisions, and presentation deck built March 2026
type: project
---

## What was done

Owen researched credit card and Clover integration options for USEFULL's appless checkout, responding to asks from Alison (CEO). Produced three key artifacts in `appless-checkout/`:

- **business-problem-codex-2026-03-28.md** — The 7 strategic research questions Alison/Owen needed answered
- **usefull-appless-checkout-architecture-deep-dive.md** — Deep dive answering all 7 questions with hardware, pricing, architecture recommendations
- **appless-checkout-deck.html** — 14-slide HTML presentation for Alison and Igor (CTO)

## Key decisions and findings

- **Stripe Reader M2 ($59)** is the recommended CC reader for Boulder — Stripe-native, works with existing integration
- **HID ATR215** (NFC + QR dual reader) for campus card sites, **ATR200** (QR only) for return stations — USEFULL is committed to HID for at least the first year, has working integration
- **Fee model for Boulder:** Saved card via Stripe SetupIntent, existing USEFULL fee logic (daily accrual, weekly batched charges). Zero backend changes needed. Original concern about 33% processing cost on $1 dripfeed charges was wrong — USEFULL already batches weekly.
- **Small deposit model ($0.50) ruled out:** 12%+ effective processing rate, 5-10 day refund delays, doesn't change behavior
- **Square ruled out:** SDK prohibits unattended terminals
- **Holy Cross:** Clover-native app on existing POS (Fiserv, not Stripe — separate integration path). USEFULL deploys return stations only. State grant resurrected this project.
- **Phone-first identity is a paradigm shift:** Card tap gives no email. Phone number is faster at kiosk but requires changes to Firebase auth, notification infrastructure, and support workflows. Flagged as a decision point.

## Repo structure

- Project was renamed from `appless-checkout` to `tablet-onboarding`
- Old `notes/` subdirectory renamed to `appless-checkout/`
- Remote: `owenbarron/usefullcheckout` on GitHub
- GitHub Pages deck URL: `https://owenbarron.github.io/usefullcheckout/appless-checkout/appless-checkout-deck.html`

**Why:** Alison asked Owen to research CC/Clover integration with focus on deposit systems and two client use cases (Boulder, Holy Cross). This is the deliverable.

**How to apply:** Use these findings as the baseline for any future appless checkout work. The presentation deck is the canonical summary for leadership.
