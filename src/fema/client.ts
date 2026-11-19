import type { Selection } from '../state/selection';
import type { FemaResponse } from './types';

export async function fetchFema(selection: Selection, signal: AbortSignal): Promise<FemaResponse> {
  const response = await fetch('/api/fema', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selection.point, selectionId: selection.selectionId }), signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]) });
  if (!response.ok) throw new Error('FEMA lookup unavailable');
  const result: FemaResponse = await response.json();
  if (result.selectionId !== selection.selectionId || result.point?.lat !== selection.point.lat || result.point?.lon !== selection.point.lon || !Array.isArray(result.sources)) throw new Error('FEMA response does not match this point');
  return result;
}
