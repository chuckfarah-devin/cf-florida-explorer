import { wildlifeGroups } from '../nature/wildlife-categories.ts';
import { checkPoint } from '../config/bounds.ts';

export interface WildlifeRecord { id: number; name: string; scientificName: string; observedOn: string; url: string; distanceKm?: number; nativeStatus?: 'native' | 'introduced' | 'unknown' }
export function groupWildlife(records: WildlifeRecord[]): (WildlifeRecord & { reportCount: number })[] {
  const groups = new Map<string, WildlifeRecord & { reportCount: number }>();
  const seen = new Set<number>();
  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const previous = groups.get(record.scientificName);
    const reportCount = (previous?.reportCount ?? 0) + 1;
    const closest = previous && (previous.distanceKm ?? Infinity) <= (record.distanceKm ?? Infinity) ? previous : record;
    groups.set(record.scientificName, { ...closest, reportCount,
      nativeStatus: previous && previous.nativeStatus !== record.nativeStatus ? 'unknown' : record.nativeStatus });
  }
  return [...groups.values()].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
export function cleanObservations(value: unknown, point?: { lat: number; lon: number }): WildlifeRecord[] {
  const results = (value as { results?: unknown[] } | null)?.results;
  if (!Array.isArray(results)) throw new Error('Invalid source response');
  const records: WildlifeRecord[] = [];
  for (const raw of results) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const t = r.taxon as Record<string, unknown> | undefined;
    // Never expose locations or dates for obscured/private observations.
    if (r.geoprivacy || t?.geoprivacy || r.obscured || r.private_location || r.quality_grade !== 'research') continue;
    if (!Number.isSafeInteger(r.id) || typeof r.observed_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.observed_on) || typeof t?.name !== 'string') continue;
    let distanceKm: number | undefined;
    if (point) {
      const location = typeof r.location === 'string' ? r.location.split(',').map(Number) : [];
      if (location.length !== 2 || !location.every(Number.isFinite) || Math.abs(location[0]) > 90 || Math.abs(location[1]) > 180) continue;
      const rad = Math.PI / 180;
      const h = Math.sin((location[0] - point.lat) * rad / 2) ** 2 + Math.cos(point.lat * rad) * Math.cos(location[0] * rad) * Math.sin((location[1] - point.lon) * rad / 2) ** 2;
      distanceKm = 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
    }
    const nativeStatus = t.introduced === true ? 'introduced' : t.native === true || t.endemic === true ? 'native' : 'unknown';
    records.push({ nativeStatus, ...(distanceKm !== undefined ? { distanceKm } : {}), id: r.id as number, name: typeof t.preferred_common_name === 'string' ? t.preferred_common_name : t.name, scientificName: t.name, observedOn: r.observed_on, url: `https://www.inaturalist.org/observations/${r.id}` });
  }
  return records.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

export function createWildlifeHandler(fetcher: typeof fetch = fetch) {
  const cache = new Map<string, { until: number; records: WildlifeRecord[]; pages: number; total: number; retrievedAt: string; sourceUrl: string; totals: Record<string, number> }>();
  let active = 0;
  let blockedUntil = 0;
  return async (request: Request): Promise<Response> => {
    const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': String(Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000))) } : {}) } });
    if (request.method !== 'POST') return reply({ error: 'Use POST' }, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Same-origin requests only' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) return reply({ error: 'Use JSON' }, 415);
    let b: Record<string, unknown>;
    try { const text = await request.text(); if (text.length > 4096) return reply({ error: 'Too large' }, 413); b = JSON.parse(text); } catch { return reply({ error: 'Invalid request' }, 400); }
    if (!b || typeof b.lat !== 'number' || typeof b.lon !== 'number' || !checkPoint({ lat: b.lat, lon: b.lon }).ok) return reply({ error: 'Select a Florida point' }, 400);
    const group = b.group === undefined || b.group === 'all' ? undefined : wildlifeGroups.find((g) => g.id === b.group);
    if (b.group !== undefined && b.group !== 'all' && !group) return reply({ error: 'Unknown animal group' }, 400);
    const subtype = b.type === undefined || b.type === 'all' ? undefined : group?.types.find((t) => t.id === b.type);
    if (b.type !== undefined && b.type !== 'all' && !subtype) return reply({ error: 'Unknown animal type' }, 400);
    if (b.status !== undefined && !['all', 'native', 'introduced'].includes(String(b.status))) return reply({ error: 'Unknown native status' }, 400);
    const taxa: Record<string, string> = { bobcat: '41976', fox: '42076' };
    if (b.species !== undefined && b.species !== 'all' && !Object.hasOwn(taxa, String(b.species))) return reply({ error: 'Unknown wildlife filter' }, 400);
    const key = `${b.lat}/${b.lon}/${b.species ?? 'all'}/${b.group ?? 'all'}/${b.type ?? 'all'}/${b.status ?? 'all'}`;
    if (b.depth !== undefined && b.depth !== 1 && b.depth !== 2) return reply({ error: 'Invalid search depth' }, 400);
    const mixedGroups = !group && (!b.species || b.species === 'all');
    const pageSize = mixedGroups ? 20 : 25;
    const targetPages = mixedGroups ? (b.depth === 2 ? 10 : 5) : (b.depth === 2 ? 8 : 4);
    const bodyFor = (entry: { records: WildlifeRecord[]; total: number; retrievedAt: string; sourceUrl: string }) => ({ records: groupWildlife(entry.records), radiusKm: 50, retrievedAt: entry.retrievedAt, sourceUrl: entry.sourceUrl, reportsLoaded: entry.records.length, totalReports: entry.total, canExpand: b.depth !== 2 && entry.total > 100 });
    const hit = cache.get(key);
    const fresh = hit && hit.until > Date.now() ? hit : undefined;
    if (fresh && (fresh.pages >= targetPages || fresh.pages * pageSize >= fresh.total)) return reply(bodyFor(fresh));
    if (Date.now() < blockedUntil) return reply({ error: 'Sightings source is busy; try again shortly', reason: 'UPSTREAM_HTTP_429' }, 429);
    if (active >= 4) return reply({ error: 'Busy' }, 503);
    active++;
    try {
      const url = new URL('https://api.inaturalist.org/v1/observations');
      const params = { lat: String(b.lat), lng: String(b.lon), radius: '50', place_id: '21', quality_grade: 'research', taxon_id: '1', geoprivacy: 'open', taxon_geoprivacy: 'open', per_page: String(pageSize), order_by: 'observed_on', order: 'desc', d2: new Date().toISOString().slice(0, 10) };
      url.search = new URLSearchParams(params).toString();
      if (group) url.searchParams.set('taxon_id', subtype?.taxon ?? group.taxon);
      const filter = subtype ?? group;
      url.searchParams.set('without_taxon_id', ['47178', '196614', '49099', '49231', ...(filter && 'exclude' in filter ? filter.exclude.split(',') : [])].join(','));
      if (b.status === 'native') url.searchParams.set('native', 'true');
      if (b.status === 'introduced') url.searchParams.set('introduced', 'true');
      if (b.species && b.species !== 'all') url.searchParams.set('taxon_id', taxa[String(b.species)]);
      const records = [...(fresh?.records ?? [])];
      let total = fresh?.total ?? Infinity;
      const totals: Record<string, number> = { ...(fresh?.totals ?? {}) };
      let pages = fresh?.pages ?? 0;
      const deadline = AbortSignal.timeout(30_000);
      for (let page = pages + 1; page <= targetPages; page++) {
        const discoveryGroup = mixedGroups ? wildlifeGroups[(page - 1) % wildlifeGroups.length] : undefined;
        const sourcePage = mixedGroups ? Math.floor((page - 1) / wildlifeGroups.length) + 1 : page;
        url.searchParams.set('page', String(sourcePage));
        if (discoveryGroup) {
          url.searchParams.set('taxon_id', discoveryGroup.taxon);
          url.searchParams.set('without_taxon_id', ['47178', '196614', '49099', '49231', ...('exclude' in discoveryGroup ? discoveryGroup.exclude.split(',') : [])].join(','));
        }
        const response = await fetcher(new URL(url), { signal: AbortSignal.any([request.signal, deadline, AbortSignal.timeout(12_000)]), headers: { Accept: 'application/json' } });
        if (response.status === 429) { const seconds = Number(response.headers.get('Retry-After')); blockedUntil = Date.now() + Math.max(60, Number.isFinite(seconds) ? Math.min(seconds, 300) : 60) * 1000; }
        if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
        const text = await response.text(); if (text.length > 6_000_000) throw new Error('Source too large');
        const data = JSON.parse(text);
        const batch = cleanObservations(data, { lat: b.lat, lon: b.lon });
        records.push(...batch);
        pages = page;
        const sourceTotal = typeof data.total_results === 'number' && Number.isFinite(data.total_results) && data.total_results >= 0 ? data.total_results : (data.results.length < pageSize ? (sourcePage - 1) * pageSize + data.results.length : sourcePage * pageSize + 1);
        totals[discoveryGroup?.id ?? 'selected'] = sourceTotal;
        total = Object.values(totals).reduce((sum, n) => sum + n, 0);
        if (!mixedGroups && (data.results.length < pageSize || page * pageSize >= total)) break;
      }
      const entry = { records, pages, totals, total: Number.isFinite(total) ? total : pages * pageSize + 1, retrievedAt: new Date().toISOString(), sourceUrl: url.toString(), until: Date.now() + 900_000 };
      if (cache.size >= 64 && !cache.has(key)) cache.delete(cache.keys().next().value!);
      cache.set(key, entry);
      return reply(bodyFor(entry));
    } catch (error) { const reason = error instanceof Error && /^UPSTREAM_HTTP_\d+$/.test(error.message) ? error.message : error instanceof TypeError && error.message.includes('AbortSignal.any') ? 'RUNTIME_SIGNAL_UNSUPPORTED' : error instanceof Error ? error.name : 'UNKNOWN'; return reply({ error: 'Couldn’t load sightings', reason }, reason === 'UPSTREAM_HTTP_429' ? 429 : 503); }
    finally { active--; }
  };
}

