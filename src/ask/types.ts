import type { LatLon } from '../config/bounds';
import type { TideRequest } from '../noaa/types';

export interface AskSource {
  ref: string;
  label: string;
  url: string;
  retrievedAtUtc: string;
  kind: string;
  stationId?: string;
  fields?: Record<string, string | number | null>;
}
export interface AskResponse {
  domain?: 'water' | 'nature';
  selectionId: number;
  point: LatLon;
  window: TideRequest;
  packId: string;
  createdAtUtc: string;
  question: string;
  mode: 'template';
  intent: 'flood' | 'tides' | 'event' | 'nature' | 'unsupported';
  findings: { id: string; text: string; evidenceClass: 'regulatory_classification' | 'measured_observation' | 'predicted_tide' | 'mapped_feature'; citations: string[]; facts?: { ref: string; field: string; value: string | number | null }[] }[];
  limitations: string[];
  sources: AskSource[];
  statuses: { source: string; state: string }[];
  supported: boolean;
}
