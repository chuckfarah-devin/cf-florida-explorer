# Florida Explorer personal-use MVP

Release candidate reviewed with Chuck, November 6, 2026. This is the current scope record; the original design documents remain historical baselines. The user requested a GitHub push for review, not a merge or public deployment.

## Delivered scope

| Area | MVP behavior |
|---|---|
| Map | ArcGIS basemap/search with a restricted key; coordinate, pointer and keyboard point selection; Florida bounds checks; responsive layouts and readable attribution |
| Water & Weather | FEMA point classification, separate nearby-zone check, source/coverage/error states; NOAA observed and predicted tides, date/datum controls, station markers, chart and tables |
| Ask This Place | Checked template answers with claim-level sources for Water and mapped Nature facts; no model key or model-generated prose |
| Nature | Wetland/deepwater, conservation-land and aquatic-preserve point lookups; nearby protected-area boundary distances; Show on map |
| Wildlife | Native/introduced filters, five animal groups and subtypes; no fish; public research-grade iNaturalist reports; one row per scientific name with loaded-report count, closest loaded distance/date and source link |
| Wildlife breadth | Up to 100 recent reports initially, balanced across five groups when All animals is selected; Search more reports expands to 200 without refetching cached earlier pages |
| History | Up to eight nearby official state markers and a sourced Briny farm/camp/town chronology; marker year is distinct from historical event dates |
| Land & Infrastructure | Watershed membership and nearby canals/structures; optional watershed, canal and structure overlays with source-field popups; no inferred street-drain or sewer routing |
| Presentation | Distances in miles; map/source metric units remain unchanged; technical JSON links labelled; overlays preserve the selected evidence point |
| Personal planning | Existing local-device interests/date/stop list retained; further planner work deferred by owner |

## Original requirement review

| Requirement | Assessment and evidence |
|---|---|
| R01 / AC01 | Implemented; bounds, selection and map keyboard tests; early layer-toggle and late initialization tests |
| R02 / AC02 | Implemented; FEMA exact/buffer/cache/coverage tests and documented live checks. Server coordinate transformation remains unverified at boundaries |
| R03 / AC03 | Implemented for curated NOAA stations; product/datum/time-zone/quality tests and live comparisons. Not a measured Intracoastal record at Briny |
| R04 / AC04–05 | Implemented for Water and mapped Nature templates; source binding/claim validation and late-response rejection tests. Wildlife, History and Land Ask are deferred |
| R05 / AC10–11 | Source, datum, evidence-class and validation controls implemented for the checked-answer contract; history and wildlife cards use direct source records rather than model prose |
| R06 / AC06–07 | Source-specific empty/error/coverage states and cache behavior tested. No proof that every provider outage or production load scenario is covered |
| R07 / AC08 | Partial: reproducible queries, source metadata and live comparison notes exist in the I2/I3/I3b records. A complete archived October-event validation package and independently located street-flood evidence are not release-complete. Tide data is not street-flood proof |
| R08 / AC09 | Responsive UI, labelled controls and automated desktop/mobile WCAG A/AA checks. Native Android/installability and formal performance targets are deferred |

The synthetic FEMA inside-coverage/no-zone fixture remains synthetic. A real control point is still a validation task. This MVP does not claim that every original proposed acceptance criterion has been fully certified.

## Deliberately deferred

- History/Land/wildlife Ask evidence contracts; current composer explains its supported domains.
- Municipal storm-drain connections, verified flow arrows and sanitary-sewer-to-treatment-plant tracing. Regional canals are not those networks.
- Historic aerial/map comparison, general statewide town narratives, broader visitor-site collection and live trip-date weather/closure checks.
- Android packaging or installation, authentication/sync, hosting, public deployment, production monitoring, formal load/performance tests and ongoing operating budget.
- Proving the Briny back-tax story, copying archive photos or treating a nearby story radius as an official town boundary.

## Source and credential boundaries

No new dependency was required by these discovery increments. ArcGIS uses a dedicated referrer-restricted browser key from ignored `.env.local`; no credential should be added to this PR. No raw wildlife coordinates, observer profiles or photos are copied into the wildlife response. Private/obscured observations remain excluded. Planner state is local browser storage, not uploaded to a user account. New APIs use fixed upstream hosts, validation, bounded caches/concurrency and timeouts.

Raw local verification output, screenshots, build artifacts and logs under `scripts/out/`, test reports, `node_modules/`, `dist/` and local environment files are excluded from publication. No analyzer changes.

## Review and delivery

The current change is stacked on the existing Nature PR #6, which itself depends on the earlier design/map/FEMA/NOAA/Ask PRs. Publishing a new review branch does not merge that stack into `main`. Review and merge order remains #1 through #6, followed by this release-candidate PR, unless the owner chooses a separate consolidation.

Validation is recorded in the PR: lint, type checks, unit/API suite, production build and full Playwright/axe suite. Live probes remain separate from synthetic browser checks. Existing large ArcGIS bundle warnings and React test `act` warnings are recorded as non-failing follow-up items; neither is a claim of performance certification.
