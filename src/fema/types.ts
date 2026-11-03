import type { LatLon } from '../config/bounds';

export type FemaState = 'classified' | 'classified_near_boundary' | 'ambiguous_overlap' | 'in_coverage_no_zone' | 'outside_nfhl_coverage' | 'coverage_unknown' | 'unavailable';
export type QueryName = 'exact' | 'buffer' | 'coverage' | 'panels' | 'revisions';
export type SourceError = 'timeout' | 'rate_limited' | 'upstream_error' | 'malformed';
export type Attributes = Record<string, string | number | null>;
export interface FemaSource {
  name: QueryName;
  provider: 'FEMA';
  dataset: 'National Flood Hazard Layer';
  evidenceClass: 'regulatory_classification';
  sourceCrs: 'EPSG:4269';
  spatialRelation: 'point_intersection' | 'buffer_intersection';
  layer: number;
  queryUrl: string;
  retrievedAtUtc: string;
  status: 'ok' | SourceError;
  records: Attributes[];
}
export interface FemaResult {
  point: LatLon;
  batchId: string;
  state: FemaState;
  zones: Attributes[];
  nearbyZones: Attributes[];
  sources: FemaSource[];
  radiusMeters: 15;
  boundaryCheckAvailable: boolean;
  freshness: 'fresh' | 'stale';
  retrievedAtUtc: string;
  refreshFailures: QueryName[];
}
export interface FemaResponse extends FemaResult { selectionId: number }
