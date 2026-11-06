# Florida Explorer

Select a place. Explore its story. Follow the evidence.

Florida geographic discovery app with a local Node API and responsive ArcGIS map.
Repository: [cf-florida-explorer](https://github.com/chuckfarah-devin/cf-florida-explorer), separate from `cf-ai-infrastructure-analyzer`.

Status as of 2026-11-06: personal-use MVP release candidate. Water & Weather, Nature & Wildlife, History & Change and Land & Infrastructure are available. Checked Ask answers cover Water and mapped Nature facts. See [MVP scope and acceptance](docs/mvp-release.md) for completed scope, evidence and deferred work. No public deployment or native Android app.

## Reading order

1. [Charter](docs/charter.md)
2. [PRD](specs/prd.md)
3. [Acceptance and traceability](specs/acceptance-criteria.md)
4. [Evidence contract](specs/evidence-contract.md) and [source registry](data/source-registry.md)
5. [Briny Breezes validation](specs/briny-breezes-validation.md)
6. [Read-only reuse review](docs/analyzer-reuse-review.md)
7. [Exact Devin handoff](devin/technical-design-handoff.md)
8. [Gates and decisions](docs/decisions-and-gates.md) and [independent review](devin/review-record.md)

The documentation baseline remains under docs/, specs/, devin/, and data/. Application code is under src/; the portable local API is under server/.


## Run locally

Requires Node 24.15+. Copy `.env.example` to `.env.local` and set `VITE_ARCGIS_API_KEY` to the dedicated, referrer-restricted Florida Explorer key (never commit it). Without a key the app uses an OpenStreetMap development basemap and place search is unavailable.

```
npm ci
npm run dev        # local dev server
npm run lint && npm run typecheck && npm test && npm run build
```

The Vite development and preview servers serve `/api/fema`, `/api/noaa`, `/api/nature`, `/api/ask`, `/api/wildlife`, `/api/history` and `/api/infrastructure` locally. For the built frontend plus local API, run `npm run build` then `npm start` (default http://localhost:4173; `PORT` changes the port). Use localhost if that is the hostname permitted by your ArcGIS key. An HTTPS reverse proxy must explicitly configure `PUBLIC_ORIGIN` to its exact frontend origin; forwarded protocol headers are not trusted. No hosting provider or deployment is selected.

FEMA requests need no API key. A static-files-only server cannot run the API: it must use the portable handler or the provided local Node server. Server runtime is Node 24.15+ and uses native TypeScript stripping; no production server dependency is added.

`npm run test:a11y` checks the built frontend with synthetic FEMA responses and blocked upstream map/data services. `node scripts/fema-smoke.mjs` separately probes public FEMA services at the two documented Briny Breezes points and writes ignored output under scripts/out/. Synthetic tests and screenshots do not validate the October 2026 flooding event.


