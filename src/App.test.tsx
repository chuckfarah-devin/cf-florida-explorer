import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { type MapApi } from './App';
import type { MapHandle } from './map/arcgis';

function fakeApi() {
  const calls: { visible: [string, boolean][]; markers: unknown[]; tideStations: unknown[][] } = { visible: [], markers: [], tideStations: [] };
  let click: ((p: { lat: number; lon: number }) => void) | undefined;
  const handle: MapHandle = {
    setMarker: (p) => calls.markers.push(p), goTo: () => {}, center: () => ({ lat: 26.5089, lon: -80.0522 }), zoom: () => {},
    setTideStations: (stations) => calls.tideStations.push(stations),
    setLayerVisible: (id, v) => calls.visible.push([id, v]), retryLayer: () => {}, destroy: () => {},
  };
  const api: MapApi = {
    createMap: async (_c, _l, h) => { click = h.onClick; return handle; },
    findPlaces: async () => [{ name: 'Briny Breezes, Florida', point: { lat: 26.5089, lon: -80.0522 } }],
  };
  return { api: () => Promise.resolve(api), calls, click: (p: { lat: number; lon: number }) => click?.(p) };
}

describe('App (I1)', () => {
  it('applies the latest selected point when map initialization finishes after coordinate selection', async () => {
    const user = userEvent.setup();
    let finish!: (handle: MapHandle) => void;
    const handle: MapHandle = {
      setMarker: vi.fn(), setTideStations: vi.fn(), goTo: vi.fn(), center: () => ({ lat: 27, lon: -81 }),
      zoom: vi.fn(), setLayerVisible: vi.fn(), retryLayer: vi.fn(), destroy: vi.fn(),
    };
    const delayedApi: MapApi = { createMap: () => new Promise((resolve) => { finish = resolve; }), findPlaces: async () => [] };
    const mapApi = () => Promise.resolve(delayedApi);
    render(<App mapApi={mapApi} />);
    const box = screen.getByRole('searchbox');
    await user.type(box, '26.5089, -80.0522{Enter}');
    await user.clear(box);
    await user.type(box, '26.5084, -80.0546{Enter}');
    expect(handle.setMarker).not.toHaveBeenCalled();
    await act(async () => { finish(handle); });
    await waitFor(() => expect(handle.setMarker).toHaveBeenLastCalledWith({ lat: 26.5084, lon: -80.0546 }));
    expect(handle.goTo).toHaveBeenCalledWith({ lat: 26.5084, lon: -80.0546 });
    expect(handle.goTo).not.toHaveBeenCalledWith({ lat: 26.5089, lon: -80.0522 });
  });
  it('clears station graphics on accepted selections and domain changes', async () => {
    const user = userEvent.setup();
    const f = fakeApi();
    render(<App mapApi={f.api} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const initial = f.calls.tideStations.length;
    await user.type(screen.getByRole('searchbox'), '26.5089, -80.0522{Enter}');
    expect(f.calls.tideStations.length).toBeGreaterThan(initial);
    const beforeDomain = f.calls.tideStations.length;
    await user.click(screen.getByRole('button', { name: 'Nature & Wildlife' }));
    expect(f.calls.tideStations.length).toBeGreaterThan(beforeDomain);
    expect(f.calls.tideStations.at(-1)).toEqual([]);
  });
  it('has descriptively labelled map controls (N32)', async () => {
    render(<App mapApi={fakeApi().api} />);
    for (const name of ['Map layers', '+ Zoom in', '− Zoom out', '⊕ Select map center']) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }
  });

  it('shows Ask This Place as a labelled, disabled preview with no answers (N31 component level)', () => {
    render(<App mapApi={fakeApi().api} />);
    const ask = screen.getByRole('region', { name: /ask this place/i });
    expect(within(ask).getByText('Preview')).toBeInTheDocument();
    expect(within(ask).getByRole('textbox', { name: 'Question' })).toBeDisabled();
    expect(within(ask).getByText(/Nothing is answered yet/)).toBeInTheDocument();
  });

  it('selects a typed coordinate and rejects an out-of-bounds one without moving (N22)', async () => {
    const user = userEvent.setup();
    render(<App mapApi={fakeApi().api} />);
    const box = screen.getByRole('searchbox', { name: /search a florida place/i });
    await user.type(box, '26.50890, -80.05225{Enter}');
    expect(await screen.findByRole('heading', { name: 'Selected spot' })).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, '25.0, -78.0{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('outside Florida');
    await user.click(screen.getByRole('button', { name: 'Show exact location' }));
    expect(screen.getByText('26.50890, −80.05225')).toBeInTheDocument();
  });

  it('uses the place name from search and never shows unsourced descriptions (U8)', async () => {
    const user = userEvent.setup();
    render(<App mapApi={fakeApi().api} />);
    await user.type(screen.getByRole('searchbox', { name: /search a florida place/i }), 'Briny Breezes{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Briny Breezes, Florida' }));
    expect(await screen.findByRole('heading', { name: 'Briny Breezes' })).toBeInTheDocument();
    expect(screen.queryByText(/barrier island/i)).toBeNull();
    expect(screen.queryByText(/1% annual chance/i)).toBeNull();
  });

  it('rejects an out-of-bounds map click with the same message', async () => {
    const f = fakeApi();
    render(<App mapApi={f.api} />);
    await screen.findByRole('button', { name: 'Map layers' });
    await new Promise((r) => setTimeout(r, 0));
    f.click({ lat: 25, lon: -78 });
    expect(await screen.findByRole('alert')).toHaveTextContent('This point is outside Florida; Florida Explorer covers Florida only.');
  });

  it('toggles reference layers and shows source details', async () => {
    const user = userEvent.setup();
    const f = fakeApi();
    render(<App mapApi={f.api} />);
    await new Promise((r) => setTimeout(r, 0));
    await user.click(screen.getByRole('switch', { name: 'Show Wetlands' }));
    expect(f.calls.visible).toContainEqual(['wetlands', true]);
    await user.click(screen.getByRole('button', { name: 'Conservation areas' }));
    expect(screen.getByText(/Protected does not always mean open to the public/)).toBeInTheDocument();
  });
});
