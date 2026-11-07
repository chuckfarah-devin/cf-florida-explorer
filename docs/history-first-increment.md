# History & Change: nearby historical places

Chuck requested moving to History and deferring further day-planner work, November 5, 2026.

The History & Change tab is now enabled. First increment: up to eight nearest official Florida historical markers within 50 km of the selected point. Cards show source title, short excerpt (140 characters maximum), mapped marker distance, location, source marker year and a direct state record link. Marker year is not treated as the historical event date. The source is the Florida Department of State / Division of Historical Resources map at https://markers.flheritage.com/home/map. Individual records use /home/details/{id} links verified on the state's county listing pages.

The source embeds a markerCards JSON array. The adapter parses JSON only, never executes page scripts, validates IDs and Florida coordinates, removes HTML from excerpts and fails clearly if the source format changes. The statewide snapshot is cached for 24 hours with concurrent requests sharing one retrieval. Source failure produces a loading error, distinct from a successful search with no nearby markers. Each selected point is independently distance-sorted across the whole published snapshot before limiting results. The browser aborts requests and discards results after selection changes.

Live check: source had 1,204 records. Briny point 26.5089,-80.0522 returned North Ocean Boulevard (0.985 km, marker year 2004), Boynton Woman's Club (1.249 km, 1995), Bethesda Memorial Hospital (1.766 km, 2013). Southwest Florida control 26.086,-81.6 returned Big Cypress Swamp, The Naples Canal and The Naples Depot. These distances locate marker records, not surveyed building entrances.

Unit/API tests cover source format changes, invalid coordinates, nearby sorting, successful caching, error versus empty results and year labels. Browser checks cover the history tab, source cards and WCAG A/AA on mobile and desktop.

Next History increments may add historic map/aerial comparisons and historical-event timelines. Neither is implemented or implied by marker-year labels. History Ask is not connected yet; the composer remains disabled for History. The existing Water and Nature checked-answer contracts remain as before. No merge or public deployment included.

## Briny community history

The user correctly identified the marker-only gap. Added a sourced Briny timeline ahead of the marker list for points within a 2 km discovery radius of 26.5089,-80.0522. This is explicitly a nearby story, not a municipal membership determination. It covers Shore Acres dairy in the early 1920s (Boynton Beach Historical Society), strawberries and trailer campers during the 1930s, residents buying the property in 1958 (Historical Society of Palm Beach County), and incorporation in 1963 (Boynton Beach City Library Archives). Dates avoid contradictory exact incorporation-day accounts. The user recalled paying Boynton back taxes as part of becoming a town; that detail remains an unverified research lead and is not published as fact. Historical accounts also describe a separation from an earlier Boynton Beach municipality in 1937; this should not be conflated with incorporation in 1963. No archive photographs reproduced.
