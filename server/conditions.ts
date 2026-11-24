/* eslint-disable @typescript-eslint/no-explicit-any -- External NWS documents are narrowed at each consumed field below. */
import { checkPoint, type LatLon } from '../src/config/bounds.ts';
import { upstreamFetch } from './upstream-fetch.ts';

export const ROAD_SOURCE = 'https://trafficincidents.flhsmv.gov/SmartWebClient/CadView.aspx';
export const CAMERA_SOURCE = 'https://pbctrafficstreams.pbc.gov/portal/feeds/loader.php';
export interface Incident { kind: string; received: string; county: string; location: string; remarks: string; lat: number; lon: number }
export interface Camera { name: string; lat: number; lon: number; url: string }
const plain = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
export function miles(a: LatLon, b: LatLon) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function parseIncidents(html: string): Incident[] {
  if (!html.includes('Latitude') || !html.includes('Longitude') || !html.includes('FLORIDA HIGHWAY PATROL')) throw new Error('Road source changed');
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c => plain(c[1])));
  return rows.filter(r => r.length === 9 && /^\d{1,2}\/\d{1,2}\/\d{4} /.test(r[1]) && r[7] && r[8] && checkPoint({ lat: Number(r[7]), lon: Number(r[8]) }).ok)
    .map(r => ({ kind: r[0], received: r[1], county: r[4], location: r[5], remarks: r[6], lat: Number(r[7]), lon: Number(r[8]) }));
}
export function parseCameras(xml: string): Camera[] {
  if (!xml.includes('<wink_mediarouter')) throw new Error('Camera source changed');
  return [...xml.matchAll(/<stream\s+([^>]+)>/g)].flatMap(m => {
    const a = Object.fromEntries([...m[1].matchAll(/([\w]+)="([^"]*)"/g)].map(x => [x[1], x[2]]));
    const p = { lat: Number(a.lat), lon: Number(a.lng) };
    if (a.state !== 'active' || !a.title || !/^WF01-[A-Z0-9-]+$/.test(a.guid) || !checkPoint(p).ok) return [];
    return [{ ...p, name: plain(a.title), url: `https://pbctrafficstreams.pbc.gov/portal/index.php?${btoa(`guid=${a.guid}`)}` }];
  });
}
export interface Conditions {
  point: LatLon; checkedAt: string;
  alerts: { state: 'ok' | 'unavailable'; url: string; items: { title: string; description: string; expires: string | null }[] };
  observation: { state: 'ok' | 'unavailable'; url?: string; station?: string; distanceMiles?: number; timestamp?: string; description?: string; temperatureF?: number | null; rainLastHourInches?: number | null; stale?: boolean };
  roads: { state: 'ok' | 'unavailable'; url: string; items: (Incident & { distanceMiles: number })[] };
  cameras: { state: 'ok' | 'unavailable' | 'outside_coverage'; items: (Camera & { distanceMiles: number })[] };
}
export function createConditionsHandler(fetcher: typeof fetch = upstreamFetch, now = Date.now) {
  const cache = new Map<string, { until: number; data: Conditions }>();
  let active = 0;
  async function read(url: string, json = true): Promise<any> {
    const u = new URL(url);
    if (![ 'api.weather.gov', 'trafficincidents.flhsmv.gov', 'pbctrafficstreams.pbc.gov' ].includes(u.hostname) || u.protocol !== 'https:' || u.username || u.password) throw new Error('Invalid source');
    const r = await fetcher(url, { redirect: 'error', headers: { Accept: json ? 'application/geo+json' : 'text/html', 'User-Agent': 'FloridaExplorer/0.1 (personal geographic discovery)' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('Source unavailable');
    const text = await r.text(); if (text.length > 6_000_000) throw new Error('Source too large');
    return json ? JSON.parse(text) : text;
  }
  return async (request: Request): Promise<Response> => {
    const reply = (v: unknown, status = 200) => Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
    if (request.method !== 'POST') return reply({ error: 'Use POST' }, 405);
    if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Same origin required' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) return reply({ error: 'Use JSON' }, 415);
    let point: LatLon;
    try { const text = await request.text(); if (text.length > 4096) return reply({ error: 'Too large' }, 413); const p = JSON.parse(text); point = { lat: p.lat, lon: p.lon }; if (typeof point.lat !== 'number' || typeof point.lon !== 'number' || !checkPoint(point).ok) throw new Error(); } catch { return reply({ error: 'Select a Florida point' }, 400); }
    const key = `${point.lat}/${point.lon}`; const hit = cache.get(key); if (hit && hit.until > now()) return reply(hit.data);
    if (active >= 6) return reply({ error: 'Busy; retry shortly' }, 503);
    active++;
    try {
      const alertsUrl = `https://api.weather.gov/alerts/active?point=${point.lat},${point.lon}`;
      const data: Conditions = { point, checkedAt: new Date(now()).toISOString(), alerts: { state: 'unavailable', url: alertsUrl, items: [] }, observation: { state: 'unavailable' }, roads: { state: 'unavailable', url: ROAD_SOURCE, items: [] }, cameras: { state: 'outside_coverage', items: [] } };
      await Promise.allSettled([
        (async () => { const j = await read(alertsUrl); if (!Array.isArray(j.features) || j.features.length > 200) throw new Error(); if (j.features.some((f: any) => typeof f?.properties?.headline !== 'string' || (f.properties.expires != null && !Number.isFinite(Date.parse(f.properties.expires))))) throw new Error('Invalid alert'); const items = j.features.map((f: any) => f.properties).filter((p: any) => typeof p?.headline === 'string' && (!p.expires || Date.parse(p.expires) > now())).slice(0,12).map((p: any) => ({ title: p.headline.slice(0,500), description: String(p.description ?? '').slice(0,5000), expires: p.expires ?? null })); data.alerts = { state: 'ok', url: alertsUrl, items }; })(),
        (async () => { const meta = await read(`https://api.weather.gov/points/${point.lat.toFixed(4)},${point.lon.toFixed(4)}`); const stationsUrl = new URL(meta.properties.observationStations); if (stationsUrl.origin !== 'https://api.weather.gov' || !/^\/gridpoints\/[A-Z]{3}\/\d+,\d+\/stations$/.test(stationsUrl.pathname)) throw new Error('Invalid station directory'); const stations = await read(stationsUrl.href); if (!Array.isArray(stations.features)) throw new Error(); const list = stations.features.flatMap((f: any) => { const c=f.geometry?.coordinates; const id=f.properties?.stationIdentifier; if (!Array.isArray(c) || !c.every(Number.isFinite) || typeof id !== 'string' || !/^[A-Z0-9]{3,12}$/.test(id)) return []; return [{ id, name: String(f.properties.name ?? id).slice(0,200), distance: miles(point,{lat:c[1],lon:c[0]}) }]; }).sort((a: any,b: any) => a.distance-b.distance); const s=list[0]; if (!s || s.distance>50) throw new Error(); const url=`https://api.weather.gov/stations/${s.id}/observations/latest`; const p=(await read(url)).properties; if (!Number.isFinite(Date.parse(p?.timestamp)) || Date.parse(p.timestamp)>now()+300000) throw new Error(); const temp=p.temperature; const rain=p.precipitationLastHour; data.observation={state:'ok',url,station:s.name,distanceMiles:s.distance,timestamp:p.timestamp,description:String(p.textDescription??'').slice(0,200),temperatureF:temp?.unitCode==='wmoUnit:degC' && typeof temp.value==='number' && Number.isFinite(temp.value)?temp.value*9/5+32:null,rainLastHourInches:rain?.unitCode==='wmoUnit:m' && typeof rain.value==='number' && Number.isFinite(rain.value) && rain.value>=0?rain.value/0.0254:null,stale:now()-Date.parse(p.timestamp)>7200000}; })(),
        (async () => { const rows=parseIncidents(await read(ROAD_SOURCE,false)); data.roads={state:'ok',url:ROAD_SOURCE,items:rows.map(r=>({...r,distanceMiles:miles(point,r)})).filter(r=>r.distanceMiles<=15).sort((a,b)=>a.distanceMiles-b.distanceMiles).slice(0,8)}; })(),
        (async () => { // This county feed is supplementary; statewide cameras are linked through FL511.
          if (point.lat<26.25 || point.lat>27.05 || point.lon< -80.9 || point.lon> -79.9) return;
          data.cameras.state='unavailable'; const rows=parseCameras(await read(CAMERA_SOURCE,false)); data.cameras={state:'ok',items:rows.map(r=>({...r,distanceMiles:miles(point,r)})).filter(r=>r.distanceMiles<=15).sort((a,b)=>a.distanceMiles-b.distanceMiles).slice(0,4)};
        })(),
      ]);
      if (cache.size>=64) cache.delete(cache.keys().next().value!);
      // Never cache a failed provider as a successful empty result.
      if (data.alerts.state==='ok' && data.observation.state==='ok' && data.roads.state==='ok' && data.cameras.state!=='unavailable') cache.set(key,{until:now()+120000,data});
      return reply(data);
    } finally { active--; }
  };
}
export const handleConditionsRequest = createConditionsHandler();
