import type { Selection } from '../state/selection';
import type { NatureFeature, NatureResponse } from './types';

function featureValid(feature: NatureFeature): boolean {
  return !!feature && typeof feature.id === 'string' && typeof feature.name === 'string' &&
    [feature.agency, feature.wetlandType, feature.code].every((value) => value === undefined || typeof value === 'string') &&
    (feature.inside === undefined || typeof feature.inside === 'boolean') &&
    (feature.bearing === undefined || ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].includes(feature.bearing)) &&
    (feature.distanceMeters === undefined || (Number.isFinite(feature.distanceMeters) && feature.distanceMeters >= 0)) &&
    (feature.geometry === undefined || (feature.geometry?.spatialReference?.wkid === 4326 && Array.isArray(feature.geometry.rings) && feature.geometry.rings.length > 0 && feature.geometry.rings.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90) && ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1])));
}
const safeUrl = (value: string) => { try { const url = new URL(value); return url.protocol === 'https:' && ['ca.dep.state.fl.us', 'ags.dep.state.fl.us'].includes(url.hostname) && !url.username && !url.password; } catch { return false; } };
export async function fetchNature(selection: Selection, signal: AbortSignal): Promise<NatureResponse> {
  const response = await fetch('/api/nature', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...selection.point, selectionId: selection.selectionId }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(35_000)]),
  });
  if (!response.ok) throw new Error('Nature lookup unavailable');
  const result: NatureResponse = await response.json();
  if (!result || result.selectionId !== selection.selectionId || result.point?.lat !== selection.point.lat || result.point?.lon !== selection.point.lon || result.radiusMeters !== 5000 || !Number.isFinite(Date.parse(result.retrievedAtUtc)) || !Array.isArray(result.sources) || !Array.isArray(result.nearby)) throw new Error('Nature response does not match this point');
  const ids = new Set(result.sources.map((source) => source.id));
  if (result.sources.length !== 4 || ids.size !== 4 || !['wetlands', 'conservation', 'preserves', 'nearby'].every((id) => ids.has(id as typeof result.sources[number]['id'])) || result.sources.some((source) => !['ok', 'unavailable'].includes(source.state) || !safeUrl(source.queryUrl) || !Number.isFinite(Date.parse(source.retrievedAtUtc)) || !Array.isArray(source.features) || source.features.some((feature) => !featureValid(feature))) || result.nearby.some((feature) => !featureValid(feature) || feature.distanceMeters === undefined)) throw new Error('Invalid nature source records');
  return result;
}
