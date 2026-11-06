import { checkPoint } from '../src/config/bounds.ts';

export const HISTORY_SOURCE = 'https://markers.flheritage.com/home/map';
interface Marker { id: number; title: string; markerYear: string; city: string; county: string; address: string; excerpt: string; lat: number; lon: number; url: string }
export function parseMarkers(html: string): Marker[] {
  const match = html.match(/const markerCards\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error('Marker source format changed');
  const data: unknown = JSON.parse(match[1]);
  if (!Array.isArray(data)) throw new Error('Invalid markers');
  const records: Marker[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (!Number.isSafeInteger(r.Id) || typeof r.Title !== 'string' || typeof r.Latitude !== 'number' || typeof r.Longitude !== 'number' || !checkPoint({ lat: r.Latitude, lon: r.Longitude }).ok) continue;
    const text = typeof r.Description === 'string' ? r.Description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
    records.push({ id: r.Id as number, title: r.Title, markerYear: typeof r.Year === 'string' ? r.Year : '', city: typeof r.City === 'string' ? r.City : '', county: typeof r.County === 'string' ? r.County : '', address: typeof r.Location === 'string' ? r.Location : '', excerpt: text.length > 140 ? `${text.slice(0, 137)}…` : text, lat: r.Latitude, lon: r.Longitude, url: `https://markers.flheritage.com/home/details/${r.Id}` });
  }
  if (!records.length) throw new Error('No valid marker records');
  return records;
}
export function nearbyMarkers(records: Marker[], point: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  return records.map((r) => {
    const h = Math.sin((r.lat - point.lat) * rad / 2) ** 2 + Math.cos(point.lat * rad) * Math.cos(r.lat * rad) * Math.sin((r.lon - point.lon) * rad / 2) ** 2;
    return { ...r, distanceKm: 12742 * Math.asin(Math.min(1, Math.sqrt(h))) };
  }).filter((r) => r.distanceKm <= 50).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 8);
}
export function createHistoryHandler(fetcher: typeof fetch = fetch) {
  let cache: { records: Marker[]; retrievedAt: string; until: number } | undefined;
  let pending: Promise<NonNullable<typeof cache>> | undefined;
  async function load() {
    if (cache && cache.until > Date.now()) return cache;
    if (!pending) pending = (async () => {
      const response = await fetcher(HISTORY_SOURCE, { signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error('Source unavailable');
      const html = await response.text(); if (html.length > 8_000_000) throw new Error('Source too large');
      const result = { records: parseMarkers(html), retrievedAt: new Date().toISOString(), until: Date.now() + 86400_000 };
      cache = result; return result;
    })().finally(() => { pending = undefined; });
    return pending;
  }
  return async (request: Request): Promise<Response> => {
    const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Same-origin requests only' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Use JSON' }, 415);
    let b: Record<string, unknown>;
    try { const text = await request.text(); if (text.length > 4096) return json({ error: 'Too large' }, 413); b = JSON.parse(text); } catch { return json({ error: 'Invalid request' }, 400); }
    if (!b || typeof b.lat !== 'number' || typeof b.lon !== 'number' || !checkPoint({ lat: b.lat, lon: b.lon }).ok) return json({ error: 'Select a Florida point' }, 400);
    try { const data = await load(); return json({ records: nearbyMarkers(data.records, { lat: b.lat, lon: b.lon }), radiusKm: 50, retrievedAt: data.retrievedAt, sourceUrl: HISTORY_SOURCE }); }
    catch { return json({ error: 'Couldn’t load historical places' }, 503); }
  };
}
export const handleHistoryRequest = createHistoryHandler();
