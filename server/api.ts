import { checkPoint } from '../src/config/bounds.ts';
import { createFemaService } from './fema.ts';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

/** Portable Fetch-style API; no host, account or paid service selected. */
export function createFemaHandler(service = createFemaService()) {
  let active = 0;
  return async (request: Request): Promise<Response> => {
    if (new URL(request.url).pathname !== '/api/fema') return json({ error: 'Not found' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Same-origin requests only' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Use application/json' }, 415);
    const text = await request.text();
    if (text.length > 4096) return json({ error: 'Request too large' }, 413);
    let body: { lat?: unknown; lon?: unknown; selectionId?: unknown };
    try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!body || typeof body !== 'object' || typeof body.lat !== 'number' || typeof body.lon !== 'number' || !Number.isSafeInteger(body.selectionId) || (body.selectionId as number) < 1 || !checkPoint({ lat: body.lat, lon: body.lon }).ok) return json({ error: 'A valid Florida point and selectionId are required' }, 400);
    if (active >= 10) return json({ error: 'Busy; please retry' }, 503);
    active++;
    try { return json({ ...(await service.lookup({ lat: body.lat, lon: body.lon })), selectionId: body.selectionId }); }
    catch { return json({ error: 'FEMA lookup unavailable' }, 503); }
    finally { active--; }
  };
}

export const handleFemaRequest = createFemaHandler();
