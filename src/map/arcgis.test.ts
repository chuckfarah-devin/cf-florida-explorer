import { vi } from 'vitest';
import { REFERENCE_LAYERS } from '../config/layers';

const sdk = vi.hoisted(() => {
  const layers: FakeLayer[] = [];
  const ready = vi.fn(() => Promise.resolve());
  const makeLegend = vi.fn();
  const goTo = vi.fn(() => Promise.resolve());
  const hitTest = vi.fn(() => Promise.resolve({ results: [] as object[] }));
  const clicks: ((event: object) => Promise<void>)[] = [];
  class FakeLayer {
    visible = false;
    load = vi.fn(() => Promise.resolve());
    destroy = vi.fn();
    constructor(options: object) { Object.assign(this, options); layers.push(this); }
    removeAll = vi.fn();
    add = vi.fn();
  }
  class FakeMap {
    layers = { indexOf: () => 0 };
    add() {}
    remove() {}
  }
  const surface = document.createElement('div');
  class FakeView {
    ui = { remove: vi.fn(), add: vi.fn() };
    center = { latitude: 27, longitude: -81 };
    zoom = 6;
    when = () => ready();
    whenLayerView = vi.fn(() => Promise.resolve({ updating: false }));
    on = vi.fn((name: string, callback: (event: object) => Promise<void>) => { if (name === 'click') clicks.push(callback); });
    hitTest = hitTest;
    goTo = goTo;
    destroy = vi.fn();
    constructor({ container, aria }: { container: HTMLElement; aria: { label: string } }) { surface.className = 'esri-view-surface'; surface.setAttribute('role', 'application'); surface.setAttribute('aria-label', aria.label); container.append(surface); }
  }
  return { layers, ready, makeLegend, goTo, hitTest, clicks, FakeLayer, FakeMap, FakeView, surface, config: { request: { interceptors: [] as { error: (err: { details: { url: string } }) => void }[] } } };
});
vi.mock('@arcgis/core/config.js', () => ({ default: sdk.config }));
vi.mock('@arcgis/core/Map.js', () => ({ default: sdk.FakeMap }));
vi.mock('@arcgis/core/views/MapView.js', () => ({ default: sdk.FakeView }));
vi.mock('@arcgis/core/Graphic.js', () => ({ default: class { constructor(options: object) { Object.assign(this, options); } } }));
vi.mock('@arcgis/core/layers/GraphicsLayer.js', () => ({ default: sdk.FakeLayer }));
vi.mock('@arcgis/core/layers/FeatureLayer.js', () => ({ default: sdk.FakeLayer }));
vi.mock('@arcgis/core/layers/MapImageLayer.js', () => ({ default: sdk.FakeLayer }));
vi.mock('@arcgis/core/core/reactiveUtils.js', () => ({ whenOnce: () => Promise.resolve() }));
vi.mock('@arcgis/core/widgets/Legend.js', () => ({ default: class { constructor(options: object) { sdk.makeLegend(options); Object.assign(this, options); } } }));

import { createMap, MAP_LABEL } from './arcgis';

afterEach(() => {
  sdk.ready.mockReset().mockResolvedValue(undefined);
  sdk.makeLegend.mockReset();
  sdk.goTo.mockClear();
  sdk.hitTest.mockReset().mockResolvedValue({ results: [] });
  sdk.clicks.length = 0;
});

async function setup() {
  sdk.layers.length = 0;
  sdk.surface.removeAttribute('aria-label');
  sdk.surface.removeAttribute('role');
  sdk.config.request.interceptors.length = 0;
  const onLayerStatus = vi.fn();
  const onEnter = vi.fn();
  const onClick = vi.fn();
  const handle = await createMap(document.createElement('div'), REFERENCE_LAYERS, { onClick, onEnter, onLayerStatus });
  const layer = sdk.layers[4]; // Selected place + tide graphics layers, wetlands, conservation, aquatic preserves.
  const config = REFERENCE_LAYERS.find((l) => l.id === 'aquatic-preserves')!;
  const fail = () => sdk.config.request.interceptors[0].error({ details: { url: `${config.serviceUrl}/0/query` } });
  return { handle, layer, onLayerStatus, onEnter, onClick, fail };
}

describe('ArcGIS layer lifecycle', () => {
  const natureFeature = { id: 'protected-1', name: 'Synthetic protected place', geometry: { rings: [[[-80.06, 26.50], [-80.05, 26.50], [-80.05, 26.51], [-80.06, 26.50]]], spatialReference: { wkid: 4326 as const } } };

  it('highlights the supplied polygon and fits it without changing the selected evidence point', async () => {
    const { handle, onClick } = await setup();
    const marker = sdk.layers[0];
    handle.setMarker({ lat: 26.508, lon: -80.054 });
    const before = marker.add.mock.calls.length;
    handle.showNatureFeature!(natureFeature);
    const highlight = sdk.layers.find((l) => (l as unknown as { title: string }).title === 'Highlighted nature area')!;
    const graphic = highlight.add.mock.calls[0][0];
    expect(graphic.geometry.rings).toEqual(natureFeature.geometry.rings);
    expect(graphic.geometry.rings).not.toBe(natureFeature.geometry.rings);
    expect(graphic.geometry.spatialReference).toEqual({ wkid: 4326 });
    expect(graphic.popupTemplate.content.textContent).toContain('selected spot is unchanged');
    await vi.waitFor(() => expect(sdk.goTo).toHaveBeenCalledWith(graphic));
    expect(marker.add).toHaveBeenCalledTimes(before);
    expect(onClick).not.toHaveBeenCalled();
    handle.destroy();
  });

  it('keeps only the newest queued nature highlight, and clearing or selecting cancels navigation', async () => {
    let ready!: () => void;
    sdk.ready.mockReturnValue(new Promise<void>((resolve) => { ready = resolve; }));
    const { handle } = await setup();
    handle.showNatureFeature!(natureFeature);
    handle.showNatureFeature!({ ...natureFeature, id: 'protected-2' });
    ready();
    await vi.waitFor(() => expect(sdk.goTo).toHaveBeenCalledOnce());
    expect(sdk.goTo).toHaveBeenCalledWith(expect.objectContaining({ attributes: { natureFeatureId: 'protected-2' } }));
    sdk.goTo.mockClear();
    handle.showNatureFeature!(natureFeature);
    handle.clearNatureFeature!();
    await Promise.resolve();
    expect(sdk.goTo).not.toHaveBeenCalled();
    handle.showNatureFeature!(natureFeature);
    handle.setMarker({ lat: 26.51, lon: -80.05 });
    await Promise.resolve();
    expect(sdk.goTo).not.toHaveBeenCalled();
    handle.showNatureFeature!(natureFeature);
    handle.destroy();
    await Promise.resolve();
    expect(sdk.goTo).not.toHaveBeenCalled();
  });

  it('rejects missing, unclosed or invalid-coordinate geometry rather than highlighting a different place', async () => {
    const { handle } = await setup();
    const highlight = sdk.layers.find((l) => (l as unknown as { title: string }).title === 'Highlighted nature area')!;
    handle.showNatureFeature!({ id: 'none', name: 'No geometry' });
    handle.showNatureFeature!({ ...natureFeature, geometry: { ...natureFeature.geometry, rings: [[[-80, 26], [-80, 27], [-81, 27], [-82, 28]]] } });
    handle.showNatureFeature!({ ...natureFeature, geometry: { ...natureFeature.geometry, rings: [[[-80, 26], [-80, 27], [NaN, 27], [-80, 26]]] } });
    await Promise.resolve();
    expect(highlight.add).not.toHaveBeenCalled();
    expect(sdk.goTo).not.toHaveBeenCalled();
    handle.destroy();
  });

  it('waits for view readiness and navigates only to the newest requested point', async () => {
    let ready!: () => void;
    const pending = new Promise<void>((resolve) => { ready = resolve; });
    sdk.ready.mockReturnValue(pending);
    const { handle } = await setup();
    handle.goTo({ lat: 26.51, lon: -80.05 });
    handle.goTo({ lat: 26.52, lon: -80.06 });
    expect(sdk.goTo).not.toHaveBeenCalled();
    ready();
    await vi.waitFor(() => expect(sdk.goTo).toHaveBeenCalledOnce());
    expect(sdk.goTo).toHaveBeenCalledWith({ center: [-80.06, 26.52], zoom: 14 });
    handle.destroy();
  });

  it('drops queued navigation after a newer pointer marker or map destruction', async () => {
    let ready!: () => void;
    const pending = new Promise<void>((resolve) => { ready = resolve; });
    sdk.ready.mockReturnValue(pending);
    const { handle } = await setup();
    handle.goTo({ lat: 26.51, lon: -80.05 });
    handle.setMarker({ lat: 26.52, lon: -80.06 });
    ready();
    await Promise.resolve();
    expect(sdk.goTo).not.toHaveBeenCalled();
    handle.goTo({ lat: 26.53, lon: -80.07 });
    handle.destroy();
    await Promise.resolve();
    expect(sdk.goTo).not.toHaveBeenCalled();
  });
  it('uses distinct station symbols, source-specific labels and text-only popup content without moving the selected marker', async () => {
    const { handle } = await setup();
    const pointLayer = sdk.layers[0];
    const stations = sdk.layers[1];
    handle.setTideStations!([
      { id: '8722670', name: 'Lake Worth Pier', lat: 26.612778, lon: -80.034164, waterBody: 'Atlantic Ocean', observed: true },
      { id: '8722718', name: '<img src=x>', lat: 26.5, lon: -80.05, waterBody: 'Intracoastal', observed: false },
    ]);
    const graphics = stations.add.mock.calls.map((call) => call[0]);
    expect(graphics[0].symbol.style).toBe('circle');
    expect(graphics[2].symbol.style).toBe('triangle');
    expect(graphics[0].popupTemplate.content.textContent).toContain('not water at your selected spot');
    expect(graphics[2].popupTemplate.content.querySelector('img')).toBeNull();
    expect(graphics[3].symbol.text).toContain('<img src=x>');
    expect(pointLayer.removeAll).not.toHaveBeenCalled();
    handle.setTideStations!([]);
    expect(stations.removeAll).toHaveBeenCalledTimes(2);
    handle.destroy();
    handle.setTideStations!([]);
    expect(stations.removeAll).toHaveBeenCalledTimes(2);
  });

  it('opens a station without selecting its coordinates and discards delayed hit tests after destruction', async () => {
    const { handle, onClick } = await setup();
    sdk.hitTest.mockResolvedValueOnce({ results: [{}] });
    await sdk.clicks[0]({ mapPoint: { latitude: 26.6, longitude: -80.03 } });
    expect(onClick).not.toHaveBeenCalled();
    await sdk.clicks[0]({ mapPoint: { latitude: 26.5, longitude: -80.05 } });
    expect(onClick).toHaveBeenCalledWith({ lat: 26.5, lon: -80.05 });
    let finish!: (result: { results: object[] }) => void;
    sdk.hitTest.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = sdk.clicks[0]({ mapPoint: { latitude: 26.7, longitude: -80.04 } });
    handle.destroy();
    finish({ results: [] });
    await pending;
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not let a pending map hit test replace a newer typed point', async () => {
    const { handle, onClick } = await setup();
    let finish!: (result: { results: object[] }) => void;
    sdk.hitTest.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = sdk.clicks[0]({ mapPoint: { latitude: 26.7, longitude: -80.04 } });
    handle.setMarker({ lat: 26.5, lon: -80.05 });
    finish({ results: [] });
    await pending;
    expect(onClick).not.toHaveBeenCalled();
    handle.destroy();
  });
  it('selects the map center on native Enter before SDK readiness and removes the listener on destroy', async () => {
    sdk.ready.mockReturnValueOnce(new Promise<void>(() => {}));
    const { handle, onEnter } = await setup();
    sdk.surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onEnter).toHaveBeenCalledOnce();
    handle.destroy();
    sdk.surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onEnter).toHaveBeenCalledOnce();
  });
  it('keeps map controls working when optional legend creation fails', async () => {
    sdk.makeLegend.mockImplementationOnce(() => { throw new Error('legend assets unavailable'); });
    const { handle, onLayerStatus } = await setup();
    handle.setLayerVisible('flood', true);
    await vi.waitFor(() => expect(onLayerStatus).toHaveBeenLastCalledWith('flood', 'visible'));
    expect(sdk.makeLegend).toHaveBeenCalled();
    expect(handle.center()).toEqual({ lat: 27, lon: -81 });
    expect(sdk.surface).toHaveAttribute('aria-label', MAP_LABEL);
    handle.destroy();
  });
  it('names the keyboard surface even if basemap readiness never resolves', async () => {
    sdk.ready.mockReturnValueOnce(new Promise<void>(() => {}));
    const { handle } = await setup();
    expect(sdk.surface).toHaveAttribute('aria-label', MAP_LABEL);
    handle.destroy();
  });
  it('names the actual SDK keyboard surface', async () => {
    const { handle } = await setup();
    await vi.waitFor(() => expect(sdk.surface).toHaveAttribute('aria-label', MAP_LABEL));
    expect(sdk.surface).toHaveAttribute('role', 'application');
    handle.destroy();
  });

  it('reports a mid-session failure, then retries using a fresh layer', async () => {
    const { handle, layer, onLayerStatus, fail } = await setup();
    handle.setLayerVisible('aquatic-preserves', true);
    await vi.waitFor(() => expect(onLayerStatus).toHaveBeenLastCalledWith('aquatic-preserves', 'visible'));
    fail();
    expect(onLayerStatus).toHaveBeenLastCalledWith('aquatic-preserves', 'error');
    handle.retryLayer('aquatic-preserves');
    await vi.waitFor(() => expect(onLayerStatus).toHaveBeenLastCalledWith('aquatic-preserves', 'visible'));
    expect(layer.destroy).toHaveBeenCalledOnce();
    handle.destroy();
    expect(sdk.config.request.interceptors).toHaveLength(0);
  });

  it('does not let a replaced request overwrite a successful retry', async () => {
    const { handle, layer, onLayerStatus } = await setup();
    let reject!: (reason: Error) => void;
    layer.load.mockImplementationOnce(() => new Promise<void>((_resolve, r) => { reject = r; }));
    handle.setLayerVisible('aquatic-preserves', true);
    handle.retryLayer('aquatic-preserves');
    await vi.waitFor(() => expect(onLayerStatus).toHaveBeenLastCalledWith('aquatic-preserves', 'visible'));
    reject(new Error('late failure from replaced layer'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onLayerStatus).toHaveBeenLastCalledWith('aquatic-preserves', 'visible');
    handle.destroy();
  });

  it('suppresses completion and service errors after switching a layer off', async () => {
    const { handle, layer, onLayerStatus, fail } = await setup();
    let resolve!: () => void;
    layer.load.mockImplementationOnce(() => new Promise<void>((r) => { resolve = r; }));
    handle.setLayerVisible('aquatic-preserves', true);
    handle.setLayerVisible('aquatic-preserves', false);
    onLayerStatus.mockClear();
    resolve();
    fail();
    await new Promise((r) => setTimeout(r, 0));
    expect(onLayerStatus).not.toHaveBeenCalled();
    handle.destroy();
  });

  it('does not turn an initial request error back into Shown when loading settles', async () => {
    const { handle, layer, onLayerStatus, fail } = await setup();
    let resolve!: () => void;
    layer.load.mockImplementationOnce(() => new Promise<void>((r) => { resolve = r; }));
    handle.setLayerVisible('aquatic-preserves', true);
    fail();
    resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(onLayerStatus).toHaveBeenLastCalledWith('aquatic-preserves', 'error');
    handle.destroy();
  });

  it('does not publish a pending load failure after the map is destroyed', async () => {
    const { handle, layer, onLayerStatus } = await setup();
    let reject!: (reason: Error) => void;
    layer.load.mockImplementationOnce(() => new Promise<void>((_resolve, r) => { reject = r; }));
    handle.setLayerVisible('aquatic-preserves', true);
    handle.destroy();
    onLayerStatus.mockClear();
    reject(new Error('late load failure'));
    await new Promise((r) => setTimeout(r, 0));
    expect(onLayerStatus).not.toHaveBeenCalled();
  });
});
