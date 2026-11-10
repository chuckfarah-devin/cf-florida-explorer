# I1/C7 continuation after quota interruption

Date: 2026-11-03. Starting revision: 8886d71bc9f336cc564a2f49ca6a89ee0be04848, PR #2.

The interrupted Devin commit already contained the three fixes (SDK keyboard-surface label/focus, mid-session layer errors, and muted-text contrast), plus four Playwright/axe checks in CI. GitHub's check for that starting revision completed successfully. These changes were inspected rather than recreated.

## Remaining layer-status race fixed

An earlier layer load could settle after the user retried or disabled the layer. Its completion could overwrite the current status, including replacing a successful retry with an old error. Tracking now binds status updates to the layer instance and current load generation, requires the layer to remain visible, and stops publishing after map destruction. Retry disposes of the replaced layer.

Six SDK-boundary regression tests cover the real createMap wiring with SDK/network doubles: naming the SDK focus surface, mid-session error and successful retry, a late error from a replaced load, completion/errors after toggling off, error persistence while initial loading settles, and a pending failure after map destruction. These tests complement the existing URL attribution and UI tests; they do not test real WebGL or upstream service behavior.

## Scope

## Verification of this follow-up

- Lint and TypeScript checks: passed.
- Vitest: 31 tests across five files passed, including six new SDK-boundary regressions.
- Production build: passed; existing ArcGIS chunks-over-500-kB warning remains.
- Playwright/axe: four checks passed in installed Chrome on Windows, against the production build with upstream services blocked and no ArcGIS key. Desktop start, desktop selected place, mobile selected place and keyboard focus/Enter were covered. This is not a live-service or hosted-preview result.
- The locked dependency installation reported 11 moderate advisories; no dependency upgrade was made as part of this scoped fix.

## Approval boundary

I1/C7 only. No model/FEMA/NOAA answer integration, key access, I2 implementation, merge or deployment. Hosted preview and restricted-key verification remain separate from local service-blocked browser checks. Accessibility automation cannot replace screen-reader, real-device or manual full-map attribution review.
