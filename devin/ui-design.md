# UI design and interaction specification

Status: UI proposal for Chuck's review before any build (G1). Wireframes are static annotated drawings. **Implementation NOT authorized.** There is no application code, no scaffold and no dependencies. Values shown (Zone AE, panel 12099C0793G, stations 8722670/8722718) are taken from the live source checks in source-feasibility.md and are illustrative layout content, not validated answers.

## 1. Wireframes

### Desktop (≥ 1024 px)

![Desktop wireframe](wireframes/desktop.svg)

Three columns: layers and legend (250 px) · map (flexible) · "This place" panel (≈ 400 px, resizable 360–560 px). The annotations are in the right-hand column of the drawing.

### Mobile (< 768 px)

![Mobile wireframes](wireframes/mobile.svg)

Full-screen map with a bottom sheet that has three snap points: A collapsed (≈ 150 px), B half (≈ 60% of the screen) and C full. Tablet (768–1023 px): map with the place panel as a right-hand drawer (≈ 380 px), and layers in a popover.

## 2. Layout regions

| Region | Contents | Requirement |
|---|---|---|
| Top bar | Product name; place search or typed lat/lon; four domain tabs; About/Help | R01, charter domains |
| Domain tabs | **Water & Weather** (MVP, active), **Nature & Wildlife**, **History & Change**, **Land & Infrastructure** (labelled "later"; visible so the product scope is legible, but they load no data) | Charter; PRD future domains |
| Layers panel | FEMA flood hazard overlay (toggle, opacity), NOAA station markers, NOAA sea level rise (disabled, "later — D3"), basemap choice, FEMA legend with verbatim codes and plain labels, station legend, an "overlay is orientation only" note, and attribution | R02, R03, R08 |
| Map | Basemap, FEMA overlay, station markers (circle = observed, triangle = predictions only), selected-point crosshair and coordinate chip, zoom, locate, "Select map centre" control, scale bar, attribution | R01, R02, R08 |
| This place | Bound-point header; FEMA card; NOAA card; Ask This Place; answer; source details | R02–R06 |

## 3. Interaction specification

### 3.1 Selecting a point (R01, AC01, AC11)

| Input | Behaviour |
|---|---|
| Click or tap on the map | Moves the crosshair to the exact clicked coordinate and shows the chip `26.50890, -80.05225` (5 dp display; full precision is kept). On mobile, a toast "Point moved to …" offers Undo for 5 s |
| Keyboard | Map is focusable. Arrow keys pan by 1/8 of the viewport (Shift: 1/2), `+`/`−` zoom, and **Enter** or the "Select map centre" button selects the fixed centre crosshair. The result is identical to a click |
| Typed coordinates | Search box accepts `lat, lon`. Rejected with an inline message and no query when outside the Florida envelope ("This point is outside Florida; Florida Explorer covers Florida only") or when the order looks swapped ("Did you mean 26.51, -80.05? Latitude comes first") |
| Place search | Geocoder suggestions (provider per D1). Choosing one sets the point; the chip shows coordinates, not just the name |
| Copy | Copies coordinates in `lat, lon` decimal degrees |

Only one point is active at a time. Area selection is out of scope (PRD future).

### 3.2 Changing the point (R04, AC05)

1. New `selectionId`. All in-flight evidence and answer requests for the old point are aborted.
2. The FEMA and NOAA cards and any answer for the old point are removed immediately and replaced by loading states for the new point. Nothing from the old point remains visible.
3. The Ask thread is closed. A divider reads "Now asking about 26.50870, -80.05170". Previous answers stay available under "Earlier points" (collapsed) with their own coordinates.
4. A response is rendered only if its `selectionId` and `locationEcho` match the current point.

### 3.3 Layer controls (R02, R08)

- Toggles are real checkboxes with labels and opacity sliders (0–100%, step 10).
- Turning the FEMA overlay off does not change the classification card, which comes from the server-side point query.
- The legend shows FEMA codes verbatim (`AE`, `VE`, `X`, …) with short plain labels. Colour is never the only cue: each zone also has a pattern on the map, and the code is always shown in the card.
- Station markers have accessible names, e.g. "8722670 Lake Worth Pier, observed water level, 11.7 km north".

### 3.4 FEMA card (R02, R05, R06)

| State (source-feasibility.md) | Card copy (fixed) | Visual |
|---|---|---|
| `classified` | "Zone AE · Coastal floodplain · SFHA: yes" + BFE/datum + panel + effective date | Zone colour bar |
| `classified_near_boundary` | As above, plus the chip "Near boundary: X (0.2%) within 15 m" | Amber chip |
| `in_coverage_no_zone` | "FEMA's digital map covers this point but returned no flood-zone polygon. This is a data gap, not a finding of low risk." | Grey, dashed border |
| `outside_nfhl_coverage` | "FEMA's digital flood map does not cover this point." | Grey, dashed border |
| either of the two above with `nearbyZones` | adds "FEMA maps Zone AE within 15 m of this point" | Amber chip |
| `ambiguous_overlap` | "FEMA returned more than one zone here: AE, X" | Amber |
| `coverage_unknown` / failure | "FEMA flood data is unavailable right now. Retry" (other sources still shown) | Red outline, Retry button |
| stale cache | Normal content plus "Retrieved <date> (stale)" | Clock icon |
| loading | Skeleton with "Checking FEMA flood map…" | — |

Never shown in any state: "safe", "no risk", "not in a flood zone".

Outside-Florida input is rejected at selection time (§3.1). It never reaches the FEMA card, so it cannot be confused with `outside_nfhl_coverage`.

### 3.5 NOAA card (R03, R05)

- Heading: "NOAA tide context (stations, not this point)".
- One row per station: role (observed or predicted), id, name, water body or side (ocean / Intracoastal), distance and bearing.
- **Window selector:** the date range must be chosen explicitly (start and end date, America/New_York, with the UTC equivalent in the source details). Default is "not set". The UI never interprets relative phrases such as "last week". If a question contains one, the answer asks for dates instead.
- When a window is set: daily max observed and predicted high tides as a small chart and table, each labelled `ft · NAVD88 · EST/EDT · verified/preliminary`. Station thresholds are labelled as the station's thresholds. Datum toggle: MLLW or NAVD88, re-requested from NOAA in that datum (not converted on the client).

### 3.6 Ask This Place (R04, AC04, AC10)

- Question box (multi-line, max 500 characters), Ask button, Enter to submit (Shift+Enter for a new line). There are suggested questions, and free text is allowed.
- Disabled with a reason ("Waiting for evidence for this point…") until the evidence pack exists. If some sources failed, Ask is allowed and the answer is partial.
- In-progress text: "Checking answer against sources…". The answer appears in an `aria-live="polite"` region, and only after validation.
- **Answer layout:**
  - Header "Answer for <coords>" and a mode badge: "Built from verified evidence", or "Template answer (model unavailable)".
  - Findings as short bullets, each ending in citation chips `E1 E2`.
  - Optional inference bullets in a distinct style, labelled "Inference" with their assumptions.
  - "What the evidence can't say" for unknowns and limitations, using fixed, validated wording.
  - "Sources unavailable" if any source failed.
- Every visible sentence comes from a validated finding, an allow-listed unknown or limitation code, source status or fixed UI copy (evidence-and-agent-design.md §4–4b).
- Follow-ups stay bound to the same point and evidence pack. The header always shows the coordinates.
- Out-of-scope questions (forecasts, insurance, other domains) get a fixed abstention naming what is available and where to look. Questions in the "later" domains get "Nature & Wildlife isn't available yet."

### 3.7 Citations and source details (R05, AC04)

- A citation chip is a button. Activating it expands that source in the "Sources" accordion, scrolls to it and moves focus to its heading. Esc or "Back to answer" returns focus to the chip.
- Each source detail shows:
  - Evidence ID, provider and dataset, and evidence class (regulatory classification / measured observation / predicted tide).
  - Spatial relation (point inside polygon / station 11.7 km N).
  - Record IDs, effective date or period, units, datum and time zone.
  - Quality (verified/preliminary), retrieval time (UTC and local) and freshness.
  - Limitations.
  - Links: "View query" (source URL), "Terms" and attribution.
- Hovering or focusing a chip highlights the related map feature or station. This highlight is presentation only.

### 3.8 Partial, stale and failure states (R06, AC06, AC07)

- Each source has its own state and its own Retry. One source failing never blanks the panel.
- Global banner only when every source fails: "Sources are unavailable; nothing can be said about this point right now."
- Stale content stays visible with "Retrieved <date> (stale)". Preliminary NOAA data is labelled "preliminary, may change".

### 3.9 Responsive behaviour (R08, AC09)

| Width | Layout |
|---|---|
| ≥ 1024 px | Three columns (desktop wireframe) |
| 768–1023 px | Map + right drawer (≈ 380 px) for This place; layers in a popover |
| < 768 px | Map + bottom sheet (A/B/C). Selecting a point opens A. Ask opens B. An answer opens C. The coordinates header stays pinned at B and C. When the on-screen keyboard opens, the sheet goes to C |
| 320 px / 200% zoom | Single column, no horizontal scrolling except the map; the domain chips row scrolls |

### 3.10 Accessibility (R08, AC09; thresholds in validation-plan.md)

- Focus order: skip link → search → domain tabs → layers → map → This place (header, FEMA, NOAA, Ask, answer, sources).
- Visible focus ring ≥ 2 px with 3:1 contrast.
- Touch targets ≥ 44 × 44 px on mobile, ≥ 24 × 24 px on desktop.
- Text contrast ≥ 4.5:1, UI ≥ 3:1. Zone colours always come with codes and patterns.
- Live regions: point changes ("Point set to 26.50890, -80.05225") and answer readiness are announced politely. Errors use `role="alert"` only for blocking input errors.
- `prefers-reduced-motion` disables map fly-to animation and sheet easing.
- Map alternative: the This place panel carries all the information, so a screen-reader user can work from typed coordinates without using the map visually.

## 4. Traceability

| UI element | R | AC |
|---|---|---|
| Point selection: click, keyboard, typed; coordinate chip | R01 | AC01, AC09, AC11 |
| FEMA overlay, legend, FEMA card states | R02, R06 | AC02, AC06, AC07 |
| NOAA card, station markers, explicit window | R03, R05 | AC03, AC11 |
| Ask, answer, citation chips, mode badge | R04, R05 | AC04, AC10 |
| Point-change reset and bound header | R04 | AC05 |
| Source details accordion | R05 | AC04 |
| Responsive layouts, keyboard and contrast | R08 | AC09 |

## 5. Open UI decisions (for Chuck)

| ID | Decision | Recommendation |
|---|---|---|
| U1 | Show the three non-MVP domain tabs now ("later") or hide them | Show, disabled. It makes the four-domain product legible without implying data |
| U2 | Place search provider (follows D1 map choice) | Same vendor as the basemap |
| U3 | Default map view | Statewide Florida on first load; no geolocation prompt until the user presses Locate |
| U4 | Earlier-point answers kept in the session | Yes, collapsed, with coordinates; cleared on reload (retention per D6) |
| U5 | NOAA mini-chart in MVP or table only | Table first; chart if time allows (same data) |
| U6 | Brand and visual style | Neutral wireframe style now; visual design after G2 |
