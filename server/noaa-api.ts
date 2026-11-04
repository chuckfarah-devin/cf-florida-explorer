import { checkPoint } from '../src/config/bounds.ts';
import { createNoaaService, tideWindow } from './noaa.ts';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

export function createNoaaHandler(service = createNoaaService()) {
  let active = 0;
  return async (request: Request): Promise<Response> => {
    if (new URL(request.url).pathname !== '/api/noaa') return json({ error: 'Not found' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Same-origin requests only' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Use application/json' }, 415);
    const text = await request.text(); if (text.length > 4096) return json({ error: 'Request too large' }, 413);
    let input: unknown; try { input = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'Invalid request' }, 400);
    const b = input as Record<string, unknown>;
    if (typeof b.lat !== 'number' || typeof b.lon !== 'number' || !checkPoint({ lat: b.lat, lon: b.lon }).ok || !Number.isSafeInteger(b.selectionId) || (b.selectionId as number) < 1 || typeof b.startDate !== 'string' || typeof b.endDate !== 'string' || (b.datum !== 'MLLW' && b.datum !== 'NAVD')) return json({ error: 'Valid Florida point, selection, dates and height reference required' }, 400);
    try { tideWindow(b.startDate, b.endDate); } catch { return json({ error: 'Choose valid dates covering 1–30 days' }, 400); }
    if (active >= 10) return json({ error: 'Busy; retry shortly' }, 503);
    active++;
    try { return json({ ...await service.lookup({ lat: b.lat, lon: b.lon }, b.startDate, b.endDate, b.datum), selectionId: b.selectionId }); }
    catch { return json({ error: 'NOAA unavailable' }, 503); }
    finally { active--; }
  };
}
export const handleNoaaRequest = createNoaaHandler();
