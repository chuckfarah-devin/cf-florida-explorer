// @vitest-environment node
import { vi } from 'vitest';
import { createNatureService, natureQuery } from './nature';
import type { NatureSourceId } from '../src/nature/types';

const POINT = { lat: 26.5, lon: -80.05 };
const sleep = async () => {};
const square = (west = -80.04, south = 26.499, width = 0.001) => ({ rings: [[[west, south], [west + width, south], [west + width, south + width], [west, south + width], [west, south]]], spatialReference: { wkid: 4326 } });
function row(id = 1, name = 'Synthetic preserve', west = -80.04, agency = 'Synthetic agency') { return { attributes: { OBJECTID: id, MANAME: name, MANAGING_A: agency, NAME: name }, geometry: square(west) }; }
function sourceId(url: URL): NatureSourceId { return url.searchParams.has('distance') ? 'nearby' : url.pathname.includes('Program_Support') ? 'wetlands' : url.pathname.includes('AQUATIC_PRESERVES') ? 'preserves' : 'conservation'; }
function upstream(change?: (id: NatureSourceId, url: URL) => Response | undefined) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input)); const id = sourceId(url);
    return change?.(id, url) ?? Response.json({ features: [], spatialReference: { wkid: 4326 } });
  });
}
const body = (features: unknown[], more = {}) => Response.json({ features, spatialReference: { wkid: 4326 }, ...more });
const source = (result: Awaited<ReturnType<ReturnType<typeof createNatureService>['lookup']>>, id: NatureSourceId) => result.sources.find((s) => s.id === id)!;

describe('nature fixed-source connector', () => {
  it('keeps exact no-match results separate from nearby conservation matches (N27/N29)', async () => {
    const fetcher = upstream((id) => id === 'nearby' ? body([row()]) : undefined);
    const result = await createNatureService({ fetcher }).lookup(POINT);
    for (const id of ['wetlands', 'conservation', 'preserves'] as const) expect(source(result, id)).toMatchObject({ state: 'ok', features: [] });
    expect(result.nearby).toHaveLength(1); expect(result.nearby[0]).toMatchObject({ name: 'Synthetic preserve', inside: false });
    expect(result.nearby[0].distanceMeters).toBeGreaterThan(990); expect(result.nearby[0].distanceMeters).toBeLessThan(1010);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('uses exact authoritative wetland and conservation labels and independent preserve membership (N28/N30)', async () => {
    const fetcher = upstream((id) => id === 'wetlands' ? body([{ attributes: { OBJECTID: 7, WETLAND_TYPE: 'Freshwater Emergent Wetland', ATTRIBUTE: 'PEM1F' } }]) : id === 'conservation' ? body([row(8, 'Arthur R. Marshall Loxahatchee National Wildlife Refuge')]) : id === 'preserves' ? body([row(9, 'Synthetic Aquatic Preserve')]) : undefined);
    const result = await createNatureService({ fetcher }).lookup(POINT);
    expect(source(result, 'wetlands').features[0]).toMatchObject({ id: 'wetlands:7', name: 'Freshwater Emergent Wetland', wetlandType: 'Freshwater Emergent Wetland', code: 'PEM1F' });
    expect(source(result, 'conservation').features[0].name).toBe('Arthur R. Marshall Loxahatchee National Wildlife Refuge');
    expect(source(result, 'preserves').features[0]).toMatchObject({ id: 'preserves:9', name: 'Synthetic Aquatic Preserve', agency: 'Florida DEP' });
  });
  it('does not substitute preserve failure for absence or suppress successful sources', async () => {
    const fetcher = upstream((id) => id === 'preserves' ? new Response('down', { status: 503 }) : id === 'nearby' ? body([row()]) : undefined);
    const result = await createNatureService({ fetcher, sleep }).lookup(POINT);
    expect(source(result, 'preserves')).toMatchObject({ state: 'unavailable', features: [] }); expect(source(result, 'wetlands').state).toBe('ok'); expect(result.nearby).toHaveLength(1);
  });
  it('sorts by boundary distance, deduplicates equal name/agency, clips to radius and returns at most five', async () => {
    const rows = [row(1, 'Duplicate', -80.01), row(2, 'Nearest', -80.049), row(3, 'Duplicate', -80.048), row(4, 'Third', -80.047), row(5, 'Fourth', -80.046), row(6, 'Fifth', -80.045), row(7, 'Sixth', -80.044), row(8, 'Too far', -79.9)];
    const result = await createNatureService({ fetcher: upstream((id) => id === 'nearby' ? body(rows) : undefined) }).lookup(POINT);
    expect(result.nearby.map((f) => f.name)).toEqual(['Nearest', 'Duplicate', 'Third', 'Fourth', 'Fifth']);
    expect(result.nearby.find((f) => f.name === 'Duplicate')?.id).toBe('conservation:3');
    expect(result.nearby.every((f, i, a) => i === 0 || f.distanceMeters! >= a[i - 1].distanceMeters!)).toBe(true);
    expect(result.nearby[0].distanceMeters).toBeLessThan(110); // Centre would be farther than this boundary.
  });
  it('labels inside only from an exact membership hit, and leaves it unknown when that query fails', async () => {
    for (const failed of [false, true]) {
      const result = await createNatureService({ fetcher: upstream((id) => id === 'nearby' ? body([row(3)]) : id === 'conservation' ? failed ? new Response('bad', { status: 429 }) : body([row(3)]) : undefined) }).lookup(POINT);
      expect(result.nearby[0].inside).toBe(failed ? undefined : true);
    }
  });
  it.each([
    { exceededTransferLimit: true, features: [] }, { error: { code: 400 }, features: [] }, { features: null },
    { features: [{ attributes: { OBJECTID: 1, MANAME: 'Broken' } }] },
    { spatialReference: { wkid: 3857 }, features: [{ ...row(), geometry: { rings: square().rings } }] },
    { features: [{ ...row(), geometry: { rings: [[[-80, 26], [-80, 27], [-79, 27], [-79, 26]]] } }] },
    { features: [{ ...row(), geometry: { rings: [[[-80, 26], [-80, 26], [-80, 26], [-80, 26]]] } }] },
    { features: [{ ...row(), geometry: { rings: [[[-80, 26], [-79, 26], [-78, 26], [-80, 26]]] } }] },
  ])('reports malformed or incomplete protected data as unavailable, never no-match: %j', async (change) => {
    const result = await createNatureService({ fetcher: upstream((id) => id === 'nearby' ? Response.json({ spatialReference: { wkid: 4326 }, ...change }) : undefined) }).lookup(POINT);
    expect(source(result, 'nearby').state).toBe('unavailable'); expect(result.nearby).toEqual([]);
  });
  it('rejects duplicate IDs rather than hiding an incomplete or overlapping response', async () => {
    const result = await createNatureService({ fetcher: upstream((id) => id === 'nearby' ? body([row(), row()]) : undefined) }).lookup(POINT);
    expect(source(result, 'nearby').state).toBe('unavailable');
  });
  it('retains original cache timestamps and isolates exact/buffer/coordinate keys', async () => {
    let clock = Date.parse('2026-11-04T12:00:00Z'); const fetcher = upstream(); const service = createNatureService({ fetcher, now: () => clock });
    const first = await service.lookup(POINT); clock += 60_000; const cached = await service.lookup(POINT);
    expect(fetcher).toHaveBeenCalledTimes(4); expect(cached.sources.map((s) => s.retrievedAtUtc)).toEqual(first.sources.map((s) => s.retrievedAtUtc));
    expect(new Set(cached.sources.map((s) => s.queryUrl)).size).toBe(4);
    await service.lookup({ ...POINT, lat: POINT.lat + 1e-8 }); expect(fetcher).toHaveBeenCalledTimes(8);
    clock += 86_400_001; await service.lookup(POINT); expect(fetcher).toHaveBeenCalledTimes(12);
  });
  it('does not serve stale success on refresh failure or cache malformed results', async () => {
    let clock = 0; let bad = false; const fetcher = upstream((id) => id === 'nearby' && bad ? body([], { exceededTransferLimit: true }) : undefined);
    const service = createNatureService({ fetcher, now: () => clock }); await service.lookup(POINT);
    clock += 86_400_001; bad = true; expect(source(await service.lookup(POINT), 'nearby').state).toBe('unavailable');
    bad = false; expect(source(await service.lookup(POINT), 'nearby').state).toBe('ok');
  });
  it('deduplicates pending queries without letting caller mutation poison the cache', async () => {
    const fetcher = upstream((id) => id === 'nearby' ? body([row()]) : undefined); const service = createNatureService({ fetcher });
    const [a, b] = await Promise.all([service.lookup(POINT), service.lookup(POINT)]); expect(fetcher).toHaveBeenCalledTimes(4);
    a.nearby[0].name = 'changed'; expect(b.nearby[0].name).toBe('Synthetic preserve');
    expect((await service.lookup(POINT)).nearby[0].name).toBe('Synthetic preserve');
  });
  it('does not retry rate limits, but retries a server error once', async () => {
    for (const status of [429, 503]) {
      const fetcher = upstream((id) => id === 'preserves' ? new Response('bad', { status }) : undefined);
      expect(source(await createNatureService({ fetcher, sleep }).lookup(POINT), 'preserves').state).toBe('unavailable');
      expect(fetcher.mock.calls.filter(([u]) => sourceId(new URL(String(u))) === 'preserves')).toHaveLength(status === 429 ? 1 : 2);
    }
  });
  it('times out and retries once without losing successful independent queries', async () => {
    const normal = upstream(); let calls = 0;
    const fetcher: typeof fetch = async (input, init) => {
      if (sourceId(new URL(String(input))) !== 'preserves') return normal(input);
      calls++; return new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }));
    };
    const result = await createNatureService({ fetcher, timeoutMs: 2, sleep }).lookup(POINT);
    expect(calls).toBe(2); expect(source(result, 'preserves').state).toBe('unavailable'); expect(source(result, 'wetlands').state).toBe('ok');
  });
  it('recovers from a network TypeError with one retry', async () => {
    let failures = 0; const normal = upstream();
    const fetcher: typeof fetch = async (input) => {
      if (sourceId(new URL(String(input))) === 'preserves' && failures++ === 0) throw new TypeError('fetch failed');
      return normal(input);
    };
    const result = await createNatureService({ fetcher, sleep }).lookup(POINT);
    expect(failures).toBe(2); expect(source(result, 'preserves').state).toBe('ok');
  });
  it('rejects invalid/outside points before retrieving sources and emits un-generalized fixed queries', async () => {
    const fetcher = upstream(); const service = createNatureService({ fetcher });
    await expect(service.lookup({ lat: 40, lon: -80 })).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
    for (const id of ['wetlands', 'conservation', 'preserves', 'nearby'] as const) {
      const url = new URL(natureQuery(POINT, id)); expect(url.protocol).toBe('https:'); expect(url.searchParams.get('geometry')).toBe('-80.05,26.5');
      expect(url.searchParams.get('inSR')).toBe('4326'); expect(url.searchParams.get('outSR')).toBe('4326');
      expect(url.searchParams.get('spatialRel')).toBe('esriSpatialRelIntersects'); expect(url.searchParams.has('maxAllowableOffset')).toBe(false); expect(url.searchParams.has('geometryPrecision')).toBe(false);
      expect(url.searchParams.get('distance')).toBe(id === 'nearby' ? '5000' : null);
    }
  });
});
