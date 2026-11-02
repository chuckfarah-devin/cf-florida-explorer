# Exact copy/paste handoff — Florida Explorer

Delivery status: NOT SENT. No Devin integration was found in this session. Copy the task below into Devin and attach this documentation workspace or its future repository.

---

Design Florida Explorer, an evidence-grounded Florida geographic discovery platform. This assignment is TECHNICAL DESIGN ONLY. Do not implement code, create src/tests, install dependencies, build executable connectors, deploy, or modify the existing analyzer. Approval to design does not authorize implementation.

Use the attached README, docs/, specs/, and data/source-registry.md as the proposed product baseline. Chuck is product owner; identify conflicts and propose changes for approval instead of silently changing scope.

Vision: an ArcGIS map with point selection and a location-aware Ask This Place agent across Water & Weather, Nature & Wildlife, History & Change, and Land & Infrastructure. First MVP: Florida map, FEMA flood classifications, NOAA flood-related context, cited answers and source/uncertainty details, validated at Briny Breezes. Broader domains stay on the roadmap.

Review https://github.com/chuckfarah-devin/cf-ai-infrastructure-analyzer read-only at a fixed revision. Identify actual reusable ArcGIS components, point interactions, connectors, UI patterns and infrastructure. Supply revision and file references, dependencies, licensing, coupling, and reuse/adapt/rebuild rationale. If inaccessible, report that clearly; do not claim review completion or modify it.

Deliver documentation in devin/:

1. technical-design.md: architecture options and recommendation, component boundaries, request flow, deployment options and domain extension strategy; illustrative diagrams are welcome, executable scaffolding is not.
2. source-feasibility.md: exact FEMA/NOAA endpoints, fields, point-query semantics, coordinate systems, boundary rules, available products, coverage, station suitability, datums/time zones, quality flags, terms, attribution, request limits, authentication, cache policy and failures. Read-only API inspection is allowed. Distinguish checked from proposed or inaccessible.
3. analyzer-reuse-findings.md: verified read-only findings with revision/path references and independent-project implications.
4. evidence-and-agent-design.md: conceptual evidence/response contracts, claim-level citations, applicability checks, abstention and partial answers, stale data, source-text injection defenses and point-switch concurrency behavior.
5. validation-plan.md: map every R01–R08 and AC01–AC11 to design decisions and future checks; propose concrete performance/accessibility thresholds. Include fixed Briny Breezes fixtures and negative cases. Do not treat nearby gauge data as proof of street flooding. User's event date is unresolved; do not invent it or resolve “last week” relative to today.
6. cost-security-and-decisions.md: credentials boundaries, location/question retention, expected service/model costs with assumptions, options, risks, blockers and owner decisions.
7. implementation-proposal.md: small proposed increments, estimated effort/dependencies and evidence needed for acceptance. Label all implementation as pending Chuck's explicit approval.

Preserve distinctions between FEMA classifications, NOAA observations, tide predictions, modeled flooding, historical reports, user reports and inference. Missing data is not proof of safety. Future species observations, habitat likelihood and density must also remain distinct. FNAI screening data must retain its occurrence classes and geographic precision.

Return a design summary, unresolved decisions and review checklist. Stop at technical-design delivery. Wait for Chuck's explicit approval before implementation. Do not interpret this task, a proposed plan, or an agent review as that approval.
