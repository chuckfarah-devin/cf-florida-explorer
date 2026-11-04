import { vi } from 'vitest';
import { fetchAnswer } from './client';
import type { AskResponse } from './types';
const selection = { selectionId: 1, point: { lat: 26.5, lon: -80.05 }, source: 'typed' as const };
const window = { startDate: '2026-10-25', endDate: '2026-10-29', datum: 'MLLW' as const };
const data = (): AskResponse => ({ selectionId: 1, point: selection.point, window, packId: 'fixture', createdAtUtc: '2026-11-04T12:00:00Z', question: 'Flooding?', mode: 'template', intent: 'flood', supported: true, limitations: [], statuses: [], sources: [{ ref: 'E1', label: 'FEMA flood map', url: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query', retrievedAtUtc: '2026-11-04T12:00:00Z', kind: 'regulatory_classification' }], findings: [{ id: 'zone', text: 'Zone AE', citations: ['E1'], evidenceClass: 'regulatory_classification' }] });
afterEach(() => vi.unstubAllGlobals());
it.each(['point', 'period', 'question', 'citation', 'url'])('rejects mismatched or unsafe %s in an answer', async (kind) => {
  const response = data();
  if (kind === 'point') response.point = { ...selection.point, lat: 26.6 };
  if (kind === 'period') response.window = { ...window, datum: 'NAVD' };
  if (kind === 'question') response.question = 'Different question';
  if (kind === 'citation') response.findings[0].citations = ['E9'];
  if (kind === 'url') response.sources[0].url = 'javascript:alert(1)';
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(response)));
  await expect(fetchAnswer(selection, window, 'Flooding?', new AbortController().signal)).rejects.toThrow();
});
it('accepts a matching answer and binds the request to the applied point and window', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(data())); vi.stubGlobal('fetch', fetcher);
  expect((await fetchAnswer(selection, window, 'Flooding?', new AbortController().signal)).packId).toBe('fixture');
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ ...selection.point, selectionId: 1, ...window, question: 'Flooding?' });
});
