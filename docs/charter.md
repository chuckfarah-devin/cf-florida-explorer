# Project charter — v0.1

Owner: Chuck. Date: 2026-11-02. Status: proposed specification baseline.

Florida Explorer is an evidence-grounded geographic discovery experience for residents, visitors, and curious researchers. An ArcGIS map and location-aware Ask This Place guide help people understand Florida through four domains: Water & Weather, Nature & Wildlife, History & Change, and Land & Infrastructure.

The product is broad geographic discovery. The first increment uses flooding to prove the map-to-evidence-to-explanation experience; flooding is not the product's permanent identity.

## First increment

Florida map, point selection, FEMA flood classification, NOAA flood-related context, cited Ask This Place responses, source details and uncertainty. Validate using Briny Breezes king-tide questions plus missing-data and failure cases. Success means reviewers can independently trace each material geographic claim to applicable evidence and see where the evidence stops.

## Responsibilities

Chuck owns priorities, specification acceptance, technical-design approval, implementation authorization, and release acceptance. This workspace maintains product specifications and review records. Devin's authorized assignment is technical design only. Independent agents review scope and design; their recommendations do not constitute owner approval.

## Boundaries

No application scaffold, dependencies, connectors, deployment, or changes to the analyzer before explicit implementation approval. Do not promise property-specific flood forecasts, insurance determinations, animal density estimates, or confirmed wildlife sightings from coarse screening data. Design for future domain and geographic expansion without requiring those features in MVP.
