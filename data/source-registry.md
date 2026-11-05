# Evidence/source registry — 2026-11-02

## I3b nature verification — 2026-11-05

The public DEP-hosted wetland/deepwater, conservation-land and aquatic-preserve sources now have separate exact/nearby fact queries, checked mapped-feature answers and polygon highlights. Live Briny, refuge, Biscayne and source-derived preserve controls succeeded; independent GIS distance comparisons passed. See [I3b record](../docs/i3b-nature-implementation.md) for query semantics, cache, provisional radius and limits. No species, public access, surveyed boundary or observed flood extent is inferred.

## I3 verification update — 2026-11-04

NOAA S02/S03 now support a bounded Briny Breezes/Ocean Ridge station comparison:8722670 observations/predictions and8722718 predictions, with source-specific metadata, direct datum requests and independent HTF daily source states. Live October25–29,2026 local requests returned1,200 preliminary observed samples,20/19 high-low predictions respectively, and no daily HTF records. Ocean Ridge has no numeric NAVD88 value in the retrieved datum table; that reference is refused there. See [I3 record](../docs/i3-noaa-implementation.md). No station result establishes water in a street or event causation.

## I2 verification update — 2026-11-03

FEMA S01 now has a working server-side connector for layers 28 (exact and separate 15 m buffer), 0 (coverage), 3 (panels), and 1 (revisions). Public metadata and live requests were checked; a complete repeat run at BB-P1/BB-P2 returned AE/X respectively. An earlier partial run exposed transient ancillary failures. See [I2 record](../docs/i2-fema-implementation.md) for provenance, caching, caveats and test limits. The original documentation-only statuses below are historical. No October-event flood extent or home damage was established by these queries.

Status legend: documentation checked means an official reference was read, not that an end-to-end connector or point query was tested. All live connector feasibility, coverage, quotas, licensing/attribution and cache rights require technical-design confirmation.

| ID | Provider/product and reference | Role / evidence class | Verification and limits |
|---|---|---|---|
| S01 | [FEMA NFHL ArcGIS service](https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer), Flood Hazard Zones layer 28 | MVP flood classification and map | Official service directory checked; point query, fields, effective dates and local coverage not tested. Preserve native spatial reference and verify transformation. Classification is not an observed event. |
| S02 | [NOAA CO-OPS Data API](https://api.tidesandcurrents.noaa.gov/api/prod/) | MVP station observations and tide predictions | Documentation checked; station and products for Briny Breezes not selected or tested. Preserve datum, units, time zone and quality status; request limits vary by product. |
| S03 | [NOAA CO-OPS Metadata API](https://api.tidesandcurrents.noaa.gov/mdapi/prod/) | Station coverage, datums and thresholds | Documentation checked; candidate stations and metadata not queried. Station proximity alone is insufficient. |
| S04 | [NOAA Sea Level Rise Viewer](https://coast.noaa.gov/slr/) | Candidate high-tide susceptibility/scenario overlay | Official viewer checked; precise service endpoint, embedding/data use and coverage unresolved. Planning-scale modeled context cannot establish exact flooded locations. |
| S05 | [FNAI Biodiversity Matrix](https://www.fnai.org/Biodiversity-Matrix-Intro) | Future Nature & Wildlife screening | Official intro checked. One-square-mile units; preserve Documented, Documented-Historic, Likely, Potential. Covers tracked rare species, not all common wildlife or density; API/reuse rights unverified. |
| S06 | iNaturalist; EDDMapS | Future observations/invasive records | Candidate only; endpoints, licenses, sampling bias and sensitive-coordinate policies not reviewed. |
| S07 | Florida/local government GIS and historical archives | Future history, land and infrastructure; possible local event corroboration | Providers/datasets not selected; no local Briny Breezes event record verified. |
| S09 | [The Coastal Star, "Along the Coast: Tidal wrath"](https://thecoastalstar.com/profiles/blogs/along-the-coast-tidal-wrath-king-tide-flooding-south-palm-beach?edited=1), 27 Oct 2026 | Candidate corroboration for BB-01 (published event report) | Link only; no permission to reproduce photos. 13 photos from multiple credit lines; only one is captioned Briny Breezes (Palm Drive). Per-photo checks in devin/bb01-event-record.md. |
| S10 | [WPBF 25, "Briny Breezes residents call current flooding the worst they've seen"](https://www.wpbf.com/article/florida-lantana-flooding-king-tides/74253246), 26 Oct 2026 | Candidate corroboration for BB-01 (published event report) | Link only. No still photos; one uncredited video, whose metadata says "Lantana" while the headline says Briny Breezes. Resolve before citing. |
| S08 | ArcGIS basemap/SDK | Map presentation | Version, credentials, attribution, licensing and cost to be assessed by Devin; no reuse assumption. |

Each approved connector must add exact endpoint/version, supported geometry and extent, schema, update cadence, terms URL, attribution, limits/authentication, caching policy, verification date and result, known errors, and evidence-contract mapping. No downloaded datasets or invented fixtures are included here.
