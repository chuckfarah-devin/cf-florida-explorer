# I3 — NOAA station comparison

Chuck authorized the next tide-comparison step on 2026-11-04 (“ok lets do it”), after reviewing live I2 FEMA information. Working point: 26.50844824511624, −80.05460169017356. This selected point is not a surveyed flood-extent/depth measurement. Default period: October 25–29, 2026, America/New_York, based on the previously recorded firsthand report. No merge, deployment, AI answers or nature fact lookups are authorized by this increment.

## Behavior and limits

November 4 visual refinement, approved by Chuck: each station now has a chart before expandable tables. Returned six-minute measurements use a line broken at missing samples; predicted high tides use separate outlined points, never an invented continuous prediction curve. Station scales remain independent and labelled. Pending form edits are marked not applied. Unsupported height references are described separately from service outages. No new NOAA products or dependencies were added.

- Water & Weather now includes an editable date period, station cards and station map markers. Ask This Place remains Preview. Inclusive local dates are converted to UTC with an exclusive end instant, including daylight-saving transitions.
- Provisional curated area: latitude26.43–26.68, longitude−80.10–−79.98; each station must also be within25km. This bounded Briny Breezes/Ocean Ridge study area is not an exhaustive Florida station search or hydrodynamic suitability assessment. Outside it the UI says the curated set does not cover the point, rather than claiming that no station exists.
- Lake Worth Pier, Atlantic Ocean (8722670): six-minute measured water levels and astronomical tide predictions. Ocean Ridge (8722718): predictions only, Intracoastal Waterway. Each station's own NOAA metadata supplies its name/coordinates. Water-body labels/rationale are curated; distance and bearing are derived from the selected point.
- Circles mean stations offering measurements; triangles mean predictions only. Source-specific station clicks preserve the selected point. Markers clear on selection/domain/submitted-window changes and unavailable/loading states. Late responses cannot relabel a newer point.
- Daily measured maxima are derived from returned samples, not claimed as true maxima across missing data. Local time, quality and sample count accompany every row; preliminary data and nonzero NOAA flags remain disclosed. Predictions are separate and are not observations or weather forecasts.
- Heights are requested directly in feet MLLW or NAVD, labelled NAVD88 in the UI. No conversion is performed or borrowed across stations. Ocean Ridge metadata names an orthometric reference but contains no numeric NAVD88 datum value: NAVD there is refused. MLLW is local to each station. No comparison with property ground level or FEMA base flood elevation is made.
- Daily high-tide-flooding reports are independent, requested in feet STND. Empty results never mean zero flooding days. Nonempty reports show station-only flags/completeness; their report-date time basis is explicitly unverified against derived local-day maxima. Missing report dates are not filled with zero.

## Connector

POST `/api/noaa` accepts a Florida numeric point, positive safe selection ID, ISO dates and MLLW/NAVD. Same-origin/JSON checks,4KB body cap, fixed NOAA URLs and ten concurrent requests mirror I2. Vite and the optional local Node server expose the same bridge. No NOAA key or new dependency is required. Hosting remains unselected.

The conservative maximum is **30 inclusive calendar dates**, safely below NOAA's one-month six-minute limit even across fall DST. Longer periods are rejected before upstream retrieval, not truncated. Each upstream request has an8-second timeout and one retry on network/timeout/server errors. HTTP429/client errors are not retried; products fail independently.

A bounded process-local cache retains metadata7days, tide products15minutes and daily flooding reports1hour. Full URL keys isolate station/product/datum/UTC window. Cached responses retain original source retrieval times. NOAA JSON200 errors are not cached as successful data; invalid source schemas are evicted so retry can recover. Identical pending requests share upstream retrieval, while point/distance/selection binding remains per request. No NOAA stale fallback or persistent archive is claimed.

## Live verification — November4,2026

The implemented connector returned all sources for October25–29 local dates: UTC2026-10-25T04:00:00Z to2026-10-30T04:00:00Z exclusive.

| Source | Result |
|---|---|
| Lake Worth Pier metadata |26.612778,−80.034164; approximately11.78km from working point |
| Lake Worth Pier observations, MLLW |1,200 six-minute samples; all preliminary, flags retained |
| Lake Worth Pier predictions, MLLW |20 high/low tide records |
| Ocean Ridge metadata |Own name OCEAN RIDGE; approximately2.03km from working point |
| Ocean Ridge predictions, MLLW |19 high/low records |
| Lake Worth Pier daily HTF |Empty DailyFloodCount/count0; no-data state, never a zero-flooding conclusion |

Raw public probe/connector results are retained locally under ignored `scripts/out/i3-*.json`; they are not claimed as a permanent event-validation archive. A historical October2025 HTF request verified the nonempty schema, not the2026 event. NOAA stations cannot establish street flood extent/depth, affected homes or event causation at the selected point.

## Verification and gates

Tests cover DST/ranges, source identity, per-station datum refusal, missing/invalid records, quality/flags, JSON200 errors, no-data versus outages, rate limits/timeouts/retry, cache isolation/recovery/timestamps, concurrency, API input/origin/body checks, daily HTF, late point/window binding, station markers and accessible UI. Browser/axe cases use synthetic records and local pinned SDK assets; live-source verification is separate. Final check results are recorded in the PR.

Owner review of the provisional station scope, merge/release approval, I4 answers and broader field-validation protocol remain separate gates. No model integration or causation claim is included.

## Authoritative references

- [NOAA Data API](https://api.tidesandcurrents.noaa.gov/api/prod/): limits, products, quality, GMT, units/datums.
- [NOAA Metadata API](https://api.tidesandcurrents.noaa.gov/mdapi/prod/): identity/coordinates and station-specific datum records.
- [NOAA Derived Product API](https://api.tidesandcurrents.noaa.gov/dpapi/prod/): daily flooding fields and STND reference.
- [NOAA disclaimers](https://tidesandcurrents.noaa.gov/disclaimers.html).
