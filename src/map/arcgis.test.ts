import { vi } from 'vitest';
import { REFERENCE_LAYERS } from '../config/layers';

const sdk = vi.hoisted(() => {
  const layers: FakeLayer[] = [];
  const ready = vi.fn(() => Promise.resolve());
  const makeLegend = vi.fn();
  class FakeLayer {
    visible = false;
    load = vi.fn(() => Promise.resolve());
    destroy = vi.fn();
    constructor(options: object) { Object.assign(this, options); layers.push(this); }
    removeAll() {}
    add() {}
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
    on = vi.fn();
    destroy = vi.fn();
    constructor({ container, aria }: { container: HTMLElement; aria: { label: string } }) { surface.className = 'esri-view-surface'; surface.setAttribute('role', 'application'); surface.setAttribute('aria-label', aria.label); container.append(surface); }
  }
  return { layers, ready, makeLegend, FakeLayer, FakeMap, FakeView, surface, config: { request: { interceptors: [] as { error: (err: { details: { url: string } }) => void }[] } } };
});
vi.mock('@arcgis/core/config.js', () => ({ default: sdk.config }));
vi.mock('@arcgis/core/Map.js', () => ({ default: sdk.FakeMap }));
vi.mock('@arcgis/core/views/MapView.js', () => ({ default: sdk.FakeView }));
vi.mock('@arcgis/core/Graphic.js', () => ({ default: class {} }));
vi.mock('@arcgis/core/layers/GraphicsLayer.js', () => ({ default: sdk.FakeLayer }));
vi.mock('@arcgis/core/layers/FeatureLayer.js', () => ({ default: sdk.FakeLayer }));
vi.mock('@arcgis/core/layers/MapImageLayer.js', () => ({ default: sdk.FakeLayer }));
vi.mock('@arcgis/core/core/reactiveUtils.js', () => ({ whenOnce: () => Promise.resolve() }));
vi.mock('@arcgis/core/widgets/Legend.js', () => ({ default: class { constructor(options: object) { sdk.makeLegend(options); Object.assign(this, options); } } }));

import { createMap, MAP_LABEL } from './arcgis';

afterEach(() => {
  sdk.ready.mockReset().mockResolvedValue(undefined);
  sdk.makeLegend.mockReset();
});

async function setup() {
  sdk.layers.length = 0;
  sdk.surface.removeAttribute('aria-label');
  sdk.surface.removeAttribute('role');
  sdk.config.request.interceptors.length = 0;
  const onLayerStatus = vi.fn();
  const onEnter = vi.fn();
  const handle = await createMap(document.createElement('div'), REFERENCE_LAYERS, { onClick: vi.fn(), onEnter, onLayerStatus });
  const layer = sdk.layers[3]; // Graphics layer, wetlands, conservation, aquatic preserves.
  const config = REFERENCE_LAYERS.find((l) => l.id === 'aquatic-preserves')!;
  const fail = () => sdk.config.request.interceptors[0].error({ details: { url: `${config.serviceUrl}/0/query` } });
  return { handle, layer, onLayerStatus, onEnter, fail };
}

describe('ArcGIS layer lifecycle', () => {
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
