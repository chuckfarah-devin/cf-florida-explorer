# Decisions and approval gates

## 2026-11-03 — I2 authorization

Chuck explicitly instructed “proceed with i2”. FEMA point lookup, local API, overlay/source details and tests are authorized. The implementation follows the existing 15 m provisional radius and proposed 24-hour/7-day FEMA cache policy. See [I2 implementation record](i2-fema-implementation.md). Hosting remains undecided; NOAA, AI answers, merging and deployment still need separate approval.

## Recorded decisions

- 2026-11-02: User authorizes a separate Florida Explorer workspace, documentation/specification preparation, multi-agent review and Devin technical-design-only handoff.
- Existing dedicated folder is the workspace; intended repository name is cf-florida-explorer. Do not couple it to cf-ai-infrastructure-analyzer.
- Broad four-domain vision; narrow FEMA/NOAA and cited Ask This Place MVP.
- Approval to request design is not approval to implement. Specification documents remain a proposed baseline for owner review.
- GitHub access became available and the analyzer was reviewed read-only. Chuck created cf-florida-explorer; GitHub access and write permission verified. No Devin integration found; handoff prepared but not sent.

- 2026-11-03: Chuck approved the revised visual direction (devin/ui-design.md §0, accepted mockups) and **authorized I1 + C7 only**: responsive layout per the mockups, a Florida map, place search, pointer/keyboard/typed-coordinate selection with consistent bounds validation, labelled controls, a pinned Ask This Place area (clearly labelled preview), display-only wetlands / conservation areas / aquatic preserves / shoreline layers with source details and loading/error states, and the project scaffold, CI and tests. FEMA point classification, NOAA, nature lookups, model integration and deployment remain pending separate approval. Stop for review before I2 or any deployment.
- D1: ArcGIS Maps SDK for JavaScript, with a dedicated, restricted Florida Explorer API key whose value is never committed (devin/arcgis-licensing.md).
- D11: factual answers are rendered from validated structured facts using reviewed templates.
- U8: unsourced place descriptions are omitted for now.
- NZ-1: the synthetic "inside coverage, no zone" fixture is accepted for deterministic branch testing. It is not claimed to be a verified real location.
- D8 (partial): 15 m is accepted as our provisional nearby-zone check radius. It is not FEMA accuracy. The other D8 thresholds remain proposed.
- D2 (partial): BB-01 event window confirmed as 25–29 Oct 2026, America/New_York, based on Chuck's firsthand observation (including water entering some homes). His outline is an approximate recollection, not a surveyed flood boundary. The exact validation point is still to be selected. Two published reports are candidate corroboration, linked only; no photo-reproduction permission. Government classifications, mapped wetlands, station measurements, published reports and owner observations stay distinct, and wetlands shading is never presented as the event's flood extent (devin/bb01-event-record.md).

## Gates

| Gate | Evidence required | Status |
|---|---|---|
| G0 Specification baseline | Charter, PRD, acceptance criteria, registry, review and open questions accepted by Chuck | Prepared; owner review pending |
| G1 Technical design | Devin design options, analyzer review, endpoint feasibility, costs/security, evidence model, R/AC traceability and validation plan | Task authorized; not sent |
| G2 Implementation | Chuck explicitly approves design and bounded implementation increment, source choices and acceptance targets | NOT authorized |
| G3 Release | Working demonstration, criterion results and captured source evidence; Chuck accepts limitations and release | Not started |

## Open decisions

1. Repository confirmed: chuckfarah-devin/cf-florida-explorer, public, created by Chuck.
2. Briny Breezes exact validation point and suitable NOAA station (event window confirmed; candidate corroboration recorded).
3. ArcGIS licensing/SDK; NOAA spatial overlay selection versus station-first MVP presentation.
4. Hosting, architecture, model/provider, budget, retention, freshness, latency and accessibility targets: Devin proposes; Chuck approves at G1/G2.
5. Confirm reuse choices and complete deeper analyzer licensing/dependency review.

Design work can proceed with explicit unresolved decisions. Implementation cannot begin on silence, elapsed time or an agent's recommendation.


