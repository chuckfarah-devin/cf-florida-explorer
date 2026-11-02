# Source feasibility — FEMA, NOAA, ArcGIS

Status: technical design for owner review (G1). Implementation NOT authorized.
Inspection date: 2026-11-02 (all times below UTC unless stated). Method: read-only HTTPS GET requests with `curl` from the Devin VM; no keys, no writes, no downloads retained in the repository.

Legend: **Checked** = live request made and response observed this session. **Documented** = official documentation read, not exercised. **Proposed** = design choice not yet verified. **Unverified** = not inspected; must be confirmed before G2.

Test points used (illustrative, not owner-approved fixtures):

| Label | WGS84 lat, lon | Origin |
|---|---|---|
| BB-P1 | 26.5089022, -80.0522463 | Census TIGERweb internal point for "Briny Breezes town" (GEOID 1208575), Places layer 4 — Checked |
| BB-P2 | 26.5087, -80.0517 | Approximate town coordinate used in early probing (~55 m east of BB-P1) |
| OFF-1 | 26.50, -79.90 | Atlantic, ~15 km offshore |
| OUT-1 | 25.00, -78.00 | Outside the United States (Bahamas region) |

Town bounding box from TIGERweb (Checked): lon -80.05680 to -80.04627, lat 26.50738 to 26.51156; AREALAND 147,744 m², AREAWATER 119,291 m².

## S01 — FEMA National Flood Hazard Layer (MVP: regulatory classification)

| Item | Finding | Status |
|---|---|---|
| Service | `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer` — ArcGIS Server 11.1, capabilities `Map,Query,Data`, maxRecordCount 2000 | Checked |
| Native spatial reference | WKID 4269 (NAD83 geographic). Queries accept `inSR=4326`; server performs datum transformation. NAD83↔WGS84 offset in Florida is ~1 m order; must be documented, not ignored, for boundary cases | Checked (SR); transformation method Unverified |
| Layers used | 28 Flood Hazard Zones (`S_Fld_Haz_Ar`), 3 FIRM Panels, 0 NFHL Availability. Also present: 27 Flood Hazard Boundaries, 1 LOMRs, 34 LOMAs, 16 Base Flood Elevations, 15 Coastal Transects, 19 Limit of Moderate Wave Action | Checked |
| Layer 28 fields | `GFID, OBJECTID, DFIRM_ID, VERSION_ID, FLD_AR_ID, STUDY_TYP, FLD_ZONE, ZONE_SUBTY, SFHA_TF, STATIC_BFE, V_DATUM, DEPTH, LEN_UNIT, VELOCITY, VEL_UNIT, AR_REVERT, AR_SUBTRV, BFE_REVERT, DEP_REVERT, DUAL_ZONE, SOURCE_CIT, GlobalID, SHAPE.STArea(), SHAPE.STLength()`. `-9999` denotes "not applicable". Formats: JSON, geoJSON, PBF | Checked |
| Layer 28 draw scale | `minScale` 36,111.9 (visible only at roughly zoom ≥ 14). A statewide FEMA overlay is not drawable from this layer; zoomed-out view needs layer 0/availability or a "zoom in to see flood zones" state | Checked |
| Layer 3 fields | `FIRM_PAN, EFF_DATE (date), PANEL_TYP, DFIRM_ID, VERSION_ID, PRE_DATE, SCALE, SOURCE_CIT, …` — provides the effective date that layer 28 lacks | Checked |
| Point query (proposed contract) | `GET …/28/query?geometry={lon},{lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=false&outFields=FLD_AR_ID,DFIRM_ID,VERSION_ID,FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,V_DATUM,DEPTH,LEN_UNIT,SOURCE_CIT&f=json` | Checked |
| BB-P1 result | `FLD_AR_ID 12099C_14409`, `FLD_ZONE AE`, `ZONE_SUBTY COASTAL FLOODPLAIN`, `SFHA_TF T`, `STATIC_BFE 8.0`, `V_DATUM NAVD88`, `DFIRM_ID 12099C` | Checked |
| BB-P2 result | `FLD_AR_ID 12099C_14190`, `FLD_ZONE X`, `ZONE_SUBTY 0.2 PCT ANNUAL CHANCE FLOOD HAZARD IN COASTAL ZONE`, `SFHA_TF F`, `VERSION_ID 2.6.3.4`, `SOURCE_CIT 12099C_STUDY5` | Checked |
| Boundary probe | Same query at BB-P1 with `distance=30&units=esriSRUnit_Meter` returns **two** zones (AE `12099C_14409` and X `12099C_14190`). Points ~55 m apart inside one small town differ in classification — boundary ambiguity is a real Briny Breezes condition, not a hypothetical | Checked |
| FIRM panel (layer 3) at BB-P1 | `FIRM_PAN 12099C0793G`, `EFF_DATE 1734652800000` = 2024-12-20, `PANEL_TYP Countywide, Panel Printed`, `SCALE 6000` | Checked |
| Coverage (layer 0) at BB-P1 | `STUDY_ID 12099C` polygon returned (digital NFHL coverage present) | Checked |
| Empty results | OFF-1 and OUT-1 both return `features: []` from layer 28. An empty layer-28 result alone cannot distinguish "inside NFHL coverage, no mapped zone" from "outside coverage"; layer 0 must be consulted | Checked |
| Reliability | Multiple HTTP **504 Gateway Time-out** responses at ~10.2 s (layer metadata, layers 0/3/28), then 0.24–7 s successes on retry minutes later | Checked |
| Authentication / limits | None required for public queries observed; no published quota found | Checked (no auth); quota Unverified |
| Terms / attribution | FEMA data is a U.S. federal government work; FEMA NFHL guidance says NFHL is not an official determination and the effective FIRM controls. Service `copyrightText` is empty | Documented (general); exact terms URL Unverified |
| Update cadence | NFHL updated continuously as LOMRs/new studies become effective (per FEMA portal; analyzer cites the same) | Documented |

### Proposed point-intersection rules (FEMA)

1. **Authoritative lookup is server-side** against layer 28 with the exact selected coordinate; the rendered overlay is presentation only and never the source of a classification.
2. Run two queries in parallel: exact-point intersect and a buffer intersect (proposed 15 m; owner to approve). Outcomes:
   - exactly one zone at point and buffer → `classified`;
   - one zone at point, >1 zone in buffer → `classified_near_boundary` (show both zones, state map scale 1:6,000 and that boundary placement uncertainty exceeds the buffer);
   - zero at point, layer 0 polygon present → `in_coverage_no_zone` (do not call it "no hazard");
   - zero at point, no layer 0 polygon → `outside_nfhl_coverage`;
   - zero at point and the layer 0 query failed → `coverage_unknown` (source unavailable; never guessed as either state above). Live coastline check at 26.5089 N: −80.039 is in coverage (layer 0 `12099C`, zone VE); −80.038 and further east have neither layer 0 nor layer 28. Layer 28 ended exactly at the coverage edge, so no real in-coverage/no-zone point was found; validation uses a labelled synthetic fixture until one is (validation-plan.md §4a);
   - >1 zone at exact point (overlap) → `ambiguous_overlap`, list all.
   
   The buffer result is evaluated for **every** state, not only when a zone is found at the point. Separately from the state, the response carries `nearbyZones`: zones that are in the buffer but not at the point. If `nearbyZones` is non-empty with `in_coverage_no_zone` or `outside_nfhl_coverage`, the UI shows a near-boundary note ("Another mapped flood zone was found within 15 m." The 15 m is our check radius, not FEMA accuracy; the map scale is 1:6,000) and the answer gets the `NEAR_MAPPED_ZONE` limitation. A no-zone or out-of-coverage state is never shown without this warning when the buffer found zones. If the buffer query fails, the response says the boundary check is unavailable (`BOUNDARY_CHECK_UNAVAILABLE`) and does not imply there is no nearby zone.
3. Effective date from layer 3 (`EFF_DATE`) for the panel containing the point; LOMR (layer 1) intersection reported as "a map revision exists here" with its own effective date, never silently merged.
4. Preserve `FLD_ZONE` and `ZONE_SUBTY` verbatim; plain-language legend is a mapping table reviewed by owner. `STATIC_BFE` is shown only with `V_DATUM` and `LEN_UNIT` (when `LEN_UNIT` is blank, unit is "not stated by source").
5. Coordinate validation before query: lat ∈ [24.3, 31.1], lon ∈ [-87.7, -79.8] (approximate Florida envelope incl. Keys, owner to confirm); reject swapped order (lat in lon slot) explicitly (AC11).

## S02 — NOAA CO-OPS Data API (MVP: observations and predictions)

| Item | Finding | Status |
|---|---|---|
| Endpoint | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` | Checked |
| Required parameters | `product, station, begin_date/end_date (or date/range), datum, units, time_zone, format, application` (application identifies the caller; NOAA requests an organization/app name) | Checked + Documented |
| Products used | `water_level` (6-min observed), `predictions` (6-min, hourly or `interval=hilo`), `hourly_height`, `high_low`, `daily_max_min` (candidate) | Checked (`water_level`, `predictions hilo`) |
| Range limits | 1-min: 4 days; 6-min: 1 month; hourly: 1 year; high/low: 1 year; daily means & max/min: 10 years; monthly: 200 years. Observed error: `Range Limit Exceeded: The size limit for data retrieval for this product is 31 days` | Checked + Documented |
| Response fields (`water_level`) | `t` time, `v` value, `s` sigma, `f` flags (4 comma-separated bits), `q` quality (`v` verified, `p` preliminary). Metadata echoes station id/name/lat/lon | Checked |
| Verification | Documentation: "Data is verified on a monthly basis for the past month". Live `date=latest` returned `q:"p"`; October 2025 returned `q:"v"` | Checked |
| Time zones | `gmt`, `lst` (local standard), `lst_ldt` (local standard/daylight). Design stores UTC (`gmt`) and renders America/New_York with offset | Checked |
| Datums | Water levels requested in `MLLW` and `NAVD` both succeeded at 8722670. Same timestamp 2025-10-10 00:00 GMT: 3.284 ft MLLW vs 0.778 ft NAVD, difference 2.506 ft, matching `h_NAVD88 = h_MLLW − 2.51` (§S03a) | Checked |
| Missing product | `water_level` at prediction-only station 8722718 → `{"error":{"message":"No data was found. This product may not be offered at this station at the requested time."}}` — distinct "product not offered" state | Checked |
| Error format | HTTP 200 with JSON `error.message` for parameter/range/no-data errors; must be parsed, not treated as success | Checked |
| Auth / quota | No key used. No numeric quota published in the page text read | Checked (no auth); quota Unverified |
| Terms / attribution | Federal data; attribute "NOAA/NOS/CO-OPS". Exact disclaimer URL to be captured in connector record | Unverified |

## S03 — NOAA CO-OPS Metadata API (station selection, datums, thresholds)

| Item | Finding | Status |
|---|---|---|
| Endpoints | `…/mdapi/prod/webapi/stations.json?type=waterlevels` (302 stations nationally), `?type=tidepredictions` (3,502 stations), `stations/{id}.json?expand=details,sensors,products,datums,floodlevels,notices` | Checked |
| Nearest water-level (observation) stations to BB-P2 | **8722670 Lake Worth Pier, Atlantic Ocean** — 11.7 km N, NWLON; next is 8722956 South Port Everglades at 47.9 km | Checked |
| Nearest prediction stations | 8722718 Ocean Ridge, ICWW — 2.0 km (type R, harmonic); 8722746 Delray Beach, ICWW — 4.1 km (subordinate S, ref 8723178); 8722706 Boynton Beach, Lake Worth — 4.4 km (S, ref 8723178); 8722670 Lake Worth Pier (ocean) — 11.7 km (R) | Checked |
| 8722670 datums (ft, station datum STND, epoch 1983–2001, accepted 2017-09-07) | MHHW 33.05, MHW 32.87, MSL 31.53, MLLW 29.99, NAVD88 32.50; GT 3.06 ft. The NAVD88 datum surface sits 2.51 ft **above** MLLW at this station only, so a water level converts as `h_NAVD88 = h_MLLW − 2.51 ft` and `h_MLLW = h_NAVD88 + 2.51 ft` (see §S03a) | Checked (datums); conversion is derived |
| 8722670 flood thresholds (ft, STND) | NOS minor 34.82 / moderate 35.77 / major 37.01; NWS minor 34.35 / moderate 34.75 / major 35.55. NOS and NWS thresholds differ and must be labeled by issuer | Checked |
| 8722670 records | Max 35.331 ft STND on 2022-11-10 18:48; HAT 34.235 | Checked |
| Station time meta | `timezone EST`, `timezonecorr -5`, `observedst true` | Checked |

### Proposed station-selection rule

Nearest is not representative. Briny Breezes sits between the Atlantic and the Intracoastal/Lake Worth Lagoon system, so ocean-side and ICWW stations describe different water bodies.

1. Candidate search: metadata API, stations within 25 km (proposed) for each product family separately (observations vs predictions).
2. Rank by a **curated suitability table** reviewed by Chuck, not by an algorithm alone: water body (ocean / ICWW / lagoon / river), product availability for the requested window, completeness, distance, datum availability.
3. Always disclose: station ID, name, water body, distance and bearing from point, product, period, datum, units, time zone, quality status and why it was chosen and what it cannot show.
4. Briny Breezes proposal: observations from 8722670 (ocean side, 11.7 km, NWLON); predictions from 8722718 Ocean Ridge ICWW (2.0 km) **and** 8722670, shown side by side and labeled as predictions. No observed ICWW record is available nearby; the answer must say so.
5. Station thresholds (NOS/NWS minor flooding) apply **at the station** only. Never transfer them to the selected point.


### S03a — Vertical datum conversion rule (water levels)

All datum elevations from the metadata API are heights on the station datum (STND). For a water level `h` reported relative to datum A, the same water surface relative to datum B is:

```
h_B = h_A + (Z_A − Z_B)        Z = datum elevation on STND, from the same station and epoch
```

At 8722670 (feet): `Z_MLLW = 29.99`, `Z_NAVD88 = 32.50`, so `Z_MLLW − Z_NAVD88 = −2.51`.

| From → to | Formula | Example |
|---|---|---|
| MLLW → NAVD88 | `h_NAVD88 = h_MLLW − 2.51` | 3.00 ft MLLW → 0.49 ft NAVD88 |
| NAVD88 → MLLW | `h_MLLW = h_NAVD88 + 2.51` | 0.49 ft NAVD88 → 3.00 ft MLLW |
| Threshold on STND → MLLW | `t_MLLW = t_STND − 29.99` | NOS minor 34.82 STND → 4.83 ft MLLW; → 2.32 ft NAVD88 |

Rules: offsets are station- and epoch-specific and never reused for another station or the selected point; a conversion is only made when both datums exist in that station's metadata, otherwise the comparison is rejected; units must match before subtraction (no ft/m mixing); every converted value carries original value, original datum, offset, source record and epoch. Preferred approach is to request the data directly in the target datum (`datum=NAVD` succeeded live at 8722670) and use conversion only for cross-checks. Live check: 3.284 ft MLLW − 2.51 = 0.774 ft vs NOAA's 0.778 ft NAVD for the same reading (|Δ| 0.004 ft, rounding of published datums). Validation tests convert in both directions and round-trip (validation-plan.md N11, N11b).

## NOAA derived high-tide-flooding products (candidate evidence)

| Endpoint | Finding | Status |
|---|---|---|
| `…/dpapi/prod/webapi/htf/htf_annual.json?station=8722670` | Annual minor/moderate/major threshold-exceedance day counts back to 1920 (e.g., 2025: 7 minor days; 2026 to date: 2) | Checked |
| `…/htf/htf_daily.json?station=8722670&start_date=YYYYMMDD&end_date=YYYYMMDD` | Daily `maxWL` (ft, STND), `minFlag/modFlag/majFlag`, `percent_completeness`. October 2025 shows minor-flag days on 10-04 and 10-07 through 10-12 at Lake Worth Pier | Checked (parameter names discovered by trial; documentation page Unverified) |
| `…/htf/htf_met_year_annual_outlook.json` | Returned `count: 0` for 8722670 | Checked (no data) |

Use: station-level context ("the Lake Worth Pier gauge exceeded the NOS minor flood threshold on N days in the window"). It is a **measured observation at the station**, not evidence of flooding at the selected point.

## S04 — NOAA Sea Level Rise Viewer services (candidate overlay)

| Item | Finding | Status |
|---|---|---|
| Services | `https://coast.noaa.gov/arcgis/rest/services/dc_slr/` — `slr_0ft … slr_10ft` (half-foot steps), `conf_*` (uncertainty), `marsh_*`, `Data_Extent`, `Pixel`, `Point_Layers`. ArcGIS Server 11.5; SR 3857; cached map services; copyright "NOAA Office for Coastal Management" | Checked |
| Point semantics | `identify` on `slr_1ft` layer 0 returned the same dissolved polygon (OBJECTID 23, area ~8.96e11 m²) at both BB-P2 and an inland point (26.51, -80.10). Point identify is therefore **not usable** for point-level claims without further study | Checked |
| Recommendation | Do **not** use in MVP answers. Optional later display-only overlay with "modeled scenario, planning scale" label, after embedding/terms review | Proposed |

**NOAA overlay decision (PRD R03 note):** recommend a **station-first MVP** — NOAA evidence presented as station markers + context panel with data used by the explanation. A NOAA spatial overlay is deferred to a later increment (see implementation-proposal.md I6). Owner decision D3.

## S08 — ArcGIS basemap and SDK

| Item | Finding | Status |
|---|---|---|
| Basemap styles service | Analyzer uses `https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery?token=…` | Checked in analyzer source (not called) |
| `@arcgis/core` / `@arcgis/map-components` | npm latest 5.1.27; license field "SEE LICENSE IN LICENSE.md" (Esri proprietary terms) | Checked (registry metadata only) |
| `maplibre-gl` | npm latest 6.16.0, BSD-3-Clause (analyzer pins 6.13.0) | Checked (registry) |
| `@esri/maplibre-arcgis` | npm latest 1.3.3, Apache-2.0 — Esri plugin for using ArcGIS basemap styles and services in MapLibre | Checked (registry) |
| Pricing / free tier / attribution rules | ArcGIS Location Platform account and API key required for Esri basemaps; free-tier quotas and attribution rules not re-read this session | Unverified — blocker for G2 cost sign-off |

## Proposed cache and freshness policy

| Data | Cache key | Fresh TTL | Serve-stale limit | Notes |
|---|---|---|---|---|
| FEMA layer 28/3/0 point results | service URL + layer + **query mode** (`point_exact` / `point_buffer`) + buffer distance and units (e.g. `15 m`; `0` for exact) + coordinate (6 dp, EPSG:4326) + `spatialRel` + outFields | 24 h | 7 days, labeled stale with retrieval time | NFHL changes continuously. Exact and buffered results for the same point are separate entries and are never substituted for each other; the classification state is computed from the two entries only when both carry the same retrieval batch (or both are re-fetched). Tested in both query orders with a shared cache (validation-plan.md N19) |
| CO-OPS station metadata/datums/thresholds | station id | 7 days | 30 days | datum epoch shown |
| Verified historical water levels/HTF (window ended > 45 days ago) | full query string | 30 days | 90 days | `q=v` |
| Preliminary / recent water levels | full query string | 6 min | none (show "unavailable") | `q=p` labeled preliminary |
| Predictions | full query string | 7 days | 30 days | predictions are deterministic but can be revised |

Every cached record keeps its original retrieval timestamp; stale state is computed at response time. No cache content is presented as current without its retrieval date.

## Failure handling (all connectors)

Per-request timeout 8 s, one retry with jitter for network errors / 5xx / 504 only (FEMA 504s observed), no retry on 4xx or CO-OPS JSON `error`. Distinct states: `ok`, `ok_empty` (FEMA: `in_coverage_no_zone`), `outside_coverage` (FEMA: `outside_nfhl_coverage`), `coverage_unknown`, `product_not_offered`, `range_error`, `timeout`, `rate_limited`, `upstream_error`, `malformed`, `stale_cache`. A failure is never converted into "no hazard".
