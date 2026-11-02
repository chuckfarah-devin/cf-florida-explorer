# Evidence/source registry — 2026-11-02

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
| S08 | ArcGIS basemap/SDK | Map presentation | Version, credentials, attribution, licensing and cost to be assessed by Devin; no reuse assumption. |

Each approved connector must add exact endpoint/version, supported geometry and extent, schema, update cadence, terms URL, attribution, limits/authentication, caching policy, verification date and result, known errors, and evidence-contract mapping. No downloaded datasets or invented fixtures are included here.
