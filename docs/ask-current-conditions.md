# Ask This Place: current conditions

Approved November 24, 2026. This increment connects the existing Conditions now retrieval pipeline to checked Ask answers in Water & Weather. It does not add an LLM or independently search the web.

## Behavior

Questions route to one supported current topic: active weather alerts, latest nearby station weather, FHP road reports within 15 straight-line miles, nearby connected county cameras, or a current-condition summary. These are recent checks, separate from the historical NOAA tide window. Response still echoes the selected point, selection ID, exact question and applied window to prevent old-selection answers; the UI labels current answers so the historical dates are not presented as their observation period.

Server invokes the existing Conditions handler itself; clients cannot supply source records. Source point and retrieval age (maximum five minutes, future tolerance 30 seconds) are checked before use. Alert endpoint/query must match the selected point; expired alerts are filtered. Station records retain observation timestamp, Fahrenheit, past-hour inches where reported, and explicit old-report/missing-rainfall states. Incident/camera distances are independently recomputed from source coordinates. Camera links are listed viewer locations, not inspected live pictures. Direct camera coverage remains Palm Beach County; FL511 is linked elsewhere.

Typed current claim rules are added to the existing deterministic claim validator. Each finding renders from checked source fields, includes matching fact references and a source citation. Browser validation additionally rejects current-source host/path mismatches and missing/altered claim facts. Source failures and no returned records remain distinct. No road is labelled clear or passable because no incident was returned. Route, safety, flood depth, future/historical weather and causation questions are outside this increment.

## Validation and delivery

New tests cover current topic routing through /api/ask, independence from FEMA/NOAA tide retrieval, source scope, stale retrievals and station observations, expired alerts, failures versus empty reports, distance tampering, camera links/coverage, claim-fact mismatch, safe source URLs and browser selection changes. Existing Water and mapped Nature behavior remains covered. Current-source tests are synthetic; live checks are separate and recorded in the delivery note.

No new dependency, paid service, model key, browser credential, sharing change, route engine or FEMA endpoint migration. Full LLM/RAG and route comparison remain future increments. No merge of the existing PR stack is implied.
