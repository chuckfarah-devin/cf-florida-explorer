import type { Selection } from '../state/selection';
import type { TideRequest } from '../noaa/types';
import type { AskResponse } from './types';

const safeUrl = (value: string, domain: 'water' | 'nature') => {
  const hosts = domain === 'nature' ? ['ca.dep.state.fl.us', 'ags.dep.state.fl.us'] : ['hazards.fema.gov', 'api.tidesandcurrents.noaa.gov', 'msc.fema.gov', 'tidesandcurrents.noaa.gov'];
  try { const url = new URL(value); return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password; } catch { return false; }
};

export async function fetchAnswer(selection: Selection, window: TideRequest, question: string, signal: AbortSignal, domain: 'water' | 'nature' = 'water'): Promise<AskResponse> {
  const response = await fetch('/api/ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...selection.point, selectionId: selection.selectionId, ...window, question, domain }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(40_000)]),
  });
  if (!response.ok) throw new Error('Answer unavailable');
  const result: AskResponse = await response.json();
  if (!result || (result.domain ?? 'water') !== domain || result.selectionId !== selection.selectionId || result.point?.lat !== selection.point.lat || result.point?.lon !== selection.point.lon || result.question !== question || result.window?.startDate !== window.startDate || result.window?.endDate !== window.endDate || result.window?.datum !== window.datum || result.mode !== 'template' || !(domain === 'nature' ? ['nature', 'unsupported'] : ['flood', 'tides', 'event', 'unsupported']).includes(result.intent) || typeof result.packId !== 'string' || !result.packId || !Number.isFinite(Date.parse(result.createdAtUtc)) || typeof result.supported !== 'boolean' || !Array.isArray(result.findings) || !Array.isArray(result.sources) || !Array.isArray(result.limitations) || !Array.isArray(result.statuses)) throw new Error('Answer does not match this place and period');
  const classes = domain === 'nature' ? ['mapped_feature'] : ['regulatory_classification', 'measured_observation', 'predicted_tide'];
  if (result.limitations.some((s) => typeof s !== 'string') || result.statuses.some((s) => !s || typeof s.source !== 'string' || typeof s.state !== 'string') || result.sources.some((s) => !s || typeof s.ref !== 'string' || typeof s.label !== 'string' || !classes.includes(s.kind) || typeof s.url !== 'string' || !safeUrl(s.url, domain) || !Number.isFinite(Date.parse(s.retrievedAtUtc)))) throw new Error('Invalid answer sources');
  const refs = new Set(result.sources.map((s) => s.ref));
  if (refs.size !== result.sources.length || result.findings.some((f) => !f || typeof f.id !== 'string' || typeof f.text !== 'string' || !classes.includes(f.evidenceClass) || !Array.isArray(f.citations) || !f.citations.length || f.citations.some((c) => !refs.has(c) || result.sources.find((s) => s.ref === c)?.kind !== f.evidenceClass))) throw new Error('Invalid answer citations');
  return result;
}
