# USEFULL default-card re-tap — React Native handoff

This package is the implementation reference for the returning-user flow where a customer presents a credit card that is not already linked to their USEFULL account.

The intended interaction is deliberately two-phase:

1. Ask whether the newly presented card should replace the current default card.
2. If the customer chooses **Update card**, start the Stripe reader immediately and replace the decision UI with the reader-waiting UI.

There is no second on-screen Update/Confirm action. The second physical presentation of the card is the confirmation.

## Package contents

- `reader-tap-illustration.svg` — animated, resolution-independent source artwork. It contains no raster images.
- `react-native/ReaderTapIllustration.tsx` — static `react-native-svg` implementation of the artwork. Add motion with the values in `implementation-spec.json`.
- `implementation-spec.json` — machine-readable copy, tokens, dimensions, motion, states, and event behavior.
- `reference/decision-portrait.png` — initial default-card decision at 800 × 1280.
- `reference/waiting-portrait.png` — active reader state at 800 × 1280.
- `reference/waiting-landscape.png` — active reader state at 1280 × 800.

## Required state behavior

```text
UPDATE_DEFAULT_CARD_DECISION
  ├─ Update card ──> start reader collection immediately
  │                  └─> WAITING_FOR_CARD
  │                         ├─ matching card presented ──> link/set default ──> success
  │                         ├─ reader error ──> show Stripe-provided recovery message
  │                         └─ Cancel ──> cancel reader action + reset checkout
  ├─ Keep current card ──> do not change default ──> success
  └─ Cancel ──> abandon/reset checkout
```

Do not place a tappable button in the waiting state other than **Cancel**. “Tap or insert your card” is an instruction, not a button.

## Exact copy

### Decision

- Title: `Update default card?`
- Body: `Use {newBrand} *{newLast4} for future late or lost fees?`
- Current method: `Current card: {currentBrand} *{currentLast4}`
- Primary: `Update card`
- Secondary: `Keep current card`
- Cancel: `Cancel` — gold/orange outlined button

### Waiting for the physical card

- Title: `Tap or insert your card`
- Body: `Use {newBrand} *{newLast4} again to confirm.`
- Only button: `Cancel`

Do not add “Reader ready,” a spinner, another Update button, or explanatory security copy.

## Illustration intent

- The card moves horizontally toward the reader.
- The three teal contactless waves pulse while the reader is collecting.
- The reader is pitched backward around its horizontal axis. It is symmetrical left-to-right: no sideways rotation, yaw, or diagonal roll.
- The far edge of the reader is narrower than the near edge.
- The reader and tap symbol are simplified vectors, not product photography.
- The tap mark contains an oval, three contactless waves, a small card, and one simplified hand silhouette.

The source viewBox is `430 × 190`. Preserve its aspect ratio. Do not redraw it from the screenshots when either supplied vector source is available.

## React Native implementation notes

- Dependency: `react-native-svg`.
- Render `ReaderTapIllustration` at approximately `430 × 190` logical pixels on the 800 × 1280 layout; allow it to shrink proportionally on smaller devices.
- Use the included League Spartan font for titles and buttons. Use Proxima Nova for supporting copy.
- When the user taps **Update card**, call the Stripe collection operation before or concurrently with entering the waiting state. The waiting screen must mean the reader is actually accepting input.
- Drive completion from the Stripe reader callback/event, not from a hidden timer or an illustration tap.
- Prototype-only behavior: the visible reader artwork is also an invisible tap zone that advances to success. Do not reproduce this shortcut in production React Native code.
- On decision-screen **Cancel**, reset the checkout. On waiting-screen **Cancel**, cancel the in-flight Stripe reader action before resetting the local checkout state.
- Surface Stripe reader prompts such as retry, insert, or remove card in the same instruction region. Do not open another confirmation modal.
- For reduced motion, render the card at its neutral position and keep all three waves visible without animation.

## Source-of-truth prototype

- Waiting screen markup and vector paths: `v4.html`, `STATE.UPDATE_DEFAULT_CARD`
- State transition helpers: `core-v4.js`, `beginUpdateDefaultCardConfirmation()` and `handleUpdateDefaultCardTap()`

The files inside this folder are self-contained so the React Native implementation does not need to parse the prototype.
