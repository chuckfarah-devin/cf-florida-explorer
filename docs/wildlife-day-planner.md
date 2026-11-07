# Wildlife discovery and personal day planner

Approved by Chuck after reviewing the two-panel concept, November 5, 2026.

## Delivered

Nature & Wildlife now includes Wildlife nearby and Plan a day. Wildlife is fetched for the selected Florida point, with a 50 km search radius, Florida place filter, research-grade community identification and geographic ranking. Bird/mammal/reptile/amphibian records are included; bobcat and gray fox filters are available. The first page contains at most 12 records. This is a discovery list, not a complete species inventory or species-count estimate. Empty results and source errors have separate short messages. Selection changes abort the browser request and discard old results.

No wildlife coordinates, photographs or observer details are copied into the app. Private and obscured records are excluded, including taxon geoprivacy. Record dates, scientific/common names and canonical observation links are retained. Panther sightings use a separate link to FWC's reporting map; no FWC records are scraped or claimed to have been verified.

The server fixes the upstream host, validates Florida coordinates and species choices, limits concurrency to four, uses a 12-second request timeout, limits response size and caches successful results for 15 minutes (64 entries maximum). Errors are not cached.

The day planner saves a trip date, wildlife interests and an ordered stop list in browser local storage. It works with the existing responsive place panel. Curated visitor sites begin with Florida Panther National Wildlife Refuge public trails and Big Cypress National Preserve, offered only within 100 km of the selected point. Those approximate site coordinates are used for regional eligibility only; no entrance pins, route distances, drive times or wildlife probabilities are presented. Saved stops remain when the selected point moves. Remove buttons allow editing the list.

## Sources

- iNaturalist API: https://api.inaturalist.org/v1/docs/ and https://www.inaturalist.org/api
- iNaturalist geoprivacy: https://help.inaturalist.org/en/support/solutions/articles/151000169938-what-is-geoprivacy-what-does-it-mean-for-an-observation-to-be-obscured-
- FWC panther map: https://app.myfwc.com/hsc/PantherSightings/Home/Locations
- Refuge visitor information: https://www.fws.gov/refuge/florida-panther/visit-us
- Big Cypress visitor information: https://www.nps.gov/bicy/planyourvisit/index.htm

## Scope and follow-up

This increment provides a personal outing list, not automated routing or a date-specific conditions service. Weather, flooding and closures are explicitly marked “not checked”; visitor information links let the user review agency information. More visitor sites, live conditions integration and Android installation are future increments. No native Android package, deployment, merge or external message is included.

The existing checked Nature Ask still answers mapped-feature questions. Wildlife discovery is a separate source-linked panel; observations have not been added to its checked-answer evidence contract.

## Validation

Unit/API coverage checks field sanitization, privacy exclusions, invalid points, successful caching, empty results versus service failure, interest selection and persistent public stops. A mobile browser test checks the complete interest-to-stop flow and WCAG A/AA accessibility. Live southwest Florida checks returned gray fox and bobcat records, including observation 410590643 (bobcat, October 24, 2026) and 259057749 (gray fox, January 18, 2025). These are source records, not new local field observations.

## Closest-first refinement

The source request now uses iNaturalist geo_score ordering. Returned public coordinates are used only on the server to calculate straight-line distance from the selected point; the response contains distances but no animal coordinates. Up to 12 returned records are sorted by distance. This is closest among returned records, not a complete nearest-neighbor census. Observation dates remain visible. Dropdown bobcat and gray-fox entries are curated shortcuts, not a dynamic list of all local species. Live Briny control returned gray fox record 199367224 (February 10, 2024), approximately 2.79 km from 26.5089, -80.0522.

## Animal categories and native status

Replaces the flat example shortcuts with Native status, Animal group and Animal type filters. Six discovery groups: reptiles, amphibians, mammals, birds, fish and invertebrates. Subgroups use verified iNaturalist taxonomy IDs in src/nature/wildlife-categories.ts. Fish and invertebrates are practical discovery groups, not claims of six equivalent taxonomic classes. Habitat labels such as freshwater/saltwater or terrestrial/marine are not inferred from broad taxonomic groups. Native and introduced filters use upstream native=true or introduced=true for each observation location. Record labels use taxon.native, taxon.endemic and taxon.introduced; missing status remains unknown. Non-native is not labelled invasive. All wildlife preserves unclassified records. Request validation rejects a subtype that does not belong to the chosen main group. Changing groups resets the subtype and result key; cache keys include every filter.

Verified live controls at Briny: introduced lizards returned Brown Anole, native birds returned Osprey, insects returned Blue-green Bottle Fly. The supplied iNaturalist guide webpage could not be retrieved, so the category structure follows the user’s pasted list rather than claiming a full import of that guide.

Fish removed at Chuck's request. Five main groups remain; all-animal requests also exclude the fish taxa used by the former category.

## Unique animals

Returned reports are grouped by scientific name. Each animal appears once, with the count of distinct source observation IDs in the returned batch and the nearest record’s distance, date and source link. Counts are explicitly labelled as counts from returned reports; the source request remains capped at 12 reports and is not a regional census. Cards remain sorted by closest distance. Conflicting native-status labels in a group produce unknown status.

## Expanded discovery — November 6, 2026

The 12-report cap could collapse to only a few unique animals. Removed that cap from sanitization and now fetch up to 100 source records initially, with Search more reports expanding to 200. Mixed All animals searches sample the five main groups separately (20 reports per group initially, then a second page). A selected category uses 25 records/page, four initial pages and four more on expansion. Source records are recent-first to avoid geographic-score ordering clustering on one taxon; the app groups the loaded records and displays their closest loaded distances first. This is not a complete park species checklist or a guarantee of nearest reports across the whole database. Radius remains 50 km (31.1 mi). Counts still refer only to distinct public reports loaded. Fish and obscured/private records remain excluded.

Success cache retains cleaned pages so expansion requests only additional pages. Total page budget is 30 seconds, individual requests 12 seconds, per-page payload capped at 6 MB. Source failures do not publish a partial batch as complete. Category changes reset expansion depth. UI reports unique-animal and loaded-report counts. Live checks returned 58 unique animals from 100 reports near Briny and 55 near 26.086,-81.6; actual counts will change. Tests cover multi-group balancing, more than twelve records, cache reuse during expansion and the UI expansion control.

## Hosted wildlife repair — November 7, 2026
The hosted iNaturalist lookup returned HTTP 429 from the provider. Public read-only observations now load through the visitor browser using the provider's supported CORS response, without cookies or credentials. Shared src/wildlife/service.ts retains the API's validation, privacy exclusions, taxonomy filters, grouping, caches and distances. Client source requests are spaced at least 1.1 seconds apart (below 60/minute); upstream 429 responses honor a bounded Retry-After cooldown and show a busy message. Source requests are cancelled when the selected request is aborted. The local/server API remains available and reports throttling honestly. Live hosted Briny check returned 61 unique animals from 100 reports with five successful source requests. No snapshots or API keys were committed.
