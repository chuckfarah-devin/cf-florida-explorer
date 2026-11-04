import type { LatLon } from '../config/bounds';

export type TideDatum = 'MLLW' | 'NAVD';
export interface TideRequest {
  startDate: string;
  endDate: string;
  datum: TideDatum;
}
export interface TideRow {
  timeUtc: string;
  value: number;
  quality?: 'verified' | 'preliminary';
  flags?: string;
  kind?: 'H' | 'L';
}
export interface TideProduct {
  product: 'water_level' | 'predictions';
  state: 'ok' | 'no_data' | 'unavailable' | 'datum_unavailable';
  queryUrl: string;
  retrievedAtUtc: string;
  rows: TideRow[];
  message?: string;
}
export interface TideStation {
  id: string;
  name: string;
  waterBody: string;
  lat: number;
  lon: number;
  distanceKm: number;
  bearing: string;
  rationale: string;
  metadataUrl: string;
  metadataRetrievedAtUtc?: string;
  datumEpoch?: string;
  products: TideProduct[];
  htf?: {
    state: 'ok' | 'no_data' | 'unavailable';
    queryUrl: string;
    retrievedAtUtc: string;
    datum: 'STND';
    units: 'ft';
    rows: { date: string; maxWL: number; minor: boolean; moderate: boolean; major: boolean; percentCompleteness: number }[];
  };
}
export interface TideResponse {
  point: LatLon;
  selectionId: number;
  window: { startDate: string; endDate: string; startUtc: string; endUtc: string; timeZone: 'America/New_York' };
  datum: TideDatum;
  units: 'ft';
  retrievedAtUtc: string;
  stations: TideStation[];
  state: 'ok' | 'partial' | 'no_suitable_station' | 'unavailable';
}
