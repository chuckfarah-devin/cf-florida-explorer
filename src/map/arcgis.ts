import type { LatLon } from '../config/bounds';
import { FLORIDA_BOUNDS } from '../config/bounds';
import type { ReferenceLayerConfig, LayerStatus } from '../config/layers';
import type { PlaceCandidate } from '../components/SearchBox';
import { layersForFailedUrl } from './layerErrors';

export interface MapHandle {
  setMarker: (p: LatLon | null) => void;
  goTo: (p: LatLon) => void;
  center: () => LatLon;
  zoom: (delta: number) => void;
  setLayerVisible: (id: string, visible: boolean) => void;
  retryLayer: (id: string) => void;
  destroy: () => void;
}

export const MAP_LABEL = 'Map of Florida. Use arrow keys to pan and Enter to select the map center.';

const GEOCODE_URL = 'https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer';

/** Loads the ArcGIS SDK lazily so unit tests never touch WebGL. */
export async function createMap(
  container: HTMLDivElement,
  layers: readonly ReferenceLayerConfig[],
  handlers: { onClick: (p: LatLon) => void; onEnter: () => void; onLayerStatus: (id: string, s: LayerStatus) => void },
): Promise<MapHandle> {
  const [{ default: esriConfig }, { default: EsriMap }, { default: MapView }, { default: Graphic }, { default: GraphicsLayer }, { default: FeatureLayer }, { default: MapImageLayer }, reactiveUtils] =
    await Promise.all([
      import('@arcgis/core/config.js'), import('@arcgis/core/Map.js'), import('@arcgis/core/views/MapView.js'),
      import('@arcgis/core/Graphic.js'), import('@arcgis/core/layers/GraphicsLayer.js'), import('@arcgis/core/layers/FeatureLayer.js'),
      import('@arcgis/core/layers/MapImageLayer.js'), import('@arcgis/core/core/reactiveUtils.js'),
    ]);
  const apiKey = import.meta.env.VITE_ARCGIS_API_KEY as string | undefined;
  if (apiKey) esriConfig.apiKey = apiKey;
  const failed = new Set<string>();
  const interceptor = {
    urls: [...new Set(layers.map((l) => l.serviceUrl))],
    error: (err: { details?: unknown }) => {
      const url = (err.details as { url?: string } | undefined)?.url ?? '';
      for (const id of layersForFailedUrl(url, layers)) {
        if (!layerById.get(id)?.visible) continue;
        failed.add(id);
        handlers.onLayerStatus(id, 'error');
      }
    },
  };
  esriConfig.request.interceptors?.push(interceptor);
  const marker = new GraphicsLayer({ title: 'Selected place', listMode: 'hide' });
  const map = new EsriMap({ basemap: apiKey ? 'arcgis/light-gray' : 'osm' });
  const layerById = new Map<string, InstanceType<typeof FeatureLayer> | InstanceType<typeof MapImageLayer>>();
  const makeLayer = (cfg: ReferenceLayerConfig) => cfg.render === 'feature'
    ? new FeatureLayer({ url: `${cfg.serviceUrl}/${cfg.sublayerId}`, visible: false, opacity: 0.55, title: cfg.label, outFields: [] })
    : new MapImageLayer({ url: cfg.serviceUrl, sublayers: [{ id: cfg.sublayerId, visible: true }], visible: false, opacity: 0.45, title: cfg.label });
  for (const cfg of layers) {
    const layer = makeLayer(cfg);
    layerById.set(cfg.id, layer);
    map.add(layer);
  }
  map.add(marker);
  const view = new MapView({
    container, map, center: [-81.6, 27.8], zoom: 6,
    constraints: { geometry: { type: 'extent', xmin: FLORIDA_BOUNDS.lonMin - 2, ymin: FLORIDA_BOUNDS.latMin - 1.5, xmax: FLORIDA_BOUNDS.lonMax + 2, ymax: FLORIDA_BOUNDS.latMax + 1.5, spatialReference: { wkid: 4326 } }, minZoom: 5 },
  });
  view.ui.remove('zoom');
  void view.when().then(() => {
    const surface = container.querySelector<HTMLElement>('.esri-view-surface');
    surface?.setAttribute('role', 'application');
    surface?.setAttribute('aria-label', MAP_LABEL);
  }, () => undefined);
  view.on('click', (e) => { const mp = e.mapPoint; if (mp?.latitude != null && mp.longitude != null) handlers.onClick({ lat: mp.latitude, lon: mp.longitude }); });
  view.on('key-down', (e) => { if (e.key === 'Enter') { e.stopPropagation(); handlers.onEnter(); } });

  async function track(id: string) {
    const layer = layerById.get(id)!;
    failed.delete(id);
    handlers.onLayerStatus(id, 'loading');
    try {
      await layer.load();
      const lv = await view.whenLayerView(layer);
      await reactiveUtils.whenOnce(() => !lv.updating);
      handlers.onLayerStatus(id, failed.has(id) ? 'error' : 'visible');
    } catch {
      handlers.onLayerStatus(id, 'error');
    }
  }

  return {
    setMarker(p) {
      marker.removeAll();
      if (p) marker.add(new Graphic({ geometry: { type: 'point', latitude: p.lat, longitude: p.lon }, symbol: { type: 'simple-marker', color: '#e2603f', size: 16, outline: { color: '#ffffff', width: 2.5 } } }));
    },
    goTo(p) { void view.goTo({ center: [p.lon, p.lat], zoom: Math.max(view.zoom, 14) }).catch(() => undefined); },
    center() { return { lat: view.center.latitude ?? 0, lon: view.center.longitude ?? 0 }; },
    zoom(delta) { void view.goTo({ zoom: view.zoom + delta }).catch(() => undefined); },
    setLayerVisible(id, visible) { const l = layerById.get(id); if (!l) return; l.visible = visible; if (visible) void track(id); },
    retryLayer(id) {
      const old = layerById.get(id); const cfg = layers.find((c) => c.id === id); if (!old || !cfg) return;
      const fresh = makeLayer(cfg); map.remove(old); map.add(fresh, map.layers.indexOf(marker)); layerById.set(id, fresh); fresh.visible = true; void track(id);
    },
    destroy() {
      const list = esriConfig.request.interceptors;
      const i = list?.indexOf(interceptor) ?? -1;
      if (i >= 0) list!.splice(i, 1);
      view.destroy();
    },
  };
}

/** Florida-constrained place search; results are never stored (forStorage stays false). */
export async function findPlaces(text: string): Promise<PlaceCandidate[]> {
  const { addressToLocations } = await import('@arcgis/core/rest/locator.js');
  const b = FLORIDA_BOUNDS;
  const results = await addressToLocations(GEOCODE_URL, {
    address: { SingleLine: text },
    countryCode: 'USA',
    maxLocations: 5,
    outFields: ['PlaceName', 'Region'],
    searchExtent: { type: 'extent', xmin: b.lonMin, ymin: b.latMin, xmax: b.lonMax, ymax: b.latMax, spatialReference: { wkid: 4326 } } as never,
  });
  return results
    .filter((r) => r.location?.latitude != null && r.location.longitude != null)
    .map((r) => ({ name: r.address ?? text, point: { lat: r.location!.latitude!, lon: r.location!.longitude! } }));
}
