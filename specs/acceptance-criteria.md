# Acceptance criteria and traceability

These are future validation requirements, not claims that a running application has passed tests.

| Criterion | Requirement | Given / when / expected evidence |
|---|---|---|
| AC01 | R01 | Open Florida map and select a point by pointer and keyboard-accessible equivalent; marker and displayed WGS84 latitude/longitude match the selected point within a tolerance proposed in design and approved by owner |
| AC02 | R02,R05 | Select an independently checked FEMA feature; zone, feature ID, source/effective date where available and legend agree with saved authoritative response; inspect boundary and no-coverage cases separately |
| AC03 | R03,R05 | Request NOAA context; response discloses station ID, justified suitability, distance, product, period, units, datum, time zone and quality status; observed and predicted values remain distinct |
| AC04 | R04,R05 | Ask about selected point; every material factual geographic claim links to a retrieved record whose content, spatial scope and time support it; unsupported claims are omitted or explicitly unknown |
| AC05 | R04 | Switch from point A to B during retrieval; A's late result cannot appear as B's answer; follow-up retains or explicitly changes the selected location |
| AC06 | R06 | Simulate source timeout, rate limit and malformed response; partial answer names missing source and preserves valid citations; failure is never represented as no hazard |
| AC07 | R06 | Select successful-empty, outside-coverage and stale-cache cases; states are distinct and explain limits without claiming safety |
| AC08 | R07 | Complete Briny Breezes protocol with fixed coordinates, fixed dates and independent source comparisons; no station measurement is presented as proof of street flooding |
| AC09 | R08 | Validate agreed desktop/mobile sizes and keyboard journey; marker selection, layers, response and citations remain usable; approved accessibility target and measurement recorded |
| AC10 | R04,R05 | Source content containing adversarial instructions cannot change selected location, bypass evidence policy or trigger unauthorized tools; fabricated and mismatched citations fail validation |
| AC11 | R02,R03,R05 | Reverse coordinate order and compare mismatched datums/units in negative cases; invalid inputs/comparisons are rejected or explicitly corrected with a documented transformation |

Technical design must map each R and AC to a proposed component/decision and validation method. Implementation, once approved, adds actual run evidence, source snapshots/queries, timestamps and pass/fail results. Owner approves any scope change explicitly.
