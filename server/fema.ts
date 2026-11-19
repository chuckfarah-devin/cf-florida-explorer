import { checkPoint, type LatLon } from '../src/config/bounds.ts';
import type { Attributes, FemaResult, FemaSource, QueryName, SourceError } from '../src/fema/types.ts';

export const FEMA_SERVICE = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer';
const DAY = 86_400_000;
const QUERIES: { name: QueryName; layer: number; fields: string }[] = [
  { name: 'exact', layer: 28, fields: 'FLD_AR_ID,DFIRM_ID,VERSION_ID,FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,V_DATUM,LEN_UNIT,SOURCE_CIT' },
  { name: 'buffer', layer: 28, fields: 'FLD_AR_ID,FLD_ZONE,ZONE_SUBTY,SFHA_TF' },
  { name: 'coverage', layer: 0, fields: 'STUDY_ID' },
  { name: 'panels', layer: 3, fields: 'FIRM_PAN,EFF_DATE,PANEL_TYP,DFIRM_ID,SCALE' },
  { name: 'revisions', layer: 1, fields: 'LOMR_ID,CASE_NO,EFF_DATE,STATUS' },
];

export function queryUrl(point: LatLon, name: QueryName): string {
  const query = QUERIES.find((q) => q.name === name)!;
  const params = new URLSearchParams({ geometry: `${point.lon},${point.lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', returnGeometry: 'false', outFields: query.fields, f: 'json' });
  if (name === 'buffer') { params.set('distance', '15'); params.set('units', 'esriSRUnit_Meter'); }
  return `${FEMA_SERVICE}/${query.layer}/query?${params}`;
}

class QueryError extends Error {
  kind: SourceError;
  retry: boolean;
  constructor(kind: SourceError, retry: boolean) { super(kind); this.kind = kind; this.retry = retry; }
}
function recordsFrom(body: unknown, name: QueryName): Attributes[] {
  if (!body || typeof body !== 'object') throw new QueryError('malformed', false);
  const data = body as { error?: { code?: number }; exceededTransferLimit?: boolean; features?: { attributes?: unknown }[] };
  if (data.error) {
    const code = data.error.code ?? 500;
    throw new QueryError(code === 429 ? 'rate_limited' : 'upstream_error', code >= 500);
  }
  if (data.exceededTransferLimit || !Array.isArray(data.features)) throw new QueryError('malformed', false);
  return data.features.map((feature) => {
    if (!feature || typeof feature !== 'object' || !feature.attributes || typeof feature.attributes !== 'object' || Array.isArray(feature.attributes)) throw new QueryError('malformed', false);
    const attrs = feature.attributes as Record<string, unknown>;
    const required = name === 'exact' || name === 'buffer' ? 'FLD_ZONE' : name === 'coverage' ? 'STUDY_ID' : name === 'panels' ? 'FIRM_PAN' : 'CASE_NO';
    if (typeof attrs[required] !== 'string' || !attrs[required].trim()) throw new QueryError('malformed', false);
    const clean: Attributes = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) clean[key] = value;
      else throw new QueryError('malformed', false);
    }
    return clean;
  });
}

interface Options {
  fetcher?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  maxEntries?: number;
}

/** Fixed upstream endpoints; a bounded, process-local cache of complete retrieval batches. */
export function createFemaService(options: Options = {}) {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const cache = new Map<string, { savedAt: number; result: FemaResult }>();
  const pending = new Map<string, Promise<FemaResult>>();

  async function query(point: LatLon, name: QueryName): Promise<FemaSource> {
    const config = QUERIES.find((q) => q.name === name)!;
    const url = queryUrl(point, name);
    const metadata = { provider: 'FEMA', dataset: 'National Flood Hazard Layer', evidenceClass: 'regulatory_classification', sourceCrs: 'EPSG:4269', spatialRelation: name === 'buffer' ? 'buffer_intersection' : 'point_intersection' } as const;
    let error: SourceError = 'upstream_error';
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
      try {
        const response = await fetcher(url, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new QueryError(response.status === 429 ? 'rate_limited' : 'upstream_error', response.status >= 500);
        let body: unknown;
        try { body = await response.json(); } catch { throw new QueryError('malformed', false); }
        return { ...metadata, name, layer: config.layer, queryUrl: url, retrievedAtUtc: new Date(now()).toISOString(), status: 'ok', records: recordsFrom(body, name) };
      } catch (err) {
        error = controller.signal.aborted ? 'timeout' : err instanceof QueryError ? err.kind : 'upstream_error';
        const retry = controller.signal.aborted || !(err instanceof QueryError) || err.retry;
        if (!retry || attempt === 1) break;
      } finally { clearTimeout(timer); }
      await sleep(150 + Math.random() * 150);
    }
    return { ...metadata, name, layer: config.layer, queryUrl: url, retrievedAtUtc: new Date(now()).toISOString(), status: error, records: [] };
  }

  async function retrieve(point: LatLon, key: string, previous: { savedAt: number; result: FemaResult } | undefined): Promise<FemaResult> {
    // Exact and buffered queries are distinct; neither can replace the other.
    const sources = await Promise.all(QUERIES.map((q) => query(point, q.name)));
    const byName = (name: QueryName) => sources.find((s) => s.name === name)!;
    const exact = byName('exact'); const buffer = byName('buffer'); const coverage = byName('coverage');
    const refreshFailures = sources.filter((s) => s.status !== 'ok').map((s) => s.name);
    if (exact.status !== 'ok' && previous && now() - previous.savedAt <= 7 * DAY) {
      return { ...previous.result, freshness: 'stale', refreshFailures };
    }
    const zones = exact.status === 'ok' ? exact.records : [];
    const zoneKey = (a: Attributes) => `${a.FLD_ZONE}|${a.ZONE_SUBTY ?? ''}`;
    const atPoint = new Set(zones.map(zoneKey));
    const nearbyZones = buffer.status === 'ok' ? buffer.records.filter((z) => !atPoint.has(zoneKey(z))) : [];
    const state = exact.status !== 'ok' ? 'unavailable' : zones.length > 1 ? 'ambiguous_overlap' : zones.length === 1 ? (nearbyZones.length ? 'classified_near_boundary' : 'classified') : coverage.status !== 'ok' ? 'coverage_unknown' : coverage.records.length ? 'in_coverage_no_zone' : 'outside_nfhl_coverage';
    const retrievedAtUtc = new Date(now()).toISOString();
    const result: FemaResult = { point, batchId: crypto.randomUUID(), state, zones, nearbyZones, sources, radiusMeters: 15, boundaryCheckAvailable: buffer.status === 'ok', freshness: 'fresh', retrievedAtUtc, refreshFailures };
    // Partial or unavailable batches are never cached as complete or mixed with older records.
    if (refreshFailures.length === 0) {
      if (cache.size >= (options.maxEntries ?? 500)) cache.delete(cache.keys().next().value!);
      cache.delete(key);
      cache.set(key, { savedAt: now(), result });
    }
    return result;
  }

  return {
    async lookup(point: LatLon): Promise<FemaResult> {
      if (!checkPoint(point).ok) throw new Error('Invalid Florida point');
      // Preserve full input precision: rounding cannot transfer classification across a boundary.
      const key = JSON.stringify([FEMA_SERVICE, point.lat, point.lon, 15, 'esriSRUnit_Meter', 'esriSpatialRelIntersects', QUERIES]);
      const previous = cache.get(key);
      if (previous && now() - previous.savedAt < DAY) return previous.result;
      const running = pending.get(key); if (running) return running;
      const task = retrieve(point, key, previous).finally(() => pending.delete(key));
      pending.set(key, task);
      return task;
    },
  };
}
