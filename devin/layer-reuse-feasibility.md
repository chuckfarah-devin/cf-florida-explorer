# Analyzer environmental layers: reuse feasibility and scope proposal

Status: design proposal for Chuck's review (G1). **Implementation NOT authorized.** Nothing here changes the approved baseline. Each addition is listed as a proposed change (C7–C9) with a decision (D12–D13), and none applies until Chuck accepts it.

Analyzer reviewed read-only at `68a74a027e07ac51d00d7290ce19d563bdb35f81`, file `src/data/environmentalLayers.ts` (blob `80494e5b`). No analyzer code was copied: its license is all rights reserved, so only patterns are reused (see analyzer-reuse-findings.md). Endpoints were checked live with read-only requests on 2026-11-02.

## 1. What the analyzer has

The analyzer has five layers, each described by a declarative `EnvironmentalLayerConfig` (`label`, `agency`, `coverage`, `sourcePage`, `sourceDate`, `limitation`, `queryUrl`, legend). Each layer is fetched with an envelope query around a fixed site (GeoJSON, `maxAllowableOffset 0.0001`, `geometryPrecision 5`, `resultRecordCount 1000`), or as a raster export for the shoreline.

| Analyzer id | Service (as configured) | Live check (this session) |
|---|---|---|
| `flood` | FEMA NFHL `…/NFHL/MapServer/28` | Already in the MVP baseline (source-feasibility.md S01) |
| `wetlands` | FDEP-hosted USFWS NWI: `https://ca.dep.state.fl.us/arcgis/rest/services/Map_Direct/Program_Support/MapServer/6` | Reachable. ArcGIS 11.1, polygon, SR 6439 (NAD83(2011) Florida GDL Albers), `maxRecordCount` 4000. Fields `ATTRIBUTE` (Cowardin code), `WETLAND_TYPE`, `ACRES`. Copyright "USFWS" |
| `conservation` | FDEP CLEAR Florida Conservation Lands: `https://ca.dep.state.fl.us/arcgis/rest/services/Map_Direct/Environment/MapServer/38` | Reachable. 11.1, polygon, SR 6439, `maxRecordCount` 1000. Fields include `MANAME`, `MANAGING_A`, `OWNER`, `PROTSTAT`, `MATYPE`, `TOTACRES`, `MA_WEBSITE`. Copyright text empty |
| `aquatic-preserve` | FDEP Aquatic Preserves: `https://ags.dep.state.fl.us/arcgis/rest/services/OpenData/AQUATIC_PRESERVES/MapServer/0` | Reachable. 11.1, polygon, SR 6439, `maxRecordCount` 1000. Fields `NAME`, `COUNTIES`, `REGION`, `PRESERVE_MANAGER`, `SHORT_DESCRIPTION_SUMMARY`, links. Copyright "FDEP, Division of State Lands, Bureau of Survey & Mapping" |
| `shoreline` | FDEP-hosted NOAA Composite Shoreline: `…/Program_Support/MapServer/41` | Reachable. 11.1, polyline, SR 6439. Field `F_NAME` (e.g. "Apparent shore", "Approx. Shore", "SPOR", "Gen. manmade object"). Copyright NOAA Office for Coastal Management |

### Point and nearby results

| Point | Wetlands (NWI) | Conservation lands | Aquatic preserve |
|---|---|---|---|
| BB-P1 26.5089022, −80.0522463 | none at point | none at point | none at point |
| Box ≈ 4.5 × 4.4 km around Briny Breezes (−80.075…−80.03, 26.49…26.53) | 48 polygons, mostly "Estuarine and Marine Deepwater", plus "Freshwater Pond" and "Estuarine and Marine Wetland" | 3: Seacrest Scrub Natural Area, Ocean Ridge Natural Area, North Ocean Ridge Mangroves Natural Area (all managed by Palm Beach County) | 0 (5 shoreline features in the same box) |
| Control: 26.50, −80.25 (Loxahatchee NWR) | `PEM1F` Freshwater Emergent Wetland | Arthur R. Marshall Loxahatchee National Wildlife Refuge | none |
| Control: 25.60, −80.20 (Biscayne Bay) | `M1ABL` Estuarine and Marine Deepwater | Biscayne National Park | none |
| Palm Beach region box (−80.4…−79.9, 26.2…27.1) | — | — | 3: Jensen Beach to Jupiter Inlet; Loxahatchee River–Lake Worth Creek; Kristin Jacobs Coral |

All services accepted `inSR=4326` point queries with server-side transformation. No credentials were needed.

**Distances to nearby protected places** (used in the mockups). These are computed from the live conservation-lands geometry (`outSR=4326`), measuring from BB-P1 to each polygon boundary with a local planar approximation; the reference GIS cross-check is pending (N29):

| Area | Managing agency | Distance to boundary | Direction (to centroid) |
|---|---|---|---|
| Ocean Ridge Natural Area | Palm Beach County | 1.22 km | N |
| Seacrest Scrub Natural Area | Palm Beach County | 1.75 km | SW |
| North Ocean Ridge Mangroves Natural Area | Palm Beach County | 2.21 km | N |
| Ocean Ridge Hammock Park | Palm Beach County | 2.55 km | N |

Each record carries `MA_WEBSITE` (here the county's ERM or parks page), which supports the "managing agency" link. Protection status (`PROTSTAT`) says nothing about public access, so the UI always shows an access caveat.

## 2. Reuse assessment

| Analyzer element | Verdict | Notes |
|---|---|---|
| Config shape (agency, coverage, source page, date, limitation, legend) | **Adapt** (re-implement) | Maps directly onto the connector registry. Add `evidenceClass`, `allowedClaims`, freshness and terms fields |
| Envelope GeoJSON query | **Adapt for display only** | Fine for drawing context. Generalised geometry (`maxAllowableOffset`, 5 dp) and the 1000-record cap make it unsuitable for any statement about the selected point. Point membership needs an exact intersect, as for FEMA |
| Shoreline raster export (MapServer `export` tiles + count check) | **Adapt** | Good low-cost display pattern for large line datasets |
| Limitation copy (e.g. NWI "not a regulatory wetland delineation"; conservation "not legal ownership or surveyed boundaries") | **Adapt wording** (rewritten, owner-reviewed) | Becomes the per-layer limitation codes in evidence-and-agent-design.md §4b |
| Colours and legend | **Rebuild** | The analyzer uses purple for flooding; the new visual system (ui-design.md §0.3) uses colour plus pattern for contrast and colour-blind safety |
| `sourceDate` strings (e.g. conservation "September 2026 edition") | **Do not reuse** | Must be read from the source at retrieval time; not verified this session |

## 3. Proposal: what could join the first increment

The PRD lists "additional overlays" as future candidates, so adding any of these is a **scope change** and needs Chuck's decision.

| Layer | First increment? | What it would do | Evidence class (proposed) | Allowed claims | Extra effort |
|---|---|---|---|---|---|
| Conservation areas | **Recommended (display + nearby list)** | Map layer; "Protected places nearby" list from an exact-point query plus a nearby query (names, managing agency, distance to boundary) | `mapped_feature` (new, C9) | "inside / within X km of <MANAME>, managed by <MANAGING_A>" | +0.5 d display (I1); +1 d nearby facts (I3b) |
| Aquatic preserves | **Recommended (display + point membership)** | Map layer; "This spot is inside <NAME> Aquatic Preserve" when the point query hits | `mapped_feature` | membership, name | +0.25 d display; +0.25 d facts |
| Wetlands (NWI) | **Recommended, display first** | Map layer through MapServer export tiles (polygons can be huge, e.g. 116,597 acres); point lookup gives the wetland type in plain language | `mapped_feature` | "mapped as <WETLAND_TYPE> in the national wetlands inventory"; never "is a regulated wetland" | +0.5 d display; +0.5 d facts and plain-language Cowardin labels |
| Shoreline | **Display only** | Reference line; no answer claims | — (display) | none | +0.25 d |
| FEMA flood | Already baseline | — | `regulatory_classification` | as designed | 0 |

Totals if all are accepted:
- **≈ +1.5 d in I1** (display layers, legend, layer panel, source-detail sheets);
- **≈ +2 d as a new I3b** (point and nearby facts, a "Nature nearby" card, Ask claims for conservation, preserve and wetland facts, validation cases N23–N26).

Recommended path: accept C7 (display layers in I1) now and decide C8 (point/nearby facts) at I3.

### Proposed baseline changes

| ID | Change | Why | Risk if accepted | Risk if rejected |
|---|---|---|---|---|
| C7 | Add wetlands, conservation areas, aquatic preserves and shoreline as **display-only** layers in I1, each with source details and limitations | Makes the product a discovery experience from day one, at low effort; all four sources are public and need no key | FDEP-hosted services become a dependency (availability, schema drift); terms and attribution URLs still unverified | The MVP looks flood-only; the Nature tab has nothing live |
| C8 | Add point/nearby lookups for conservation areas, aquatic preserves and wetlands, a "Nature nearby" card, and allowed Ask claims (new increment I3b) | Answers "what's protected near here?" from records | More validator claim types and fixtures; the "nearby" radius needs owner approval | Nature questions get an abstention in the MVP |
| C9 | Extend the closed evidence-class set: `mapped_feature` now; `species_observation` and `habitat_model` reserved for future connectors | Keeps sightings vs likely habitat vs mapped boundaries distinct, as the PRD requires for future domains | Contract change; needs evidence-contract.md review | Mapped features would be forced into ill-fitting classes |

## 4. Nature & Wildlife capabilities awaiting integration (not proposed for the first increment)

| Capability | Candidate source | Feasibility found this session | Evidence class | Blockers |
|---|---|---|---|---|
| Wildlife sightings ("Seen here") | iNaturalist API v1 (`https://api.inaturalist.org/v1/observations`) | Reachable. A query within 1 km of BB-P1 returned 2,500 research-grade observations, each with observed date, taxon, `positional_accuracy` (e.g. 61–68 m), `obscured` / `geoprivacy` and a per-observation licence (e.g. `cc-by-nc`). Documented throttle: max 100 requests/min, asked to stay ≤ 60/min and < 10,000/day | `species_observation` | Licence mix (NC terms), attribution per observation, obscured coordinates for sensitive taxa, sampling bias, caching rules. Terms URL: https://www.inaturalist.org/terms (not reviewed in full) |
| Likely habitat for rare species ("Could live here") | FNAI Biodiversity Matrix | Public map app config lists `https://fnai04.fnai.org:6443/arcgis/rest/services/BDM/BioMatrix_Grid_MapSvc/MapServer` (layers 0–3). The service **timed out from this environment** (port 6443). FNAI describes 1-square-mile units with Documented / Documented-Historic / Likely / Potential, covering tracked species only | `habitat_model` (Documented maps to observation-derived; Likely/Potential to modelled) | Data-use permission from FNAI; service reachability from the chosen host; reuse rights |
| Invasive species | EDDMapS | Not reviewed | `species_observation` | Everything above |

UI rules for these, already shown in the mockups:
- Sightings and likely habitat are visually distinct ("Seen here" vs "Could live here").
- Neither implies the other. No density or abundance is inferred from sightings.
- Sensitive locations stay hidden.
- Cards say "Coming later" until integrated, and any example content is labelled "Example layout — not live data".
