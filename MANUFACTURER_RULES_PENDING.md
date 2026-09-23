# Manufacturer Rules — Pending Source Verification

Status: **open**. Nothing in this file has been applied to the rule engine.
Phase 1 (branch `claude/full-engineering-review`) deliberately did not change any manufacturer
dimension table, rating range, or table interpretation.

Each item below lists what the code does today, what must be resolved against the original
manufacturer document, and — where the supplied PDFs were read during Phase 1 — the
*observations* to check. Observations are page references for the reviewer, **not decisions**.

Sources supplied:

- ABB — *MNS R Low Voltage Switchgear System Guide*, 1TTB900011D0203 (2016-07)
- Siemens — *TIP Planning manual SIVACON S8*, 2025-02 EN (status 01/2025)

---

## C2 — ABB rated current ↔ frame compatibility

**Code today:** ABB ACB (`ABB_ACB`) and MCCB (`ABB_MCCB`) matching checks frame + pole only.
Any rating is accepted, e.g. E6.2 at 160 A or XT1 at 6300 A returns *Manufacturer Verified*.

**To resolve:** encode the permitted rated uninterrupted current (Iu) per frame, and decide how a
rating outside the range is classified (Invalid Manufacturer Configuration).

**Observations to verify (ABB PDF):**
- Emax 2 Iu per performance level: E1.2 p.28; E2.2 / E4.2 / E6.2 p.29.
- Tmax XT1–XT4 rated uninterrupted current: p.32–33.
- Tmax T5 / T6 / T7 rated uninterrupted current: p.37.
- Whether the breaker range or the MNS R cubicle rating (derated in the assembly) should be used.

## H1 — AUTO rating → series / frame thresholds

**Code today:** `recommendBreaker()` uses generic thresholds
(ABB: `> 630 A → Emax 2`; Siemens: `> 1000 A → 3WA`) and fixed frame picks
(e.g. ABB 315 A / 500 A → XT4, 1600–2000 A → E1.2; E2.2 never selected).
The result carries `classification: 'Engineering Estimate'`.

**To resolve:** replace thresholds with "rating → compatible candidates from manufacturer data"
(depends on C2), then choose among candidates by an explicit, documented rule. Decide how AUTO
reports multiple candidates.

## H2 — Siemens 3WA Tables 3/2, 3/3, 3/4

**Code today:** one width table (`SIEMENS_3WA_WIDTHS`) is used for all three tables, with
exceptions for 3WA1240 (rear only), 3WA1340 same-side cable, 3WA1350/1363 not in Table 3/4.
Rule IDs now resolve to per-table metadata (Table 3/2 pdf 29 / printed 25; 3/3 pdf 30 / printed 26;
3/4 pdf 31 / printed 27).

**To resolve (compare every row, pole and connection column):**
- Table 3/2 vs `SIEMENS_3WA_WIDTHS`.
- Table 3/3, both groups (busbar rear-top + entry bottom / rear-bottom + entry top, and
  busbar rear-bottom + entry bottom / rear-top + entry top), incl. footnotes 1)–5).
- Table 3/4 (two busbar systems) incl. which types are listed for incoming/outgoing vs couplers.
- Longitudinal / transversal coupler widths (not modelled; no coupler Function exists).
- Rated operational currents / derating by busbar position, entry and ventilation
  (Tables 3/6–3/9) — not modelled.

**Observations to verify (Siemens PDF):**
- 3/2–3/4 list incoming and outgoing feeder in the same row; only coupler cubicles have separate
  widths. Confirm whether "circuit role" affects width only through coupler types.
- 3/3 first group: 3WA1340 cable connection 1,000 / 1,000 (code yields 3P 800 for any rear position).
- 3/3 second group: 3WA1350 cable connection 1,000 / 1,000 with footnote 4)
  (code: no cable connection for 3WA1350).
- 3/3 second group does not list 3WA1240; 3/4 lists 3WA1240 only for the transversal coupler
  (code allows 3WA1240 in any rear configuration).

## H3 — ABB MNS R ACB / MCCB detailed conditions

**Code today:** ACB widths from p.22 with a fixed 22E module; busbar position, mounting
position and busbar-module rows are not evaluated. MCCB values (6E / 8E / 16E / 24E, 600 mm)
are labelled "MCCB standardization, p.23".

**To resolve:**
- Which p.22 / p.23 table applies to an energy-distribution switchboard.
- Busbar module rows (cubicle type × busbar position × rated current → E) — catalogued as
  `ABB_MNSR_PC_BUSBAR_MODULE_CONDITIONS` but not evaluated.
- E1.2 / T6 / T7 600 vs 800 mm selection criteria (footnote **: four breakers in 800 mm).
- Stacking of two ACBs per panel (p.14) — the code places one ACB per section.

**Observations to verify (ABB PDF):**
- p.22 "Power Center Breakers" lists Tmax XT1–XT4 as Horizontal / 8E / 600 mm, T5 12E,
  T6 / T7 Vertical 22E 600 / 800 mm.
- p.23 table carrying 6E / 8E / 16E / 24E is titled **"Motor Control Center Plug in modules"**
  (Application: Energy distribution), footnote "600 mm is the only width available for MNS R
  MCC cubicles". The code's current metadata table name ("MCCB standardization") should be
  corrected once the applicable table is decided.
- p.22 footnote *: "The step up option is available for all the breakers".

## H7 — Siemens 3VA Tables 3/16 and 3/17

**Code today:** any encoded 3VA frame returns 400 mm *Manufacturer Verified* (device level);
Table 3/17 operational current is selected by busbar Top/Rear and cable entry, ventilation.

**To resolve:**
- 3/16 says the width is "generally 400 mm": decide whether exceptions exist and how
  "generally" is classified.
- 3/17 "busbar at the top" provides cable connection from the bottom only; confirm handling
  of top busbar + top cable entry (currently a missing condition).
- Cable capacity (up to 4 cables per phase up to 1,000 A, p.37) is not checked.

**Observations to verify (Siemens PDF, printed p.37 / pdf 41):**
- 3/17 cell pairs are 3VA1 / 3VA2 values (e.g. 630 A / 605 A), not ventilated / non-ventilated.
  The encoded arrays appear to follow this, but must be re-checked cell by cell.
- 3/17 rear columns are split by cable entry (bottom / top), not by Rear Top vs Rear Bottom
  busbar — the code does not distinguish Rear Top from Rear Bottom for 3VA.

---

## Related decisions needed (surfaced by Phase 1)

1. **MCCB section packing policy (C1).** Phase 1 classifies every MCCB section as
   *Provisional Planning Width · Manufacturer Confirmation Required*, for ABB and Siemens alike.
   Siemens §3.4 "Cubicles with One MCCB (3VA)" is itself a manufacturer cubicle type; decide
   whether a one-3VA-per-cubicle section may be classified as verified for Siemens.
2. **True automatic MCCB packing** would need, per manufacturer: module heights per device
   (Siemens Tab. 4/5, 4/17, 6/11, 6/12; ABB p.23), usable compartment height (Siemens Tab. 4/1,
   6/8), rated diversity factor rules (Siemens RDF 0.8 notes; Tab. 12/2), distribution busbar
   ratings (Siemens Tab. 4/2, 6/9), form of separation and cable compartment width.
3. **Manufacturer main-busbar rating rules.** Phase 1 added only a manufacturer-independent
   check (incomer ≤ Rated Main Bus Current). Manufacturer bus ratings / derating
   (Siemens Tab. 2/9 incl. 3WA1350 / 3WA1363 correction factors and two-system derating;
   ABB p.7) are not encoded.
4. **Siemens manufacturer-listed dimensions.** Only ABB p.7 dimensions are catalogued.
   Siemens heights / widths / depths (Tab. 2/1, 2/6) are not encoded, so the UI shows
   "Not available in rule catalog" for Siemens.
