import { vi } from 'vitest';
import { fetchNature } from './client';
const selection = { selectionId: 1, point: { lat: 26.5, lon: -80.05 }, source: 'typed' as const };
const source = { state: 'ok', queryUrl: 'https://ca.dep.state.fl.us/arcgis/rest/services/example/MapServer/0/query', retrievedAtUtc: '2026-11-04T12:00:00Z', features: [] };
const fixture = () => ({ selectionId: 1, point: selection.point, radiusMeters: 5000, retrievedAtUtc: source.retrievedAtUtc, sources: ['wetlands', 'conservation', 'preserves', 'nearby'].map((id) => ({ ...source, id })), nearby: [] });
afterEach(() => vi.unstubAllGlobals());
it.each([{ selectionId: 2 }, { point: { lat: 26.6, lon: -80.05 } }, { radiusMeters: 10000 }, { sources: [] }])('rejects wrong-point or incomplete source responses %j', async (changed) => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ...fixture(), ...changed })));
  await expect(fetchNature(selection, new AbortController().signal)).rejects.toThrow();
});
it('rejects source links outside the fixed Florida DEP hosts', async () => {
  const data = fixture(); data.sources[0].queryUrl = 'https://unrelated.example/query';
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(data)));
  await expect(fetchNature(selection, new AbortController().signal)).rejects.toThrow('Invalid nature source');
});
it('accepts a complete bound response without changing its source fields', async () => {
  const data = fixture(); vi.stubGlobal('fetch', vi.fn(async () => Response.json(data)));
  expect(await fetchNature(selection, new AbortController().signal)).toEqual(data);
});
it('rejects duplicate source sections rather than treating them as a complete lookup', async () => {
  const data = fixture(); data.sources.push(data.sources[0]);
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(data)));
  await expect(fetchNature(selection, new AbortController().signal)).rejects.toThrow('Invalid nature source');
});
