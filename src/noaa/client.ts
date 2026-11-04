import type { Selection } from '../state/selection';
import type { TideRequest, TideResponse } from './types';

export async function fetchTides(selection: Selection, window: TideRequest, signal: AbortSignal): Promise<TideResponse> {
  const response = await fetch('/api/noaa', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...selection.point, selectionId: selection.selectionId, ...window }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
  });
  if (!response.ok) throw new Error('NOAA lookup unavailable');
  const result: TideResponse = await response.json();
  if (result.selectionId !== selection.selectionId || result.point?.lat !== selection.point.lat || result.point?.lon !== selection.point.lon || result.window?.startDate !== window.startDate || result.window?.endDate !== window.endDate || result.datum !== window.datum || result.units !== 'ft' || result.window?.timeZone !== 'America/New_York' || !Array.isArray(result.stations)) {
    throw new Error('NOAA response does not match this point and period');
  }
  return result;
}
