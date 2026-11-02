# Decisions and approval gates

## Recorded decisions

- 2026-11-02: User authorizes a separate Florida Explorer workspace, documentation/specification preparation, multi-agent review and Devin technical-design-only handoff.
- Existing dedicated folder is the workspace; intended repository name is cf-florida-explorer. Do not couple it to cf-ai-infrastructure-analyzer.
- Broad four-domain vision; narrow FEMA/NOAA and cited Ask This Place MVP.
- Approval to request design is not approval to implement. Specification documents remain a proposed baseline for owner review.
- GitHub access became available and the analyzer was reviewed read-only. Chuck created cf-florida-explorer; GitHub access and write permission verified. No Devin integration found; handoff prepared but not sent.

## Gates

| Gate | Evidence required | Status |
|---|---|---|
| G0 Specification baseline | Charter, PRD, acceptance criteria, registry, review and open questions accepted by Chuck | Prepared; owner review pending |
| G1 Technical design | Devin design options, analyzer review, endpoint feasibility, costs/security, evidence model, R/AC traceability and validation plan | Task authorized; not sent |
| G2 Implementation | Chuck explicitly approves design and bounded implementation increment, source choices and acceptance targets | NOT authorized |
| G3 Release | Working demonstration, criterion results and captured source evidence; Chuck accepts limitations and release | Not started |

## Open decisions

1. Repository confirmed: chuckfarah-devin/cf-florida-explorer, public, created by Chuck.
2. Briny Breezes exact point and fixed event window; local corroboration and suitable NOAA station.
3. ArcGIS licensing/SDK; NOAA spatial overlay selection versus station-first MVP presentation.
4. Hosting, architecture, model/provider, budget, retention, freshness, latency and accessibility targets: Devin proposes; Chuck approves at G1/G2.
5. Confirm reuse choices and complete deeper analyzer licensing/dependency review.

Design work can proceed with explicit unresolved decisions. Implementation cannot begin on silence, elapsed time or an agent's recommendation.


