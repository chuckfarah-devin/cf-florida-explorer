// @vitest-environment node
import { vi } from 'vitest';
import { createNatureHandler } from './nature-api';
import type { NatureResponse } from '../src/nature/types';

const input = { lat: 26.5089022, lon: -80.0522463, selectionId: 5 };
const request = (data: unknown = input, extra: RequestInit = {}) => new Request('http://localhost:4173/api/nature', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:4173' }, body: JSON.stringify(data), ...extra });
function fakeService() {
  const result: Omit<NatureResponse, 'selectionId'> = { point: { lat: input.lat, lon: input.lon }, radiusMeters: 5000, retrievedAtUtc: '2026-11-04T12:00:00Z', nearby: [], sources: ['wetlands', 'conservation', 'preserves', 'nearby'].map((id) => ({ id: id as NatureResponse['sources'][number]['id'], state: 'ok', queryUrl: 'https://ca.dep.state.fl.us/arcgis/rest/services/example', retrievedAtUtc: '2026-11-04T12:00:00Z', features: [] })) };
  return { lookup: vi.fn(async () => result) };
}

describe('nature API boundary', () => {
  it('echoes the exact selected point and selection ID and forbids browser caching', async () => {
    const service = fakeService(); const res = await createNatureHandler(service)(request());
    expect(res.status).toBe(200); expect(res.headers.get('cache-control')).toBe('no-store'); expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await res.json()).toMatchObject({ point: { lat: input.lat, lon: input.lon }, selectionId: input.selectionId, radiusMeters: 5000 });
    expect(service.lookup).toHaveBeenCalledWith({ lat: input.lat, lon: input.lon });
  });
  it.each([null, [], {}, { ...input, lat: '26.5' }, { ...input, lat: null }, { ...input, lat: 40 }, { ...input, lat: -80, lon: 26.5 }, { ...input, selectionId: 0 }, { ...input, selectionId: 1.5 }, { ...input, selectionId: Number.MAX_SAFE_INTEGER + 1 }])('rejects invalid scope before source calls: %j', async (value) => {
    const service = fakeService(); expect((await createNatureHandler(service)(request(value))).status).toBe(400); expect(service.lookup).not.toHaveBeenCalled();
  });
  it('requires same-origin POST JSON with a bounded valid body', async () => {
    const service = fakeService(); const handler = createNatureHandler(service);
    expect((await handler(new Request('http://localhost:4173/api/nature'))).status).toBe(405);
    expect((await handler(new Request('http://localhost:4173/api/other', { method: 'POST' }))).status).toBe(404);
    expect((await handler(request(input, { headers: { origin: 'https://other.test', 'content-type': 'application/json' } }))).status).toBe(403);
    expect((await handler(request(input, { headers: { 'content-type': 'text/plain' } }))).status).toBe(415);
    expect((await handler(request({}, { body: '{invalid' }))).status).toBe(400);
    expect((await handler(request({}, { body: ' '.repeat(4097) }))).status).toBe(413);
    expect(service.lookup).not.toHaveBeenCalled();
  });
  it('does not accept an arbitrary radius or client-selected upstream service', async () => {
    const service = fakeService(); const res = await createNatureHandler(service)(request({ ...input, radiusMeters: 1000000, url: 'https://untrusted.test' }));
    expect(res.status).toBe(200); expect((await res.json()).radiusMeters).toBe(5000);
    expect(service.lookup).toHaveBeenCalledExactlyOnceWith({ lat: input.lat, lon: input.lon });
  });
  it('preserves per-source failures and releases a slot after an exception', async () => {
    const service = fakeService(); service.lookup.mockRejectedValueOnce(new Error('down'));
    const handler = createNatureHandler(service); expect((await handler(request())).status).toBe(503);
    const result = await service.lookup(); result.sources[2].state = 'unavailable';
    const res = await handler(request()); expect(res.status).toBe(200); expect((await res.json()).sources[2].state).toBe('unavailable');
  });
  it('rejects an eleventh active lookup without starting another upstream request', async () => {
    const service = fakeService(); const result = await service.lookup(); service.lookup.mockClear();
    const releases: (() => void)[] = []; service.lookup.mockImplementation(() => new Promise((resolve) => releases.push(() => resolve(result))));
    const handler = createNatureHandler(service); const active = Array.from({ length: 10 }, () => handler(request()));
    await vi.waitFor(() => expect(service.lookup).toHaveBeenCalledTimes(10));
    expect((await handler(request())).status).toBe(503); expect(service.lookup).toHaveBeenCalledTimes(10);
    releases.forEach((r) => r()); expect((await Promise.all(active)).every((r) => r.status === 200)).toBe(true);
  });
});
