import { expect, it, vi } from 'vitest';
import { createHistoryHandler, parseMarkers, nearbyMarkers } from './history';
const marker = { Id: 560, Title: 'School', Year: '2007', Description: 'Opened in 1913.', City: 'Boynton Beach', County: 'Palm Beach', Location: 'Ocean Avenue', Latitude: 26.51, Longitude: -80.05 };
const html = (items: unknown[]) => `const markerCards = ${JSON.stringify(items)};`;
const request = (point = { lat: 26.5089, lon: -80.0522 }) => new Request('http://localhost/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(point) });
it('parses state data without executing scripts and preserves marker year separately', () => {
  const records = parseMarkers(html([marker, { ...marker, Id: 1, Latitude: 80 }]));
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ markerYear: '2007', excerpt: 'Opened in 1913.', url: 'https://markers.flheritage.com/home/details/560' });
  expect(() => parseMarkers('const markerCards = alert(1);')).toThrow();
});
it('sorts all published markers before limiting and excludes distant records', () => {
  const records = parseMarkers(html([{ ...marker, Id: 1, Latitude: 26.7 }, marker, { ...marker, Id: 2, Latitude: 29 }]));
  expect(nearbyMarkers(records, { lat: 26.5089, lon: -80.0522 }).map((r) => r.id)).toEqual([560, 1]);
});
it('shares successful source retrieval and separates source failure from no nearby markers', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(html([marker])));
  const handler = createHistoryHandler(fetcher);
  expect((await (await handler(request())).json()).records).toHaveLength(1);
  expect((await (await handler(request({ lat: 30, lon: -84 }))).json()).records).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const broken = createHistoryHandler(vi.fn().mockResolvedValue(new Response('changed format')));
  expect((await broken(request())).status).toBe(503);
});
it('rejects non-Florida selections without querying the source', async () => {
  const fetcher = vi.fn(); expect((await createHistoryHandler(fetcher)(request({ lat: 40, lon: -80 }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
});
