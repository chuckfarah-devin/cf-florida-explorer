import { checkPoint } from '../src/config/bounds.ts';
const ROOT = 'https://geoweb.sfwmd.gov/agsext1/rest/services/WaterManagementSystem/';
const datasets = [
  { id: 'watershed', label: 'Watershed at this point', layer: 'DrainageAreas/MapServer/1', fields: 'OBJECTID,NAME,HYDROID', nearby: false },
  { id: 'canals', label: 'Canals and streams within 3.1 mi', layer: 'Canals/MapServer/5', fields: 'OBJECTID,NAME,NHD_GNIS_NAME,OPER_MAINT', nearby: true },
  { id: 'structures', label: 'Water-control structures within 3.1 mi', layer: 'All_Structures/MapServer/10', fields: 'OBJECTID,NAME,CANAL,SOURCE_FEATURE_CLASS', nearby: true },
] as const;
export function createInfrastructureHandler(fetcher: typeof fetch = fetch) {
  const cache = new Map<string, { until: number; body: unknown }>();
  let active = 0;
  return async (request: Request): Promise<Response> => {
    const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Same-origin requests only' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Use JSON' }, 415);
    let b: Record<string, unknown>;
    try { const text = await request.text(); if (text.length > 4096) return json({ error: 'Too large' }, 413); b = JSON.parse(text); } catch { return json({ error: 'Invalid request' }, 400); }
    if (!b || typeof b.lat !== 'number' || typeof b.lon !== 'number' || !checkPoint({ lat: b.lat, lon: b.lon }).ok) return json({ error: 'Select a Florida point' }, 400);
    const key = `${b.lat}/${b.lon}`; const hit = cache.get(key);
    if (hit && hit.until > Date.now()) return json(hit.body);
    if (active >= 6) return json({ error: 'Busy' }, 503);
    active++;
    try {
      const sources = await Promise.all(datasets.map(async (dataset) => {
        const url = new URL(`${ROOT}${dataset.layer}/query`);
        url.search = new URLSearchParams({ f: 'json', geometry: `${b.lon},${b.lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: dataset.fields, returnGeometry: 'false', resultRecordCount: '500', ...(dataset.nearby ? { distance: '5000', units: 'esriSRUnit_Meter' } : {}) }).toString();
        const retrievedAt = new Date().toISOString();
        try {
          const response = await fetcher(url, { signal: AbortSignal.timeout(12_000) });
          if (!response.ok) throw new Error();
          const text = await response.text(); if (text.length > 2_000_000) throw new Error();
          const data = JSON.parse(text);
          if (data.error || !Array.isArray(data.features) || data.exceededTransferLimit) throw new Error();
          const names = new Map<string, { name: string; canal?: string }>();
          for (const feature of data.features) {
            const a = feature?.attributes;
            const name = typeof a?.NAME === 'string' && a.NAME.trim() ? a.NAME.trim() : typeof a?.NHD_GNIS_NAME === 'string' ? a.NHD_GNIS_NAME.trim() : '';
            if (!name) continue;
            const canal = typeof a.CANAL === 'string' && a.CANAL.trim() ? a.CANAL.trim() : undefined;
            names.set(`${name}/${canal ?? ''}`, { name, ...(canal ? { canal } : {}) });
          }
          return { id: dataset.id, label: dataset.label, state: 'ok', records: [...names.values()].sort((a, b) => a.name.localeCompare(b.name)), queryUrl: url.toString(), retrievedAt };
        } catch { return { id: dataset.id, label: dataset.label, state: 'error', records: [], queryUrl: url.toString(), retrievedAt }; }
      }));
      // Regional feature proximity is never treated as a connected street-drain route.
      const body = { sources, point: { lat: b.lat, lon: b.lon }, routeState: 'not_connected', radiusKm: 5 };
      if (sources.every((s) => s.state === 'ok')) {
        if (cache.size >= 64) cache.delete(cache.keys().next().value!);
        cache.set(key, { until: Date.now() + 3600_000, body });
      }
      return json(body);
    } finally { active--; }
  };
}
export const handleInfrastructureRequest = createInfrastructureHandler();
