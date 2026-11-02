# Implementation proposal

**Status: PROPOSAL ONLY — every increment is pending Chuck's explicit approval (G2).** This document, an agent review, silence or elapsed time is not approval. Effort is in Devin working days, assuming decisions D1, D4, D5 are made and accounts/keys are provided.

| Inc | Scope | Requirements / ACs | Depends on | Effort | Acceptance evidence |
|---|---|---|---|---|---|
| I0 | Owner decisions D1–D10; fixture acceptance; baseline edits C1–C6 (docs only) | — | Chuck | 0 (owner time) | Decisions recorded in docs/decisions-and-gates.md |
| I1 | Repo scaffold (TS, React, Vite, lint, test, CI); map with basemap + attribution; point selection by pointer, keyboard crosshair and typed coordinates; coordinate validation | R01, R08 (partial); AC01, AC11 (coords), AC09 (partial) | D1, ArcGIS key | 1–2 | CI green; AC01 automated test; axe report; screenshots at 4 viewports |
| I2 | Serverless API skeleton; connector registry; FEMA connector (L28 exact+buffer, L0, L3); evidence records; FEMA overlay + legend; connector states; cache | R02, R05, R06; AC02, AC06/07 (FEMA) | I1, D4, D8, D10 | 2–3 | Saved authoritative responses for BB-P1/BB-P2/OFF-1; mocked failure tests; state screenshots |
| I3 | NOAA connector (metadata, curated station table for Palm Beach County coast, water_level, predictions, HTF daily); station markers + card; datum/units handling | R03, R05; AC03, AC11 | I2 | 2–3 | Station card checklist; datum conversion tests; range-limit and product-not-offered tests |
| I4 | Ask This Place: pack builder, model call (no tools), validator, template fallback, selectionId binding, follow-ups | R04, R05; AC04, AC05, AC10 | I2, I3, D5, D6 | 3–4 | Validator unit tests incl. injection/fabrication fixtures; 50-run switching test; 20-question review set |
| I5 | Validation harness and run: BB-02/BB-03 (and BB-01 when D2 resolved), N01–N12; a11y and performance measurement | R07, R08; AC08, AC09 | I1–I4 | 2 | Archived run evidence per validation-plan.md §6; Chuck reviews results |
| I6 | (Optional, later) NOAA overlay — SLR/HTF display-only with modeled-scenario labelling | R03 enhancement | Terms/embedding review | 1–2 | Overlay legend/limitation review |
| I7 | (Later) first non-flood domain connector (e.g., FNAI matrix) | Future domains | Licensing/API confirmation | TBD | Domain claim-policy tests |

Total MVP (I1–I5): ~10–14 Devin days of build, plus owner review between increments. Each increment ends with a PR for Chuck's review; no deployment without separate approval.
