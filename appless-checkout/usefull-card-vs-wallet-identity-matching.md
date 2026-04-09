# Card Tap vs. Mobile Wallet: Identity Matching Problem & Implementation Plan

**Date:** March 30, 2026

---

## The Problem

USEFULL's appless kiosk checkout uses Stripe Terminal card fingerprinting to recognize returning users. When a student taps a card, Stripe returns a `fingerprint` hash that uniquely identifies that card number. USEFULL stores the fingerprint in its database, linked to the student's account. On repeat visits, the student taps → fingerprint matches → instant checkout.

This breaks when a student switches between a physical card and a mobile wallet (Apple Pay, Google Pay, Samsung Pay) — even if the wallet is backed by the same underlying card.

### Why fingerprints diverge

When a card is added to Apple Pay or Google Pay, the wallet provider generates a **Device Primary Account Number (DPAN)** — a completely separate card number that is unique to the device. Stripe's `fingerprint` attribute is derived from the card number it sees, so:

- Physical Visa ending in 4242 → fingerprint `fp_AAAA`
- Apple Pay backed by the same Visa → DPAN ending in 7890 → fingerprint `fp_BBBB`

These are different fingerprints for the same student, the same bank account, and the same underlying credit card. The kiosk has no way to know they're related from the fingerprint alone.

Stripe's documentation confirms this: card-present fingerprints from mobile wallets don't share a fingerprint with the physical card or with online transactions.

### Why this matters for USEFULL

If the kiosk treats an unrecognized fingerprint as a new user, a student who signed up with their physical card and later taps Apple Pay would be prompted to create a second account — even though they already have one. This leads to:

- Duplicate accounts in USEFULL's database
- Confusion about which account has the saved payment method
- A returning user who expects instant checkout getting a first-time-user flow
- Potential for fees accruing to the wrong account

Given that ~60-70% of college students default to Apple Pay for contactless payments, this isn't an edge case. It's the common case.

### The fraud vector

The fallback for an unrecognized fingerprint is to prompt the student for their phone number (or email) to look up their existing account. But phone numbers aren't secret — anyone who knows a classmate's number could type it in, claim to be them, and check out containers that accrue fees to the victim's saved payment method.

The attack:
1. Attacker scans containers at kiosk
2. Attacker taps their own card → no fingerprint match (it's not the victim's card)
3. Kiosk prompts: "Enter your phone number"
4. Attacker enters victim's phone number
5. Kiosk says: "Welcome back, [victim's name]!"
6. Attacker takes containers → fees accrue to victim's saved card

This is meaningfully different from loyalty-program spoofing (Starbucks, Toast) where the downside is someone earning you free rewards. Here, the attacker gets free containers and the victim gets charged $17-25 per unreturned item.

---

## How Other Systems Handle This

**Uber / Lyft:** Require SMS OTP when logging in on a new device. The stored payment method is only accessible within an authenticated session. No kiosk analog, but the principle — prove possession of the phone before accessing the payment method — is directly applicable.

**Square Customer Directory:** Lets cashiers look up customers by phone number for loyalty. No verification that the person giving the number is actually that customer. Tolerable because the worst case is someone earning points they shouldn't; no stored payment method is exposed.

**Toast:** Phone-number-based loyalty lookup, same as Square. No OTP. Acceptable risk profile for restaurant rewards; not acceptable for deferred-charge container rental.

**Starbucks:** App-based authentication with persistent login. Payment method access requires being logged in. Doesn't apply to the kiosk context, but confirms the pattern: stored payment methods should require authentication, not just identifier entry.

**Transit systems (Oyster, OMNY, Clipper):** Use the card itself as the account. No phone lookup, no fallback. If you tap a different card, you're a different account. Clean but inflexible — can't link multiple cards to one account.

**The pattern:** Any system that exposes a stored payment method to deferred charges requires proof of identity beyond a publicly-known identifier. Phone number alone is insufficient.

---

## Recommended Implementation

### Design Principles

1. **Fingerprint is an accelerator, not the identity.** It enables zero-friction repeat checkout when the same card is tapped. It is not the account's primary key.
2. **Phone number is the durable identifier.** It's what links the student to their account across card changes and wallet switches.
3. **Phone number entry must be verified** whenever it's used to access an existing account's payment method. Knowledge of a phone number is not proof of possession.
4. **Card metadata can serve as a lightweight second factor** before falling back to SMS OTP.

### The Three Repeat-Visit Paths

#### Path 1: Same card, same presentation method → Instant checkout

The happy path. Student taps the same card (or same wallet) they used at signup. Fingerprint matches.

```
Tap card → Fingerprint match → "Welcome back" → Checkout
```

No verification needed. Possession of the card is the proof.

#### Path 2: Same underlying card, different presentation method → Card-metadata match

Student signed up with physical Visa, now taps Apple Pay backed by the same Visa. Fingerprint doesn't match, but the underlying card metadata does.

The key insight: Stripe Terminal returns the **underlying card's** `last4` in the `last4` field on wallet taps, not the DPAN's last4 (which goes in `dynamic_last4`). So even though the fingerprints differ, USEFULL can compare `last4` + `brand` + `exp_month` + `exp_year` against the cards stored on the account.

```
Tap card → No fingerprint match
         → Prompt: "Enter your phone number"
         → Phone matches existing account
         → Compare tapped card's last4/brand/exp against cards on file
         → MATCH → Add new fingerprint to account → Checkout
```

This catches the most common wallet-switch scenario with minimal friction. No SMS required.

**Important caveat:** The `last4`/`brand`/`exp` match is a probabilistic check, not a cryptographic proof. Two different Visa cards could theoretically share the same last4 and expiry. In practice, the collision probability is low (~1 in 10,000 for last4 alone, much lower combined with expiry). For USEFULL's scale, this is acceptable as a lightweight gate. If the check passes, the student is overwhelmingly likely to be the account holder.

**Verify during prototyping:** Confirm that Stripe Terminal's `card_present` PaymentMethod returns the underlying card's `last4` (not the DPAN's) when reading Apple Pay and Google Pay taps. The API documentation indicates this is the expected behavior, but Terminal's card-present path should be tested with real wallet taps.

#### Path 3: Different card entirely → SMS OTP required

Student taps a card that doesn't match any card on file for the account they claim (different last4, different brand, or different expiry). This is either a legitimate new card (student got a replacement) or a fraud attempt.

```
Tap card → No fingerprint match
         → Prompt: "Enter your phone number"
         → Phone matches existing account
         → Compare tapped card's last4/brand/exp against cards on file
         → NO MATCH → Send SMS OTP to phone on file
         → Student enters 4-6 digit code on kiosk
         → Code valid → Add new card + fingerprint to account → Checkout
         → Code invalid or not entered → Block checkout
```

The OTP proves possession of the phone number. An attacker who types the victim's phone number will not receive the code — it goes to the victim's actual phone. Attack blocked.

This also handles the legitimate "I got a new card from my bank" case. The student enters their phone, the card doesn't match (because it's a brand-new card number), they receive an OTP, enter it, and the new card is added to their account. Slightly more friction, but this is a rare event (card replacement happens maybe once a year).

### First Visit (No Account Exists)

```
Scan containers → Tap card (physical or wallet)
               → No fingerprint match
               → Prompt: "Enter your phone number"
               → Phone not found in database
               → "Let's set up your account"
               → SMS OTP to verify phone ownership
               → Code entered → SetupIntent saves card → Account created
```

OTP on first visit ensures that nobody can create an account under someone else's phone number.

### Complete Flow Diagram

```
Student taps card
        │
        ▼
Fingerprint in database? ──YES──► "Welcome back" → Checkout (Path 1)
        │
        NO
        ▼
"Enter your phone number"
        │
        ▼
Phone in database? ──NO──► New user → SMS OTP → Create account
        │
        YES
        ▼
Tapped card last4/brand/exp
matches a card on file? ──YES──► Add fingerprint → Checkout (Path 2)
        │
        NO
        ▼
SMS OTP to phone on file
        │
        ▼
Code valid? ──YES──► Add new card + fingerprint → Checkout (Path 3)
        │
        NO
        ▼
Block checkout
```

---

## Implementation Notes

### SMS OTP delivery

Firebase Authentication supports phone-number-based OTP natively. The `verifyPhoneNumber()` API sends a 6-digit code via SMS and returns a verification ID. The kiosk app collects the code and calls `signInWithCredential()` to verify. Typical SMS delivery latency is 3-10 seconds.

For the kiosk context, USEFULL may prefer a custom OTP flow (generate code server-side, send via Twilio or Firebase Cloud Messaging) rather than Firebase Auth's built-in phone sign-in, to avoid creating a Firebase Auth session on a shared device. A 4-digit code with 5-minute expiry is sufficient for this threat model.

### Fingerprint array storage

Each USEFULL account stores an array of known card fingerprints, not a single fingerprint. The array grows as the student uses different cards or wallet methods:

```
user: {
  phone: "555-1234",
  email: "student@nau.edu",  // optional
  card_fingerprints: ["fp_AAAA", "fp_BBBB", "fp_CCCC"],
  stripe_customer_id: "cus_XXX",
  payment_methods: [
    { pm_id: "pm_XXX", last4: "4242", brand: "visa", exp: "03/28" }
  ]
}
```

The fingerprint lookup on tap is: `WHERE 'fp_XXXX' IN user.card_fingerprints`. This is a simple indexed query.

### Rate limiting

To prevent brute-force OTP attacks on the kiosk, rate-limit SMS sends to:
- 3 OTP attempts per phone number per hour
- 5 OTP sends per kiosk per hour
- 10-second lockout after a failed code entry

### Edge case: shared cards

Family members or roommates may share a credit card. Both try to create USEFULL accounts with the same card. The fingerprint will match the first person's account on the second person's tap. Options:
- Allow it: one card, one account. The card owner is responsible. This is the simplest model and probably correct for USEFULL — the cardholder is the liable party.
- Block it with a warning: "This card is already linked to an account. Use a different card or contact support."
- Support it with a multi-user model: one card, multiple accounts. Higher complexity, probably not worth it for V1.

Recommended: allow it for V1. One card = one account = one liable party. If two people want separate accounts, they need separate cards.

---

## Updated Slide Content

### How It Works: Checkout Flow

**FIRST VISIT**

```
Scan containers → Tap card → Enter phone → Verify (SMS) → Card saved
```

Student taps credit card or mobile wallet, enters phone number, verifies via SMS code. Stripe saves the card via SetupIntent — no charge. USEFULL creates an account linked to the phone number and card fingerprint.

**REPEAT VISIT — SAME CARD**

```
Tap card → Fingerprint match → Instant checkout
```

Card tap alone identifies the student — no phone number, no app, no login. Stripe fingerprint matches the saved account.

**REPEAT VISIT — WALLET SWITCH**

```
Tap wallet → No fingerprint match → Enter phone → Card details match → Checkout
```

If a student switches from physical card to Apple Pay (or vice versa), fingerprints differ. Phone number lookup + card metadata match links the new credential. One-time friction; future taps with either method are instant.
