import type { LatLon } from '../config/bounds';

export interface NatureGeometry { rings: number[][][]; spatialReference: { wkid: 4326 } }
export interface NatureFeature {
  id: string;
  name: string;
  agency?: string;
  wetlandType?: string;
  code?: string;
  geometry?: NatureGeometry;
  geometryHash?: string;
  distanceMeters?: number;
  bearing?: string;
  inside?: boolean;
}
export type NatureSourceId = 'wetlands' | 'conservation' | 'preserves' | 'nearby';
export interface NatureSource {
  id: NatureSourceId;
  state: 'ok' | 'unavailable';
  queryUrl: string;
  retrievedAtUtc: string;
  features: NatureFeature[];
}
export interface NatureResponse {
  point: LatLon;
  selectionId: number;
  radiusMeters: 5000;
  retrievedAtUtc: string;
  sources: NatureSource[];
  nearby: NatureFeature[];
}
