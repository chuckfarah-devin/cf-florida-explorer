import { checkPoint, type LatLon } from '../src/config/bounds.ts';
import type { TideResponse as NoaaResponse, TideProduct, TideRow, TideStation, TideDatum } from '../src/noaa/types.ts';
type TideWindow = NoaaResponse['window'];

const BASE = 'https://api.tidesandcurrents.noaa.gov';
const HOUR = 3_600_000;
const curated = [
  { id: '8722670', waterBody: 'Atlantic Ocean', observed: true, rationale: 'Curated ocean-side gauge for the Briny Breezes coastal study area. Observations describe the pier, not the selected spot.' },
  { id: '8722718', waterBody: 'Intracoastal Waterway', observed: false, rationale: 'Curated Intracoastal prediction station. Predictions are astronomical tides, not measurements of water in nearby streets.' },
] as const;

/** Date-only inputs mean inclusive local calendar days, never the browser/server timezone. */
export function tideWindow(startDate: string, endDate: string): TideWindow {
  const parse = (s: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Invalid date');
    const ms = Date.parse(`${s}T00:00:00Z`);
    if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== s || +s.slice(0, 4) < 1900 || +s.slice(0, 4) > 2100) throw new Error('Invalid date');
    return ms;
  };
  const begin = parse(startDate); const end = parse(endDate);
  if (end < begin || (end - begin) / (24 * HOUR) >= 30) throw new Error('Choose 1–30 days');
  const localMidnight = (date: string) => {
    const wanted = Date.parse(`${date}T00:00:00Z`);
    let instant = wanted + 5 * HOUR;
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    for (let i = 0; i < 3; i++) {
      const p = Object.fromEntries(fmt.formatToParts(instant).map((x) => [x.type, x.value]));
      const represented = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
      instant += wanted - represented;
    }
    return instant;
  };
  const nextDate = new Date(end + 24 * HOUR).toISOString().slice(0, 10);
  return { startDate, endDate, startUtc: new Date(localMidnight(startDate)).toISOString(), endUtc: new Date(localMidnight(nextDate)).toISOString(), timeZone: 'America/New_York' };
}

export function stationDistance(point: LatLon, station: LatLon) {
  const rad = (n: number) => n * Math.PI / 180;
  const a = rad(point.lat); const b = rad(station.lat); const dl = rad(station.lon - point.lon);
  const h = Math.sin((b - a) / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(dl / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const angle = (Math.atan2(Math.sin(dl) * Math.cos(b), Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(dl)) * 180 / Math.PI + 360) % 360;
  return { distanceKm, bearing: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(angle / 45) % 8] };
}

export function inCuratedArea(p: LatLon) { return checkPoint(p).ok && p.lat >= 26.43 && p.lat <= 26.68 && p.lon >= -80.10 && p.lon <= -79.98; }

type Dict = Record<string, unknown>;
const dict = (x: unknown): Dict => { if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('Malformed NOAA response'); return x as Dict; };
const numeric = (x: unknown): number => { if ((typeof x !== 'string' && typeof x !== 'number') || (typeof x === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(x.trim())) || !Number.isFinite(Number(x))) throw new Error('Invalid NOAA number'); return Number(x); };
class UpstreamError extends Error { retry: boolean; constructor(retry: boolean) { super('NOAA unavailable'); this.retry = retry; } }
interface Options { fetcher?: typeof fetch; now?: () => number; timeoutMs?: number; sleep?: (ms: number) => Promise<void> }

/** Fixed public endpoints; no API key, client-selected URL, cross-station offsets or extrapolation. */
export function createNoaaService(options: Options = {}) {
  const fetcher = options.fetcher ?? fetch; const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const cache = new Map<string, { saved: number; data: unknown }>();
  const pending = new Map<string, Promise<unknown>>();
  async function request(url: string, ttl = 15 * 60_000): Promise<unknown> {
    const old = cache.get(url); if (old && now() - old.saved < ttl) return old.data;
    if (pending.has(url)) return pending.get(url)!;
    const work = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
        try {
          const response = await fetcher(url, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
          if (!response.ok) throw new UpstreamError(response.status >= 500);
          const body = await response.json(); dict(body);
          // Error objects are returned by NOAA with HTTP 200. Never cache them as data.
          if (!(body as Dict).error) { if (cache.size >= 150) cache.delete(cache.keys().next().value!); cache.set(url, { saved: now(), data: body }); }
          return body;
        } catch (e) {
          if (attempt || (e instanceof UpstreamError && !e.retry) || e instanceof SyntaxError) throw e;
        } finally { clearTimeout(timer); }
        await sleep(150);
      }
      throw new Error('NOAA unavailable');
    })();
    pending.set(url, work); try { return await work; } finally { pending.delete(url); }
  }
  const stamp = (url: string) => new Date(cache.get(url)?.saved ?? now()).toISOString();
  function dataUrl(id: string, product: string, window: TideWindow, datum: TideDatum) {
    const minute = (s: string) => s.slice(0, 16).replace('T', ' ');
    const params = new URLSearchParams({ product, station: id, begin_date: minute(window.startUtc), end_date: minute(new Date(Date.parse(window.endUtc) - 60_000).toISOString()), datum, units: 'english', time_zone: 'gmt', format: 'json', application: 'CF_Florida_Explorer' });
    if (product === 'predictions') params.set('interval', 'hilo');
    return `${BASE}/api/prod/datagetter?${params}`;
  }
  async function product(id: string, kind: 'water_level' | 'predictions', window: TideWindow, datum: TideDatum, available: boolean): Promise<TideProduct> {
    const url = dataUrl(id, kind, window, datum);
    const base = { product: kind, queryUrl: url, retrievedAtUtc: new Date(now()).toISOString(), rows: [] as TideRow[] };
    if (!available) return { ...base, state: 'datum_unavailable' };
    try {
      const body = dict(await request(url));
      if (body.error) {
        const message = String(dict(body.error).message ?? '');
        return { ...base, state: /No data was found/i.test(message) ? 'no_data' : 'unavailable' };
      }
      if (kind === 'water_level' && String(dict(body.metadata).id) !== id) throw new Error('Wrong NOAA station');
      const values = body[kind === 'water_level' ? 'data' : 'predictions'];
      if (!Array.isArray(values)) throw new Error('Malformed NOAA rows');
      const seen = new Set<string>(); const rows: TideRow[] = [];
      for (const value of values) {
        const r = dict(value);
        if (typeof r.t !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(r.t)) throw new Error('Invalid NOAA time');
        const timeUtc = r.t.replace(' ', 'T') + ':00.000Z'; const ms = Date.parse(timeUtc);
        if (!Number.isFinite(ms) || new Date(ms).toISOString() !== timeUtc || ms < Date.parse(window.startUtc) || ms >= Date.parse(window.endUtc) || seen.has(timeUtc)) throw new Error('Invalid NOAA time range');
        seen.add(timeUtc);
        if (r.v === '' || r.v === null) continue; // Missing measurement, not a zero or an interpolated value.
        const height = numeric(r.v);
        if (height === -9999) continue; // Known missing-value sentinel is not a water height.
        if (kind === 'water_level') {
          if (!['v', 'p'].includes(String(r.q)) || typeof r.f !== 'string' || !/^\d,\d,\d,\d$/.test(r.f)) throw new Error('Missing NOAA quality');
          rows.push({ timeUtc, value: height, quality: r.q === 'v' ? 'verified' : 'preliminary', flags: r.f });
        } else {
          if (r.type !== 'H' && r.type !== 'L') throw new Error('Missing tide type');
          rows.push({ timeUtc, value: height, kind: r.type });
        }
      }
      rows.sort((a, b) => a.timeUtc.localeCompare(b.timeUtc));
      return { ...base, state: rows.length ? 'ok' : 'no_data', retrievedAtUtc: stamp(url), rows };
    } catch { cache.delete(url); return { ...base, state: 'unavailable' }; }
  }
  async function dailyFlood(id: string, window: TideWindow): Promise<NonNullable<TideStation['htf']>> {
    const params = new URLSearchParams({ station: id, start_date: window.startDate.replaceAll('-', ''), end_date: window.endDate.replaceAll('-', ''), units: 'english', datum: 'STND' });
    const queryUrl = `${BASE}/dpapi/prod/webapi/htf/htf_daily.json?${params}`;
    const base = { queryUrl, retrievedAtUtc: new Date(now()).toISOString(), datum: 'STND' as const, units: 'ft' as const, rows: [] as NonNullable<TideStation['htf']>['rows'] };
    try {
      const b = dict(await request(queryUrl, HOUR));
      if (b.error || b.units !== 'feet' || !Array.isArray(b.DailyFloodCount)) throw new Error('Malformed daily flood data');
      if (!b.DailyFloodCount.length && b.count === 0) return { ...base, retrievedAtUtc: stamp(queryUrl), state: 'no_data' };
      if (b.stnId !== id || b.count !== b.DailyFloodCount.length) throw new Error('Wrong daily flood station');
      const seen = new Set<string>();
      const rows = b.DailyFloodCount.flatMap((value) => {
        const r = dict(value); if (typeof r.day !== 'string' || !/^\d{2}\/\d{2}\/\d{4}$/.test(r.day)) throw new Error('Invalid report day');
        const [m, d, y] = r.day.split('/'); const date = `${y}-${m}-${d}`;
        if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || date < window.startDate || date > window.endDate || seen.has(date)) throw new Error('Invalid report range');
        seen.add(date);
        for (const field of ['minFlag', 'modFlag', 'majFlag', 'nanFlag']) if (r[field] !== 0 && r[field] !== 1) throw new Error('Invalid report flag');
        if (r.nanFlag === 1) return []; // Report declares missing data; never use the sentinel height or flags.
        const percentCompleteness = numeric(r.percent_completeness);
        if (percentCompleteness < 0 || percentCompleteness > 100) throw new Error('Invalid completeness');
        return [{ date, maxWL: numeric(r.maxWL), minor: r.minFlag === 1, moderate: r.modFlag === 1, major: r.majFlag === 1, percentCompleteness }];
      });
      return { ...base, retrievedAtUtc: stamp(queryUrl), rows, state: rows.length ? 'ok' : 'no_data' };
    } catch { cache.delete(queryUrl); return { ...base, state: 'unavailable' }; }
  }
  async function station(config: typeof curated[number], point: LatLon, window: TideWindow, datum: TideDatum): Promise<TideStation | null> {
    const metadataUrl = `${BASE}/mdapi/prod/webapi/stations/${config.id}.json?expand=datums,floodlevels&units=english`;
    try {
      const body = dict(await request(metadataUrl, 7 * 24 * HOUR));
      if (!Array.isArray(body.stations) || body.stations.length !== 1) throw new Error('Missing NOAA station');
      const s = dict(body.stations[0]);
      if (s.id !== config.id || typeof s.name !== 'string' || !s.name.trim()) throw new Error('Wrong NOAA metadata');
      const lat = numeric(s.lat); const lon = numeric(s.lng);
      if (!checkPoint({ lat, lon }).ok) throw new Error('Invalid station coordinates');
      const location = stationDistance(point, { lat, lon }); if (location.distanceKm > 25) return null;
      const datums = dict(s.datums); const entries = datums.datums;
      const available = datums.units === 'feet' && Array.isArray(entries) && entries.some((d) => { const e = dict(d); return e.name === (datum === 'NAVD' ? 'NAVD88' : datum) && typeof e.value === 'number' && Number.isFinite(e.value); });
      const kinds = config.observed ? ['water_level', 'predictions'] as const : ['predictions'] as const;
      const [products, htf] = await Promise.all([Promise.all(kinds.map((kind) => product(config.id, kind, window, datum, available))), config.observed ? dailyFlood(config.id, window) : undefined]);
      return { id: config.id, name: s.name, waterBody: config.waterBody, lat, lon, ...location, rationale: config.rationale, metadataUrl, metadataRetrievedAtUtc: stamp(metadataUrl), datumEpoch: typeof datums.epoch === 'string' ? datums.epoch : 'Not stated', products, ...(htf ? { htf } : {}) };
    } catch { cache.delete(metadataUrl); return null; }
  }
  return {
    async lookup(point: LatLon, startDate: string, endDate: string, datum: TideDatum): Promise<Omit<NoaaResponse, 'selectionId'>> {
      if (!checkPoint(point).ok || !['MLLW', 'NAVD'].includes(datum)) throw new Error('Invalid NOAA request');
      const window = tideWindow(startDate, endDate);
      const base = { point, window, datum, units: 'ft' as const, retrievedAtUtc: new Date(now()).toISOString() };
      if (!inCuratedArea(point)) return { ...base, stations: [], state: 'no_suitable_station' };
      const found = await Promise.all(curated.map((c) => station(c, point, window, datum)));
      const stations = found.filter((s): s is TideStation => s !== null);
      const succeeded = (p: TideProduct) => p.state === 'ok' || p.state === 'no_data';
      const ok = stations.flatMap((s) => s.products).filter(succeeded).length;
      return { ...base, stations, state: !stations.length || !ok ? 'unavailable' : stations.length === curated.length && stations.every((s) => s.products.every(succeeded) && s.htf?.state !== 'unavailable') ? 'ok' : 'partial' };
    },
  };
}
