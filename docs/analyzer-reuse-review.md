# Analyzer reuse review — read-only, 2026-11-02

Repository: https://github.com/chuckfarah-devin/cf-ai-infrastructure-analyzer

GitHub access became available during this session. Reviewed README, package.json, src/components/StJohnsSatelliteView.tsx, src/data/environmentalLayers.ts, and .github/workflows/deploy.yml. Tree inspected at SHA 68a74a027e07ac51d00d7290ce19d563bdb35f81. File reads used main; blob SHAs below identify exact reviewed contents. No analyzer changes, source copying, builds or runtime tests performed.

| Component / file | Verified finding | Reuse recommendation |
|---|---|---|
| src/components/StJohnsSatelliteView.tsx; blob fe396179bd6dccabf45d61f888c5ff3d4ffa77f9 | MapLibre map uses ArcGIS imagery, attribution, navigation, markers, layer toggles, source details, abort controllers, timeout and distinct empty/error states | Adapt map and evidence presentation patterns; separate fixed-site and infrastructure content |
| src/data/environmentalLayers.ts; blob 80494e5b182ed730b1670c35bacc3caff565d00a | Declarative metadata and ArcGIS envelope queries; FEMA layer 28 with FLD_ZONE, ZONE_SUBTY, SFHA_TF; GeoJSON and raster strategies | Adapt registry patterns; envelope queries are surrounding context, not exact point classification. Review result caps and geometry precision |
| package.json; blob 4ed1e2b242d48fe6214c6ec4fa3f3efc544ae329 | React 18, TypeScript, Vite, MapLibre 6.13.0, Vitest; no ArcGIS JavaScript SDK dependency listed | Compare MapLibre plus ArcGIS services with ArcGIS SDK; do not assume SDK migration |
| .github/workflows/deploy.yml; blob bec8ba9e58ccc2858d68156c2960895ede2a6e1c | Test/build then Pages deployment; basemap key injected during frontend build | Reference only; model credentials need a server-side boundary, not frontend variables |
| README.md; blob bf8b785c9212858da6ae8c6530d36db179352f64 | Source caveats and all-rights-reserved licensing | Confirm owner permission and third-party notices before later code reuse |

Gaps: this map uses documented fixed-site coordinates; free point selection and a cited location agent are not established by these files. NOAA shoreline reference is not a tide or flood observation connector. In-memory layer caching is not a provenance/freshness system. No full audit or live-service validation was performed.

Devin must pin a commit for further review, confirm dependencies/licensing and propose reuse/adapt/rebuild decisions. Florida Explorer remains independent. No source was imported.
