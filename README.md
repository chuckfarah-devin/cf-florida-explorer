# Florida Explorer

Select a place. Explore its story. Follow the evidence.

Independent Florida Explorer documentation workspace.
Repository: [cf-florida-explorer](https://github.com/chuckfarah-devin/cf-florida-explorer), separate from `cf-ai-infrastructure-analyzer`.

Status as of 2026-11-02: documentation baseline prepared for review; technical design handoff authorized; implementation NOT authorized. GitHub repository created by Chuck; Devin handoff NOT sent. No application code or test scaffold has been created.

## Reading order

1. [Charter](docs/charter.md)
2. [PRD](specs/prd.md)
3. [Acceptance and traceability](specs/acceptance-criteria.md)
4. [Evidence contract](specs/evidence-contract.md) and [source registry](data/source-registry.md)
5. [Briny Breezes validation](specs/briny-breezes-validation.md)
6. [Read-only reuse review](docs/analyzer-reuse-review.md)
7. [Exact Devin handoff](devin/technical-design-handoff.md)
8. [Gates and decisions](docs/decisions-and-gates.md) and [independent review](devin/review-record.md)

Only docs/, specs/, devin/, and data/ are needed at this stage. This folder is already distinct; another nested project folder is unnecessary.


## Development (I1)

Requires Node 24.15+. Copy `.env.example` to `.env.local` and set `VITE_ARCGIS_API_KEY` to the dedicated, referrer-restricted Florida Explorer key (never commit it). Without a key the app uses an OpenStreetMap development basemap and place search is unavailable.

```
npm ci
npm run dev        # local dev server
npm run lint && npm run typecheck && npm test && npm run build
```
