/** Approximate Florida envelope incl. the Keys (source-feasibility.md rule 5; owner to confirm). */
export const FLORIDA_BOUNDS = { latMin: 24.3, latMax: 31.1, lonMin: -87.7, lonMax: -79.8 } as const;

export interface LatLon {
  lat: number;
  lon: number;
}

export type BoundsResult =
  | { ok: true; point: LatLon }
  | { ok: false; reason: 'invalid' | 'outside_florida' | 'swapped'; suggestion?: LatLon };

export const MESSAGES = {
  invalid: 'Enter coordinates as latitude, longitude (for example 26.50890, -80.05225).',
  outside_florida: 'This point is outside Florida; Florida Explorer covers Florida only.',
  swapped: 'Latitude comes first.',
} as const;

function inFlorida({ lat, lon }: LatLon): boolean {
  const b = FLORIDA_BOUNDS;
  return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax;
}

/** Single bounds check used by every selection path (click, keyboard, typed, search). */
export function checkPoint(point: LatLon): BoundsResult {
  const { lat, lon } = point;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    if (Number.isFinite(lat) && Number.isFinite(lon) && inFlorida({ lat: lon, lon: lat })) {
      return { ok: false, reason: 'swapped', suggestion: { lat: lon, lon: lat } };
    }
    return { ok: false, reason: 'invalid' };
  }
  if (inFlorida(point)) return { ok: true, point };
  if (inFlorida({ lat: lon, lon: lat })) return { ok: false, reason: 'swapped', suggestion: { lat: lon, lon: lat } };
  return { ok: false, reason: 'outside_florida' };
}

const COORD_RE = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** Returns null when the text is not a coordinate pair (treat it as a place search). */
export function parseCoordinates(text: string): LatLon | null {
  const m = COORD_RE.exec(text);
  if (!m) return null;
  return { lat: Number(m[1]), lon: Number(m[2]) };
}

export function messageFor(result: Exclude<BoundsResult, { ok: true }>): string {
  if (result.reason === 'swapped' && result.suggestion) {
    return `Did you mean ${formatLatLon(result.suggestion, 2)}? ${MESSAGES.swapped}`;
  }
  return MESSAGES[result.reason];
}

export function formatLatLon({ lat, lon }: LatLon, digits = 5): string {
  return `${lat.toFixed(digits)}, ${lon.toFixed(digits)}`.replace(/-/g, '−');
}
