# Conditions now — first statewide increment

Authorized November 19, 2026. Available under Water & Weather for any valid selected Florida point, not hardcoded example destinations.

- POST /api/conditions validates the Florida point and same-origin JSON request, bounds body/concurrency/cache, and gathers independent source results. Partial failures remain unavailable, not empty/clear.
- NWS active alerts at the point, expired alerts removed; nearby station chosen by straight-line distance from the returned station directory. Temperature and past-hour precipitation shown only with known source units; missing rainfall is not zero. Reports older than two hours labelled. Station conditions are not selected-point water depth.
- FHP public statewide live incident table, up to eight reports within 15 miles, closest first, source-received time and remarks retained. All incident types included. This is point proximity, not route intersection or exhaustive closure coverage. Missing reports never labelled clear roads.
- Supplementary Palm Beach County public camera catalogue: up to four within 15 miles. Catalogue availability does not prove fresh video. Viewer opens at the source; outside the connected county area, the app explicitly links to FL511 statewide cameras rather than inventing local coverage.
- Radar and recent-rainfall maps open the official NWS/NOAA viewers; no radar overlay, image-depth inference, satellite street monitoring or embedded video is implemented.
- Fetch results checked against the current selected point; aborted/late results discarded. Manual refresh retries sources; successful whole results can be reused for two minutes. No automatic background polling.

Sources: https://www.weather.gov/documentation/services-web-api ; https://trafficincidents.flhsmv.gov/SmartWebClient/CadView.aspx ; https://pbctrafficstreams.pbc.gov/portal/feeds/loader.php ; https://radar.weather.gov/region/southeast/standard ; https://water.noaa.gov/precip ; https://www.fl511.com/ . No paid service or new key.

Live local checks passed at King's Academy, Tallahassee and Orlando: alerts/station/road sources responded at all three; county cameras returned the school intersection and nearby approaches; camera coverage was explicitly absent outside the county. Tests cover other-point isolation, provider failures, expired alerts, unit conversions, upstream host boundaries, private same-origin requests and stale selection responses. Browser checks use mocked source results, independently from live probes.

Next increment remains route comparison using reported closures, with source freshness and unknown-road coverage. Not implemented in this increment. FEMA remains a separately tracked provider-access failure and is not used as a live flood detection source. Wildlife/History/Land Ask remains deferred. Public sharing unchanged.
