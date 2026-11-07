import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
it('reads public CORS data without credentials and retains source grouping', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ total_results: 1, results: [{ id: 123, observed_on: '2026-11-01', quality_grade: 'research', location: '26.51,-80.05', taxon: { name: 'Lynx rufus', preferred_common_name: 'Bobcat' } }] }));
  vi.stubGlobal('fetch', fetcher);
  const { fetchWildlife } = await import('./client');
  const result = await fetchWildlife(JSON.stringify({ lat: 26.5089, lon: -80.0522, group: 'mammals' }), new AbortController().signal);
  const body = await result.json();
  expect(body.records[0]).toMatchObject({ name: 'Bobcat', reportCount: 1 });
  expect((fetcher.mock.calls[0][0] as URL).origin).toBe('https://api.inaturalist.org');
  expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit' });
});
