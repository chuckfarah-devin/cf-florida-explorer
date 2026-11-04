import { vi } from 'vitest';
import { fetchTides } from './client';
const selection = { selectionId: 1, point: { lat: 26.5, lon: -80.05 }, source: 'typed' as const };
const window = { startDate: '2026-10-25', endDate: '2026-10-29', datum: 'MLLW' as const };
afterEach(() => vi.unstubAllGlobals());
it.each([
  { selectionId: 2 }, { datum: 'NAVD' }, { point: { lat: 26.6, lon: -80.05 } },
  { window: { startDate: '2026-10-26', endDate: '2026-10-29', timeZone: 'America/New_York' } },
])('rejects NOAA results bound to another selection, window or datum: %j', async (changed) => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ selectionId: 1, point: selection.point, units: 'ft', datum: 'MLLW', window: { ...window, timeZone: 'America/New_York' }, stations: [], ...changed })));
  await expect(fetchTides(selection, window, new AbortController().signal)).rejects.toThrow('does not match');
});
