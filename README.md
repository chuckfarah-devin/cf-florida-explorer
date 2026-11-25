# Florida Explorer

Select a place. Explore its story. Follow the evidence.

## Live application

[Open Florida Explorer](https://cf-florida-explorer.bracedecho1.chatgpt.site)

Hosted with its data APIs through Sites. The demo is public: anyone with the link can open it without a ChatGPT login. Public access was verified in a fresh browser on November 25, 2026. The running application comes from the MVP work in PR #7. GitHub Pages is not used because it cannot run the server-side data APIs. The implementation PR stack remains separate from this README link; it has not been merged by this update.


Independent Florida Explorer documentation workspace.
Repository: [cf-florida-explorer](https://github.com/chuckfarah-devin/cf-florida-explorer), separate from `cf-ai-infrastructure-analyzer`.

Current demo: Florida map discovery across Water & Weather, Nature & Wildlife, History & Change, and Land & Infrastructure. Ask This Place retrieves source records and produces checked, cited template answers; it does not use an LLM. Current-condition weather/road/camera questions are connected. The hosted FEMA point lookup remains unavailable because upstream requests are refused.

The documents below preserve the original November 2 design baseline. Implementation is in the stacked review PRs through [PR #7](https://github.com/chuckfarah-devin/cf-florida-explorer/pull/7); those application changes have not been merged into main.

## Reading order

1. [Charter](docs/charter.md)
2. [PRD](specs/prd.md)
3. [Acceptance and traceability](specs/acceptance-criteria.md)
4. [Evidence contract](specs/evidence-contract.md) and [source registry](data/source-registry.md)
5. [Briny Breezes validation](specs/briny-breezes-validation.md)
6. [Read-only reuse review](docs/analyzer-reuse-review.md)
7. [Exact Devin handoff](devin/technical-design-handoff.md)
8. [Gates and decisions](docs/decisions-and-gates.md) and [independent review](devin/review-record.md)

The documentation workspace is independent of the CF AI Infrastructure Analyzer. This README update changes the public-demo description only; it does not merge the application PR stack.

