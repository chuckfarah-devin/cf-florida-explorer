# I1 + C7 verification record

What was actually checked for PR #2, where it ran, and what is still only planned. Recorded 2026-11-03.

## Where each check ran

| Environment | What it is | Checks run there |
|---|---|---|
| GitHub Actions CI | Ubuntu runner, no real browser, no ArcGIS calls | `npm run lint`, `npm run typecheck`, 25 Vitest/jsdom tests, `npm run build`, then `npm run test:a11y`: 4 Playwright + axe-core tests against the built app in headless Chromium, with external map/data services blocked (OSM fallback basemap, no key). Passing on the latest commit. |
| Local real-key preview | `npm run preview` on `http://localhost:4173`, real Chrome, real ArcGIS and FDEP services | ArcGIS basemap, "Briny Breezes, FL" search, the screenshots in `devin/i1-screenshots/` |
| Preview-origin test build | The same built files served by Playwright under the exact preview origin (`https://florida-explorer--25otxhxk.preview.devinapps.com`), real headless Chrome, real ArcGIS and FDEP network | Everything in "Completed checks" below |
| Direct API check | `curl` to Esri's basemap-styles and geocode endpoints with Origin/Referer headers | The key works for the preview origin and localhost and is rejected for an unlisted origin |
| **Actual hosted preview** | The Devin preview link (it needs a Devin login) | **Not checked by Devin.** Devin's browser can't log in to it; only Chuck has opened it. |

## Completed checks (preview-origin test build, Chrome)

| Area | Result |
|---|---|
| Basemap and search | ArcGIS light-gray basemap, Esri attribution, no dev banner. "Briny Breezes, FL" returns "Briny Breezes, Florida" and places the marker. No ArcGIS request failed. Desktop 1366×768 and mobile 360×800. |
| Keyboard: search | Tab to the search box, type, Enter, Tab to the result, Enter: the place opens. Pass. |
| Keyboard: controls | Topic buttons, every layer name and switch, Map layers, Zoom in/out and Select map center can all be reached by Tab, and each shows a focus ring. Space toggles a layer ("Shown"). Enter on a layer name opens its source details with Limits. Pass. |
| Keyboard: map | **Fixed, now passes.** The first run failed: the labelled outer map stop ignored arrows and Enter, and ArcGIS's inner surface had no name or focus ring. The map is now a single Tab stop (ArcGIS's surface) named "Map of Florida. Use arrow keys to pan and Enter to select the map center.", with a teal focus ring. Re-test: arrow keys pan (center moved from −81.60 to −80.17 longitude), and Enter selects the map center ("Selected spot"). The "Select map center" button also works. |
| Desktop pinned Ask | The Ask input stays in view without page scrolling at 1366×768, 1280×720 and 1024×768. Input disabled, marked Preview. Pass. |
| Mobile scrolling and pinned Ask | At 360×800, 390×844 and 800×360: the place sheet scrolls internally, the page itself doesn't scroll, there's no horizontal overflow, and Ask stays in view before and after scrolling and after opening and closing Map layers. Pass. |
| Mobile layers | Map layers opens the panel, tapping Wetlands shows it ("Shown"), and Done closes the panel. Pass. |
| Layer loading | With a 4 s delay on each FDEP request, the status shows "Loading…". Pass. |
| Layer error and retry | With the aquatic-preserves service unreachable from page load: "Couldn't load", announced as an alert, plus a Retry button. Other layers are unaffected. After the service is restored, Retry shows "Shown". Pass. |
| Layer failing mid-session | **Fixed, now passes.** The first run failed: data requests failed (6 in the test) but the status stayed "Shown". Failed requests to a layer's service are now attributed to that layer (by sublayer where the URL names one) and set it to "Couldn't load" with Retry. Re-test: same 6 failures now show "Couldn't load / Retry". |
| Automated accessibility (axe-core 4.10.2, WCAG 2.0/2.1 A and AA rules) | **Fixed, now 0 violations** on desktop start, desktop place and mobile place views. The first run failed colour contrast: #73828a was 3.97:1 on white and 3.58:1 on sand. The muted text colour is now #5c6a71: 5.59:1 on white, 5.06:1 on sand, 4.83:1 on light teal. The suggested-questions container now has `role="group"`. axe still can't rate contrast for Esri's attribution text over the map (reported as "incomplete", not pass). axe now runs in CI (`e2e/a11y.spec.ts`). |

## Planned acceptance tests (not yet run)

- Real screen readers (NVDA, VoiceOver, TalkBack).
- Real phones and touch gestures, plus Safari and Firefox.
- 200% and 400% zoom reflow, and reduced motion.
- Performance/Lighthouse budgets.
- A check of the hosted preview link itself.
