import type { LatLon } from '../config/bounds';
import { FLORIDA_BOUNDS } from '../config/bounds';
import type { ReferenceLayerConfig, LayerStatus } from '../config/layers';
import type { PlaceCandidate } from '../components/SearchBox';
import { layersForFailedUrl } from './layerErrors';
import { stationLabel, type TideStationMarker } from './noaaStations';

export interface MapHandle {
  setMarker: (p: LatLon | null) => void;
  setTideStations?: (stations: TideStationMarker[]) => void;
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
  const [{ default: esriConfig }, { default: EsriMap }, { default: MapView }, { default: Graphic }, { default: GraphicsLayer }, { default: FeatureLayer }, { default: MapImageLayer }, reactiveUtils, { default: Legend }] =
    await Promise.all([
      import('@arcgis/core/config.js'), import('@arcgis/core/Map.js'), import('@arcgis/core/views/MapView.js'),
      import('@arcgis/core/Graphic.js'), import('@arcgis/core/layers/GraphicsLayer.js'), import('@arcgis/core/layers/FeatureLayer.js'),
      import('@arcgis/core/layers/MapImageLayer.js'), import('@arcgis/core/core/reactiveUtils.js'),
      import('@arcgis/core/widgets/Legend.js'),
    ]);
  const apiKey = import.meta.env.VITE_ARCGIS_API_KEY as string | undefined;
  if (apiKey) esriConfig.apiKey = apiKey;
  const failed = new Set<string>();
  let destroyed = false;
  const generations = new Map<string, number>();
  const interceptor = {
    urls: [...new Set(layers.map((l) => l.serviceUrl))],
    error: (err: { details?: unknown }) => {
      const url = (err.details as { url?: string } | undefined)?.url ?? '';
      for (const id of layersForFailedUrl(url, layers)) {
        if (destroyed || !layerById.get(id)?.visible) continue;
        failed.add(id);
        handlers.onLayerStatus(id, 'error');
      }
    },
  };
  esriConfig.request.interceptors?.push(interceptor);
  const marker = new GraphicsLayer({ title: 'Selected place', listMode: 'hide' });
  const tideStations = new GraphicsLayer({ title: 'NOAA tide stations', listMode: 'hide' });
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
  map.add(tideStations);
  map.add(marker);
  const view = new MapView({
    container, map, center: [-81.6, 27.8], zoom: 6,
    aria: { label: MAP_LABEL },
    constraints: { geometry: { type: 'extent', xmin: FLORIDA_BOUNDS.lonMin - 2, ymin: FLORIDA_BOUNDS.latMin - 1.5, xmax: FLORIDA_BOUNDS.lonMax + 2, ymax: FLORIDA_BOUNDS.latMax + 1.5, spatialReference: { wkid: 4326 } }, minZoom: 5 },
  });
  view.ui.remove('zoom');
  let legend: InstanceType<typeof Legend> | null = null;
  const showFloodLegend = (visible: boolean) => {
    if (legend) { legend.visible = visible; return; }
    if (!visible) return;
    void view.when().then(() => {
      const layer = layerById.get('flood');
      if (destroyed || legend || !layer?.visible) return;
      try {
        legend = new Legend({ view, layerInfos: [{ layer, title: 'FEMA flood zones · zoom in for shading' }] });
        view.ui.add(legend, 'bottom-left');
      } catch { legend = null; } // Optional legend assets must never prevent point selection.
    }, () => undefined);
  };
  // The SDK owns the keyboard surface: its aria option survives localization and surface updates.
  let clickSequence = 0;
  let navigationSequence = 0;
  view.on('click', async (e) => {
    const sequence = ++clickSequence;
    const mp = e.mapPoint;
    // A station popup must not silently replace the user's selected place.
    try {
      const hit = await view.hitTest(e, { include: [tideStations] });
      if (hit.results.length > 0) return;
    } catch { /* Normal point selection remains available if hit testing fails. */ }
    if (!destroyed && sequence === clickSequence && mp?.latitude != null && mp.longitude != null) handlers.onClick({ lat: mp.latitude, lon: mp.longitude });
  });
  // Enter selects the same center as the explicit button, even before the SDK navigation engine is ready.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.target !== container.querySelector('.esri-view-surface')) return;
    clickSequence++;
    event.preventDefault(); event.stopPropagation(); handlers.onEnter();
  };
  container.addEventListener('keydown', onKeyDown, true);

  async function track(id: string) {
    const layer = layerById.get(id)!;
    const generation = (generations.get(id) ?? 0) + 1;
    generations.set(id, generation);
    const current = () => !destroyed && layer.visible && layerById.get(id) === layer && generations.get(id) === generation;
    failed.delete(id);
    handlers.onLayerStatus(id, 'loading');
    try {
      await layer.load();
      if (!current()) return;
      const lv = await view.whenLayerView(layer);
      await reactiveUtils.whenOnce(() => !lv.updating);
      if (current()) handlers.onLayerStatus(id, failed.has(id) ? 'error' : 'visible');
    } catch {
      if (current()) handlers.onLayerStatus(id, 'error');
    }
  }

  return {
    setMarker(p) {
      clickSequence++;
      navigationSequence++;
      marker.removeAll();
      if (p) marker.add(new Graphic({ geometry: { type: 'point', latitude: p.lat, longitude: p.lon }, symbol: { type: 'simple-marker', color: '#e2603f', size: 16, outline: { color: '#ffffff', width: 2.5 } } }));
    },
    setTideStations(stations) {
      if (destroyed) return;
      tideStations.removeAll();
      for (const station of stations) {
        if (!Number.isFinite(station.lat) || !Number.isFinite(station.lon) || Math.abs(station.lat) > 90 || Math.abs(station.lon) > 180) continue;
        const label = stationLabel(station);
        const content = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = label;
        const explanation = document.createElement('p');
        explanation.textContent = `NOAA station ${station.id}. ${station.observed ? 'Measurements describe water at this gauge' : 'Predictions describe astronomical tides at this station'}, not water at your selected spot or flooding in its streets.`;
        content.append(title, explanation);
        tideStations.add(new Graphic({
          geometry: { type: 'point', latitude: station.lat, longitude: station.lon },
          symbol: { type: 'simple-marker', style: station.observed ? 'circle' : 'triangle', color: station.observed ? '#007080' : '#6d40b8', size: 14, outline: { color: '#ffffff', width: 2 } },
          attributes: { stationId: station.id, stationLabel: label },
          popupTemplate: { title: 'NOAA tide station', content },
        }));
        tideStations.add(new Graphic({
          geometry: { type: 'point', latitude: station.lat, longitude: station.lon },
          symbol: { type: 'text', text: label, color: '#173b49', haloColor: '#ffffff', haloSize: 2, yoffset: 17, font: { size: 10, family: 'sans-serif' } },
        }));
      }
    },
    goTo(p) {
      const sequence = ++navigationSequence;
      const target = { ...p };
      void view.when().then(() => {
        if (!destroyed && sequence === navigationSequence) return view.goTo({ center: [target.lon, target.lat], zoom: Math.max(view.zoom, 14) });
      }).catch(() => undefined);
    },
    center() { return { lat: view.center.latitude ?? 0, lon: view.center.longitude ?? 0 }; },
    zoom(delta) { void view.goTo({ zoom: view.zoom + delta }).catch(() => undefined); },
    setLayerVisible(id, visible) {
      const l = layerById.get(id); if (!l) return;
      l.visible = visible;
      if (id === 'flood') showFloodLegend(visible);
      if (visible) void track(id);
      else generations.set(id, (generations.get(id) ?? 0) + 1);
    },
    retryLayer(id) {
      const old = layerById.get(id); const cfg = layers.find((c) => c.id === id); if (!old || !cfg) return;
      const fresh = makeLayer(cfg); map.remove(old); old.destroy(); map.add(fresh, map.layers.indexOf(marker)); layerById.set(id, fresh); fresh.visible = true;
      if (id === 'flood' && legend) legend.layerInfos = [{ layer: fresh, title: 'FEMA flood zones · zoom in for shading' }];
      void track(id);
    },
    destroy() {
      destroyed = true;
      container.removeEventListener('keydown', onKeyDown, true);
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
