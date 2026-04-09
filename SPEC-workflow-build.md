# USEFULL Kiosk — Full Workflow Build Spec

## Architecture: Shared Engine, Variant Skins

### Goal
Support multiple visual themes (currently 2, expect 3-5 total) that share a common state machine and business logic, while allowing each variant to diverge in markup, CSS, copy, and which flows it implements.

### File Structure

```
core.js                 ← shared engine (state machine, timers, simulation,
                           container catalog, keypad, branding, debug mode)
green-bars.html         ← renamed from index.html. Original theme with topbar,
                           footer, stepper, status tile. Links core.js + own CSS/render.
two-buttons.html        ← existing. Two payment zones, counter pill, countdown ring,
                           settings wheel. Links core.js + own CSS/render.
variant-N.html          ← future variants follow same pattern.
styles-green-bars.css   ← theme CSS for green-bars (current styles.css, renamed)
backup/pre-refactor/    ← snapshot of index.html, app.js, styles.css, two-buttons.html
                           before this refactor
screenshots/            ← dev screenshots moved out of repo root
```

### How core.js Works

core.js exposes everything as globals (no ES modules, no bundler — keeps it iPad PWA friendly).

**core.js provides:**
- `STATE` constants: SCAN, PROGRAM_OVERVIEW, IDENTIFIER_ENTRY, OTP_VERIFY, ACCOUNT_LOOKUP, ACCOUNT_FOUND, SMS_CONFIRM_METHOD, SUCCESS_NEW, SUCCESS_RETURNING, ERROR_CAMPUS, ERROR_FROZEN
- `PAYMENT_MODE` constants: CAMPUS, CREDIT
- `CREDIT_SCENARIO` constants: NEW_USER, RETURN_SAME_EXACT, RETURN_SAME_UNDERLYING, RETURN_DIFFERENT_CARD
- `BRANDING_PROFILES` — college branding data
- `CONTAINER_CATALOG` — container names, types, icons
- State variables: `appState`, `containerCount`, `activeUserName`, `checkoutDate`, `paymentMode`, `creditScenario`, `currentFlow`, `identifierValue`, `otpValue`, `checkoutLocked`, `scanNoticeMessage`, etc.
- State transition functions: `setState()`, `handleScan()`, `handleIdTap()`, `beginCreditScenarioFlow()`, `resetSession()`
- Timer management: `resetTimers()`, `startCountdown()`, `stopCountdown()`, `scheduleAutoReset()`
- Simulation engine: `startSimulation()`, `cancelSimulation()`
- Keypad: `handleKeypadInput()`, `formatPhoneNumber()`, `renderKeypad()`
- Utilities: `formatDueDate()`, `computeDueDate()`, `getDueDateString()`, `getScannedContainerItems()`, `getBrandingProfile()`
- Scroll guards: `installScrollGuards()`
- Debug mode: `debugEnabled`, `jumpTo(stateName)`

**Each variant provides (and core.js calls):**
- `window.render()` — core calls this after every state change
- `window.onCoreReady()` — called after core initializes; variant wires up its event listeners here
- Variant registers its `screen` element: `core.setScreenElement(el)`

**The contract:**
1. core.js loads first (`<script src="core.js"></script>`)
2. Variant script defines `window.render` and `window.onCoreReady`
3. Variant script calls `core.boot()` which calls `resetSession()` which calls `render()`

### How a Variant Picks What to Implement

A variant's `render()` function has a `switch(appState)` block. If the variant doesn't implement a state (e.g., two-buttons doesn't have IDENTIFIER_ENTRY yet), it simply doesn't have that case — it can show a fallback or skip it. The variant controls what flows are accessible via its settings UI.

Adding a new variant = copy the closest existing variant's HTML, change the render functions and CSS. The engine works underneath without changes.

---

## Settings Panel

All variants use the **settings wheel** pattern (gear icon, bottom-left, popover on click). No more footer mode bar.

### Settings Fields

| Field | Options | Notes |
|---|---|---|
| College | Pioneer State University, Northern Arizona University | Controls branding throughout |
| ID Outcome | Returning User, New User, User Not Found, Account Frozen | Campus card tap result |
| Payment Mode | Campus Card, Credit Card | Which flow to run |
| Credit Scenario | New User, Return same exact method, Return same underlying card, Return different card | Shown when Payment Mode = Credit |
| Card Brand | Visa, Mastercard, Amex | Cosmetic, for demo. Shown when Credit |
| Last 4 | Text input, default "1234" | Shown when Credit |
| Containers | 1-5 | Simulation count |
| First delay | 1s, 2s, 3s, 5s | Simulation timing |
| Between scans | 1s, 2s, 3s, 5s | Simulation timing |
| Before ID | 1s, 2s, 3s, 5s | Simulation timing |
| Debug Mode | Toggle | See Debug Mode section |
| [Simulate] | Button | Runs simulation |
| [Reset] | Button | Calls resetSession() |

---

## Debug Mode

Activated via `?debug=1` URL parameter OR toggle in settings popover.

When active:
- **All auto-reset timers disabled** — success, error, and idle screens stay put until manually dismissed
- **"Jump to" dropdown** in settings popover — lists every state. Selecting one immediately renders that screen with mock data (2 containers, name "Cody", Visa 1234, etc.)
- **`jumpTo(stateName)` console function** — same as dropdown, usable from browser console
- **Visual "DEBUG" badge** in corner
- **Hotspot debug overlays** enabled (green/blue translucent tap zones)
- Countdown ring/bar still renders but does not trigger auto-reset

---

## Complete Screen Specs

### Screen 1: Idle (SCAN state, 0 containers)

**Purpose:** Attract attention, instruct user to scan containers.

**Layout (two-buttons style):**
- Brand strip: USEFULL logo (left) + T&C link (right)
- Hero: large title "Scan your USEFULL containers" (left) + scanner illustration with animated hand (right)
- Settings wheel (bottom-left)

### Screen 2: Scanning (SCAN state, 1+ containers)

**Purpose:** Show scanned count, present payment options.

**Layout (two-buttons style):**
- Brand strip: USEFULL logo (left) + T&C link + countdown ring (right)
- Scan notice area (red text, for errors like "scan containers first")
- Heading: "Now finish checking out with..."
- Two payment zones side-by-side:
  - **Campus card zone** (teal-light bg): HID reader sketch + NFC animation + "{CampusCard}" + "Tap your card or mobile ID"
  - **"or" pill** (centered between zones)
  - **Credit card zone** (subtle gray bg): Stripe reader sketch + NFC animation + "Credit Card" + "Tap or insert at the card slot"
- "or keep scanning containers" text
- Teal counter pill: "{count} CONTAINERS scanned"
- Settings wheel (bottom-left)

### Screen 3: Program Overview — New Campus User (PROGRAM_OVERVIEW)

**Purpose:** Explain how USEFULL works, get T&C consent.

**Layout:**
- Brand strip: USEFULL logo only
- Centered card layout
- **Title:** "Welcome to USEFULL, {name}!"
- **Subtitle:** "You're checking out {count} containers at {shortName}."
- **Info row — 4 summary cards** (compact, side-by-side):
  1. Calendar icon — **2 DAYS FREE** — "No charge if returned on time"
  2. Dollar icon — **$1 / DAY LATE FEE** — "Applies after day 2"
  3. Warning icon — **LOST AFTER 15 DAYS** — "Charged $17 cup / $25 bowl (max)"
  4. Card icon — **{CAMPUSCARD} BILLING** — "All fees charged automatically"
- **Due date badge** (green bg): RETURN BY {date}
- **Buttons:** Accept & Continue (primary) | Cancel (outline/secondary)
- **Consent text:** "By tapping 'Accept & Continue,' you agree to the Terms & Conditions." (T&C is a link opening the terms modal)

**Notes:**
- The info row must include replacement costs and the campus card name — this was missing in the two-buttons version
- Icon images already exist at `images/interface-icons/icon-duedate.png`, `icon-fee.png`, `icon-lost.png`, `icon-card.png`

### Screen 3b: Program Overview — New Credit Card User

Same as Screen 3 except:
- **Card 4:** "CREDIT CARD BILLING" — "Late or lost fees bill to {cardBrand} {last4}"
- Reached via: scan -> card tap -> phone entry -> account lookup (no account found) -> this screen

### Screen 4: Success — New User (SUCCESS_NEW)

**Purpose:** Confirm checkout, show details, promote app.

**Layout:**
- Green checkmark circle
- **Title:** "Welcome to USEFULL!"
- **Body:** "You checked out {count} containers."
- **Payment method line:** "Charged to {PioneerCard}" or "Charged to {cardBrand} ***{last4}"
- **Due date badge** (green): RETURN BY {date}
- **Container list** (scrollable if many): each row = icon + container name + container type
  - Uses CONTAINER_CATALOG data
  - Example: [16oz cup icon] Giant Platinum Finch — 16oz cup
- **App promo:** "Want reminders and impact stats?" + "Get the USEFULL app" link + QR code
- **Auto-resets** after SUCCESS_RESET_MS (5s) unless debug mode is on

### Screen 5: Success — Returning User (SUCCESS_RETURNING)

Same layout as Screen 4 except:
- **Title:** "You're all set, {name}!"

### Screen 6: Error — Campus User Not Found (ERROR_CAMPUS)

**Layout:**
- Red circle icon (exclamation)
- **Title:** "We couldn't find your campus account"
- **Body:** "Please contact support@usefull.us for help."
- **Button:** "Try Again" (calls resetSession)
- Auto-resets after ERROR_RESET_MS (8s) unless debug mode

### Screen 7: Error — Account Frozen (ERROR_FROZEN)

**Layout:**
- Red circle icon
- **Title:** "Account on hold"
- **Body:** "Please pay outstanding fees to continue. Questions? support@usefull.us"
- **Button:** "Done" (calls resetSession)
- Auto-resets after ERROR_RESET_MS (8s) unless debug mode

### Screen 8: Identifier Entry (IDENTIFIER_ENTRY)

**Purpose:** Collect phone number for credit card flows.

**Layout:**
- Brand strip
- Centered auth card
- **Label chip:** "Credit card checkout"
- **Title** (varies by scenario):
  - New user: "Create or find your account"
  - Return, same underlying: "Verify your account"
  - Return, different card: "Verify your account"
- **Body** (varies):
  - New user: "Enter your mobile number to create a new account or link this card to an existing USEFULL account."
  - Return, same underlying: "Enter your mobile number so we can link this wallet to your account."
  - Return, different card: "Enter your mobile number so we can look up your account before confirming this new card."
- **Phone display:** formatted as (___) ___-____ filling in as digits entered
- **Numeric keypad** (3x4 grid: 1-9, Clear, 0, Delete)
- **Buttons:** Continue (disabled until 10 digits) | Cancel

### Screen 9: Account Lookup (ACCOUNT_LOOKUP)

**Purpose:** Brief loading transition while "looking up" the phone number.

**Layout:**
- Brand strip
- Centered card
- Spinner / loading animation
- **Text:** "Looking up {formatted phone}..."
- **Cancel** button (subtle, below)
- **Auto-advances** after configurable delay (default 1.5s, settable in debug/settings)
- Transitions to:
  - ACCOUNT_FOUND (if returning user scenario)
  - PROGRAM_OVERVIEW credit variant (if new user, no account found)

### Screen 10: Account Found (ACCOUNT_FOUND)

**Purpose:** Confirm we matched the right person before proceeding.

**Layout:**
- Brand strip
- Centered card
- User initial circle (large "C" for Cody, teal bg)
- **Title:** "We found your account!"
- **Details:** Name: Cody | Phone: ***3456 | Member since 2024
- **Button:** "Continue as Cody" (primary)
- **Link:** "Not you? Try a different number" (resets to IDENTIFIER_ENTRY)
- **Cancel** button

### Screen 11: SMS Confirm New Payment Method (SMS_CONFIRM_METHOD)

**Purpose:** Confirm the user wants to add a new/different payment method.

**Layout:**
- Brand strip
- Centered card
- **Title:** "Add this payment method?"
- **Card display:** "{cardBrand} ***{last4}" or "Apple Pay ({cardBrand} ***{last4})"
- **Body:** "We'll send a confirmation code to ***3456"
- **Button:** "Send Code" (primary) -> transitions to OTP_VERIFY
- **Cancel** button

### Screen 12: OTP Verify (OTP_VERIFY)

**Purpose:** Verify identity via SMS code.

**Layout:**
- Brand strip
- Centered auth card
- **Label chip:** "Verify with SMS"
- **Title:** "Enter the code we sent"
- **Body** (varies by context):
  - New user: "We sent a 6-digit code to {formatted phone}."
  - Different card: "This card does not match the payment method on file. To protect the account, verify the phone number ending in {last4phone}."
  - Same underlying: "Confirm linking this wallet to your account. We sent a code to ***{last4phone}."
- **6-digit OTP boxes** (fill as digits entered)
- **Numeric keypad**
- **Buttons:** Verify & Continue (disabled until 6 digits) | Cancel

### Terms & Conditions Modal

**Reused across all variants. Triggered by T&C links anywhere.**

**Layout:**
- Overlay with centered panel
- Header: "USEFULL Terms & Conditions" + close (X) button
- Tabs: Summary | Full Terms
- Scrollable body
- QR code: "Scan to view on your phone"

---

## Credit Card Flow Paths

```
NEW USER:
  SCAN -> card tap -> IDENTIFIER_ENTRY (enter phone)
       -> ACCOUNT_LOOKUP (spinner, ~1.5s)
       -> no account found
       -> PROGRAM_OVERVIEW (credit variant, with credit card billing info)
       -> Accept & Continue
       -> OTP_VERIFY (verify phone)
       -> SUCCESS_NEW

RETURN - SAME EXACT METHOD:
  SCAN -> card tap -> SUCCESS_RETURNING (instant, card recognized)

RETURN - SAME UNDERLYING CARD:
  SCAN -> card tap -> IDENTIFIER_ENTRY (enter phone)
       -> ACCOUNT_LOOKUP -> ACCOUNT_FOUND ("Continue as Cody")
       -> SMS_CONFIRM_METHOD ("Link this Apple Pay?")
       -> OTP_VERIFY
       -> SUCCESS_RETURNING

RETURN - DIFFERENT CARD:
  SCAN -> card tap -> IDENTIFIER_ENTRY (enter phone)
       -> ACCOUNT_LOOKUP -> ACCOUNT_FOUND
       -> OTP_VERIFY ("Card doesn't match, verify via SMS")
       -> SMS_CONFIRM_METHOD ("Add Mastercard ***5678?")
       -> SUCCESS_RETURNING
```

## Campus Card Flow Paths

```
RETURNING USER:
  SCAN -> ID tap -> SUCCESS_RETURNING (instant)

NEW USER:
  SCAN -> ID tap -> PROGRAM_OVERVIEW (campus variant)
       -> Accept & Continue -> SUCCESS_NEW

USER NOT FOUND:
  SCAN -> ID tap -> ERROR_CAMPUS

ACCOUNT FROZEN:
  SCAN -> ID tap -> ERROR_FROZEN
```

---

## Cancel Button Behavior

**Every screen except idle gets a Cancel button** that calls `resetSession()` — clears all state, returns to idle scan screen.

- Program overview: Accept & Continue | **Cancel**
- Identifier entry: Continue | **Cancel**
- Account lookup: **Cancel** (also auto-advances)
- Account found: Continue as Cody | **Cancel** (+ "Not you?" link)
- SMS confirm: Send Code | **Cancel**
- OTP verify: Verify & Continue | **Cancel**
- Error screens: Try Again / Done (functionally same as cancel)
- Success screens: auto-reset timer (no cancel needed, but tapping settings wheel still works)

---

## Implementation Order

### Phase 1: Extract core.js
1. Pull all shared logic out of app.js into core.js
2. Define the variant contract (render, onCoreReady, boot)
3. Refactor index.html (green-bars) to use core.js — verify nothing breaks
4. Refactor two-buttons.html to use core.js — verify nothing breaks
5. Both variants should work identically to before, just with shared engine

### Phase 2: Add new states to core.js
1. Add ACCOUNT_LOOKUP, ACCOUNT_FOUND, SMS_CONFIRM_METHOD to STATE enum
2. Implement state transition logic for all credit card flow paths
3. Add debug mode infrastructure (jumpTo, timer bypass, debug badge)
4. Add settings state for card brand, last 4, account lookup delay

### Phase 3: Build screens in two-buttons variant
1. Program overview (enriched with info cards, campus card billing)
2. Success screens (enriched with container list, payment method, app QR)
3. Identifier entry + keypad
4. Account lookup (loading screen)
5. Account found
6. SMS confirm method
7. OTP verify
8. Wire settings popover with payment mode, credit scenario, card brand, last 4, debug toggle, jump-to dropdown
9. Error screens with buttons

### Phase 4: Port to green-bars variant
1. Bring credit card screens into green-bars render functions
2. Replace footer mode bar with settings wheel
3. Adapt markup to green-bars visual style

---

## Backup & Recovery

Pre-refactor snapshots saved to `backup/pre-refactor/`:
- index.html
- app.js
- styles.css
- two-buttons.html
- manifest.webmanifest

If the refactor goes sideways, restore with:
```bash
cp backup/pre-refactor/index.html . && cp backup/pre-refactor/app.js . && cp backup/pre-refactor/styles.css . && cp backup/pre-refactor/two-buttons.html .
```
