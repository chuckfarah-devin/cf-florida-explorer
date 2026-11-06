import { describe, it, expect, vi } from 'vitest';
import { cleanObservations, createWildlifeHandler, groupWildlife } from './wildlife';
const observation = { id: 123, observed_on: '2026-10-24', quality_grade: 'research', taxon: { name: 'Lynx rufus', preferred_common_name: 'Bobcat' }, location: '26,-81' };
const req = (body: unknown = { lat: 26, lon: -81, group: 'reptiles' }) => new Request('http://localhost/api/wildlife', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
describe('wildlife evidence', () => {
  it('samples every main animal group rather than allowing one group to fill the mixed list', async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ total_results: 0, results: [] })));
    await createWildlifeHandler(fetcher)(req({ lat: 26, lon: -81 }));
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(fetcher.mock.calls.map((c) => (c[0] as URL).searchParams.get('taxon_id'))).toEqual(['26036', '20978', '40151', '3', '1']);
  });
  it('loads beyond twelve reports and reuses earlier pages when expanding', async () => {
    const fetcher = vi.fn().mockImplementation((url: URL) => {
      const page = Number(url.searchParams.get('page'));
      return Promise.resolve(Response.json({ total_results: 200, results: Array.from({ length: 25 }, (_, n) => ({ ...observation, id: (page - 1) * 25 + n + 1 })) }));
    });
    const handler = createWildlifeHandler(fetcher);
    const first = await (await handler(req())).json();
    expect(first.reportsLoaded).toBe(100);
    expect(first.records[0].reportCount).toBe(100);
    expect(first.canExpand).toBe(true);
    const expanded = await (await handler(req({ lat: 26, lon: -81, group: 'reptiles', depth: 2 }))).json();
    expect(expanded.reportsLoaded).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(8);
    expect(expanded.canExpand).toBe(false);
  });
  it('shows each animal once with its report count and closest report metadata', () => {
    const records = cleanObservations({ results: [
      { ...observation, id: 1, location: '26.5,-81' },
      { ...observation, id: 2, location: '26.01,-81', observed_on: '2020-01-01' },
      { ...observation, id: 3, location: '26.2,-81', taxon: { name: 'Urocyon cinereoargenteus', preferred_common_name: 'Gray Fox' } },
    ] }, { lat: 26, lon: -81 });
    const grouped = groupWildlife([...records, records[0]]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toMatchObject({ name: 'Bobcat', id: 2, reportCount: 2, observedOn: '2020-01-01', url: 'https://www.inaturalist.org/observations/2' });
    expect(grouped[0].distanceKm).toBeCloseTo(1.112, 2);
    expect(grouped[1].reportCount).toBe(1);
  });
  it('keeps native, introduced and unclassified status distinct', () => {
    const records = cleanObservations({ results: [{ ...observation, taxon: { ...observation.taxon, native: true } }, { ...observation, id: 2, taxon: { ...observation.taxon, introduced: true } }, { ...observation, id: 3 }] });
    expect(records.map((r) => r.nativeStatus)).toEqual(['native', 'introduced', 'unknown']);
  });
  it('filters groups and native status upstream and rejects mismatched subgroups', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ results: [] }));
    const handler = createWildlifeHandler(fetcher);
    const response = await handler(req({ lat: 26, lon: -81, group: 'reptiles', type: 'snakes', status: 'introduced' }));
    expect(response.status).toBe(200);
    const url = fetcher.mock.calls[0][0] as URL;
    expect(url.searchParams.get('taxon_id')).toBe('85553');
    expect(url.searchParams.get('introduced')).toBe('true');
    expect(url.searchParams.has('native')).toBe(false);
    expect((await handler(req({ lat: 26, lon: -81, group: 'birds', type: 'snakes' }))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('sorts source records by distance rather than date without exposing coordinates', () => {
    const records = cleanObservations({ results: [{ ...observation, id: 1, location: '26.5,-81' }, { ...observation, id: 2, location: '26.01,-81', observed_on: '2020-01-01' }] }, { lat: 26, lon: -81 });
    expect(records.map((r) => r.id)).toEqual([2, 1]);
    expect(records[0].distanceKm).toBeCloseTo(1.112, 2);
    expect(records[0]).not.toHaveProperty('location');
  });
  it('returns source-linked records without animal coordinates', () => {
    expect(cleanObservations({ results: [observation] })).toEqual([{ nativeStatus: 'unknown', id: 123, observedOn: '2026-10-24', name: 'Bobcat', scientificName: 'Lynx rufus', url: 'https://www.inaturalist.org/observations/123' }]);
  });
  it('excludes obscured, private, non-research and malformed records', () => {
    expect(cleanObservations({ results: [{ ...observation, geoprivacy: 'obscured' }, { ...observation, taxon: { ...observation.taxon, geoprivacy: 'private' } }, { ...observation, obscured: true }, { ...observation, quality_grade: 'casual' }, { ...observation, id: 'bad' }] })).toEqual([]);
  });
  it('rejects outside Florida before source access', async () => {
    const fetcher = vi.fn(); expect((await createWildlifeHandler(fetcher)(req({ lat: 40, lon: -80 }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it('separates empty success from source failure and caches only success', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ results: [] })).mockRejectedValue(new Error());
    const handler = createWildlifeHandler(fetcher);
    expect((await (await handler(req())).json()).records).toEqual([]);
    await handler(req()); expect(fetcher).toHaveBeenCalledTimes(1);
    expect((await handler(req({ lat: 27, lon: -81 }))).status).toBe(503);
    expect((await handler(req({ lat: 27, lon: -81 }))).status).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
