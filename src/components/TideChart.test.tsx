import { render, screen } from '@testing-library/react';
import { TideChart } from './TideChart';
import type { TideResponse, TideStation } from '../noaa/types';

it('breaks measured lines across gaps and plots only predicted highs without inventing a curve', () => {
  const product = { state: 'ok' as const, queryUrl: 'https://example.test', retrievedAtUtc: '2026-11-04T00:00:00Z' };
  const station: TideStation = { id: 'test', name: 'Synthetic station', lat: 26.5, lon: -80, waterBody: 'Ocean', distanceKm: 1, bearing: 'N', rationale: 'Synthetic', metadataUrl: 'https://example.test', products: [
    { ...product, product: 'water_level', rows: ['04:00', '04:06', '04:18', '04:24'].map((t, i) => ({ timeUtc: `2026-10-25T${t}:00Z`, value: i, quality: 'preliminary' as const, flags: '0,0,0,0' })) },
    { ...product, product: 'predictions', rows: [{ timeUtc: '2026-10-25T05:00:00Z', value: 2, kind: 'H' }, { timeUtc: '2026-10-25T11:00:00Z', value: 0, kind: 'L' }] },
  ] };
  const result = { datum: 'NAVD', window: { startUtc: '2026-10-25T04:00:00Z', endUtc: '2026-10-26T04:00:00Z' } } as TideResponse;
  const { container } = render(<TideChart station={station} result={result} />);
  expect(screen.getByRole('img', { name: /Synthetic station: tide chart in feet NAVD88/ })).toBeVisible();
  expect(container.querySelectorAll('polyline')).toHaveLength(2);
  expect(container.querySelectorAll('.tide-predicted')).toHaveLength(1);
  expect(screen.getByText(/Preliminary measurements/)).toBeVisible();
});
