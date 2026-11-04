// @vitest-environment node
import { vi } from 'vitest';
import { createAskHandler } from './ask-api';
const body = { lat: 26.5084, lon: -80.0546, selectionId: 7, question: 'What does FEMA map here?', startDate: '2026-10-25', endDate: '2026-10-29', datum: 'MLLW' };
const request = (data: unknown = body, options: RequestInit = {}) => new Request('http://localhost:4173/api/ask', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:4173' }, body: JSON.stringify(data), ...options });
function fakeService() {
  return { answer: vi.fn(async () => ({ selectionId: 7, point: { lat: body.lat, lon: body.lon }, window: { startDate: body.startDate, endDate: body.endDate, datum: 'MLLW' as const }, packId: 'synthetic-pack', createdAtUtc: '2026-11-04T12:00:00Z', question: body.question, mode: 'template' as const, intent: 'flood' as const, findings: [], limitations: [], sources: [], statuses: [], supported: false })) };
}
describe('Ask API request boundary', () => {
  it('passes only the bound point, selection, question and applied dates to the server-owned service', async () => {
    const service = fakeService(); const response = await createAskHandler(service)(request());
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
    expect(service.answer).toHaveBeenCalledWith({ lat: body.lat, lon: body.lon }, body.selectionId, body.question, { startDate: body.startDate, endDate: body.endDate, datum: 'MLLW' });
    expect(await response.json()).toMatchObject({ selectionId: 7, packId: 'synthetic-pack' });
  });
  it.each([null, [], { ...body, lat: '26.5' }, { ...body, lat: 40 }, { ...body, lat: -80, lon: 26.5 }, { ...body, selectionId: 0 }, { ...body, selectionId: 1.5 }, { ...body, question: '' }, { ...body, question: ' '.repeat(10) }, { ...body, question: 'x'.repeat(601) }, { ...body, question: 5 }, { ...body, datum: 'STND' }, { ...body, startDate: '2026-02-30' }, { ...body, endDate: '2026-09-01' }, { ...body, startDate: '2026-10-15', endDate: '2026-11-14' }])('rejects malformed or unsupported request %j without retrieval', async (input) => {
    const service = fakeService(); const response = await createAskHandler(service)(request(input));
    expect(response.status).toBe(400); expect(service.answer).not.toHaveBeenCalled();
  });
  it('requires same origin, POST, JSON and a bounded request body', async () => {
    const service = fakeService(); const handler = createAskHandler(service);
    expect((await handler(request(body, { headers: { origin: 'https://elsewhere.test', 'content-type': 'application/json' } }))).status).toBe(403);
    expect((await handler(request(body, { headers: { 'content-type': 'text/plain' } }))).status).toBe(415);
    expect((await handler(new Request('http://localhost:4173/api/ask'))).status).toBe(405);
    expect((await handler(request({}, { body: '{bad' }))).status).toBe(400);
    expect((await handler(request({}, { body: ' '.repeat(4097) }))).status).toBe(413);
    expect(service.answer).not.toHaveBeenCalled();
  });
  it('keeps errors controlled and releases the active request slot', async () => {
    const service = fakeService(); service.answer.mockRejectedValueOnce(new Error('sensitive upstream error'));
    const handler = createAskHandler(service); const bad = await handler(request());
    expect(bad.status).toBe(503); expect(await bad.text()).not.toContain('sensitive');
    expect((await handler(request())).status).toBe(200);
  });
  it('rejects an eleventh simultaneous request before any further upstream retrieval', async () => {
    const service = fakeService(); const value = await service.answer(); service.answer.mockClear();
    const release: (() => void)[] = [];
    service.answer.mockImplementation(() => new Promise((resolve) => { release.push(() => resolve(value)); }));
    const handler = createAskHandler(service);
    const requests = Array.from({ length: 10 }, () => handler(request()));
    await vi.waitFor(() => expect(service.answer).toHaveBeenCalledTimes(10));
    expect((await handler(request())).status).toBe(503); expect(service.answer).toHaveBeenCalledTimes(10);
    release.forEach((done) => done()); expect((await Promise.all(requests)).every((r) => r.status === 200)).toBe(true);
  });
});
