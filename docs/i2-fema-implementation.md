# I2 — FEMA point evidence

Owner authorization: Chuck said “proceed with i2” on 2026-11-03. Scope is FEMA lookup and map context, not NOAA, AI answers, hosting, merging or deployment. This increment is stacked on the I1/C7 branch from PR #2; prior PRs remain unmerged.

## Implemented behavior

The browser posts latitude, longitude and selectionId to same-origin `/api/fema`. A portable Fetch-style server handler validates the existing Florida envelope, request shape, content type and origin before querying fixed FEMA NFHL endpoints. It never accepts an upstream URL or credentials from the client. A local Node HTTP server and Vite middleware exercise the handler without choosing a cloud host. The local Node listener binds only 127.0.0.1. Configure an exact `PUBLIC_ORIGIN` if deliberately placing it behind an HTTPS preview proxy; no proxy is deployed by this PR.

Five queries form an immutable batch: exact-point flood zones (layer 28), 15 m buffered zones (28), digital availability (0), map panels (3), and map revisions (1). Parameters request intersections with WGS84 input; source data are NAD83 and transformed by FEMA's server. No generalized display geometry is used for point classification. The precise transformation method remains unverified and is disclosed in details.

Classification distinguishes one zone, nearby different zone, overlap, coverage/no-zone, outside coverage, failed coverage lookup, and failed exact lookup. Buffer failure is an unavailable check, never a finding that no zone is nearby. Missing panel/revision data remain visible as separate source failures. All matching revisions and panel records are displayed, rather than silently selecting or merging one.

The public-facing card uses deterministic text from returned FEMA fields. It exposes coordinates, original zone/subtype, feature IDs, map panels/effective dates, source queries, retrieval timestamps, CRS and limitations. Unknown units and FEMA sentinel values are never replaced with assumed feet. Unrecognized X subtypes do not become minimal hazard. Empty results and failures never imply safety. The 15 m radius is our search choice, not FEMA accuracy or surveyed distance.

A separate optional Flooding overlay uses FEMA's server-rendered layer and native service legend. Zoom in for shading; source scale limits are preserved. Overlay visibility/errors do not change the server's classification. Existing nature layers stay display-only. Ask This Place stays disabled and marked Preview.

## Reliability and cache

- Upstream timeout: 8 seconds per attempt; one jittered retry for network failures, timeouts and server errors. No automatic retry for 429/client errors or malformed/truncated responses.
- At most ten active API lookups per process; 4 KiB request-body limit and no application logs of questions/credentials.
- Cache holds at most 500 complete point batches in process memory. The key includes full point precision, query definitions and radius; exact and buffer data are never substituted or mixed across retrieval batches.
- Fresh for 24 hours. After fresh expiry, a failed exact refresh may use the complete old batch for at most seven days from retrieval, explicitly labeled stale with original timestamps and current failure names. Partial batches are not cached. No disk persistence or distributed cache is assumed.
- Concurrent identical requests share upstream work but retain their own API selection IDs. The client aborts obsolete work, rejects mismatched responses and ignores late results even if the transport ignores cancellation. Browser timeout is 20 seconds. Aborting a browser request does not guarantee cancellation of already-started upstream work.

## Verification record

Final local results: lint, type checks, production build, 57 unit/API tests and all eight browser checks passed. Browser cases use synthetic FEMA responses; live service and HTTP bridge probes are separately recorded below. The existing large-SDK-chunk warning remains.

- Synthetic server tests cover all classification states, malformed/truncated data, source failures, timeout/retry, HTTP errors, whole-batch caching, stale expiry, coordinate isolation and API input/origin validation.
- HTTP bridge tests cover configured HTTPS preview origin and rejected unrelated origin. Independent review identified this issue before it was corrected.
- The final browser pass exposed a keyboard naming race when a basemap never became ready or the SDK updated its surface. MapView now receives its supported `aria.label` option at construction, rather than patching a DOM attribute after readiness. The SDK owns the label through its updates; a regression test covers unresolved basemap readiness.
- Native Enter on the focused map surface calls the same center-selection handler as the explicit button, without waiting for SDK navigation initialization. Other keys remain owned by the SDK. The listener is removed on destruction and is regression-tested.
- Optional legend initialization is lazy and isolated from core map setup; unavailable legend assets cannot prevent point selection or keyboard labeling. This path also has an SDK-boundary regression test.
- UI tests cover plain-language copy, unknown units, unknown zone subtype, stale/partial display, retries, response binding and point-switch races.
- Browser tests use explicitly synthetic FEMA responses. They check desktop/mobile accessibility, source-detail keyboard interaction, missing-data messages and delayed old-point responses. No test fixtures are shipped as real evidence.
- The browser harness serves the installed, pinned SDK localization/WASM files locally while blocking remote map/data services. Blocking those SDK files themselves prevents the SDK keyboard engine from initializing and is not a valid keyboard interaction test.
- A full request through `npm start` and the HTTP bridge on localhost returned selectionId 7 and AE for BB-P1, independently of the direct connector smoke script.
- Live read-only smoke checks at BB-P1 (26.5089022, −80.0522463) and BB-P2 (26.5087, −80.0517) on 2026-11-03 returned AE and X respectively. A repeat complete run returned all five source queries successfully for both points; the first run had ancillary failures that were retained as partial statuses. The 15 m query at BB-P1 returned AE only; BB-P2 returned an additional zone in the buffer. Do not assume the earlier 30 m experiment proves the 15 m result.

NZ-1 remains a labeled synthetic response fixture, not a discovered real point. No local flooding extent, water depth or home damage was inferred from FEMA data. The October 25–29, 2026 event record is unchanged. Actual hosted-preview/API routing, real ArcGIS-key behavior, screen-reader/device checks and performance budgets remain separate validation work. Existing large SDK chunk warnings and dependency advisories are not silently resolved by this increment.
