> Current release status: see [personal-use MVP scope](../docs/mvp-release.md), November 6, 2026. This document preserves the original design baseline; the release record identifies implemented, changed and deferred scope.

# Design summary, unresolved decisions and review checklist

Status: technical-design delivery for G1. **Implementation NOT authorized.** Devin stops here and waits for Chuck's explicit approval.

## Summary

1. **Architecture:** static frontend + thin serverless Evidence & Answer API (option B). Model credentials server-side only. Evidence is retrieved deterministically first; the model has no tools and must cite evidence IDs; a deterministic validator gates every claim; template fallback when the model is unavailable or invalid. ([technical-design.md](technical-design.md))
2. **Map:** ArcGIS Maps SDK for JS 5.x recommended; MapLibre + Esri plugin is the alternative (D1). Classification always comes from a server-side point query, never the rendered map.
3. **FEMA (checked live):** NFHL layer 28 exact-point query works (BB-P1 → AE, BFE 8.0 NAVD88; BB-P2 ~55 m away → X 0.2%); layer 3 gives effective date (panel 12099C0793G, 2024-12-20); layer 0 needed to separate no-zone from no-coverage; intermittent 504s observed. ([source-feasibility.md](source-feasibility.md))
4. **NOAA (checked live):** only observation gauge near Briny Breezes is 8722670 Lake Worth Pier (ocean side, 11.7 km); predictions available at 8722718 Ocean Ridge ICWW (2.0 km). Datums, NOS/NWS thresholds, quality flags and 31-day range limits confirmed. Station-first MVP; SLR viewer point identify unusable for point claims → overlay deferred (D3).
5. **Analyzer (read-only, SHA 68a74a0):** adapt patterns (state vocabulary, source-details panel, FEMA legend categories, abort/timeout); rebuild point selection, point classification, NOAA connector and everything agent-related. All-rights-reserved license → patterns only unless Chuck grants snippet reuse (D7). ([analyzer-reuse-findings.md](analyzer-reuse-findings.md))
6. **Validation:** every R01–R08 and AC01–AC11 mapped, thresholds proposed, Briny Breezes fixtures with the user's event window left **unresolved**; a clearly labelled historical comparison window proposed. ([validation-plan.md](validation-plan.md))
7. **Cost:** ~$0–$5/month infra plus ≈ $0.0014–$0.03 per answer (assumption band). ([cost-security-and-decisions.md](cost-security-and-decisions.md))
8. **Increments:** I1 map/selection → I2 FEMA → I3 NOAA → I4 Ask This Place → I5 validation; ~10–14 Devin days, each pending approval. ([implementation-proposal.md](implementation-proposal.md))

## Review reconciliation

Each independent review finding is mapped to the section that resolves it and the validation case that proves it.

| # | Finding | Resolved in | Validation case(s) |
|---|---|---|---|
| 1 | Signed MLLW ↔ NAVD88 water-level conversion with forward and reverse examples | source-feasibility.md §S03a: `h_B = h_A + (Z_A − Z_B)`. At 8722670 (`Z_MLLW` 29.99, `Z_NAVD88` 32.50 ft): forward `h_NAVD88 = h_MLLW − 2.51` (3.00 → 0.49 ft); reverse `h_MLLW = h_NAVD88 + 2.51` (0.49 → 3.00 ft); threshold example 34.82 STND → 4.83 MLLW → 2.32 NAVD88. A live paired reading confirmed the sign (3.284 ft MLLW vs 0.778 ft NAVD). evidence-and-agent-design.md §4.6 points to the same rule | validation-plan.md N11 (forward), N11b (reverse, round trip, live cross-check), N11c (ft/m mismatch or missing datum → reject); AC11 row |
| 2 | Structured facts checked against source fields; citation IDs alone don't prove prose | evidence-and-agent-design.md §3 (`facts[]` in the response contract), §4.9 (fact equality against the record field), §4.10 and §4a (text rendered from verified facts; model prose is audit-only), §4.6 (numbers typed by kind and matched to their field); D11 | N13 (wrong fact with valid citation), N14 (correct facts, wrong prose), N15 (wrong number), N16 (wrong datum label), N20 (identifiers and dates); AC04 row |
| 3 | Evidence controls on every user-visible answer field, including unknowns and limitations | evidence-and-agent-design.md §3 ("no free-text channel"), §4b (allow-listed codes, typed params, `basis` re-derived from the pack, server-owned source status and mandatory limitations); ui-design.md §3.6 | N17 (free-text limitation dropped), N18 (unsupported unknown dropped), N21 (`NEAR_MAPPED_ZONE` / `BOUNDARY_CHECK_UNAVAILABLE` derived from the pack); AC04 row |
| 4 | Separate fixtures for FEMA "inside coverage, no zone" and "outside coverage", distinct from outside-Florida rejection | source-feasibility.md FEMA point rules (layer 0 decides; `coverage_unknown` on failure; buffer always evaluated); validation-plan.md §4a; ui-design.md §3.1 and §3.4 (outside-Florida input is rejected before any query) | NZ-1 / N01b (inside coverage, no zone; synthetic), OC-1 + OC-2 / N01 (outside coverage; live), FL-1 / N01c (coverage lookup failed), IC-1 (control), **OUT-1 / N02 and N10** (outside Florida / swapped coordinates, rejected before query); AC07 row requires pairwise-distinct state, copy and limitation |

Kept from the Devin Review rounds:
- **Cache separation:** the FEMA cache key includes query mode, buffer distance and units, and `spatialRel` (source-feasibility.md cache table; test N19).
- **Number typing:** identifiers, dates, coordinates, distances and quantities are each checked against their own field, and only quantities need a unit and datum (evidence-and-agent-design.md §4.6; test N20).
- **Buffer evaluated for no-zone and out-of-coverage points:** `nearbyZones` (source-feasibility.md FEMA rules; test N21).

## Pre-implementation checklist: four review findings

| # | Finding | Resolution (document section) | Acceptance tests (validation-plan.md) | Status |
|---|---|---|---|---|
| 1 | Signed MLLW ↔ NAVD88 conversion | source-feasibility.md **§S03a**: `h_B = h_A + (Z_A − Z_B)`. At 8722670, forward `h_NAVD88 = h_MLLW − 2.51 ft` (3.00 → 0.49) and reverse `h_MLLW = h_NAVD88 + 2.51 ft` (0.49 → 3.00); the sign was confirmed live (3.284 MLLW / 0.778 NAVD). evidence-and-agent-design.md **§4.6** points to the same rule | **N11** (forward), **N11b** (reverse, round trip, live cross-check ≤ 0.01 ft), **N11c** (units mismatch / missing datum → reject); AC11 row | Resolved in design |
| 2 | Structured facts checked against source values | evidence-and-agent-design.md **§3** (`facts[]`), **§4.6** (numbers typed by kind), **§4.9** (fact equality), **§4.10 + §4a** (text rendered from verified facts; model prose audit-only); ui-design.md **§0.4** (flood copy keyed by the verified fact) | **N13**, **N14**, **N15**, **N16**, **N20**, **N23**; AC04 row | Resolved in design; **D11 and U7 need your approval** |
| 3 | Validation of every visible answer field | evidence-and-agent-design.md **§3** (no free-text channel), **§4b** (coded unknowns/limitations, typed params, `basis` re-derived, server-owned source status); ui-design.md **§3.6** | **N17**, **N18**, **N21**, **N25**; AC04 row | Resolved for answers; **U8 open** (see below) |
| 4 | Separate FEMA no-zone vs no-coverage fixtures | source-feasibility.md **FEMA point rules** (layer 0 decides; `coverage_unknown`; buffer always evaluated); validation-plan.md **§4a**; ui-design.md **§3.1/§3.4** (outside-Florida rejected before any query) | **NZ-1/N01b** (inside coverage, no zone), **OC-1, OC-2/N01** (outside coverage, live), **FL-1/N01c** (lookup failed), **IC-1** (control), **OUT-1/N02, N22** (outside Florida); AC07 requires pairwise-distinct state, copy and limitation | Resolved in design; **NZ-1 is synthetic** |

Still unresolved:
- **NZ-1 has no real point yet.** No real "inside coverage, no zone" location was found; FEMA's layer 28 ended exactly at the coverage edge on the transect. The synthetic fixture stands until a search during the build finds one.
- **D8:** the 15 m check radius is our choice and needs your approval. Copy uses "Another mapped flood zone was found within 15 m." The NAD83→WGS84 transformation FEMA's server applies is unverified, and it matters only for boundary cases.
- **D11 / U7:** templates vs checked model prose, and the exact plain-language flood wording table.
- **U8:** the one-line place description is the only visible text with no evidence source. It must be omitted or curated (owner-approved, labelled editorial) before Explore this place ships.
- **Datum offsets are per station.** Only 8722670's datums were checked; other stations are checked when the curated station table is built in I3.
- **D1 (map SDK and key) blocks I1;** D2 (event window) blocks BB-01 only.

## UI design

[ui-design.md](ui-design.md) has annotated desktop and mobile wireframes (`wireframes/desktop.svg`, `wireframes/mobile.svg`) and the interaction specification: point selection and switching, layers, FEMA and NOAA cards with every state, Ask This Place, citation chips and source details, responsive behaviour and accessibility. It also lists open UI decisions U1–U6.

## Revision 2: public-facing visual proposal

- **Mockups:** [ui-design.md §0](ui-design.md) has polished desktop and mobile mockups (`mockups/*.png`, all content illustrative). It also has the visual system, the plain-language flood copy table, the readable source labels and the Nature & Wildlife "Seen here" vs "Could live here" concepts.
- **No verification badges.** Uncertainty is shown in one compact line per answer.
- **Analyzer layers:** [layer-reuse-feasibility.md](layer-reuse-feasibility.md) records live checks of the analyzer's wetlands, conservation, aquatic-preserve and shoreline services. It proposes scope changes **C7** (display-only layers in I1, ≈ +1.5 d), **C8** (nature facts, new I3b ≈ +2 d) and **C9** (new evidence classes). None is applied without D12/D13.
- **Unchanged:** the bounds-check rule (N22) and all evidence safeguards. New tests N23–N26.
- **Refinements after Chuck approved the look and interaction direction:**
  - Ask This Place is pinned so it's always visible (N31).
  - Flood wording is now "FEMA maps this spot in an area with a 1% annual chance of flooding", with distances only from computed geometry (N23).
  - Nature cards show distance to the boundary and "Show on map", plus a public-access caveat.
  - Map controls have descriptive text labels (N32).

## Unresolved decisions (details in cost-security-and-decisions.md §6)

D1 map SDK · D2 Briny Breezes point and event window · D3 NOAA overlay vs station-first · D4 hosting · D5 model provider and budget · D6 retention · D7 analyzer reuse permission · D8 thresholds (AC01 1e-5°, 15 m FEMA buffer, 25 km station radius, performance/a11y) · D9 baseline changes C1–C6 · D10 cache TTLs · D11 answer text from verified facts (templates) vs checked model prose · D12 reference layers / nature facts (C7, C8) · D13 evidence classes (C9) · U1–U9 UI decisions (ui-design.md §5).

## Items not verified this session

Esri licensing/free tier/attribution rules; FEMA and NOAA exact terms URLs and quotas; NAD83→WGS84 transformation used by FEMA server; CO-OPS HTF API documentation page; inland negative-case point; any local Briny Breezes event record.

## Review checklist for Chuck

- [ ] Architecture option B and evidence-first/no-tool model approach acceptable
- [ ] D1 map choice made
- [ ] Station-first NOAA MVP accepted (D3)
- [ ] FEMA point rules (exact + buffer, layer 0, layer 3) accepted
- [ ] Briny Breezes point and event window supplied, or BB-02 accepted as labelled comparison only
- [ ] Thresholds in validation-plan.md accepted or amended
- [ ] Retention and credential boundaries accepted
- [ ] Hosting and model provider chosen; budget cap set
- [ ] Analyzer reuse permission decided
- [ ] Baseline changes C1–C6 accepted/rejected
- [ ] Visual mockups, plain-language copy and interaction spec accepted or amended (U1–U9)
- [ ] Layer scope decided (D12: C7/C8) and evidence classes (D13: C9)
- [ ] First increment explicitly approved (G2) — or design changes requested
