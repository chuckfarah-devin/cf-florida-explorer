import { expect, it, vi } from 'vitest';
import { createInfrastructureHandler } from './infrastructure';
const request = (point = { lat: 26.5089, lon: -80.0522 }) => new Request('http://localhost/api/infrastructure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(point) });
it('queries watershed membership separately from nearby assets without inferring a drain route', async () => {
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ features: [{ attributes: { NAME: 'S41', CANAL: 'C-16' } }] })));
  const data = await (await createInfrastructureHandler(fetcher)(request())).json();
  expect(data.routeState).toBe('not_connected');
  expect(fetcher).toHaveBeenCalledTimes(3);
  const urls = fetcher.mock.calls.map((call) => call[0] as URL);
  expect(urls[0].searchParams.has('distance')).toBe(false);
  expect(urls[1].searchParams.get('distance')).toBe('5000');
  expect(data.sources[2].records).toEqual([{ name: 'S41', canal: 'C-16' }]);
});
it('separates partial source errors, truncation and successful empty results', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ features: [] })).mockResolvedValueOnce(Response.json({ error: { code: 500 } })).mockResolvedValueOnce(Response.json({ features: [], exceededTransferLimit: true }));
  const data = await (await createInfrastructureHandler(fetcher)(request())).json();
  expect(data.sources.map((s: { state: string }) => s.state)).toEqual(['ok', 'error', 'error']);
});
it('rejects outside Florida before requesting sources', async () => {
  const fetcher = vi.fn(); expect((await createInfrastructureHandler(fetcher)(request({ lat: 40, lon: -80 }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
});
