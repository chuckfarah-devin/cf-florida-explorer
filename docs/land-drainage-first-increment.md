# Land & Infrastructure: drainage context

Authorized by Chuck on November 5, 2026, with the question “where does this drain go?”

First increment enables the Land tab and queries official SFWMD WaterManagementSystem data: DrainageAreas/MapServer/1 (exact point watershed), Canals/MapServer/5 (5 km nearby canals and streams), All_Structures/MapServer/10 (5 km nearby structures). Independent statuses and source query links are shown. Repeated named segments are collapsed by name/canal. Names are alphabetical, not ranked as connected outlets or closest features. There are no flow arrows or fabricated pipe traces.

The connected sources do not supply a Briny street-inlet-to-outfall network. The UI explicitly says that the street-drain outlet route was not found in connected records, and directs users to stormwater as-built drawings, drainage plans and permit records. Regional watershed membership, nearby canals, and the S41 record’s CANAL=C-16 association are distinct facts; none establishes that an arbitrary selected street drain flows through them. No inference is made from terrain, FEMA zones, shoreline proximity or station tides. The selected map point is not snapped to an invented inlet.

Live Briny check: watershed LAKE WORTH LAGOON; nearby names included BOYNTON CANAL, C-16, INTRACOASTAL WATERWAY and LWDD canal names; structures S41 (associated canal C-16) and C16_PC06. Data retrieval is not a field inspection or verification of current operations. The SFWMD dataset is regional and cannot establish a statewide complete municipal drain inventory.

Requests validate Florida coordinates, method, origin and body size. Fixed source hosts, 12-second per-source timeouts, bounded response sizes, maximum six active requests, successful-only one-hour cache capped at 64 points. ArcGIS error payloads and exceededTransferLimit are errors rather than empty results. Source errors remain independent, and the browser discards results after changing selections. No stale error cache.

Checks cover watershed versus nearby query construction, partial source failure, transfer-limit handling, invalid selections, source-linked display, and desktop/mobile accessibility. No Ask evidence contract, parcel or land-use integration, drainage map overlays, sewer tracing, operating flow direction, public deployment or merge included. Next substantive step for the drain question is to obtain an actual municipal/property pipe-and-outfall dataset or documented as-built plan and test a known inlet-to-outlet control case.

## Units and source-link refinement

User requested miles instead of kilometres and removal of the unconnected drain-route box. UI distances and radii in Wildlife, History, Nature, NOAA and drainage now display miles; stored/source geometry units stay metric. Nature checked-answer prose converts the validated source distance from meters to miles; evidence fields stay unchanged. The Land card now offers the public SFWMD GIS page and labels the exact query link Technical source data (JSON). Removed the street-drain route box.

Public wastewater routing leads: Seacoast Utility Authority publishes sewer/water/reclaimed maps and as-built links at https://www.sua.com/engineering/gis/ for its own service area. Delray reports its collection-system pump stations convey wastewater to South Central Regional at https://www.delraybeachfl.gov/government/city-departments/utilities/sewer-wastewater-issues . Plant service-area information: https://scrwwtp.org/information/ . These support regional service relationships, not the user’s individual property connection. No private address collected or assumed. Stormwater and sanitary sewer overlays must remain distinct; no sewer or storm network overlay or tracing added in this refinement.

## Regional drainage overlay

Added three optional reference layers to Map layers: Watersheds (DrainageAreas/1), Canals & streams (Canals/5), Water-control structures (All_Structures/10). All are initially off. They use the official SFWMD service geometries and source field popups. Watersheds use translucent fill and brown outlines; waterways blue lines; structures purple squares. Canal minScale is overridden to allow viewing at local map scales. Popup outFields are explicitly limited to the displayed name/ID/associated-canal fields. Clicking an enabled drainage feature opens the SDK feature popup and does not replace the selected evidence point; Select map center still selects another point under an overlay. No flow arrows, street inlet routing or sanitary sewer routes are asserted. Existing per-layer loading/error/retry handling applies. Unit checks verify popup fields and selected-point preservation; browser checks cover accessible controls and mobile list scrolling.

Overlay follow-up: fixed early layer toggles during lazy map initialization by applying the latest enabled-layer state once the map handle is ready. The deferred-map test covers this case.
