# Appless Checkout Presentation Spec

**Audience:** Alison (CEO), Igor (CTO)
**Style:** USEFULL brand (teal #008C95, gold #D69A2D), clean, professional, dark background. Talk-track deck — not a document.

---

## Slide 1 — Title

**Appless Checkout: Credit Card & Payment Research**

Subtitle: CU Boulder, Holy Cross, and the path forward — March 2026

USEFULL logo

## Slide 2 — The Immediate Question

**CU Boulder wants appless checkout with credit cards only.**

No campus card. No app. Students tap a credit card at a kiosk, check out a container, and walk away.

- Mandatory program, retail food courts only
- Must still assign specific containers to specific students
- Must still enforce fees and communicate due dates
- How do we make this work?

## Slide 3 — What We Need to Solve

- How does a student identify themselves with just a credit card?
- How do we save a payment method without processing cards ourselves?
- How do we enforce fees if there's no campus card system managing it?
- How do we contact students (receipts, due dates, late notices) when a card tap gives us no email?
- What hardware actually does this?

## Slide 4 — The Credit Card Solution: Stripe Reader M2

**Hardware:** Stripe Reader M2 ($59, USB) + HID ATR200 (QR for container scanning) + Android tablet

- Stripe-native — works within our existing Stripe integration
- Card data encrypted at the reader — USEFULL never sees card numbers, stays out of PCI scope
- Stripe returns a `fingerprint` hash that uniquely identifies each card

**First visit:** Scan containers → tap card → enter phone number → card saved via Stripe

**Repeat visit:** Tap card → fingerprint match → instant checkout

## Slide 5 — Fee Model: Saved Card, Existing Fee Logic

**Save the card at checkout. Fees work exactly like they do today.**

- Stripe SetupIntent saves the card — no charge at checkout
- Daily fee accrual, weekly batched Stripe charges — same backend, same infrastructure
- Zero changes to the charging system. The kiosk just adds a new way to save a card.

One UX requirement: Stripe requires disclosure at the kiosk that the card will be saved for future charges. This is a copy/design task, not a technical blocker.

## Slide 6 — Why Not a Small Deposit?

The $0.50 deposit idea doesn't hold up:

- **Processing cost:** ~6¢ per $0.50 charge (12%+ effective rate)
- **Refund delays:** 5–10 business days to appear on statements
- **No behavior change:** Loss-aversion research says threshold is ~$5+
- **Confusing statements:** Charge + refund + later fee = disputes

The saved-card model accomplishes the same accountability without the cost or confusion.

## Slide 7 — Why Not These Other Approaches?

- **Square:** SDK explicitly prohibits unattended terminals/kiosks. Disqualified.
- **Accountless model:** Fee enforcement requires a saved card. "Accountless" still saves a card under the hood — architecturally identical to account-based. Ship account-based.
- **Full hold, void on return:** Works well for one-time visitors (Holy Cross), but doesn't preserve our graduated fee schedule. Boulder is a recurring campus program — our existing fee logic is a better fit.

## Slide 8 — Holy Cross: Clover Integration

**Different problem, different hardware, same USEFULL backend.**

- **Checkout:** Clover-native app on existing concession POS — cashier scans container QR, places pre-auth hold
- **Returns:** USEFULL return stations (ATR200 + tablet)
- **Fee model:** Full hold ($17/$25), void on return within 24 hours — right model for one-time stadium visitors
- **Note:** Clover runs on Fiserv, not Stripe — separate integration path
- State grant opportunity has resurrected this project

## Slide 9 — Solving Boulder Solves the General Problem

Answering the Boulder question forced us to answer something bigger: how does USEFULL handle any campus where the identity primitive isn't a campus card?

Same kiosk app, swappable input hardware:

| | Campus Card Sites (NAU, UCSC) | Credit Card Sites (Boulder) | Stadium / POS (Holy Cross) |
|---|---|---|---|
| **Identity** | HID ATR215 (NFC tap) | Stripe M2 (card tap) | Clover POS |
| **QR Scanning** | ATR215 (built-in) | ATR200 | ATR200 (return stations) |
| **Payment** | Campus-managed | Stripe (saved card) | Clover / Fiserv |
| **Fee Model** | Campus-managed | Existing USEFULL fee logic | Full hold, void on return |

## Slide 10 — Fall 2026: What This Looks Like

Four deployments, three hardware profiles, one USEFULL platform:

- **NAU / UCSC:** ATR215 + tablet — campus card + QR in one device
- **CU Boulder:** ATR200 + Stripe M2 + tablet — QR + credit card
- **Holy Cross:** Existing Clover POS + return stations (ATR200 + tablet)

## Slide 11 — Long-Term: Unified Checkout Station

The fall deployments validate the software. The long-term product is hardware convergence:

- HID embedded NFC module (campus cards + mobile credentials)
- Stripe payment terminal (credit/debit tap + insert)
- Integrated QR reader
- Android touchscreen
- Custom USEFULL-designed enclosure

**One device, any campus.** Campus card OR credit card, configured via cloud.

## Slide 12 — Next Steps

- **CU Boulder:** Finalize Stripe Terminal integration, test fingerprint consistency with Apple Pay / Google Pay
- **Holy Cross:** Begin Clover SDK integration (Clover Connector for Android)
- **Firebase:** Add phone-number auth, make email nullable
- **NAU:** Continue ATR215 testing, coordinate Apple Wallet ECP config with card office

## Slide 13 — End

USEFULL logo + "Questions?"
