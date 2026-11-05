import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { NatureCard } from './NatureCard';
import type { NatureResponse } from '../nature/types';

const selection = { selectionId: 1, point: { lat: 26.5089, lon: -80.0522 }, source: 'typed' as const };
const fixture = (): NatureResponse => ({ point: selection.point, selectionId: 1, radiusMeters: 5000, retrievedAtUtc: '2026-11-04T12:00:00Z',
  sources: (['wetlands', 'conservation', 'preserves', 'nearby'] as const).map((id) => ({ id, state: 'ok', queryUrl: 'https://ca.dep.state.fl.us/arcgis/rest/services/example/MapServer/0/query', retrievedAtUtc: '2026-11-04T12:00:00Z', features: [] })),
  nearby: [{ id: '38:1', name: 'Synthetic Natural Area', agency: 'County agency', distanceMeters: 1220, bearing: 'N', geometry: { rings: [[[-80.05, 26.52], [-80.04, 26.52], [-80.04, 26.53], [-80.05, 26.52]]], spatialReference: { wkid: 4326 } } }],
});

it('keeps no point match separate from nearby places and shows distance, source and access limits', async () => {
  const data = fixture(); const onShowFeature = vi.fn();
  render(<NatureCard selection={selection} lookup={vi.fn(async () => data)} onShowFeature={onShowFeature} />);
  expect(await screen.findByText('Synthetic Natural Area')).toBeVisible();
  expect(screen.getByText(/No conservation-land polygon was returned/)).toBeVisible();
  expect(screen.getByText('1.22 km N to mapped boundary')).toBeVisible();
  expect(screen.getByText(/Protected does not always mean open/)).toBeVisible();
  expect(screen.getByText(/not necessarily a wetland/)).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Show Synthetic Natural Area on map' }));
  expect(onShowFeature).toHaveBeenCalledWith(data.nearby[0]);
  await userEvent.click(screen.getByText('Nature maps · Sources and details'));
  expect(screen.getByText(/transformation method is unverified/)).toBeVisible();
  expect(screen.getAllByRole('link')).toHaveLength(4);
});

it('shows positive exact membership and does not mislabel mapped deepwater as a wetland', async () => {
  const data = fixture();
  data.sources[0].features = [{ id: '6:1', name: 'Estuarine and Marine Deepwater', wetlandType: 'Estuarine and Marine Deepwater', code: 'M1ABL' }];
  data.sources[1].features = [{ id: '38:2', name: 'Synthetic Refuge' }];
  data.sources[2].features = [{ id: '0:3', name: 'Synthetic Aquatic Preserve' }];
  render(<NatureCard selection={selection} lookup={vi.fn(async () => data)} />);
  expect(await screen.findByText('Estuarine and Marine Deepwater')).toBeVisible();
  expect(screen.getByText(/inventory code M1ABL/)).toBeVisible();
  expect(screen.getByText('Synthetic Refuge')).toBeVisible();
  expect(screen.getByText('Synthetic Aquatic Preserve')).toBeVisible();
  expect(screen.queryByText(/No aquatic-preserve polygon/)).toBeNull();
});

it('distinguishes each failed source from an empty successful lookup', async () => {
  const data = fixture(); data.sources[0].state = 'unavailable'; data.sources[2].state = 'unavailable'; data.sources[3].state = 'unavailable'; data.nearby = [];
  render(<NatureCard selection={selection} lookup={vi.fn(async () => data)} />);
  expect(await screen.findByText(/Wetland lookup unavailable/)).toBeVisible();
  expect(screen.getByText(/Aquatic-preserve lookup unavailable/)).toBeVisible();
  expect(screen.getByText(/nearby-place search is unavailable/)).toBeVisible();
  expect(screen.getByText(/No conservation-land polygon was returned/)).toBeVisible();
  expect(screen.queryByText(/No aquatic-preserve polygon was returned/)).toBeNull();
});

it('drops delayed responses after a new selected point and supports retry after failure', async () => {
  let resolveOld!: (value: NatureResponse) => void;
  const next = { ...selection, selectionId: 2, point: { lat: 26.5, lon: -80.25 } };
  const fresh = { ...fixture(), point: next.point, selectionId: 2, nearby: [] };
  const lookup = vi.fn().mockImplementationOnce(() => new Promise<NatureResponse>((resolve) => { resolveOld = resolve; })).mockRejectedValueOnce(new Error('failure')).mockResolvedValueOnce(fresh);
  const clear = vi.fn();
  const { rerender } = render(<NatureCard selection={selection} lookup={lookup} onClearFeature={clear} />);
  rerender(<NatureCard selection={next} lookup={lookup} onClearFeature={clear} />);
  expect(await screen.findByText(/Nature maps are unavailable right now/)).toBeVisible();
  await act(async () => resolveOld(fixture()));
  expect(screen.queryByText('Synthetic Natural Area')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Retry nature lookup' }));
  expect(clear).toHaveBeenCalledOnce();
  expect(await screen.findByText(/No conservation-area boundaries were returned/)).toBeVisible();
  expect(lookup).toHaveBeenCalledTimes(3);
});
