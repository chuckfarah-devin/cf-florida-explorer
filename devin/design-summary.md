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

## Revisions after Chuck's review (round 1)

1. **Datum conversion direction.** source-feasibility.md §S03a now defines `h_B = h_A + (Z_A − Z_B)`. At 8722670 that gives `h_NAVD88 = h_MLLW − 2.51 ft` and `h_MLLW = h_NAVD88 + 2.51 ft`. A live paired reading confirmed it (3.284 ft MLLW vs 0.778 ft NAVD). Tests N11/N11b/N11c cover both directions, the round trip and rejection.
2. **Citations don't prove statements.** Findings now carry structured `facts` checked for equality against the cited record's values. Claim text is rendered from verified facts by templates, and model prose is audit-only (evidence-and-agent-design.md §4, §4a; D11). Tests N13–N16.
3. **No unvalidated text.** Unknowns and limitations are now allow-listed codes with typed params and a `basis` the validator re-derives from the pack. Source status and mandatory limitations are server-owned (§4b). Tests N17–N18.
4. **Separate missing-data fixtures.** IC-1 (in-coverage control), NZ-1 (in coverage, no zone; synthetic because no real point was found), OC-1/OC-2 (outside coverage, checked live) and FL-1 (coverage lookup failed). The fixtures must produce different states, copy and limitation codes (validation-plan.md §4a).

## Unresolved decisions (details in cost-security-and-decisions.md §6)

D1 map SDK · D2 Briny Breezes point and event window · D3 NOAA overlay vs station-first · D4 hosting · D5 model provider and budget · D6 retention · D7 analyzer reuse permission · D8 thresholds (AC01 1e-5°, 15 m FEMA buffer, 25 km station radius, performance/a11y) · D9 baseline changes C1–C6 · D10 cache TTLs · D11 answer text from verified facts (templates) vs checked model prose.

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
- [ ] First increment explicitly approved (G2) — or design changes requested
