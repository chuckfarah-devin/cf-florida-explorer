# Validation plan

Status: future validation design for owner review (G1). Nothing here has been run against an application; no application exists. Implementation NOT authorized.

## 1. Requirement traceability (R01–R08)

| Req | Design decision(s) | Component | Future check |
|---|---|---|---|
| R01 | Pointer click + keyboard crosshair "select centre" + typed lat/lon; 5-dp WGS84 display | Point selection, selection store | AC01, AC09 |
| R02 | Server-side layer-28 exact + 15 m buffer intersect; layer 0 coverage; layer 3 effective date; state machine incl. near-boundary | FEMA connector, map overlay, legend | AC02, AC07, AC11 |
| R03 | Curated station table; observations 8722670, predictions 8722718 + 8722670 for Briny Breezes; datum/units/tz/quality disclosed; station-first (no NOAA overlay MVP) | NOAA connector, station card | AC03, AC11 |
| R04 | Evidence-first pack; model without tools; selectionId/locationEcho binding; claim-level citations | Pack builder, composer, validator | AC04, AC05, AC10 |
| R05 | Closed evidence-class set; source details panel; stale/preliminary labels | Pack builder, source panel | AC02–AC04, AC10, AC11 |
| R06 | Connector state vocabulary; partial answers; never failure → "no hazard" | Connectors, frontend states | AC06, AC07 |
| R07 | Fixture records + archived query/response metadata per run | Validation harness | AC08 |
| R08 | WCAG 2.2 AA target; responsive layouts; attribution | Frontend | AC09 |

## 2. Acceptance criteria → design and check (AC01–AC11)

| AC | Design decision | Proposed check and threshold |
|---|---|---|
| AC01 | Displayed coords = selected coords; marker anchored at point | Automated: click at known screen point and typed entry; displayed lat/lon within **1e-5° (~1.1 m)** of input; marker tip within **2 px** of projected point at zoom ≥ 15. Keyboard-only selection passes same checks |
| AC02 | Exact + buffer intersect; layer 3 date | Compare app evidence for BB-P1 (AE, `12099C_14409`, BFE 8.0 NAVD88, panel 12099C0793G eff. 2024-12-20) and BB-P2 (X 0.2%, `12099C_14190`) to saved authoritative responses; BB-P1 shows near-boundary state at 15 m buffer if confirmed; OFF-1/OUT-1 handled as in AC07 |
| AC03 | Station card disclosure | Station card shows id, name, water body, distance/bearing, product, period, datum, units, tz, quality; observed vs predicted visually and textually distinct; checklist pass 100% |
| AC04 | Validator §4, §4a, §4b (facts checked against source values; unknowns/limitations code-only) | Review set of ≥ 20 questions across fixtures; **0** material claims without valid citation; **0** rendered facts that differ from the cited record value; **0** free-text unknowns/limitations; N13–N18 rejected 100%; reviewer spot-check every claim against record |
| AC05 | selectionId + abort + echo | Latency-injected A→B and A→B→A switches (100–3,000 ms delays), 50 randomized runs; **0** stale renders |
| AC06 | Connector states + partial answer | Mocked timeout, HTTP 429, HTTP 504, malformed JSON, CO-OPS `error` JSON for each source; answer names missing source, keeps other citations; **0** "no hazard"/"safe" wording |
| AC07 | `in_coverage_no_zone` / `outside_nfhl_coverage` / `stale_cache` | Separate fixtures, each asserting a distinct state code, distinct copy and distinct limitation code: **NZ-1** inside coverage with no zone (layer 0 hit, layer 28 empty; see §4a); **OC-1** and **OC-2** outside NFHL coverage (layer 0 and layer 28 both empty, Checked live); OUT-1 outside app bounds (rejected before query); stale-cache fixture with retrieval date > TTL. Test fails if NZ-1 and OC-1 produce the same state, copy or limitation; none may claim safety |
| AC08 | Fixtures §4 | Full protocol run with archived evidence; reviewer confirms no station value presented as street flooding |
| AC09 | Responsive + keyboard | Viewports 360×800, 768×1024, 1366×768, 1920×1080; axe-core **0 serious/critical**; manual keyboard journey (select point, toggle layer, ask, open citation, open source details) with visible focus; 200% zoom and 320 CSS px reflow; contrast ≥ 4.5:1 text / 3:1 UI; screen-reader smoke test (NVDA or VoiceOver) |
| AC10 | No-tool model + validator | Synthetic injected records; fabricated `E#`; citation to wrong station/date; **100%** rejected; location unchanged |
| AC11 | Coord validation; datum labelling | Swapped lat/lon (-80.05, 26.51) rejected with message; MLLW vs NAVD88 comparison either rejected or converted with the direction in source-feasibility.md §S03a (`h_NAVD88 = h_MLLW − 2.51 ft`, `h_MLLW = h_NAVD88 + 2.51 ft`, 8722670 only), conversion shown; both directions and round-trip tested (N11, N11b); feet/metres mismatch rejected |

## 3. Performance targets (proposed for owner approval)

| Metric | Target | Basis |
|---|---|---|
| Map interactive (desktop, broadband) | ≤ 3.0 s p75 | Lighthouse desktop |
| Map interactive (mobile, Lighthouse 4G throttling) | ≤ 5.0 s p75 | Lighthouse mobile |
| Point → FEMA classification shown | p50 ≤ 2 s, p95 ≤ 6 s (cache miss) | FEMA observed 0.24–7 s, intermittent 504 at ~10 s |
| Point → NOAA station card | p50 ≤ 2 s, p95 ≤ 5 s | CO-OPS observed ~1 s class |
| Question → validated answer | p50 ≤ 8 s, p95 ≤ 15 s | evidence cached + one model call |
| Source timeout | 8 s + 1 retry on 5xx/504 | then partial answer |

## 4. Briny Breezes fixtures (proposed; owner must accept)

Event date: **unresolved.** The user's "last week" is not resolved relative to any date. Until Chuck supplies a fixed window and point, only a labelled historical comparison is possible.

| ID | Point | Window | Purpose | Status |
|---|---|---|---|---|
| BB-01 | BB-P1 26.5089022, -80.0522463 (TIGER internal point) | **TBD by Chuck** (user event) | Primary validation of reported event | Blocked on D2 |
| BB-02 | BB-P1 | 2025-10-04 00:00 to 2025-10-13 00:00 America/New_York (UTC−04:00) = 2025-10-04T04:00Z to 2025-10-13T04:00Z | **Historical comparison only**: Lake Worth Pier HTF daily shows NOS minor-threshold flags on 10-04 and 10-07…10-12 (Checked). Cannot validate the user's event | Proposed |
| BB-03 | BB-P2 26.5087, -80.0517 | same as BB-02 | Second in-town point with different zone (X 0.2%) | Proposed |

Required per-fixture record (from specs/briny-breezes-validation.md): coordinates + independent check (TIGERweb, a second basemap), fixed timestamps (local + UTC), FEMA query/response/effective date/SR, NOAA candidate stations with rationale (8722670 obs, 8722718/8722670 predictions; no ICWW observation station nearby), datum/units/tz/quality, user testimony stored separately from corroborated records, expected claims and explicitly unsupported conclusions.

Expected claims for BB-02 (illustrative): FEMA zone at point with effective date; Lake Worth Pier (11.7 km N, ocean side) daily maxima and NOS minor flags with datum; predicted high tides at Ocean Ridge ICWW. Explicitly unsupported: "Briny Breezes streets flooded", "king tides caused flooding", any statement about water at the point.

### 4a. FEMA missing-data fixtures (distinct)

Layer 0 (NFHL availability) is what separates the two states; layer 28 alone cannot.

| ID | Point | Layer 0 | Layer 28 | Expected state / limitation code | Status |
|---|---|---|---|---|---|
| IC-1 | 26.5089, -80.0390 (just offshore of Briny Breezes, inside coverage) | `STUDY_ID 12099C` | VE, `12099C_14160` | `classified` (control: proves the edge is inside coverage) | Checked live |
| NZ-1 | **Recorded/synthetic pair**: layer 0 response for 12099C + empty layer 28 response | hit | empty | `in_coverage_no_zone` / `NO_ZONE_IN_COVERAGE`: "FEMA's digital map covers this point but returned no flood-zone polygon; this is a data gap, not a finding of low risk" | Synthetic. No real point found: a coastline transect (−80.039 to −80.031 at 26.5089) showed layer 28 ending exactly where layer 0 ends. G2 task: search for a real in-coverage gap (e.g., unmapped slivers along county/study edges) and replace or add it if found |
| OC-1 | OFF-1 26.50, -79.90 (offshore, inside app bounds) | empty | empty | `outside_nfhl_coverage` / `OUT_OF_COVERAGE`: "FEMA's digital flood map does not cover this point" | Checked live |
| OC-2 | 26.5089, -80.0380 (~100 m east of IC-1) | empty | empty | `outside_nfhl_coverage`; proves the near-edge case is decided by layer 0, not distance | Checked live |
| FL-1 | Layer 0 query fails (504/timeout), layer 28 empty | failure | empty | `coverage_unknown` / source-unavailable; must **not** fall back to either state above | Mock |

Assertions per fixture: state code, rendered copy, limitation code, and that no answer text contains "safe", "no risk" or "not in a flood zone". NZ-1 vs OC-1 vs FL-1 are compared pairwise and must all differ.

## 5. Negative cases

| ID | Case | Input | Expected | Evidence basis |
|---|---|---|---|---|
| N01 | Outside NFHL coverage | OC-1 / OC-2 (§4a) | `outside_nfhl_coverage`; no safety claim | Checked layers 0 and 28 empty |
| N01b | Inside coverage, no zone | NZ-1 (§4a) | `in_coverage_no_zone`; differs from N01 in state, copy and limitation | Synthetic pending real fixture |
| N01c | Coverage lookup failed | FL-1 (§4a) | `coverage_unknown`; differs from N01 and N01b | Mock |
| N02 | Outside Florida bounds | OUT-1 25.00, -78.00 | rejected before query | Checked layer 28 empty |
| N03 | FEMA boundary | BB-P1 with 15 m buffer | near-boundary state listing AE and X | Checked at 30 m |
| N04 | Inland / non-coastal point | point to be selected and independently verified at G2 | NOAA: "no suitable tidal station"; FEMA per result | Not yet selected |
| N05 | NOAA product not offered | water_level at 8722718 | `product_not_offered`, predictions still shown | Checked |
| N06 | NOAA range exceeded | 6-min request > 31 days | connector splits or reports `range_error` | Checked error text |
| N07 | Source outage | FEMA 504 / timeout (mock) | partial answer | 504 observed live |
| N08 | Stale cache | record older than TTL, live fails | stale label + retrieval date | Design |
| N09 | Rapid switching | A→B→A | AC05 | Design |
| N10 | Swapped coordinates | (-80.05, 26.51) | rejected | Design |
| N11 | Datum conversion MLLW → NAVD88 | 8722670, 3.00 ft MLLW | 0.49 ft NAVD88 (±0.005 ft); also NOS minor 34.82 ft STND → 4.83 ft MLLW → 2.32 ft NAVD88; converted value labelled with offset and epoch | Station datums Checked; arithmetic derived |
| N11b | Datum conversion NAVD88 → MLLW and round-trip | 8722670, 0.49 ft NAVD88; then 100 random values both ways | 3.00 ft MLLW; round-trip error ≤ 0.001 ft; result cross-checked against the same timestamp requested live with `datum=MLLW` and `datum=NAVD` (difference ≤ 0.01 ft) | Both datums returned live |
| N11c | Datum/units mismatch | MLLW ft vs NAVD88 m; or station without NAVD88 in metadata | rejected, no conversion; offset never borrowed from another station | Design |
| N12 | Injection | synthetic record text | AC10 | Design |
| N13 | Wrong fact, valid citation | finding `facts: [{E1, FLD_ZONE, "X"}]`, E1 = BB-P1 AE record | rejected (fact equality) | Design |
| N14 | Correct facts, wrong prose | facts AE, model `text` says "Zone X" | rendered text is template from facts (AE); mismatch logged and finding rejected in audit mode | Design |
| N15 | Wrong number | "BFE 9.0 ft" citing STATIC_BFE 8.0 | rejected | Design |
| N16 | Wrong datum label | 8722670 value requested in MLLW but labelled NAVD88 | rejected | Design |
| N17 | Free-text limitation | limitation "this area is safe from flooding" | dropped (not an allow-listed code; prohibited content) | Design |
| N18 | Unsupported unknown | `NO_ICWW_OBS_STATION` when pack has an ICWW water-level station | dropped (basis re-derivation fails) | Design |

## 6. Run evidence (post-approval)

Each run stores: commit SHA, model id + prompt version, fixture id, request/response metadata (URLs, params, retrieval UTC, status), validator decisions, screenshots for UI checks, pass/fail per AC. Only permitted public-domain snapshots are archived.
