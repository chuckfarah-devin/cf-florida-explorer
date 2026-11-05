import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App, { type MapApi } from './App';
import type { MapHandle } from './map/arcgis';
import type { NatureMapFeature } from './map/natureFeature';

const feature = vi.hoisted(() => ({ id: 'source-polygon', name: 'Synthetic protected place', geometry: { rings: [[[-80.06, 26.5], [-80.05, 26.5], [-80.05, 26.51], [-80.06, 26.5]]], spatialReference: { wkid: 4326 as const } } }));
vi.mock('./components/NatureCard', () => ({ NatureCard: ({ onShowFeature, onClearFeature }: { onShowFeature?: (f: NatureMapFeature) => void; onClearFeature?: () => void }) => <><button onClick={() => onShowFeature?.(feature)}>Show synthetic place on map</button><button onClick={onClearFeature}>Retry synthetic lookup</button></> }));

const mapHandle = (): MapHandle => ({ setMarker: vi.fn(), setTideStations: vi.fn(), showNatureFeature: vi.fn(), clearNatureFeature: vi.fn(), goTo: vi.fn(), center: () => ({ lat: 26.5089, lon: -80.0522 }), zoom: vi.fn(), setLayerVisible: vi.fn(), retryLayer: vi.fn(), destroy: vi.fn() });

it('shows the source polygon without changing the selected point and clears only on valid selection/domain/retry', async () => {
  const user = userEvent.setup(); const handle = mapHandle();
  const api: MapApi = { createMap: async () => handle, findPlaces: async () => [] };
  const mapApi = async () => api;
  render(<App mapApi={mapApi} />);
  await user.type(screen.getByRole('searchbox'), '26.5089, -80.0522{Enter}');
  await user.click(screen.getByRole('button', { name: 'Nature & Wildlife' }));
  const beforeMarker = vi.mocked(handle.setMarker).mock.calls.length;
  await user.click(screen.getByRole('button', { name: 'Show synthetic place on map' }));
  expect(handle.showNatureFeature).toHaveBeenLastCalledWith(feature);
  expect(handle.setMarker).toHaveBeenCalledTimes(beforeMarker);
  await user.click(screen.getByRole('button', { name: 'Show exact location' }));
  expect(screen.getByText('26.50890, −80.05220')).toBeVisible();
  const clearCount = vi.mocked(handle.clearNatureFeature!).mock.calls.length;
  const search = screen.getByRole('searchbox');
  await user.clear(search); await user.type(search, '25, -78{Enter}');
  expect(handle.clearNatureFeature).toHaveBeenCalledTimes(clearCount);
  await user.click(screen.getByRole('button', { name: 'Retry synthetic lookup' }));
  expect(handle.clearNatureFeature).toHaveBeenCalledTimes(clearCount + 1);
  await user.click(screen.getByRole('button', { name: 'Water & Weather' }));
  expect(handle.clearNatureFeature).toHaveBeenCalledTimes(clearCount + 2);
});

it('restores a queued polygon only after restoring the selected point on delayed map initialization', async () => {
  const user = userEvent.setup(); const handle = mapHandle(); let finish!: (h: MapHandle) => void;
  const api: MapApi = { createMap: () => new Promise((resolve) => { finish = resolve; }), findPlaces: async () => [] };
  const mapApi = async () => api;
  render(<App mapApi={mapApi} />);
  await user.type(screen.getByRole('searchbox'), '26.5089, -80.0522{Enter}');
  await user.click(screen.getByRole('button', { name: 'Nature & Wildlife' }));
  await user.click(screen.getByRole('button', { name: 'Show synthetic place on map' }));
  expect(handle.showNatureFeature).not.toHaveBeenCalled();
  await act(async () => finish(handle));
  expect(handle.setMarker).toHaveBeenLastCalledWith({ lat: 26.5089, lon: -80.0522 });
  expect(handle.showNatureFeature).toHaveBeenLastCalledWith(feature);
  expect(vi.mocked(handle.setMarker).mock.invocationCallOrder.at(-1)!).toBeLessThan(vi.mocked(handle.showNatureFeature!).mock.invocationCallOrder[0]);
});
