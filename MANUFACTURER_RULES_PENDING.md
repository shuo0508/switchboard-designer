# Manufacturer Rules — Remaining Confirmation Items

Status after **Phase 2C** (branch `claude/full-engineering-review`).
Phase 2B encoded the Phase 2A source extraction (S1–S14) in `manufacturer-data/` and aligned
`manufacturer-rules.js` with it. Everything below is **still open**: the engine reports these
cases as *Manufacturer Confirmation Required* or *Not Established By Provided Source* and does
not infer a value.

Sources:

- ABB — *MNS R Low Voltage Switchgear System Guide*, 1TTB900011D0203 (2016-07). Printed page = PDF page.
- Siemens — *TIP Planning manual SIVACON S8*, Publication date 01/2025 · Status 01/2025 V3-korr
  (file `TIP_Planning_manual_SIVACON_S8_2025-02_EN.pdf`). Printed page = PDF page − 4.

---

## Resolved in Phase 2B (for reference)

| Item | Now |
|---|---|
| C2 ABB rating ↔ frame | Rating must equal a source-listed Iu (p.28–29, 32–33, 35–37). Above max → Invalid; below / between → Confirmation (trip-unit In not established). |
| H1 AUTO thresholds | Removed. Rating → source-backed candidates → `ENGINEERING_SELECTION_POLICY` (Engineering Derived). No candidate → Confirmation. |
| H2 Siemens 3WA | Five independent tables (3/2, 3/3 G1/G2, 3/4 G1/G2); G1/G2 derived; footnotes evaluated as separate conditions. |
| H3 ABB p.22 / p.23 | Power Center and MCC plug-in kept separate; MCCB cubicle type is a required input. |
| H7 Siemens 3VA | Single 3VA fixed-mounted → 400 mm *Partially Verified* ("generally"); Tab. 3/17 all 36 values. |

## Resolved in Phase 2C (Phase 2B independent verification findings)

| Finding | Now |
|---|---|
| L1 Siemens Tab. 3/17 | Operational current is displayed as manufacturer information only; never compared with the breaker rated current, never used for AUTO. Top busbar + top entry = NOT_ESTABLISHED. |
| A1 ABB p.22 "600 mm / 800 mm**" | Single E1.2 / T6 / T7 = 600 mm (Verified when the other p.22 conditions match). 800 mm belongs to the ** four-breaker arrangement only: catalogued, Manufacturer Confirmation Required, never offered or applied. |
| C1 Design Status | Four states: VALID / MATCHED, RESOLVED WITH QUALIFICATIONS, INCOMPLETE, INVALID (Electrical Design Conflict is listed separately as a basis of INVALID). |
| C2 Emax 2 performance level | Explicit input. Rating listed only for some levels → level required; incompatible level → Invalid. |
| L2 Siemens busbar systems | Only buses with breakers on the switchboard select Tab. 3/3 vs 3/4. |
| L3 Siemens 3WA rating | Below the listed rated device current → Confirmation (setting not established); above → Invalid. |
| C3 ABB device notes | XT1 Plug-In In max 125 A (p.32) and T5 630 P/W derating (p.36) are in the trace; breaker execution is not collected, so affected ratings are Confirmation. |
| F1 Siemens Tab. 3/3 fn 4) | Marked SOURCE_AMBIGUOUS; deviations are Confirmation, never Invalid (see below). |
| U1 AUTO | No source-backed candidate → no series / frame selected ("No source-backed candidate"). |
| L4 Stale configuration | Breaker configuration is revalidated against the rule engine on every change. |

## ABB MNS R — open

1. **Trip-unit In values below Iu** (e.g. XT4 100 A, E1.2 500 A): not listed in the provided source.
2. **p.22 footnote \*\*** — four breakers (E1.2 / T6 / T7) in an 800 mm cubicle: catalogued only; no single-breaker 800 mm width.
   Rating, pole combination, busbar, cable, auxiliary space and mounting conditions not established.
3. **p.22 footnote \*** — step-up option: not modelled.
4. **Breaker execution** (fixed / plug-in / withdrawable) inside MNS R Power Center and MCC plug-in modules:
   not established, so XT1 above 125 A and T5 630 at 630 A remain *Manufacturer Confirmation Required*.
5. **p.23 MCC plug-in modules as incomers**: the source lists "Energy distribution" only.
6. **Main busbar module table (p.22)**: catalogued, not evaluated; "Rated current" column unlabeled.
7. **MCCB packing / compartment arrangement** (p.14, 20–21): no automatic multi-MCCB packing.
8. **Emax 2 E2.2 / E4.2 / E6.2 fixed/withdrawable availability**: printed on p.28 only (SOURCE_AMBIGUOUS).
9. **Two ACBs stacked per panel** (p.14): one ACB per section is used.
10. **1025 mm depth** ("depending on the switchgear layout", p.17): not modelled.

## Siemens SIVACON S8 — open

1. **Table 3/3 G2 footnote 4)** (3WA1350 cable) — **SOURCE_AMBIGUOUS, not reconciled**:
   - fn 4): "Main busbar up to 7,010A rear-bottom, cable connection bottom, 3WA1350 H, C (max. 100kA), double front 1,200mm deep".
   - p.104 (printed p.100): "The incoming feeder / outgoing feeder 5,000 A with cable connection *opposed* to the main busbar
     rear-bottom is only implemented as a double front and absolutely requires a special cubicle at the rear".
   - Concepts involved: rear-bottom, cable connection side, H / C class, double front, 1,200 mm depth, max. 100 kA,
     special rear cubicle. "max. 100 kA" is not collected. Any deviation or missing item → *Manufacturer Confirmation Required*.
2. **Width alternatives** (e.g. 400 / 600, 600 / 800, 800 / 1000): no selection condition in the source.
3. **§3.4 3VA "generally 400 mm"**: exceptions not defined → *Partially Verified*.
4. **3VA plug-in / withdrawable**: "information from Siemens on request" (Tab. 3/1).
5. **Tab. 3/17 top busbar + top cable entry**: not listed → *Not Established By Provided Source*.
6. **3VA trip-unit In below the rated device current**: not established.
7. **Coupler cubicles** (Tab. 3/2–3/4 longitudinal / transversal): source data only; no coupler Function.
   Tab. 3/3 footnote 5) "3WL1232 C" kept as printed (SOURCE_AMBIGUOUS).
8. **Tab. 3/6** operational currents: informational only; no load-current validation.
   Printed coupler rows "3WA1140" and repeated 3WA1350 / 3WA1363 kept as printed.
9. **Tab. 3/7 – 3/9**: source-traceable only, not applied.
10. **Main busbar ratings / derating** (Tab. 2/9): catalogued only.
11. **Siemens listed dimensions** (Tab. 2/1, 2/6): only frame height (2000 / 2200 mm) is used, for footnotes.

## Not implemented by instruction

Automatic multi-MCCB packing · automatic coupler Function · trip-unit In values not in source ·
315 A / 500 A mappings · automatic load-current validation · manufacturer typo corrections ·
ABB step-up option logic · 1025 mm depth logic.
