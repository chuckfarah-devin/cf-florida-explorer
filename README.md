# Florida Explorer

Select a place. Explore its story. Follow the evidence.

## Live application

[Open Florida Explorer](https://cf-florida-explorer.bracedecho1.chatgpt.site)

Hosted with its data APIs through Sites. Access is private to the owner; sign in with the account that owns the site. This is the personal-use MVP snapshot from PR #7. GitHub Pages is not used because it cannot run the server-side data APIs. The implementation PR stack remains separate from this README link; it has not been merged by this update.


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

