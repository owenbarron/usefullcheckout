# USEFULL Appless Checkout: Hardware & Payments Architecture Deep Dive

**Date:** March 28, 2026

---

## Executive Summary

USEFULL can build a unified tablet-kiosk platform for appless container checkout that serves campus cards, credit cards, and QR codes through a single Android app with swappable peripheral hardware and per-campus configuration. Every piece of the stack exists commercially today.

**The seven strategic research questions, answered:**

1. **Can HID readers standardize the campus-card use case?** Yes. The HID OMNIKEY 5427CK Gen2 (~$85 at volume) reads every major US campus credential technology — HID Prox, iCLASS, SEOS, MIFARE DESFire, and Apple Wallet student IDs. It covers NAU, UCSC, and ~95%+ of US campuses.

2. **How often will USEFULL need campus-specific reader substitutions?** Rarely. The only exceptions are pure FeliCa campuses (Japanese institutions) or proprietary mobile-only credentials without NFC pass-through — neither is common in the US.

3. **Is the viable Boulder path account-based, accountless, or both?** Account-based first. The "accountless" model still requires saving a card to enforce USEFULL's fee logic, making it architecturally identical to account-based under the hood. Ship account-based; offer accountless as a guest-checkout presentation layer.

4. **Can Stripe-compatible hardware handle credit-card campuses cleanly?** Yes. The Stripe Reader M2 ($59, USB to Android tablet) handles contactless/chip/swipe. Stripe Terminal's SetupIntent flow saves a card as a reusable payment method without charging. Card fingerprinting enables "tap and go" returning-user recognition.

5. **Can USEFULL authenticate an account from a card tap without processing cards?** Yes. Stripe Terminal returns a `fingerprint` hash that uniquely identifies a card number — USEFULL never sees the raw PAN. The limitation: Apple Pay / Google Pay fingerprints don't match physical card fingerprints, so ~60-70% of college-age wallet users need a phone/email fallback.

6. **Can a single authorization support a dripfeed fee model?** No. Standard Stripe captures are single-capture. Multicapture exists but requires IC+ pricing and creates confusing bank statements. The recommended approach: save the card via `generated_card` and charge off-session as fees accrue, or simplify to a full-replacement-amount hold that's voided on return.

7. **Is there a credible hybrid kiosk configuration?** Yes. No off-the-shelf product combines all USEFULL's peripherals, but the combination of a Samsung Galaxy Tab + LAVA SimulCharge adapter + modular peripherals (HID reader, Stripe M2, QR scanner) in a Lilitab or ArmorActive enclosure is proven and costs ~$1,400 per station.

---

## 1. Campus Card Readers: HID OMNIKEY 5427CK Is the Standard

### The campus card landscape

US university credentials span several technologies. The most common, in rough order of installed base: HID Prox (125 kHz, legacy, unencrypted, still at hundreds of campuses including UC Santa Cruz); HID iCLASS / iCLASS SE (13.56 MHz, the workhorse of mid-2010s deployments); HID iCLASS SEOS (HID's newest, 128-bit AES, designed for mobile credential portability); and NXP MIFARE DESFire EV2/EV3 (open-standard alternative growing at campuses using Wavelynx LEAF readers). Magnetic stripe persists at some locations for non-access functions.

The two dominant campus card platforms are Transact (formerly Blackboard, now merged with CBORD as "Illumia") and TouchNet (Global Payments). Transact claims 85%+ market share in mobile student ID credentials, with over 2.75 million mobile credentials issued at 100+ institutions. The critical trend is mobile credentials: at NAU, ~70% of students use mobile JacksCard (Apple Wallet), and 90%+ of freshmen opt for mobile over physical.

### Why OMNIKEY 5427CK, not TripTick

Research found no HID TripTick "ATR-15" in any public listing, datasheet, or press release. The TripTick family (acquired from Access-IS) consists of the ATR200 (QR only), ATR210 (QR + NFC), and ATR220 (QR + NFC + EMV payments), all targeted at transit kiosks. The ATR210 reads standard ISO 14443 NFC cards but does not support HID iCLASS, SEOS, HID Prox, or Apple Enhanced Contactless Polling (ECP) — making it poorly suited for campus cards. If USEFULL received a pre-production unit labeled "ATR-15," it may be a custom early variant; clarification from HID's campus team is warranted.

The HID OMNIKEY 5427CK Gen2 is the clear winner:

| Spec | Detail |
|------|--------|
| Model | R54270101 (standard) / R54270111 (with Bluetooth) |
| Frequencies | 125 kHz + 13.56 MHz dual-frequency simultaneous |
| Credentials | HID Prox, iCLASS, iCLASS SE, iCLASS SEOS, MIFARE Classic, DESFire EV1/EV2, Apple Wallet (ECP), HID Mobile Access (BLE on BT variant) |
| Interface | USB 2.0 Type-A (powers via USB) |
| Modes | CCID (driverless smart card) and Keyboard Wedge (keystrokes) |
| Dimensions | 71 × 93 × 16 mm |
| Android support | Official OMNIKEY Android Driver (AAR library), USB OTG, Android 7.0+ |
| Price (1 unit) | ~$90–123 |
| Price (100+ units) | ~$85 |
| Price (500+ units) | ~$83 |

This single reader covers every campus card technology USEFULL will encounter across US universities. Stanford uses the OMNIKEY 5427CK as their campus card reader standard. An OEM board version (OMNIKEY 5127CK Mini) exists for deeper kiosk embedding.

**Keyboard Wedge mode is the fastest integration path**: configure the reader to output the Card Serial Number (CSN) as keystrokes — the Android app receives a text string, looks up the user in USEFULL's database, done. No SDK integration needed for basic operation. For advanced use, HID provides a CCID-based Android SDK.

**CSN vs. secure read**: reading just the CSN is unencrypted but sufficient for USEFULL's use case — mapping a unique card number to a student account for container checkout. Reading secured card sectors (encrypted iCLASS/SEOS data) requires each campus's encryption keys, which is impractical for a third-party kiosk. CSN-based identification is the standard approach for campus food service integrations.

### NAU and UCSC specifics

**NAU (JacksCard)**: TouchNet OneCard platform, HID readers, Apple Wallet support (first public AZ university), ~90% iPhone campus population. Mobile credentials provisioned via Apple Wallet and NAUgo app (Android). The OMNIKEY 5427CK needs proper ECP configuration to read Apple Wallet JacksCards — this requires coordination with NAU's card office for TCI configuration values.

**UC Santa Cruz (SlugCard)**: CBORD platform, HID Prox 125 kHz physical cards. No mobile credential deployment found. No Apple/Google Wallet integration. The OMNIKEY 5427CK reads Prox cards natively via simple CSN read.

### When HID readers won't work

Situations where OMNIKEY 5427CK won't read campus credentials are rare in the US. Pure DESFire/LEAF campuses (Wavelynx installs like UGA) still use ISO 14443A cards that OMNIKEY reads at the CSN level. The only problematic scenarios: campuses using proprietary mobile-only credentials without NFC pass-through, or very rare FeliCa-based systems (Japanese institutions). Wavelynx Ethos and HID Signo readers are access-control devices (Wiegand/OSDP protocol) and not USB-connectable to tablets. For practical purposes, the OMNIKEY 5427CK covers ~95%+ of US campus card ecosystems.

---

## 2. Stripe Terminal Handles Credit-Card Campuses — Including Tokenization, Identity, and Fee Enforcement

### Hardware: Stripe Reader M2 at $59

| Reader | Price | NFC | Chip | Swipe | Display | Connectivity | Best for |
|--------|-------|-----|------|-------|---------|-------------|----------|
| Reader M2 | $59 | ✅ | ✅ | ✅ | None | Bluetooth, USB | Kiosk peripheral (tablet shows UI) |
| WisePOS E | $249 | ✅ | ✅ | ✅ | 5" touch | WiFi, Ethernet | Standalone payment point |
| Reader S700 | $349 | ✅ | ✅ | ✅ | 5.5" 1080p | WiFi, Ethernet | Premium kiosk with custom apps |
| Reader S710 | Contact sales | ✅ | ✅ | ✅ | 5.5" 1080p | WiFi, Ethernet, 4G LTE | Outdoor/stadium where WiFi is unreliable |

For USEFULL's kiosk, the M2 via USB to the Android tablet is the recommended configuration: reliable wired connection, cheapest hardware, and the tablet handles all UI. USB connectivity is Android SDK–only (not available on iOS), which aligns with USEFULL's Android kiosk platform.

### Stripe Terminal Android SDK (v5.3.0)

The SDK is at version 5.3.0 with Kotlin coroutines support. Gradle dependency: `com.stripe:stripeterminal:5.3.0`. Two open-source example apps (Java + Kotlin) are available on GitHub. The v5 SDK simplified the API significantly — `processPaymentIntent()` combines collect + confirm into a single call, and `easyConnect()` handles discovery + connection.

Reader connectivity from Android: M2 works via Bluetooth or USB. Smart readers (S700, WPE) connect over WiFi/local network only — they cannot pair via Bluetooth or USB to a tablet.

### Saving a card without charging: SetupIntents

Stripe Terminal supports `SetupIntents`, which save a card as a reusable payment method without creating any charge:

1. Create a Stripe Customer on USEFULL's backend
2. Create a SetupIntent with `payment_method_types: ["card_present"]`
3. User taps card on M2 reader
4. SDK calls `processSetupIntent()` — card is encrypted at the reader, sent to Stripe, and a `generated_card` PaymentMethod is created and attached to the Customer
5. No charge occurs. USEFULL now has a reusable card on file.
6. If container isn't returned → create a PaymentIntent using the saved `generated_card` to charge the fee off-session

The `generated_card` is critical: the physical `card_present` PaymentMethod from the tap is not directly rechargeable online. Stripe automatically creates a parallel `generated_card` (type `card`) that IS reusable for future off-session charges. These later charges process at card-not-present rates (2.9% + 30¢), not the lower card-present rate (2.7% + 5¢).

### Card-tap-as-identity: fingerprint-based account lookup

Stripe's `fingerprint` attribute uniquely identifies a card number and remains consistent across all taps of the same physical card within the same Stripe account. USEFULL never sees the raw card number — only the fingerprint hash. This is not "processing cards" in the PCI sense; it's looking up a token.

**The flow for "card-as-identity":**

1. Student taps card on M2
2. Stripe M2 encrypts → sends to Stripe servers
3. Stripe returns `card_present` PaymentMethod to USEFULL app (contains fingerprint, last4, brand, expiry — NOT the PAN)
4. USEFULL backend: `SELECT user WHERE card_fingerprint = ?`
5. If found → "Welcome back" → checkout
6. If not found → "New user" → collect phone/email → SetupIntent → save card

No SetupIntent or PaymentIntent is needed just for the lookup itself, but Stripe Terminal requires that you create some intent to initiate a card read. The lightest option is to create a SetupIntent, read the fingerprint, and cancel it if the user is already known (no charge, no new PM created).

**Critical limitation: wallet fingerprint inconsistency.** Wallet-based taps (Apple Pay, Google Pay) use device-specific tokenized card numbers (DPANs), which may produce different fingerprints from the physical card. Stripe's documentation explicitly states that wallet fingerprints don't share a fingerprint with cards used online or via other presentation methods. In practice, ~60-70% of college students default to Apple Pay for contactless. This is a significant fraction that won't get the seamless "tap and go" repeat experience if they switch between wallet and physical card.

**Recommended repeat-visit architecture:**

1. Primary: fingerprint match → instant checkout
2. Fallback 1: last-4 digits + expiry match (less secure but catches wallet/physical switches for the same underlying card)
3. Fallback 2: phone number keypad entry (10 digits, fast)
4. If the student always uses the same wallet, the `card_present` fingerprint should be consistent across taps of that specific wallet. The inconsistency only arises when switching presentation methods.

### PCI compliance is minimal

All Terminal transactions use end-to-end encryption (E2EE) — card data is encrypted at the reader and USEFULL's app never sees raw card numbers. Only tokens and PaymentMethod objects are returned. An optional P2PE (point-to-point encryption) upgrade adds HSM-based decryption for +5¢ per authorization, qualifying USEFULL for the simplest SAQ P2PE questionnaire. Without P2PE, USEFULL completes a basic SAQ through Stripe's Dashboard wizard. No SAQ-D (300+ questions) is required in either scenario. USEFULL stays fully out of PCI scope.

### CU Boulder specifics

CU Boulder dining is self-operated by Campus Dining & Hospitality — not contracted to Aramark, Sodexo, or Chartwells. This gives USEFULL more flexibility since there's no third-party food service vendor gatekeeping. The Buff OneCard uses RFID proximity on a JSA Technologies platform with GET Mobile app support. The campus card system is proprietary and not standard NFC payment — which is why CU Boulder specifically wants credit/debit card checkout rather than campus card integration.

### Why not Square, Clover, or others for payment hardware?

**Square is disqualified**: Square's Mobile Payments SDK explicitly prohibits unattended terminals/kiosks.

**Clover uses Fiserv, not Stripe**: incompatible with Stripe's payment processing. USEFULL would need a separate Fiserv merchant account. However, Clover is the right choice where venues already run Clover POS (Holy Cross) — USEFULL already has a Clover integration plan for pre-auth holds.

**Adyen** has minimum volume requirements likely too high for USEFULL's current scale. **PayPal Zettle** and **SumUp** have limited APIs unsuitable for custom kiosk integration.

---

## 3. Account-Based vs. Accountless: CU Boulder Product Path

### Ship account-based first; offer accountless as guest checkout later

Both models are technically viable, but they converge architecturally because USEFULL's fee model requires a saved payment method regardless. The "accountless" path either simplifies the fee promise to a single binary outcome (hold → void or capture) or saves the card under the hood anyway.

### Path A: Account-Based

The account-based model maps directly to Stripe's `SetupIntent` + `Customer` architecture. First-time users provide a phone number (or email), tap their card, and USEFULL creates a persistent account with a saved `generated_card`. Returning users tap their card and are recognized via fingerprint lookup.

This model preserves USEFULL's existing cron-based fee logic: $1/day late fees after the due date, then remainder up to $17 (cup) or $25 (bowl), all charged via the saved `generated_card` using off-session PaymentIntents.

**The fraud concern with identifier-first lookup** (someone types another person's email to charge their account) is resolved by making card-tap the primary authentication step, not identifier entry. The recommended flow:

1. Student scans containers → taps card
2. System checks fingerprint → if match found, auto-identifies the account
3. If no match, system prompts for phone/email → creates new account → runs SetupIntent
4. Identifier entry alone cannot authorize a checkout — a card tap is always required

### Path B: Accountless

Each checkout is tied to a single card tap event. The student scans containers, taps a card, provides contact info, and takes the containers. No persistent stored payment method.

The core problem: USEFULL's dripfeed fee model requires the ability to charge multiple times after the initial checkout. A single pre-authorization hold does not support this — Stripe's standard captures are one-shot. Once you capture, the auth is done. Multicapture exists (up to 50 captures per PaymentIntent) but requires IC+ pricing, creates confusing bank statement line items, and is designed for split-shipment ecommerce.

**If USEFULL wants to preserve the dripfeed model in an "accountless" flow, it must still save the card** via a SetupIntent that creates a `generated_card`. At that point, it's architecturally identical to account-based — the only difference is presentation.

### Verdict

| Dimension | Account-Based | Accountless |
|-----------|--------------|-------------|
| Dripfeed fee model | ✅ Works via saved `generated_card` | ❌ Requires saving card anyway or simplifying to binary hold/capture |
| Repeat user UX | ✅ Card fingerprint → instant recognition | ❌ Must re-enter contact info every time |
| Contact info | ✅ Collected once, reused | ⚠️ Must collect every checkout |
| Fraud risk | ✅ Card-tap required (possession proof) | ✅ No identifier to spoof |
| Backend alignment | ✅ Maps to existing user/assignment model | ❌ Requires new anonymous-assignment model |

**Recommendation:** Ship account-based for Boulder. Offer "guest checkout" (accountless presentation) as a secondary mode for one-time visitors, with a simplified fee promise: "Return within 2 days or we charge $17/$25."

---

## 4. Fee Models for Credit-Card-First Deployments

USEFULL's current fee logic is backend-driven: cron jobs evaluate active assignments, assess $1/day late fees after the due date, then assess the remainder after ~9 days. Translating this to credit-card-first environments requires understanding what Stripe's authorization and capture mechanics actually support.

### What Stripe supports

| Feature | Auth Window | Captures | Pricing Required | Dripfeed Compatible |
|---------|------------|----------|-----------------|-------------------|
| Standard pre-auth | 2 days (in-person) | 1 | Standard | ❌ |
| Extended auth | Up to 30 days (Visa/MC/Amex) | 1 | Standard | ❌ |
| Incremental auth | Same as base | Auth amount can increase up to 10x | IC+ only | ❌ |
| Multicapture | Same as base | Up to 50 | IC+ only | ⚠️ Technically, but poor UX |
| Saved card + off-session | N/A (card on file) | Unlimited | Standard | ✅ |

### Recommended models by deployment type

**Model 1: Full replacement hold, void on return** (recommended for Boulder first deployment and Holy Cross)

At checkout, place a pre-auth hold for $17 (cup) or $25 (bowl) with extended authorization (up to 30 days). If the student returns the container within the grace period, void the auth — the pending charge disappears from their statement. If not returned, capture the full amount. Voided auths are free. Captured charges cost 2.7% + 5¢.

UX message at kiosk: "We'll place a temporary $17 hold on your card. It's released when you return the container within 2 days."

This maps to the hotel/rental-car mental model students already understand. It's the simplest option: one authorization, one binary decision (void or capture), minimal dispute risk, and no need for saved cards. The tradeoff is losing the psychological nudge of escalating daily fees — but for a first deployment, simplicity wins.

**Model 2: Saved card with full dripfeed** (recommended for Boulder account-based at scale)

At checkout, run a SetupIntent to save the card. No charge. If the container isn't returned, USEFULL's existing cron-based fee logic kicks in: $1/day late fees via off-session PaymentIntents using the saved `generated_card`, then the remainder after ~9 days.

Off-session charges process at card-not-present rates (2.9% + 30¢ per charge). On a $1 fee, that's 33¢ in processing cost — a 33% effective rate. USEFULL should consider consolidating late fees (e.g., charge $3 on day 3 rather than $1/day for three days) to reduce per-transaction overhead.

Requires explicit consent language at the kiosk: Stripe mandates disclosure that the card will be saved for future charges, including the anticipated timing, frequency, and how amounts are determined.

**Model 3: Small deposit + later replacement fee** (the "double charge" structure from the spec — not recommended)

Charge $0.50–1.00 upfront (refundable on return), then charge the full replacement fee later if not returned. This creates the highest operational complexity: refunds take 5–10 business days to appear on statements, students see multiple confusing line items (charge + refund + later fee), and the small deposit is unlikely to meaningfully change return behavior. Behavioral economics research suggests the threshold for loss-aversion-driven behavior change is ~$5+. The extra complexity doesn't justify the marginal behavioral benefit.

**For Holy Cross (stadium, one-time visitors):** Model 1 with a shortened grace window. Auth for $17/$25 at checkout, void on return at stadium exit. If not returned within 24 hours, capture the full amount. This avoids the contactability problem entirely for the simplest cases — no email, no phone, no account needed for visitors who return on-site.

For visitors who take containers off-premises, USEFULL needs contact info. Collect phone number at checkout, send an SMS with return instructions and the "your card will be charged $17 if not returned within 24 hours" warning.

---

## 5. Identity and Contactability

USEFULL today requires email for Firebase accounts. Credit-card-first flows can't assume email is available — a card tap provides no email address. This creates a new product requirement.

### Phone-first is the right kiosk UX for credit-card flows

Phone number is the better primary identifier for kiosk contexts: faster to enter (10-digit keypad vs. typing an email on a tablet), SMS notifications for due dates and late fees are more immediate, students are more likely to have their phone number memorized, and phone numbers are more stable than university email addresses.

USEFULL doesn't need to choose one. The recommended approach:

1. Kiosk UI collects phone number first (10-digit keypad)
2. Backend creates or matches a USEFULL account using phone number as the lookup key
3. Email is collected optionally — either on the kiosk ("enter email for receipt") or via a follow-up SMS ("tap here to add your email")
4. Firebase user record uses phone number as the primary auth method; email is added as a secondary identifier when available

For campus-card-based flows (NAU, UCSC), the campus card system may provide an email address via the card's associated data. If it does (e.g., NAU's TouchNet links JacksCard to student email), USEFULL can auto-populate. If it doesn't (e.g., CSN-only read), USEFULL falls back to phone number collection.

### Firebase schema evolution

Current: `users/{uid}` with `email` as a required field. Proposed: `users/{uid}` with `email` OR `phone` as required (at least one), plus a `card_fingerprints[]` array for credit-card-first users. This is a non-breaking change if USEFULL makes email nullable and adds phone as an alternative required field. Firebase Auth natively supports phone-number-based authentication via SMS verification.

---

## 6. Hybrid Kiosk Configuration

### No off-the-shelf product — but a credible build from proven components

No single commercial kiosk product exists that integrates an HID campus card reader, a payment terminal, a QR scanner, and an Android tablet in one enclosure. The closest products are Elo Pay (integrated NFC SoftPOS + optional scanner, ~$2,000+) and Eflyn QuickServe Now (campus OneCard + credit card, quote-based), but neither matches USEFULL's exact peripheral requirements. This is a genuinely novel configuration that differentiates USEFULL's offering.

### The LAVA SimulCharge adapter is non-negotiable

Standard Android USB OTG mode forces the tablet to run on battery when acting as USB host. For 24/7 kiosk operation, this is unacceptable. LAVA Computer MFG makes the only proven adapters for simultaneous charging + USB host mode on Samsung Galaxy tablets:

| Model | USB-A Ports | Ethernet | PoE | Price |
|-------|-------------|----------|-----|-------|
| eSynC-vc5UE | 5 | Gigabit | ✅ | ~$200–300 |
| eSTS-2UE | 2 | Yes | ❌ | ~$150–200 |
| STS-3U | 3 | No | ❌ | ~$100–150 |

The eSynC-vc5UE is recommended: 5 USB-A ports simultaneously drive HID NFC reader + Stripe M2 (or USB barcode scanner) + spare ports, with Gigabit Ethernet and PoE. It includes Resistive Battery Modulation (RBM) technology that prevents overcharging and battery bloating.

### Enclosure recommendations

**For permanent campus installations — Elo I-Series 4**: Elo's Edge Connect system offers snap-on modular peripherals that attach magnetically to the screen bezel (NFC/RFID adapter, barcode scanner, EMV cradles). Runs Android 12, comes in 10"/15"/22" sizes, managed via EloView MDM. No LAVA adapter needed. Price: ~$800–2,000 depending on screen size, plus ~$150/module.

**For cost-sensitive or pilot deployments — Samsung Galaxy Tab + enclosure**: Samsung Galaxy Tab S9 FE ($350) or Tab A9+ ($220) + LAVA eSynC ($250) + HID OMNIKEY 5427CK ($85) + Stripe M2 ($59) + Honeywell CF4680 QR scanner ($100) + Lilitab Pro or ArmorActive enclosure ($500–800). Total: ~$1,400–1,800 per kiosk.

**For Holy Cross stadium — no checkout kiosk needed at concessions**: Clover POS handles checkout. USEFULL deploys return stations only: tablet + LAVA adapter + QR scanner + enclosure, ~$800–1,200 each.

### Dedicated QR scanner vs. tablet camera

Always use a dedicated scanner for kiosk deployments. Embedded modules like the Honeywell CF4680 (designed for self-service kiosks, vending, stadiums) offer instant decode at 3m/s motion tolerance, optimized illumination for phone screens, and industrial reliability. The tablet camera works as a fallback but is slower and struggles in ambient light.

### Clover: peripheral for venues, not the kiosk brain

Clover cannot serve as the kiosk brain for unattended operation — Clover's documentation states devices are only certified for attended and semi-attended environments per PCI PTS POI rules. However, Clover works well as a semi-integrated payment peripheral via the Clover Connector SDK (available for Android). Clover is NOT compatible with Stripe (uses Fiserv), so USEFULL must maintain separate integration paths.

For Holy Cross specifically, the Clover-native approach (custom Clover Android app on existing POS) is correct per USEFULL's already-documented Clover recommendation: the app detects USEFULL-eligible items, scans container QR codes via Clover's built-in scanner, and places pre-auth holds.

---

## 7. Software Architecture: Plugin Model with Per-Campus Configuration

### The pattern: microkernel with strategy abstraction

Each peripheral is wrapped behind a common `IdentityInputProvider` interface. USEFULL's core app manages workflow, UI, and business logic; each peripheral is a separate plugin. Nadia's existing auto-detecting HID interface already validates this approach.

```
┌─────────────────────────────────────┐
│     USEFULL Kiosk App (UI/Workflow) │
├─────────────────────────────────────┤
│     IdentityInputManager (Core)     │
│     Routes identity events from     │
│     any active peripheral           │
├──────────┬──────────┬───────────────┤
│ HID      │ Stripe   │ QR Scanner    │  ← Plugin Layer
│ Plugin   │ Plugin   │ Plugin        │
├──────────┼──────────┼───────────────┤
│ USB Host │ Terminal  │ Camera/USB    │  ← Vendor SDK Layer
│ API+AAR  │ SDK 5.3  │ ZXing/ML Kit  │
├──────────┴──────────┴───────────────┤
│   Android OS / Samsung Knox / HAL   │
└─────────────────────────────────────┘
```

Each plugin implements a common interface with methods like `initialize()`, `startListening(callback)`, `stopListening()`, and `dispose()`. The `IdentityInputManager` activates only the plugins specified in the campus's configuration. A campus config JSON (loaded from USEFULL's backend at boot) controls which peripherals are active:

```json
{
  "campus_id": "nau",
  "identity_mode": "campus_card",
  "enabled_peripherals": ["hid_reader", "qr_scanner"],
  "payment_processor": null,
  "fee_model": "campus_managed",
  "hid_reader_config": { "mode": "keyboard_wedge", "auto_detect": true }
}
```

vs.

```json
{
  "campus_id": "cu_boulder",
  "identity_mode": "credit_card",
  "enabled_peripherals": ["stripe_terminal", "qr_scanner"],
  "payment_processor": "stripe",
  "fee_model": "full_hold_void_on_return",
  "stripe_config": { "location_id": "tml_XXX", "reader_type": "m2_usb" },
  "contactability": "phone_first"
}
```

This configuration-driven approach means one APK deployed everywhere, with behavior varying per campus.

### Samsung Knox for kiosk lockdown

Knox Platform for Enterprise (KPE) is now free for all Samsung devices (since July 2021). The Knox SDK provides `ProKioskManager` for deep lockdown, `UsbDevicePolicy` for USB device whitelisting by vendor/product ID (auto-approve HID readers without user permission dialogs), and hardware button control. Layer Android Enterprise Dedicated Device mode underneath for OS-level lock task.

Knox Suite Essentials at $24/device/year adds Knox Manage (remote MDM), Knox Mobile Enrollment (zero-touch provisioning), and Remote Support. For 100 kiosks: ~$2,400/year.

### Fleet management: Esper.io

Esper is purpose-built for dedicated Android devices. Its Blueprints feature creates configuration templates per device group — perfect for per-campus profiles. Pipelines provide CI/CD-style app deployment: upload new APK → staged rollout (5% → 25% → 100%) → automatic rollback if crash rate spikes. Includes unbreakable kiosk mode, full remote screen control, self-healing WiFi reconnect, and PCI DSS / SOC 2 Type 2 compliance. At 100 devices × $5/month = $6,000/year.

If USEFULL standardizes exclusively on Samsung tablets, Knox Manage at $24/device/year is a cheaper alternative with native Samsung integration but less developer-friendly APIs and no staged rollout.

### How competitors handle multi-campus variability

Transact Campus uses a unified cloud POS backend with configurable front-end hardware — exactly this pattern. They serve 450+ schools with 1,950+ locations, supporting multiple form factors (POS registers, kiosks, tablets, kitchen displays) connected to their Cloud POS platform. CBORD similarly uses cloud-based configuration with per-campus hardware profiles. The lesson: cloud-first backend with device-agnostic frontend is the proven approach.

---

## Deployment Profiles: Complete Bill of Materials

### Profile A — Campus card sites (NAU, UCSC, most universities)

| Component | Model | Price |
|-----------|-------|-------|
| Tablet | Samsung Galaxy Tab S9 FE (10.9") | $350 |
| SimulCharge adapter | LAVA eSynC-vc5UE | $250 |
| Campus card reader | HID OMNIKEY 5427CK Gen2 | $85 |
| QR scanner | Honeywell CF4680 fixed-mount | $100 |
| Enclosure | Lilitab Pro | $600 |
| **Total per kiosk** | | **~$1,385** |

Identity via campus card CSN. No payment processing at kiosk. Fee enforcement via campus-managed mechanisms.

### Profile B — Credit card sites, account-based (CU Boulder)

| Component | Model | Price |
|-----------|-------|-------|
| Tablet | Samsung Galaxy Tab S9 FE (10.9") | $350 |
| SimulCharge adapter | LAVA eSynC-vc5UE | $250 |
| Payment reader | Stripe Reader M2 (USB) | $59 |
| QR scanner | Honeywell CF4680 fixed-mount | $100 |
| Enclosure | Lilitab Pro | $600 |
| **Total per kiosk** | | **~$1,359** |

First-time: collect phone → SetupIntent → save card. Repeat: card tap → fingerprint lookup → instant checkout. Fee model: full hold with void-on-return (launch), transitioning to saved card + dripfeed (at scale).

### Profile B-Hybrid — Campus card + credit card (future)

| Component | Model | Price |
|-----------|-------|-------|
| Tablet | Samsung Galaxy Tab S9 FE (10.9") | $350 |
| SimulCharge adapter | LAVA eSynC-vc5UE | $250 |
| Campus card reader | HID OMNIKEY 5427CK Gen2 | $85 |
| Payment reader | Stripe Reader M2 (Bluetooth) | $59 |
| QR scanner | Honeywell CF4680 fixed-mount | $100 |
| Enclosure | Lilitab Pro or ArmorActive | $600–800 |
| **Total per kiosk** | | **~$1,500–1,700** |

For campuses that want both campus-card identification and credit-card fallback/guest handling. M2 connects via Bluetooth to free a USB port.

### Profile C — Venue POS integration (Holy Cross concessions)

No USEFULL checkout kiosk at concessions — Clover-native app on existing POS handles checkout (cashier scans container QR, places pre-auth hold). USEFULL deploys return stations only:

| Component | Model | Price |
|-----------|-------|-------|
| Tablet | Samsung Galaxy Tab A9+ (11") | $220 |
| SimulCharge adapter | LAVA eSTS-2UE | $175 |
| QR scanner | Honeywell CF4680 fixed-mount | $100 |
| Enclosure | Lilitab countertop | $500 |
| **Total per return station** | | **~$995** |

---

## Open Items and Next Steps

1. **Clarify the TripTick ATR-15 with HID.** No public product matches this designation. Determine whether it's a custom/pre-production variant and whether it supports iCLASS SEOS and Apple ECP. If not, pivot to OMNIKEY 5427CK for NAU.

2. **NAU Apple Wallet ECP configuration.** Reading mobile JacksCards via OMNIKEY requires TCI configuration values from NAU's card office. This is a business development task, not a technical blocker.

3. **Stripe IC+ pricing evaluation.** If USEFULL wants multicapture or incremental authorization for any deployment, it needs IC+ pricing (negotiated with Stripe). Standard pricing supports everything in the recommended architecture except those two features.

4. **Firebase phone auth implementation.** Add phone-number-based authentication to USEFULL's Firebase Auth configuration. Make email nullable in the user schema. This is a prerequisite for credit-card-first deployments.

5. **Wallet fingerprint consistency testing.** Before committing to fingerprint-as-primary-identity for Boulder, test whether Apple Pay and Google Pay produce consistent `card_present` fingerprints across multiple taps of the same wallet on the same device. Stripe's documentation warns about inconsistency but real-world behavior may be more stable than the docs suggest.

6. **LAVA adapter compatibility testing.** Verify that the LAVA eSynC-vc5UE works with the specific Samsung tablet model selected and that it correctly passes through USB data for both HID OMNIKEY and Stripe M2 simultaneously.

7. **Fee model A/B test plan for Boulder.** Design a test comparing full-hold-void-on-return (Model 1) vs. saved-card-with-dripfeed (Model 2) on return rates, dispute rates, and student satisfaction. Run during the first semester of deployment.
