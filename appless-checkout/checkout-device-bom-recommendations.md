# Checkout Device BOM Recommendations

**Date:** April 7, 2026

---

## Context

The original deep dive (March 2026) recommended Samsung Galaxy Tab S9 FE (10.9", $350) + LAVA eSynC-vc5UE ($250). Both are problematic: the Tab S9 FE is too large for a crowded checkout station, and the eSynC-vc5UE is expensive and has stock issues. This analysis re-evaluates with updated constraints:

- **~8" tablet** (crowded checkout station)
- **HID ATR215** — self-powered, USB output to tablet
- **Stripe Reader M2** — Bluetooth to tablet
- **Steady, reliable adapter** — not blazing fast, just dependable
- **In-stock availability** through 2027 ideally
- **Budget-conscious** — the $250 LAVA eSynC was too expensive

---

## Tablet Recommendation: Samsung Galaxy Tab A9 (8.7")

| Spec | Detail |
|------|--------|
| Screen | 8.7" — fits crowded checkout station |
| SoC | MediaTek Helio G99 (plenty for a kiosk app) |
| RAM/Storage | 4GB / 64GB |
| OS | Android 13, Samsung Knox support |
| Port | USB-C |
| Price | ~$140–170 (WiFi, widely available) |
| Availability | In stock at Walmart, Amazon, Samsung.com. Released late 2023, still Samsung's current 8" budget line — should remain available through 2027 |

This is Samsung's only current ~8" tablet. Knox gives you kiosk lockdown for free. The Tab S9 FE from the deep dive is 10.9" and more expensive ($350) — overkill for an 8" station. The Lenovo Tab M9 (9") is cheaper (~$100–130) but has no Knox, weaker enterprise support, and less certain long-term availability.

---

## The Connectivity Picture

```
[Wall outlet] → [USB-C charger] → [Adapter/Hub] → USB-C → [Galaxy Tab A9]
                                        ↓ USB-A
[Wall outlet] → [ATR215 PSU] → [HID ATR215] ──────────────┘
                                                    Bluetooth
                                 [Stripe M2] ──────────────→ [Galaxy Tab A9]
```

The ATR215 has its own power brick and outputs USB data. The M2 pairs via Bluetooth. So the tablet needs exactly **one USB-A data port + simultaneous charging**. That's a much lighter requirement than the 5-port LAVA eSynC ($250) the deep dive specced.

---

## Pathway A: LAVA Charge-Plus USB-C (Recommended)

The purpose-built, "sleep easy" option.

| Component | Model | Est. Price |
|-----------|-------|-----------|
| Tablet | Samsung Galaxy Tab A9 8.7" WiFi 64GB | ~$150 |
| Adapter | LAVA Charge-Plus USB-C (1 USB-A port) | ~$30 |
| Card reader | HID ATR215 (self-powered) | (already sourced) |
| Payment reader | Stripe Reader M2 (Bluetooth) | $59 |
| USB-C charger | Any 15W+ USB-C charger | ~$10 |
| USB-A cable | ATR215 → Charge-Plus USB-A port | (comes with ATR215) |
| **Total (tablet + adapter + M2)** | | **~$250** |

**Why this pathway:** LAVA's SimulCharge tech is purpose-built for Samsung tablets doing 24/7 OTG + charging. The Charge-Plus is their entry-level USB-C adapter — one USB-A port is all you need. It includes **Battery Modulation** to prevent battery bloat from constant charging, which is critical for a device that will be plugged in 24/7/365.

**Risk:** LAVA's online store has been flaky (under maintenance). The Charge-Plus LAN Hub variant ($57, 2 USB-A + Ethernet) is listed on Walmart and Amazon. Recommend buying a few spares while available. Contact LAVA sales directly at sales@lavalink.com if web stock is unreliable.

---

## Pathway B: Generic USB-C PD Hub (Budget / Fast-ship)

The "good enough for pilot" option.

| Component | Model | Est. Price |
|-----------|-------|-----------|
| Tablet | Samsung Galaxy Tab A9 8.7" WiFi 64GB | ~$150 |
| Hub | USB-C hub with PD pass-through + USB-A ports (e.g., Selna 5-in-1 or similar) | ~$15–25 |
| Card reader | HID ATR215 (self-powered) | (already sourced) |
| Payment reader | Stripe Reader M2 (Bluetooth) | $59 |
| USB-C PD charger | 20W+ USB-C PD charger | ~$12 |
| **Total (tablet + hub + M2)** | | **~$240** |

**Why this pathway:** Amazon is full of USB-C hubs with PD pass-through charging that are Tab A9-compatible. Prime shipping, commodity pricing, easy to replace. Several are specifically marketed for Galaxy Tab A9.

**Risks:**
- **No battery modulation.** 24/7 charging without protection will bloat the battery within 12–18 months. You'd need to manage this with software (e.g., Samsung's battery protection setting that caps at 85%) or accept periodic tablet replacement.
- **OTG + charging reliability varies.** Samsung tablets can be finicky with generic hubs — some work perfectly, some don't negotiate power + data correctly. You'd want to test the specific hub before ordering in bulk.
- **No long-term product stability.** Generic Amazon hubs rotate SKUs constantly. The exact model you test may be unavailable in 6 months.

---

## Pathway C: LAVA Charge-Plus LAN Hub (Recommended for Production)

Same as Pathway A but with wired network + a spare USB port.

| Component | Model | Est. Price |
|-----------|-------|-----------|
| Tablet | Samsung Galaxy Tab A9 8.7" WiFi 64GB | ~$150 |
| Adapter | LAVA Charge-Plus USB-C LAN Hub (2 USB-A + Ethernet) | ~$57 |
| Card reader | HID ATR215 (self-powered) | (already sourced) |
| Payment reader | Stripe Reader M2 (Bluetooth) | $59 |
| USB-C charger | Any 15W+ USB-C charger | ~$10 |
| **Total (tablet + adapter + M2)** | | **~$276** |

**Why this pathway:** WiFi in a busy dining hall can be unreliable. Wired Ethernet eliminates that variable entirely. The spare USB-A port gives future flexibility (e.g., a USB barcode scanner if you ever move away from camera-based QR). Battery Modulation included. Still under $60 for the adapter — a fraction of the $250 eSynC.

---

## Quick Comparison

| | Pathway A (LAVA basic) | Pathway B (Generic hub) | Pathway C (LAVA LAN Hub) |
|---|---|---|---|
| **Est. total** | ~$250 | ~$240 | ~$276 |
| **Battery protection** | Yes (Battery Modulation) | No | Yes |
| **OTG+charge reliability** | Proven (SimulCharge) | Variable | Proven |
| **Ethernet** | No | No (most) | Yes |
| **Spare USB ports** | 0 | 2–3 | 1 |
| **Supply chain risk** | Medium (LAVA niche) | Low (commodity) | Medium (LAVA niche) |
| **Best for** | Simplest reliable build | Fast pilot / testing | Production deployment |

**Recommendation:** Pathway C for production, Pathway B to get a prototype on someone's desk this week. Buy 2–3 LAVA Charge-Plus LAN Hubs now as insurance against stock issues.
