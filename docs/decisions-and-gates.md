# Decisions and approval gates

## 2026-11-04/05 — I3b nature authorization and resumed work

Chuck approved the recommended Nature step (“ok that sounds good”): exact wetlands/conservation/aquatic-preserve lookups, nearby protected places with boundary distances and Show on map, then checked nature answers. Work resumed November 5 after the usage interruption. The default nearby search is a disclosed provisional 5 km radius with up to five distinct name/agency results; owner review can revise it. No sightings, species presence, habitat prediction, model integration, merges or deployment are authorized. See [I3b record](i3b-nature-implementation.md). Earlier scope restrictions below are historical and superseded only for this bounded increment.

## 2026-11-04 — I4 template-first authorization

Chuck approved the recommended next step (“i agree....lets do it”): Ask This Place with checked FEMA/NOAA templates and readable citations, before nature. No model/provider is needed or selected. Applied dates/reference bind the answer; drafts do not. See [I4 record](i4-checked-answers.md). Merges, deployment, broader model routing and nature facts remain separately gated.

## 2026-11-04 — I3 authorization

Chuck said “ok lets do it” to the next NOAA tide-comparison increment after reviewing live I2 FEMA information. I3 metadata, observations/predictions, daily HTF source states, local API, station markers, UI and checks are authorized. Working point:26.50844824511624,−80.05460169017356; default period October25–29,2026 America/New_York. Station scope/radius remains provisional and disclosed; periods are conservatively capped at30 inclusive local dates. See [I3 record](i3-noaa-implementation.md). AI answers, nature fact lookups, merging and deployment remain separately gated. Earlier status tables below are historical and do not revoke later bounded authorizations.

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


