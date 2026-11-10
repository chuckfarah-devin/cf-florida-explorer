import { REFERENCE_LAYERS } from '../config/layers';
import { layersForFailedUrl } from './layerErrors';

const byId = (id: string) => REFERENCE_LAYERS.find((l) => l.id === id)!;

describe('layersForFailedUrl', () => {
  it('maps a failed feature query to its own layer only', () => {
    const l = byId('aquatic-preserves');
    expect(layersForFailedUrl(`${l.serviceUrl}/${l.sublayerId}/query?f=pbf`, REFERENCE_LAYERS)).toEqual(['aquatic-preserves']);
  });
  it('separates layers that share a service by sublayer', () => {
    const w = byId('wetlands');
    const s = byId('shoreline');
    expect(w.serviceUrl).toBe(s.serviceUrl);
    expect(layersForFailedUrl(`${w.serviceUrl}/${w.sublayerId}?f=json`, REFERENCE_LAYERS)).toEqual(['wetlands']);
    expect(layersForFailedUrl(`${s.serviceUrl}/${s.sublayerId}/query`, REFERENCE_LAYERS)).toEqual(['shoreline']);
  });
  it('attributes a service-level request to every layer on that service', () => {
    const w = byId('wetlands');
    expect(layersForFailedUrl(`${w.serviceUrl}/export?bbox=1`, REFERENCE_LAYERS).sort()).toEqual(['shoreline', 'wetlands']);
  });
  it('ignores unrelated and look-alike URLs', () => {
    const w = byId('wetlands');
    expect(layersForFailedUrl('https://basemapstyles-api.arcgis.com/x', REFERENCE_LAYERS)).toEqual([]);
    expect(layersForFailedUrl(`${w.serviceUrl}Extra/0/query`, REFERENCE_LAYERS)).toEqual([]);
  });
});
