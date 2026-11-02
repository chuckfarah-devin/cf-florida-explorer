# Cost, security and owner decisions

Status: proposal for owner review (G1). Implementation NOT authorized. Prices are assumptions to be re-verified before G2.

## 1. Credential boundaries

| Credential | Where it lives | Never |
|---|---|---|
| Model provider API key | Serverless platform secret, read only by `/ask` | In frontend, `VITE_*` vars, repo, logs, or any request to FEMA/NOAA |
| ArcGIS API key (basemap) | Frontend (Esri keys for basemaps are client-side by design) **scoped to basemap styles only, HTTP-referrer restricted** to the production and preview origins | Granting it privileges beyond basemaps; reusing the analyzer's key |
| FEMA / NOAA | None needed (public) | Sending any credential to these endpoints |
| CI | Deploy tokens via GitHub Actions secrets/OIDC | Printing secrets in logs |

Analyzer finding: it injects `VITE_ARCGIS_API_KEY` at build time and places it in the style URL (`token=`). Acceptable only for a referrer-restricted basemap-only key; not a pattern for any other secret.

## 2. Location and question retention

| Data | Stored? | Detail |
|---|---|---|
| Selected coordinates | Request-scoped; evidence cache keyed by exact coordinate for TTL (≤ 7 days stale limit) | No user identifier attached |
| Operational logs | Yes, minimal | Coordinates rounded to 3 dp (~110 m), source status, latency, model token counts; **no question text**, no IP beyond platform default retention |
| Question text | Not persisted by default | Sent to model provider for the call only; choose provider/setting with no training use and shortest retention (D6) |
| Validation runs | Yes | Fixture questions and responses archived in repo/artifacts (fixed, non-personal) |
| Accounts / cookies | None | No login (PRD) |
| User testimony (e.g., "my street flooded") | Conversation only | Labelled `user_report`; not stored server-side |

A short in-app privacy note states the above.

## 3. Expected costs (assumptions)

| Item | Assumption | Estimate |
|---|---|---|
| FEMA, NOAA APIs | Public, no fee | $0 |
| Static hosting | GitHub Pages or platform free tier | $0 |
| Serverless API | < 100k requests/month fits common free tiers (Cloudflare Workers, Vercel Hobby, AWS Lambda free tier) — terms Unverified | $0–$5/month MVP |
| Model calls | ~6k input tokens (policy + evidence pack + question) and ~800 output per answer. Illustrative price band $0.15–$3 per 1M input and $0.60–$15 per 1M output depending on model tier | ≈ $0.0014–$0.03 per answer → 1,000 answers/month ≈ $1.40–$30 |
| ArcGIS basemap | ArcGIS Location Platform free tier assumed to cover MVP traffic — **Unverified** | $0 assumed; must confirm (D1) |
| Validation runs | ~200 answers per full run | < $10 per run at upper band |

Cost controls: per-IP rate limit on `/ask` (e.g., 20/hour), max question length 500 chars, evidence pack size cap, monthly spend alert at a Chuck-set budget, template-answer fallback when budget reached.

## 4. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| FEMA NFHL intermittent 504 (observed) | Missing classification | Retry, cache, stale-with-label, partial answer |
| Station not representative of point (ocean vs ICWW) | Misleading context | Curated table, disclosure, prohibited point-level claims |
| Boundary misclassification (zones differ within ~55 m in town) | Wrong zone shown | Buffer check, near-boundary state, FIRM caveat |
| Model fabricates or over-generalizes | Trust failure | No tools, validator, template fallback |
| Esri terms/pricing differ from assumption | Cost or licensing block | Verify before G2; M1 fallback |
| Analyzer code reuse without written grant | Licensing ambiguity | Adapt patterns; D7 |
| Misreading "last week" | Invalid validation | Blocked fixture until D2 |

## 5. Blockers before implementation (G2)

1. Chuck's approval of this design and a bounded first increment.
2. D1 map SDK and ArcGIS account/key ownership; Esri terms and free-tier confirmation.
3. D4 hosting accounts; D5 model provider and budget.
4. D2 Briny Breezes point + event window (blocks BB-01/AC08 only, not I1–I4).

## 6. Owner decisions

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Map rendering | M1 MapLibre + Esri plugin; M2 ArcGIS Maps SDK 5.x | M2 (M1 if open license preferred) |
| D2 | Briny Breezes fixture | Exact point; fixed event window (dates/times, tz); any local corroboration | Provide window; accept BB-02 as labelled comparison meanwhile |
| D3 | NOAA presentation | Station-first; add SLR/HTF overlay | Station-first MVP; overlay later |
| D4 | Hosting | D4-a…d (technical-design.md §6) | D4-a or D4-b on existing accounts |
| D5 | Model provider/budget | Any provider with structured output and no-training option | Choose provider; set monthly cap |
| D6 | Retention | As §2 or stricter | Accept §2 |
| D7 | Analyzer reuse permission | None (patterns only) / grant for named snippets | Patterns only; optional named-snippet grant |
| D8 | Thresholds | AC01 tolerance, FEMA buffer (15 m), station radius (25 km), performance and a11y targets | Accept validation-plan.md values or amend |
| D9 | Baseline changes C1–C6 | Accept / reject each | Accept |
| D10 | Freshness TTLs | source-feasibility.md table | Accept or amend |
