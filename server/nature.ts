import { checkPoint, type LatLon } from '../src/config/bounds.ts';
import type { NatureFeature, NatureResponse, NatureSource } from '../src/nature/types.ts';
import { nearestBoundary } from './nature-geometry.ts';
import { createHash } from 'node:crypto';
export const NATURE_RADIUS = 5000;
export const NATURE_LAYERS = {
  wetlands: { url: 'https://ca.dep.state.fl.us/arcgis/rest/services/Map_Direct/Program_Support/MapServer/6', fields: 'OBJECTID,ATTRIBUTE,WETLAND_TYPE' },
  conservation: { url: 'https://ca.dep.state.fl.us/arcgis/rest/services/Map_Direct/Environment/MapServer/38', fields: 'OBJECTID,MANAME,MANAGING_A' },
  preserves: { url: 'https://ags.dep.state.fl.us/arcgis/rest/services/OpenData/AQUATIC_PRESERVES/MapServer/0', fields: 'OBJECTID,NAME' },
} as const;
export function natureQuery(point: LatLon, id: NatureSource['id']) {
  const cfg = NATURE_LAYERS[id === 'nearby' ? 'conservation' : id];
  const params = new URLSearchParams({ f: 'json', geometry: `${point.lon},${point.lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', outSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: cfg.fields, returnGeometry: id === 'wetlands' ? 'false' : 'true', orderByFields: 'OBJECTID', resultRecordCount: '1000' });
  if (id === 'nearby') { params.set('distance', String(NATURE_RADIUS)); params.set('units', 'esriSRUnit_Meter'); }
  return `${cfg.url}/query?${params}`;
}
type Dict = Record<string, unknown>;
const dict = (v: unknown): Dict => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Malformed nature source'); return v as Dict; };
const text = (v: unknown) => { if (typeof v !== 'string' || !v.trim() || v.length > 300) throw new Error('Invalid source label'); return v.trim(); };
function features(body: unknown, id: NatureSource['id']): NatureFeature[] {
  const b = dict(body);
  if (b.error) { const code = dict(b.error).code; throw new SourceFailure(typeof code === 'number' && code >= 500); }
  if (b.exceededTransferLimit || !Array.isArray(b.features) || b.features.length > 1000) throw new Error('Incomplete nature source');
  let vertices = 0; const seen = new Set<string>();
  return b.features.map((item) => {
    const feature = dict(item); const a = dict(feature.attributes);
    if (typeof a.OBJECTID !== 'number' || !Number.isSafeInteger(a.OBJECTID) || a.OBJECTID < 0) throw new Error('Missing feature ID');
    const key = `${id === 'nearby' ? 'conservation' : id}:${a.OBJECTID}`; if (seen.has(key)) throw new Error('Duplicate source record'); seen.add(key);
    const name = text(id === 'wetlands' ? a.WETLAND_TYPE : id === 'preserves' ? a.NAME : a.MANAME);
    const result: NatureFeature = { id: key, name };
    if (id === 'wetlands') { result.wetlandType = name; result.code = text(a.ATTRIBUTE); }
    if (id === 'preserves') result.agency = 'Florida DEP';
    if ((id === 'conservation' || id === 'nearby') && typeof a.MANAGING_A === 'string' && a.MANAGING_A.trim()) result.agency = text(a.MANAGING_A);
    if (id !== 'wetlands') {
      const g = dict(feature.geometry); const sr = dict(g.spatialReference ?? b.spatialReference);
      if (sr.wkid !== 4326 && sr.latestWkid !== 4326) throw new Error('Wrong source geometry reference');
      if (!Array.isArray(g.rings) || !g.rings.length) throw new Error('Missing polygon');
      const rings = g.rings.map((value) => {
        if (!Array.isArray(value) || value.length < 4) throw new Error('Invalid polygon ring');
        const ring = value.map((coord) => {
          vertices++; if (vertices > 250000 || !Array.isArray(coord) || coord.length < 2 || typeof coord[0] !== 'number' || typeof coord[1] !== 'number' || !Number.isFinite(coord[0]) || !Number.isFinite(coord[1]) || Math.abs(coord[0]) > 180 || Math.abs(coord[1]) > 90) throw new Error('Invalid polygon position');
          return [coord[0], coord[1]];
        });
        if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) throw new Error('Unclosed source ring');
        const area = ring.slice(1).reduce((sum, q, i) => sum + ring[i][0] * q[1] - q[0] * ring[i][1], 0);
        if (new Set(ring.map((q) => `${q[0]},${q[1]}`)).size < 3 || Math.abs(area) < 1e-15) throw new Error('Degenerate source ring');
        return ring;
      });
      result.geometry = { rings, spatialReference: { wkid: 4326 } };
      result.geometryHash = createHash('sha256').update(JSON.stringify(result.geometry)).digest('hex');
    }
    return result;
  });
}
class SourceFailure extends Error { retry: boolean; constructor(retry: boolean) { super('Nature service unavailable'); this.retry = retry; } }
interface Options { fetcher?: typeof fetch; now?: () => number; timeoutMs?: number; sleep?: (ms: number) => Promise<void> }
export function createNatureService(options: Options = {}) {
  const fetcher = options.fetcher ?? fetch; const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const cache = new Map<string, { saved: number; result: NatureSource; size: number }>(); const pending = new Map<string, Promise<NatureSource>>();
  async function query(point: LatLon, id: NatureSource['id']): Promise<NatureSource> {
    const queryUrl = natureQuery(point, id); const old = cache.get(queryUrl);
    if (old && now() - old.saved < 86_400_000) return structuredClone(old.result);
    if (pending.has(queryUrl)) return structuredClone(await pending.get(queryUrl)!);
    const work = (async (): Promise<NatureSource> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
        try {
          const r = await fetcher(queryUrl, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
          if (!r.ok) throw new SourceFailure(r.status >= 500);
          const rows = features(await r.json(), id);
          const result: NatureSource = { id, state: 'ok', queryUrl, retrievedAtUtc: new Date(now()).toISOString(), features: rows };
          const size = JSON.stringify(result).length * 2;
          cache.delete(queryUrl);
          while (cache.size && (cache.size >= 128 || [...cache.values()].reduce((sum, e) => sum + e.size, 0) + size > 16_000_000)) cache.delete(cache.keys().next().value!);
          if (size <= 16_000_000) cache.set(queryUrl, { saved: now(), result: structuredClone(result), size });
          return result;
        } catch (e) { if (attempt || (!controller.signal.aborted && (!(e instanceof TypeError) && !(e instanceof SourceFailure && e.retry)))) break; }
        finally { clearTimeout(timer); }
        await sleep(150);
      }
      return { id, state: 'unavailable', queryUrl, retrievedAtUtc: new Date(now()).toISOString(), features: [] };
    })();
    pending.set(queryUrl, work); try { return structuredClone(await work); } finally { pending.delete(queryUrl); }
  }
  return {
    async lookup(point: LatLon): Promise<Omit<NatureResponse, 'selectionId'>> {
      if (!checkPoint(point).ok) throw new Error('Invalid Florida point');
      const sources = await Promise.all((['wetlands', 'conservation', 'preserves', 'nearby'] as const).map((id) => query(point, id)));
      const exact = sources.find((s) => s.id === 'conservation')!; const nearbySource = sources.find((s) => s.id === 'nearby')!;
      let nearby: NatureFeature[] = [];
      if (nearbySource.state === 'ok') {
        try {
          const candidates = nearbySource.features.map((feature) => ({ ...feature, ...nearestBoundary(point, feature.geometry!), ...(exact.state === 'ok' ? { inside: exact.features.some((f) => f.id === feature.id) } : {}) }));
          const unique = new Map<string, NatureFeature>();
          for (const feature of candidates.sort((a, b) => a.distanceMeters! - b.distanceMeters!)) {
            if (feature.distanceMeters! > NATURE_RADIUS && !feature.inside) continue;
            const key = `${feature.name}|${feature.agency ?? ''}`; if (!unique.has(key)) unique.set(key, feature);
          }
          nearby = [...unique.values()].slice(0, 5);
          nearbySource.features = nearbySource.features.map(({ geometry: _geometry, ...feature }) => { void _geometry; return feature; });
        } catch { nearbySource.state = 'unavailable'; nearbySource.features = []; }
      }
      return { point, radiusMeters: NATURE_RADIUS, retrievedAtUtc: new Date(now()).toISOString(), sources, nearby };
    },
  };
}
