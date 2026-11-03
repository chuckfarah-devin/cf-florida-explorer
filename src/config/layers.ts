/** C7 display-only reference layers (layer-reuse-feasibility.md). No answer claims are made from them in I1. */
export type ReferenceLayerId = 'wetlands' | 'conservation' | 'aquatic-preserves' | 'shoreline';

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
    limitation: 'Screening map only. Not a regulatory wetland delineation or jurisdictional determination.',
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
] as const;

export type LayerStatus = 'off' | 'loading' | 'visible' | 'error';
