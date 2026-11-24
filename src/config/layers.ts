/** C7 display-only reference layers (layer-reuse-feasibility.md). No answer claims are made from them in I1. */
export type ReferenceLayerId = 'wetlands' | 'conservation' | 'aquatic-preserves' | 'shoreline' | 'flood' | 'watersheds' | 'canals' | 'water-structures';

export interface ReferenceLayerConfig {
  id: ReferenceLayerId;
  label: string;
  sourceLabel: string;
  provider: string;
  serviceUrl: string;
  sublayerId: number;
  render: 'feature' | 'map-image';
  swatch: string;
  sourcePage: string;
  about: string;
  limitation: string;
  popupFields?: readonly { fieldName: string; label: string }[];
}

export const REFERENCE_LAYERS: readonly ReferenceLayerConfig[] = [
  {
    id: 'wetlands',
    label: 'Wetlands',
    sourceLabel: 'Wetlands inventory',
    provider: 'U.S. Fish & Wildlife Service National Wetlands Inventory, hosted by Florida DEP',
    serviceUrl: 'https://ca.dep.state.fl.us/arcgis/rest/services/Map_Direct/Program_Support/MapServer',
    sublayerId: 6,
    render: 'map-image',
    swatch: '#6fb7a3',
    sourcePage: 'https://www.fws.gov/program/national-wetlands-inventory',
    about: 'Mapped wetlands and deepwater habitats. Mapping dates vary by area.',
    limitation: 'Screening map only. Not a regulatory wetland delineation, and not where water went in any flood event.',
  },
  {
    id: 'conservation',
    label: 'Conservation areas',
    sourceLabel: 'Florida conservation lands',
    provider: 'Florida DEP CLEAR / Florida Natural Areas Inventory',
    serviceUrl: 'https://ca.dep.state.fl.us/arcgis/rest/services/Map_Direct/Environment/MapServer',
    sublayerId: 38,
    render: 'feature',
    swatch: '#9cc98d',
    sourcePage: 'https://www.fnai.org/conservation-lands',
    about: 'Managed conservation lands such as parks, preserves and natural areas.',
    limitation: 'Not legal ownership or surveyed boundaries. Protected does not always mean open to the public.',
  },
  {
    id: 'aquatic-preserves',
    label: 'Aquatic preserves',
    sourceLabel: 'Florida aquatic preserves',
    provider: 'Florida DEP Division of State Lands',
    serviceUrl: 'https://ags.dep.state.fl.us/arcgis/rest/services/OpenData/AQUATIC_PRESERVES/MapServer',
    sublayerId: 0,
    render: 'feature',
    swatch: '#1793a8',
    sourcePage: 'https://floridadep.gov/rcp/aquatic-preserve',
    about: 'State-designated aquatic preserves on sovereign submerged lands.',
    limitation: 'General context. Official legal descriptions and surveys control if boundaries differ.',
  },
  {
    id: 'shoreline',
    label: 'Shoreline',
    sourceLabel: 'NOAA reference shoreline',
    provider: 'NOAA Office for Coastal Management composite shoreline, hosted by Florida DEP',
    serviceUrl: 'https://ca.dep.state.fl.us/arcgis/rest/services/Map_Direct/Program_Support/MapServer',
    sublayerId: 41,
    render: 'map-image',
    swatch: '#6b4f3a',
    sourcePage: 'https://shoreline.noaa.gov/data/datasheets/composite.html',
    about: 'Reference shoreline compiled from NOAA surveys of different dates.',
    limitation: 'Reference only. Shorelines change; not a property or legal boundary.',
  },
  {
    id: 'flood', label: 'Flooding', sourceLabel: 'FEMA flood map', provider: 'FEMA National Flood Hazard Layer',
    serviceUrl: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer', sublayerId: 28, render: 'map-image', swatch: '#3b5ba5',
    sourcePage: 'https://msc.fema.gov/portal/home',
    about: 'Mapped flood zones. Zoom in to see the shading and FEMA legend. The server-side lookup in the place panel determines the zone at your selected point.',
    limitation: 'Screening context, not an observed flood extent or a property-level forecast. Shading is hidden at small scales by FEMA. Effective FIRMs and applicable revisions control.',
  },
  {
    id: 'watersheds', label: 'Watersheds', sourceLabel: 'SFWMD drainage areas', provider: 'South Florida Water Management District',
    serviceUrl: 'https://geoweb.sfwmd.gov/agsext1/rest/services/WaterManagementSystem/DrainageAreas/MapServer', sublayerId: 1, render: 'feature', swatch: '#916a30',
    sourcePage: 'https://www.sfwmd.gov/science-data/gis', about: 'Regional watershed boundaries. Click an area for its mapped name.', limitation: 'Regional drainage context; not a street-drain or sewer connection.',
    popupFields: [{ fieldName: 'NAME', label: 'Watershed' }, { fieldName: 'HYDROID', label: 'Source feature ID' }],
  },
  {
    id: 'canals', label: 'Canals & streams', sourceLabel: 'SFWMD mapped waterways', provider: 'South Florida Water Management District',
    serviceUrl: 'https://geoweb.sfwmd.gov/agsext1/rest/services/WaterManagementSystem/Canals/MapServer', sublayerId: 5, render: 'feature', swatch: '#007a99',
    sourcePage: 'https://www.sfwmd.gov/science-data/gis', about: 'Mapped canals, rivers and streams. Click a line for source details.', limitation: 'Lines show mapped waterways, not a verified flow direction or connection to a street drain.',
    popupFields: [{ fieldName: 'NAME', label: 'Name' }, { fieldName: 'NHD_GNIS_NAME', label: 'Waterway name' }, { fieldName: 'HYDROID', label: 'Source feature ID' }],
  },
  {
    id: 'water-structures', label: 'Water-control structures', sourceLabel: 'SFWMD regional structures', provider: 'South Florida Water Management District',
    serviceUrl: 'https://geoweb.sfwmd.gov/agsext1/rest/services/WaterManagementSystem/All_Structures/MapServer', sublayerId: 10, render: 'feature', swatch: '#8f4574',
    sourcePage: 'https://www.sfwmd.gov/science-data/gis', about: 'Mapped control structures and culverts from the district’s published search layer. Click a symbol for details.', limitation: 'Source inventory includes multiple structure types and providers. It is not a complete local storm-drain or sanitary-sewer network.',
    popupFields: [{ fieldName: 'NAME', label: 'Structure' }, { fieldName: 'CANAL', label: 'Associated canal' }, { fieldName: 'SOURCE_FEATURE_CLASS', label: 'Source inventory' }],
  },
] as const;

export type LayerStatus = 'off' | 'loading' | 'visible' | 'error';
