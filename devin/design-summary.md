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

## Unresolved decisions (details in cost-security-and-decisions.md §6)

D1 map SDK · D2 Briny Breezes point and event window · D3 NOAA overlay vs station-first · D4 hosting · D5 model provider and budget · D6 retention · D7 analyzer reuse permission · D8 thresholds (AC01 1e-5°, 15 m FEMA buffer, 25 km station radius, performance/a11y) · D9 baseline changes C1–C6 · D10 cache TTLs.

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
