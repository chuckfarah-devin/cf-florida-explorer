# Analyzer reuse findings — read-only

Status: technical design for owner review (G1). Implementation NOT authorized. No analyzer files were modified, built, run or copied.

Repository: https://github.com/chuckfarah-devin/cf-ai-infrastructure-analyzer
Pinned revision: `68a74a027e07ac51d00d7290ce19d563bdb35f81` (main, "Merge ArcGIS key injection for stable Pages build") — same SHA as docs/analyzer-reuse-review.md. 62 tracked files.

## Licensing and coupling (gating finding)

- `LICENSE` (blob `eff9fb14`): "All rights reserved… no part of the Work may be copied, modified, distributed… without the prior written permission of the copyright holder." Chuck is the holder, so reuse is legally his call, but **any source copied into cf-florida-explorer needs an explicit written grant** (e.g., a line in this repo's decisions log or a license file) — owner decision D7.
- `THIRD_PARTY_NOTICES.md` (blob `b358850e`): runtime deps MIT/BSD-3/ISC (react 18.3.1, react-dom, recharts 3.10.1, maplibre-gl 6.13.0 BSD-3-Clause, lucide-react 0.460.0 ISC); Esri basemap under Esri terms.
- Recommendation: **adapt patterns, do not copy files.** Every reusable item below is small enough to re-implement against Florida Explorer's own contracts, which avoids importing analyzer-specific coupling (fixed sites, infrastructure narrative, `CandidateSite` types, GitHub Pages base path).

## File-level findings

| Path (blob) | Verified finding | Decision |
|---|---|---|
| `src/components/StJohnsSatelliteView.tsx` (`fe396179`) L229–301 | Creates MapLibre `Map` per site with ArcGIS imagery style, `NavigationControl`, compact `AttributionControl`, a single **fixed** marker with popup "Approximate Site Location — Not a Property Boundary". No `click` handler, no free point selection, no keyboard selection | **Rebuild** point selection; **adapt** attribution/marker caveat pattern |
| same, L82–94 `fetchEnvironmentalService` | One retry after 500 ms on network error, abort-aware | **Adapt** (server-side, add 5xx/504 retry — FEMA 504s observed) |
| same, L307–401 `toggleEnvironmentalLayer` | `AbortController` per layer, 25 s timeout, distinct `loading/visible/empty/error` states, `exceededTransferLimit` warning, empty-result text "does not prove that the resource is absent" | **Adapt** state vocabulary and copy; extend with `outside_coverage`, `stale`, `partial` (R06) |
| same, L122–200 | FEMA fill expression by `FLD_ZONE`/`ZONE_SUBTY` (SFHA zones, 0.2 PCT X, MINIMAL X, D, unclassified) and zone labels incl. FLOODWAY | **Adapt** legend categories as reviewed mapping table |
| same, L446–498 | Per-layer "Source, date & limitations" `<details>` with coverage/date/limitation; `role="alert"` map error | **Adapt** for source details panel (R05, R08) |
| same, L222, L240 | Access date = render date (not retrieval date). ArcGIS key in style URL query string | **Do not reuse**: Florida Explorer needs per-record retrieval timestamps; key handling per cost-security doc |
| `src/data/environmentalLayers.ts` (`80494e5b`) | Declarative `EnvironmentalLayerConfig` registry (agency, coverage, sourcePage, sourceDate, limitation, queryUrl, legend). FEMA layer 28 queried with **envelope** (±0.04° lon, ±0.03° lat), `resultRecordCount 1000`, `maxAllowableOffset 0.0001`, `geometryPrecision 5`, `outFields FLD_ZONE,ZONE_SUBTY,SFHA_TF` | **Adapt** registry shape → connector registry (S01–S08). Envelope query is context only; generalization (`maxAllowableOffset`, 5-dp precision ≈ 1 m) is unacceptable for point classification. Point lookup must be an exact intersect (source-feasibility.md) |
| `src/components/ProjectsOverviewMap.tsx` (`055c2462`) L42–52 | Second MapLibre instance; same key-in-URL pattern; bounds fitting over fixed project markers | Reference only |
| `src/components/SiteExplorer.tsx` (`06dc5fea`), `src/data/siteExplorerData.ts` (`4661c880`) | Fixed site records with `coordinateSource` citation and per-fact `confidence` (verified/…) classification | **Adapt concept** of per-claim confidence into evidence classes; data not reusable |
| `src/components/Tooltip.tsx` (`66c63f22`) | Focus/hover tooltip with `role="tooltip"`, but trigger uses `role="button"` on a `span` | Reference; review a11y before any reuse |
| `src/assets/florida-outline.ts`, `scripts/extract-florida.mjs` (`dd69f86f`) | SVG Florida outline from Census us-atlas v3 (2017) TopoJSON | Not needed (real basemap) |
| `.github/workflows/deploy.yml` (`bec8ba9e`) | Node 20, `npm ci`, `npm test -- --run`, `npm run build` with `VITE_ARCGIS_API_KEY` secret, Pages deploy, `concurrency: pages` | **Adapt** CI shape for the frontend; model/provider credentials must never use `VITE_*` (bundled into client) |
| `vite.config.ts` | `base: '/cf-ai-infrastructure-analyzer/'` | Not reusable as-is |
| `package.json` (`4ed1e2b2`) | React 18, TS 5.5, Vite 5.4, Vitest 1.6, jsdom; maplibre-gl pinned 6.13.0; no `@arcgis/core` | Informs stack choice (technical-design.md) |
| `src/simulation/*.test.ts` | 5 test files, all simulation/financial; **no map, connector or a11y tests** | No test reuse |

## Gaps the analyzer does not cover

Free point selection; keyboard point selection; exact point-in-polygon classification; NFHL coverage (layer 0) and effective date (layer 3); any NOAA CO-OPS observation/prediction connector (its NOAA layer is a shoreline reference); evidence records with retrieval timestamps; caching/freshness policy; server-side boundary; any agent/LLM component; request/location binding.

## Independent-project implications

1. Florida Explorer stays a separate repo with no package, submodule or runtime dependency on the analyzer.
2. If Chuck grants permission (D7), at most short adapted snippets (FEMA legend expression, state vocabulary) should be re-typed with a provenance note naming this SHA.
3. Florida Explorer adds a backend; the analyzer is static-only. Its deployment workflow is a reference, not a template.
