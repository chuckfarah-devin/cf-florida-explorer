import { checkPoint } from '../src/config/bounds.ts';
import { createNatureService } from './nature.ts';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function createNatureHandler(service = createNatureService()) {
  let active = 0;
  return async (request: Request): Promise<Response> => {
    if (new URL(request.url).pathname !== '/api/nature') return json({ error: 'Not found' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
    const origin = request.headers.get('origin'); if (origin && origin !== new URL(request.url).origin) return json({ error: 'Same-origin requests only' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Use application/json' }, 415);
    const text = await request.text(); if (text.length > 4096) return json({ error: 'Request too large' }, 413);
    let value: unknown; try { value = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return json({ error: 'Invalid request' }, 400);
    const b = value as Record<string, unknown>;
    if (typeof b.lat !== 'number' || typeof b.lon !== 'number' || !checkPoint({ lat: b.lat, lon: b.lon }).ok || !Number.isSafeInteger(b.selectionId) || (b.selectionId as number) < 1) return json({ error: 'Valid Florida point and selection required' }, 400);
    if (active >= 10) return json({ error: 'Busy; retry shortly' }, 503);
    active++;
    try { return json({ ...await service.lookup({ lat: b.lat, lon: b.lon }), selectionId: b.selectionId }); }
    catch { return json({ error: 'Nature evidence unavailable' }, 503); }
    finally { active--; }
  };
}
export const handleNatureRequest = createNatureHandler();
