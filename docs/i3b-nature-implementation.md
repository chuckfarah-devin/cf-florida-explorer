# I3b — checked Nature & Wildlife maps

Authorized by Chuck November 4 and resumed November 5,2026 after a usage-limit interruption. Scope: exact-point wetland/deepwater, conservation-land and aquatic-preserve matches; nearby protected places; Show on map; checked Nature Ask templates. Wildlife sightings, species presence, likely habitat, models, merging and deployment remain gated. The analyzer is unchanged.

## Sources and spatial semantics

The existing public Florida DEP services supply USFWS NWI (Program_Support layer6), Florida conservation lands (Environment layer38) and aquatic preserves (AQUATIC_PRESERVES layer0). Requests use exact point intersection in EPSG4326. Nearby conservation uses a separate provisional5km distance query. All returned protected-area geometries are4326; no geometry generalization or coordinate rounding is requested. Source native reference is NAD83(2011)/Florida GDL Albers (6439), with server transformation method unverified.

Empty successful queries mean no returned mapped match, never on-ground absence. Sources fail independently; errors, truncation, duplicate IDs, wrong references and invalid/degenerate/unclosed polygons are rejected. NWI includes deepwater habitats; a returned water feature is not automatically a wetland. Protected status does not establish public access. Maps are not surveys, regulatory wetland delineations or observed flood extents.

Nearby results use closest polygon-boundary distance, including multipart rings/holes, via a WGS84 local tangent plane with long geographic edges densified. They are estimates, not routes or entrances. Equal name/agency entries retain the closest mapped record; up to five are listed. Inside labels require an independent exact match. The highlighted polygon is the cited record, not an inferred full legal park boundary.

Show on map highlights/fits a separate polygon layer while preserving the selected evidence point. Selection/domain changes and Retry clear it. Readiness and navigation guards prevent older highlights from returning after newer selections. Labels/popups treat source names as text.

## API, cache and answers

POST `/api/nature` follows the existing point/selection/origin/JSON/4KB/concurrency guards. Fixed URLs,12-second request timeout, one transient retry, complete-response validation and a bounded24-hour cache are used. The official wetlands service initially exceeded the earlier8-second timeout;12seconds resolved the verified controls. Client deadline is35seconds. Cache keys keep exact and nearby separate; original retrieval times survive hits. Cache budget is approximately16MB/128entries. No stale fallback is claimed.

Geometry digests remain with source records after redundant nearby-source geometry is stripped from the response. Nearby visible records retain full geometry. Nature Ask recomputes distances/bearings and verifies geometry hashes against those source records. It checks the bound point, radius and exact canonical source query, then validates closed mapped-feature claim types and field equality before rendering templates. Water facts retain their original classes/hosts. Nature answers allow only mapped_feature and DEP query citations.

Nature Ask uses current inventories, not the tide period. Historic/relative-date, wildlife/species/habitat, access and event-cause questions abstain. Retrieval is not survey/imagery date. Unsupported datums in Water & Weather and source outages are unaffected. No new dependency, account, key, inference fee or hosting provider is introduced.

## Live verification — November5

All four source requests succeeded on repeat checks. Briny control26.5089022,−80.0522463 returned no exact point matches, with nearby boundaries at approximately1.226km (Ocean Ridge Natural Area),1.756km (Seacrest Scrub),2.214km (North Ocean Ridge Mangroves) and2.555km (Ocean Ridge Hammock Park). Independent Esri geodesic point-to-polyline checks agreed within0.001m for these records; that is algorithm agreement, not claimed map accuracy.

At26.50,−80.25, the source returned Loxahatchee refuge and Freshwater Emergent Wetland (PEM1F). At25.60,−80.20, it returned Biscayne National Park and Estuarine and Marine Deepwater (M1ABL). An interior test point derived from the official preserve polygon,26.948585385873088,−80.10145360705465, returned Loxahatchee River-Lake Worth Creek. This is a map-derived control, not a field observation or flood-event location.

Raw responses and reference comparisons remain locally in ignored scripts/out; `node scripts/nature-smoke.mjs` repeats the principal source/GIS checks. No permanent event archive is claimed. Synthetic tests cover N27–N30 branches, partial failures, geometry/distance binding, cache isolation, API guards, late replies, domain binding and source-class restrictions. Browser checks use explicit fixtures and local SDK assets. Final results are recorded in the PR.
