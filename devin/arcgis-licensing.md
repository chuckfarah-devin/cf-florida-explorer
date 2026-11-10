# ArcGIS Maps SDK for JavaScript: licensing, attribution and key requirements (D1)

Checked 2026-11-03 against Esri's documentation, before installing anything for I1.

| Topic | Finding | Source |
|---|---|---|
| SDK licence | Use is subject to Esri's product-specific terms of use. No additional purchase is needed when the SDK is used with an ArcGIS Location Platform or ArcGIS Online account and an API key. npm packages `@arcgis/core` and `@arcgis/map-components` 5.1.27 are licensed "SEE LICENSE IN LICENSE.md" (Esri proprietary, not open source) | https://developers.arcgis.com/javascript/latest/licensing/ ; npm registry |
| Attribution | Required in every app using Esri technology: **"Powered by Esri"** plus **all data-provider names** for basemap and data services. The SDK's default attribution bar at the bottom of the map satisfies both and is the recommended placement. Florida Explorer keeps it visible and does not hide or restyle it away | same |
| Account and key | ArcGIS Location Services (basemap styles, geocoding) require an ArcGIS Location Platform or ArcGIS Online account. API keys are long-lived access tokens, valid for up to one year, embedded in client apps, and recommended only for public data and basic location services | https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/ |
| Key policy for this project | A dedicated Florida Explorer key with only the basemap-styles and geocoding privileges, restricted to the app's referrers (localhost during development). It is read from `VITE_ARCGIS_API_KEY` at build time, so it is public by design (browser-visible) and must stay restricted. **Never commit the value**; `.env*` files are git-ignored. Model or other server secrets never use `VITE_*` | owner instruction (I1 authorization) |
| Cost (Location Platform pricing page) | Basemap tiles: 2M free/month, then $0.15 per 1,000. Basemap sessions: 1K free, then $4 per 1,000. Geocodes (not stored): 20K free, then $0.50 per 1,000. Stored geocodes: $4 per 1,000, so place search must never set `forStorage=true` | https://location.arcgis.com/pricing/ |
| C7 layers | FDEP-hosted public ArcGIS Server services (wetlands, conservation lands, aquatic preserves, shoreline) need no key. Their own attribution is shown in the layer source details and the map attribution | layer-reuse-feasibility.md |

Not verified: the full text of Esri's product-specific terms. Before any public deployment (separate approval), Chuck should confirm the account tier and the referrer list.
