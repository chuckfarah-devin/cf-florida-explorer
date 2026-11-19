import { vi } from 'vitest';
import { fetchFema } from './client';

it('rejects responses bound to a different point or selection', async () => {
  const selection = { selectionId: 2, point: { lat: 26.5, lon: -80.05 }, source: 'typed' as const };
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ selectionId: 1, point: selection.point, sources: [] })));
  try { await expect(fetchFema(selection, new AbortController().signal)).rejects.toThrow('does not match'); }
  finally { vi.unstubAllGlobals(); }
});
