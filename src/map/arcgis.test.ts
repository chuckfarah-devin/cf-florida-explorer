import { vi } from 'vitest';
import { REFERENCE_LAYERS } from '../config/layers';

const sdk = vi.hoisted(() => {
  const layers: FakeLayer[] = [];
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
    ui = { remove: vi.fn() };
    center = { latitude: 27, longitude: -81 };
    zoom = 6;
    when = () => Promise.resolve();
    whenLayerView = vi.fn(() => Promise.resolve({ updating: false }));
    on = vi.fn();
    destroy = vi.fn();
    constructor({ container }: { container: HTMLElement }) { surface.className = 'esri-view-surface'; container.append(surface); }
  }
  return { layers, FakeLayer, FakeMap, FakeView, surface, config: { request: { interceptors: [] as { error: (err: { details: { url: string } }) => void }[] } } };
});
vi.mock('@arcgis/core/config.js', () => ({ default: sdk.config }));
vi.mock('@arcgis/core/Map.js', () => ({ default: sdk.FakeMap }));
vi.mock('@arcgis/core/views/MapView.js', () => ({ default: sdk.FakeView }));
vi.mock('@arcgis/core/Graphic.js', () => ({ default: class {} }));
vi.mock('@arcgis/core/layers/GraphicsLayer.js', () => ({ default: sdk.FakeLayer }));
vi.mock('@arcgis/core/layers/FeatureLayer.js', () => ({ default: sdk.FakeLayer }));
vi.mock('@arcgis/core/layers/MapImageLayer.js', () => ({ default: sdk.FakeLayer }));
vi.mock('@arcgis/core/core/reactiveUtils.js', () => ({ whenOnce: () => Promise.resolve() }));

import { createMap, MAP_LABEL } from './arcgis';

async function setup() {
  sdk.layers.length = 0;
  sdk.config.request.interceptors.length = 0;
  const onLayerStatus = vi.fn();
  const handle = await createMap(document.createElement('div'), REFERENCE_LAYERS, { onClick: vi.fn(), onEnter: vi.fn(), onLayerStatus });
  const layer = sdk.layers[3]; // Graphics layer, wetlands, conservation, aquatic preserves.
  const config = REFERENCE_LAYERS.find((l) => l.id === 'aquatic-preserves')!;
  const fail = () => sdk.config.request.interceptors[0].error({ details: { url: `${config.serviceUrl}/0/query` } });
  return { handle, layer, onLayerStatus, fail };
}

describe('ArcGIS layer lifecycle', () => {
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
