// @vitest-environment node
import { vi } from 'vitest';
import { createFemaService, queryUrl } from './fema';
import { createFemaHandler } from './api';

const POINT = { lat: 26.5089022, lon: -80.0522463 };
const ae = { FLD_ZONE: 'AE', FLD_AR_ID: 'test-ae', ZONE_SUBTY: 'COASTAL FLOODPLAIN', STATIC_BFE: 8, V_DATUM: 'NAVD88', LEN_UNIT: '' };
const x = { FLD_ZONE: 'X', FLD_AR_ID: 'test-x', ZONE_SUBTY: '0.2 PCT ANNUAL CHANCE FLOOD HAZARD' };
const empty = () => Response.json({ features: [] });
const features = (records: object[]) => Response.json({ features: records.map((attributes) => ({ attributes })) });

function upstream(options: { exact?: object[]; buffer?: object[]; coverage?: object[]; fail?: 'exact' | 'buffer' | 'coverage' | 'panels'; malformed?: boolean } = {}) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const layer = Number(url.pathname.split('/').at(-2));
    const name = layer === 28 ? (url.searchParams.has('distance') ? 'buffer' : 'exact') : layer === 0 ? 'coverage' : layer === 3 ? 'panels' : 'revisions';
    if (options.fail === name) return new Response('failure', { status: 504 });
    if (options.malformed && name === 'exact') return Response.json({ features: [{}] });
    if (name === 'exact') return features(options.exact ?? [ae]);
    if (name === 'buffer') return features(options.buffer ?? [ae, x]);
    if (name === 'coverage') return features(options.coverage ?? [{ STUDY_ID: 'test-study' }]);
    if (name === 'panels') return features([{ FIRM_PAN: 'test-panel', EFF_DATE: 1734652800000, SCALE: '6000' }]);
    return empty();
  });
}
const noSleep = async () => {};

describe('FEMA deterministic lookup (synthetic response fixtures)', () => {
  it('keeps exact and 15 m buffered queries separate, preserves fields and provenance', async () => {
    const fetcher = upstream();
    const service = createFemaService({ fetcher, sleep: noSleep });
    const result = await service.lookup(POINT);
    expect(result.state).toBe('classified_near_boundary');
    expect(result.zones).toEqual([ae]);
    expect(result.nearbyZones).toEqual([x]);
    expect(new URL(queryUrl(POINT, 'exact')).searchParams.has('distance')).toBe(false);
    expect(new URL(queryUrl(POINT, 'buffer')).searchParams.get('distance')).toBe('15');
    expect(result.sources).toHaveLength(5);
    expect(result.sources.every((s) => s.retrievedAtUtc && s.queryUrl.startsWith('https://hazards.fema.gov/'))).toBe(true);
    await service.lookup(POINT);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it.each([
    ['classified', { buffer: [ae] }],
    ['ambiguous_overlap', { exact: [ae, x] }],
    ['in_coverage_no_zone', { exact: [], buffer: [] }],
    ['outside_nfhl_coverage', { exact: [], buffer: [], coverage: [] }],
    ['coverage_unknown', { exact: [], fail: 'coverage' as const }],
    ['unavailable', { fail: 'exact' as const }],
  ])('distinguishes %s without claiming safety', async (state, opts) => {
    const result = await createFemaService({ fetcher: upstream(opts), sleep: noSleep }).lookup(POINT);
    expect(result.state).toBe(state);
  });

  it('keeps the nearby-zone warning even when no zone is found at the point', async () => {
    const result = await createFemaService({ fetcher: upstream({ exact: [], buffer: [x], coverage: [] }) }).lookup(POINT);
    expect(result.state).toBe('outside_nfhl_coverage');
    expect(result.nearbyZones).toEqual([x]);
  });

  it('does not turn buffer or panel failure into a missing zone or negative boundary result', async () => {
    const result = await createFemaService({ fetcher: upstream({ fail: 'buffer' }), sleep: noSleep }).lookup(POINT);
    expect(result.state).toBe('classified');
    expect(result.boundaryCheckAvailable).toBe(false);
    expect(result.refreshFailures).toContain('buffer');
    const partial = await createFemaService({ fetcher: upstream({ fail: 'panels' }), sleep: noSleep }).lookup(POINT);
    expect(partial.zones).toEqual([ae]);
    expect(partial.sources.find((s) => s.name === 'panels')?.status).toBe('upstream_error');
  });

  it('rejects malformed and truncated results instead of treating them as empty coverage', async () => {
    const malformed = await createFemaService({ fetcher: upstream({ malformed: true }), sleep: noSleep }).lookup(POINT);
    expect(malformed.state).toBe('unavailable');
    const result = await createFemaService({ fetcher: async () => Response.json({ features: [], exceededTransferLimit: true }) }).lookup(POINT);
    expect(result.state).toBe('unavailable');
    expect(result.sources[0].status).toBe('malformed');
  });

  it('does not retry HTTP 429, invalid JSON, or ArcGIS client errors', async () => {
    for (const response of [() => new Response('', { status: 429 }), () => new Response('invalid'), () => Response.json({ error: { code: 400 } })]) {
      const fetcher = vi.fn(async () => response());
      const result = await createFemaService({ fetcher, sleep: noSleep }).lookup(POINT);
      expect(fetcher).toHaveBeenCalledTimes(5);
      expect(result.state).toBe('unavailable');
    }
  });

  it('times out and retries once, preserving an unavailable state', async () => {
    const fetcher = vi.fn((_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))));
    const result = await createFemaService({ fetcher, timeoutMs: 5, sleep: noSleep }).lookup(POINT);
    expect(result.sources.every((s) => s.status === 'timeout')).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(10);
  });

  it('serves an intact stale batch on refresh failure only within seven days', async () => {
    let time = Date.UTC(2026, 10, 3);
    let failed = false;
    const fetcher = vi.fn(async (url: string | URL | Request) => failed ? new Response('', { status: 504 }) : upstream()(url));
    const service = createFemaService({ fetcher, now: () => time, sleep: noSleep });
    const first = await service.lookup(POINT);
    time += 2 * 86_400_000; failed = true;
    const stale = await service.lookup(POINT);
    expect(stale.freshness).toBe('stale');
    expect(stale.batchId).toBe(first.batchId);
    expect(stale.retrievedAtUtc).toBe(first.retrievedAtUtc);
    expect(stale.refreshFailures).toContain('exact');
    time += 6 * 86_400_000;
    expect((await service.lookup(POINT)).state).toBe('unavailable');
  });

  it('does not transfer cached zones to even slightly different coordinates', async () => {
    const fetcher = upstream(); const service = createFemaService({ fetcher });
    await service.lookup(POINT);
    await service.lookup({ ...POINT, lon: POINT.lon + 0.00000001 });
    expect(fetcher).toHaveBeenCalledTimes(10);
  });

  it('deduplicates simultaneous requests for the same point without conflating their API selection IDs', async () => {
    const fetcher = upstream(); const service = createFemaService({ fetcher });
    const handler = createFemaHandler(service);
    const request = (selectionId: number) => new Request('http://localhost/api/fema', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...POINT, selectionId }) });
    const results = await Promise.all([handler(request(1)), handler(request(2))]);
    const bodies = await Promise.all(results.map((r) => r.json()));
    expect(bodies.map((r) => r.selectionId)).toEqual([1, 2]);
    expect(bodies[0].batchId).toBe(bodies[1].batchId);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it('validates inputs before upstream queries, rejects cross-origin calls and preserves method rules', async () => {
    const fetcher = upstream(); const handler = createFemaHandler(createFemaService({ fetcher }));
    for (const body of [{ lat: 25, lon: -78, selectionId: 1 }, { ...POINT, selectionId: -1 }, { lat: '-80', lon: 26, selectionId: 1 }, null]) {
      expect((await handler(new Request('http://localhost/api/fema', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))).status).toBe(400);
    }
    expect((await handler(new Request('http://localhost/api/fema'))).status).toBe(405);
    expect((await handler(new Request('http://localhost/api/fema', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...POINT, selectionId: 1 }) }))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
