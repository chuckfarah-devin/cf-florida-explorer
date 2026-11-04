// @vitest-environment node
import { vi } from 'vitest';
import { createNoaaHandler } from './noaa-api';
import { tideWindow } from './noaa';
const body = { lat: 26.50844824511624, lon: -80.05460169017356, selectionId: 7, startDate: '2026-10-25', endDate: '2026-10-29', datum: 'MLLW' };
const request = (data: unknown = body, options: RequestInit = {}) => new Request('http://localhost:4173/api/noaa', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:4173' }, body: JSON.stringify(data), ...options });
function fakeService() {
  return { lookup: vi.fn(async () => ({ point: { lat: body.lat, lon: body.lon }, window: tideWindow(body.startDate, body.endDate), datum: 'MLLW' as const, units: 'ft' as const, retrievedAtUtc: '2026-11-04T12:00:00Z', stations: [], state: 'unavailable' as const })) };
}
describe('NOAA API boundaries', () => {
  it('echoes exact selection binding and forbids browser caching', async () => {
    const service = fakeService(); const res = await createNoaaHandler(service)(request());
    expect(res.status).toBe(200); expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toMatchObject({ point: { lat: body.lat, lon: body.lon }, selectionId: 7 });
    expect(service.lookup).toHaveBeenCalledWith({ lat: body.lat, lon: body.lon }, body.startDate, body.endDate, 'MLLW');
  });
  it.each([
    null, [], { ...body, lat: '26.5' }, { ...body, lat: 40 }, { ...body, lat: -80, lon: 26.5 }, { ...body, selectionId: 0 }, { ...body, selectionId: 1.5 }, { ...body, datum: 'STND' }, { ...body, startDate: '2026-02-30' }, { ...body, endDate: '2026-09-01' }, { ...body, startDate: '2026-10-15', endDate: '2026-11-14' },
  ])('rejects invalid input before contacting NOAA: %j', async (input) => {
    const service = fakeService(); const res = await createNoaaHandler(service)(request(input));
    expect(res.status).toBe(400); expect(service.lookup).not.toHaveBeenCalled();
  });
  it('requires same origin, JSON, POST and bounded body size', async () => {
    const service = fakeService(); const handler = createNoaaHandler(service);
    expect((await handler(request(body, { headers: { origin: 'https://elsewhere.test', 'content-type': 'application/json' } }))).status).toBe(403);
    expect((await handler(request(body, { headers: { 'content-type': 'text/plain' } }))).status).toBe(415);
    expect((await handler(new Request('http://localhost:4173/api/noaa'))).status).toBe(405);
    expect((await handler(request({}, { body: '{broken' }))).status).toBe(400);
    expect((await handler(request({}, { body: ' '.repeat(4097) }))).status).toBe(413);
    expect(service.lookup).not.toHaveBeenCalled();
  });
  it('returns controlled failure and releases the concurrency slot', async () => {
    const service = fakeService(); service.lookup.mockRejectedValueOnce(new Error('upstream problem'));
    const handler = createNoaaHandler(service);
    expect((await handler(request())).status).toBe(503); expect((await handler(request())).status).toBe(200);
  });
  it('limits simultaneous requests without starting an eleventh source lookup', async () => {
    const service = fakeService(); const value = await service.lookup(); service.lookup.mockClear();
    const release: (() => void)[] = [];
    service.lookup.mockImplementation(() => new Promise((resolve) => { release.push(() => resolve(value)); }));
    const handler = createNoaaHandler(service);
    const started = Array.from({ length: 10 }, () => handler(request()));
    await vi.waitFor(() => expect(service.lookup).toHaveBeenCalledTimes(10));
    expect((await handler(request())).status).toBe(503); expect(service.lookup).toHaveBeenCalledTimes(10);
    release.forEach((done) => done());
    expect((await Promise.all(started)).every((res) => res.status === 200)).toBe(true);
  });
});
