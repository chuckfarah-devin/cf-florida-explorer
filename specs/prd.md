# Product requirements — v0.1

Status: proposed baseline; technical design authorized, implementation gated.

## User journey

A user opens a Florida map, selects a point, sees its coordinates and active layers, and asks “What does the evidence tell us about flooding here?” Ask This Place retrieves applicable evidence and presents a concise explanation with claim-level source links and limitations. The user can inspect source records, change the point, and ask follow-up questions scoped to the current location.

## MVP requirements

| ID | Requirement | Priority |
|---|---|---|
| R01 | Interactive ArcGIS Florida map; explicit point marker and latitude/longitude; keyboard-accessible equivalent to point clicking | Must |
| R02 | FEMA flood hazard overlay, legend and point lookup; distinguish zone classification, boundary ambiguity and absent coverage | Must |
| R03 | NOAA water-level/tide context with justified station selection, distance, date range, datum, units, time zone and product type | Must |
| R04 | Ask This Place binds every request and response to the selected point and evidence set; citations support individual material claims | Must |
| R05 | Show dates, spatial precision, uncertainty and source details; distinguish observations, predictions, modeled scenarios and regulatory classifications | Must |
| R06 | Explicit loading, partial-data, no-coverage, stale-data and source-failure states; preserve available evidence without inventing missing facts | Must |
| R07 | Reproducible Briny Breezes validation and negative cases with archived evidence metadata | Must |
| R08 | Responsive desktop/mobile presentation, readable attribution, keyboard access and accessible source details | Must |

NOAA integration must include evidence used by the explanation, not only an outbound link. A NOAA spatial overlay is desirable, subject to endpoint feasibility; it is not a silently assumed mandatory integration. Devin must propose a concrete choice and document coverage and limitations before design approval.

## Future domains

Nature & Wildlife: preserve observation versus inferred habitat, occurrence status, sensitivity and spatial precision; never infer population density from sightings. History & Change: cite dated records and separate interpretation from historical evidence. Land & Infrastructure: map documented features with source dates and limitations. Area selection, nearby discoveries, additional overlays, saved places and expansion beyond Florida remain future candidates.

## Design questions and constraints

Devin proposes architecture, ArcGIS SDK/version and licensing, source endpoints, point intersection rules, station selection, evidence retrieval, citation validation, secrets handling, caching, source freshness policy, latency targets and operating cost. Those decisions are not approved by this PRD. Propose measurable performance and accessibility validation for owner acceptance. No login, paid data purchase or cloud deployment is assumed.

Retrieved source text is untrusted data: it cannot override instructions or authorize tools. Explanations must not invent citations or send credentials to source endpoints. Store only location/question information needed for the experience; design must identify retention and logging choices.

Mapping design decision: the analyzer uses MapLibre with ArcGIS basemaps/services. Compare adapting it with ArcGIS JavaScript SDK; make the rendering choice explicit for owner approval.

