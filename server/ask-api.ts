import { checkPoint } from '../src/config/bounds.ts';
import { tideWindow } from './noaa.ts';
import { createAskService } from './ask.ts';
import type { LatLon } from '../src/config/bounds.ts';
import type { TideRequest } from '../src/noaa/types.ts';
import type { AskResponse } from '../src/ask/types.ts';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function createAskHandler(service: { answer: (point: LatLon, selectionId: number, question: string, window: TideRequest, domain?: 'water' | 'nature') => Promise<AskResponse> } = createAskService()) {
  let active = 0;
  return async (request: Request): Promise<Response> => {
    if (new URL(request.url).pathname !== '/api/ask') return json({ error: 'Not found' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Same-origin requests only' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Use application/json' }, 415);
    const text = await request.text(); if (text.length > 4096) return json({ error: 'Request too large' }, 413);
    let value: unknown; try { value = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return json({ error: 'Invalid request' }, 400);
    const b = value as Record<string, unknown>;
    if (b.domain !== undefined && b.domain !== 'water' && b.domain !== 'nature') return json({ error: 'Unsupported answer domain' }, 400);
    if (typeof b.lat !== 'number' || typeof b.lon !== 'number' || !checkPoint({ lat: b.lat, lon: b.lon }).ok || !Number.isSafeInteger(b.selectionId) || (b.selectionId as number) < 1 || typeof b.question !== 'string' || !b.question.trim() || b.question.length > 600 || typeof b.startDate !== 'string' || typeof b.endDate !== 'string' || (b.datum !== 'MLLW' && b.datum !== 'NAVD')) return json({ error: 'Valid point, question (up to600 characters), selection and applied dates/reference required' }, 400);
    try { tideWindow(b.startDate, b.endDate); } catch { return json({ error: 'Choose valid dates covering 1–30 days' }, 400); }
    if (active >= 10) return json({ error: 'Busy; retry shortly' }, 503);
    active++;
    try {
      const point = { lat: b.lat, lon: b.lon }; const window: TideRequest = { startDate: b.startDate, endDate: b.endDate, datum: b.datum };
      return json(b.domain === 'nature' ? await service.answer(point, b.selectionId as number, b.question.trim(), window, 'nature') : await service.answer(point, b.selectionId as number, b.question.trim(), window));
    }
    catch { return json({ error: 'Evidence could not be checked. Retry shortly.' }, 503); }
    finally { active--; }
  };
}
export const handleAskRequest = createAskHandler();
