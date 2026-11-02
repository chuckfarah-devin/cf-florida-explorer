# Evidence and response contract

Conceptual specification only; no executable schema or connector is authorized.

Each evidence record needs a stable local reference, provider, dataset/product, original source URL, feature or station ID, query parameters, selected coordinates and coordinate reference system, geographic footprint or station distance, evidence class, observation period or effective date, retrieval timestamp in UTC, units and vertical datum where applicable, source quality flags, precision/limitations, and attribution or usage restrictions. Unknown fields must be explicitly unknown with a reason.

Evidence classes: regulatory classification; measured observation; predicted tide; modeled inundation/scenario; historical report; user report; inference. Inferences must identify supporting records and assumptions. A citation proves only claims within that record's geographic and temporal applicability.

An Ask This Place response includes the selected location, question/date window, concise findings, citations attached to material claims, evidence classes, source dates, limitations and unavailable sources. Source details expose the reproducible query and metadata. Do not treat a successful empty query as a service failure, or a service failure as absence of risk.

Preserve upstream quality flags and provisional/verified status. Do not compare water levels and elevations without compatible datums and units. Never transfer station flood thresholds to another point without a supported method. Stale cache responses must show their retrieval date and stale status under the approved freshness policy.

A user-reported flooded street remains a user report until corroborated. FEMA zone membership does not establish a particular event or cause. NOAA station levels provide context, not proof of inundation at the selected property. Missing records do not establish safety.
