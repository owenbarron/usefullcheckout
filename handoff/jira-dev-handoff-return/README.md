# USEFULL Return Station Handoff

Latest prototype refresh: `main` at commit `9650afa` (`Return station: enlarge secondary success text, balance wraps`).

This handoff package contains the Return Station tablet prototype — a separate, much simpler UX than the Checkout Station, sharing the same design language. It is built for an **8.7" Samsung Galaxy Tab A9 (SM-X110)** mounted on the return bin, running **portrait, fullscreen, as a PWA**.

## What this screen does

The return flow is self-contained and requires no authentication. A hardware **QR reader** (mounted on the bin, separate from the tablet) scans the QR code on the bottom of a USEFULL container; scanning both **initiates and completes** a return in our system. The tablet only reflects state.

Flow: **Idle → (container scanned at reader) → Success → (auto-dismiss timer) → Idle**

- **Idle:** "Scan to return" + instruction + return-station illustration with a pulsing highlight over the scanner. No buttons, no counter.
- **Success:** confirmation card with a running **session tally** ("N containers returned"). Each new scan re-chimes, increments the tally, runs a brief "pop" animation, and restarts the auto-dismiss timer.
- There is **no Done/Dismiss button** — we don't want users touching the tablet. A small auto-dismiss countdown pill shows in the top-right instead. Users can keep scanning more containers without touching the screen.

## Prototype Source

- `prototype/index.html` — self-contained (inline CSS + JS); the single source of truth
- `prototype/manifest.webmanifest` — PWA manifest (fullscreen, portrait-locked)
- `prototype/returnstation-transparent.png` — return-station rendering used on the idle screen
- `prototype/real-return-station.png` — reference photo of the physical bin (scanner location, tablet mount)

Asset paths in this package point at the bundled `assets/` folder, so the prototype runs standalone. Serve the package root over HTTP (e.g. `python3 -m http.server`) and open `prototype/index.html`.

### Demo controls (settings gear, bottom-left)

- **Wording preset** — Celebratory ("Returned!") or Pending ("Return Pending"). Presets a card color but does not lock it.
- **Card color** — Green / Teal / Golden. Drives the icon cap, card border, and tally-block background together.
- **Auto-dismiss** — seconds before returning to idle, or **Never** (freezes the success screen).
- **Show container name** — optional per-scan container name line (default off).
- **Pop effect on scan**, **Sound effects** — toggles.
- **Device frame (preview)** — wraps the UI in a scaled tablet frame for desktop review. **Off by default** (the PWA runs fullscreen on the tablet). `?frame=1` starts framed.
- **Simulate container scan** — the golden cup button next to the gear (keyboard `S` also scans). Press `H` or tap the logo to hide the demo controls for clean screenshots.

## Screenshots

All screenshots are in `screenshots/`, captured at the tablet's native **800 x 1340** CSS px (portrait) at DPR 2.

- `01-idle-portrait.png`
- `02-success-celebratory-portrait.png`
- `03-success-with-container-name-portrait.png`
- `04-success-pending-portrait.png`
- `05-settings-panel-portrait.png`
- `06-device-frame-preview.png` — optional desktop preview frame

## Assets

All prototype assets are copied under `assets/`.

- `assets/images/USEFULL-icons/USEFULL-Logo-Registered_Color.svg`
- `assets/images/USEFULL-icons/icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-1024.png` (favicon / PWA icons)
- `assets/images/interface-icons/Usefull-Icons-Golden_1_Cup.png` (sim button)
- `assets/sounds/successful-scan.m4a` (per-scan chime — same as Checkout Station)
- `assets/fonts/Proxima-Nova-Font-Family/ProximaNova-{Regular,Medium,Semibold,Bold}.ttf`

## React Build Notes

- **Target device:** Samsung Galaxy Tab A9 (SM-X110), 8.7", **800 x 1340** CSS px, portrait only, fullscreen PWA.
- **Fixed resolution:** type and spacing are fixed px tuned to fill the 800 x 1340 panel. The app is a CSS size container (`container-type: size`); the optional preview frame renders at true size and scales down, so framed preview and on-tablet render are identical.
- **Fonts:** headings/labels use **League Spartan** (Google Fonts); body/UI uses **Proxima Nova** (self-hosted, bundled under `assets/fonts/`).
- **No auth, no payment, no counter screen** — unlike the Checkout Station. The only inputs are QR scans from the hardware reader and the access-code exit.
- **State:** a small `idle | success` machine in `prototype/index.html`. Each scan calls `onScan()` (tally++, chime, render, restart auto-dismiss). `goIdle()` resets the tally.
- **Exit:** the EXIT button (idle only) opens a 4-digit access-code modal (demo code `1234`) — same pattern as the Checkout Station — to leave kiosk mode.
- **Container names** (when enabled) are whimsical placeholders (adjective . color . animal) generated client-side; real builds should show the actual scanned container if available.

## Live prototype

Hosted: https://owenbarron.github.io/usefullcheckout/return-station/ (add `?frame=1` for the device-frame preview).
