# I4 — checked template answers

Chuck authorized this increment on November 4,2026 (“i agree....lets do it”), following the recommendation to enable source-backed Water & Weather answers before nature. This is template-first I4: no model, paid inference, new dependency or account. Merging, deployment, nature facts and future model routing remain separately gated.

## Experience

The pinned composer activates after selecting a point in Water & Weather. Suggestions cover FEMA mapping, water levels in the applied period and the limits of records for a reported flooding event. Free text routes conservatively to supported topics; unknown questions abstain. Definitions, safety/insurance/property advice, forecasts, wildlife, relative dates and explicit alternative date requests are not silently interpreted. Date controls select the period.

Answers appear above the place cards, receive keyboard focus and have readable citations per finding. Details include source query, retrieval timestamp, class, point, applied dates/reference, evidence fields and pack hash. Moving the point, applying different dates/reference or changing domain clears the answer and aborts the old request. Late replies cannot replace a newer scope/question. Follow-ups are independent questions, not hidden conversation memory. Draft chart edits do not change Ask scope.

On phones, an active answer expands the reading panel and reduces the map to a context strip. Back to place restores the larger map. Focus scrolls only the reading panel, preserving the page header and pinned composer.

## Evidence and validation

POST `/api/ask` accepts a numeric Florida point, positive selection ID, bounded question and applied dates/reference. Supplied evidence, arbitrary URLs/connectors and model prompts are not accepted as retrieval instructions. Same-origin/JSON checks,4KB body cap, date limits and ten concurrent requests match the existing bridge.

Sources are retrieved for the topic; independent outages allow partial answers. Answer records may be newer than displayed cards, explicitly disclosed. The snapshot is cloned/frozen and content-hashed with scope, sources, statuses and limitations; the response is immutable. Raw question text is UI context, never a factual finding or executable instruction. There is no durable question log, persistent conversation or permanent evidence archive.

FEMA membership is re-derived from one exact layer28 point-intersection source, never an overlay, buffer or convenience summary. Query geometry, CRS parameter, intersection and absence of buffer distance are checked. Known zone/subtype templates render classification; overlaps, missing zones and coverage gaps never imply safety. Saved data retain their original timestamp/caveat. BFE is not summarized in this increment.

NOAA queries must match station, product, feet/reference, GMT and independently derived UTC bounds. Rows must lie inside that period and measurements require explicit quality/flags. Highest returned observation and highest predicted high remain separately cited station/time/units/datum facts. They are not a same-time residual or cause attribution: high/low prediction points cannot establish an observed-minus-predicted time series. Missing data and unsupported datums stay explicit.

Every candidate has a closed claim type, compatible class, existing citation and exact allow-listed facts. Fabricated refs, wrong class, extra/missing facts, mismatched values/stations/units/datums and prototype keys fail validation. Only fixed templates render accepted facts; no free-prose model channel exists. Server-derived limitations cannot be supplied by a question/model.

Answers cannot establish street flooding, property depth, affected homes, safety or cause. No statistical rarity is quantified without a long-term baseline. Firsthand reports remain separate from gauge records. Unsupported requests abstain even when the user asks to fabricate a zone or claim.

## Verification

Tests cover citation/fact/class equality, injection, exact versus buffered source queries, wrong station/reference/date/timezone, inconsistent UTC bounds, quality omissions, partial outages, stale/coverage/no-data states, immutable scope/hash, unsupported routing, API origin/input/body/concurrency, source links, old replies, applied versus draft dates and mobile accessibility. Final results are in the PR.

Live public verification responses are retained locally under ignored `scripts/out/i4-*.json`, not claimed as permanent event evidence. An initial live event answer retained NOAA findings while FEMA was transiently unavailable, exercising partial-source behavior. No cause or field-validation conclusion is claimed.
