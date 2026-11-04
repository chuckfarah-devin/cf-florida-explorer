import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Header, type DomainId } from './components/Header';
import { SearchBox, type PlaceCandidate } from './components/SearchBox';
import { LayerPanel } from './components/LayerPanel';
import { MapControls } from './components/MapControls';
import { PlacePanel } from './components/PlacePanel';
import { AskPreview } from './components/AskPreview';
import { REFERENCE_LAYERS, type LayerStatus, type ReferenceLayerId } from './config/layers';
import { initialSelection, selectionReducer } from './state/selection';
import { checkPoint, type LatLon } from './config/bounds';
import type { MapHandle } from './map/arcgis';
import type { TideStationMarker } from './map/noaaStations';

type Rec<T> = Record<ReferenceLayerId, T>;
const allOff = Object.fromEntries(REFERENCE_LAYERS.map((l) => [l.id, false])) as Rec<boolean>;
const allStatusOff = Object.fromEntries(REFERENCE_LAYERS.map((l) => [l.id, 'off'])) as Rec<LayerStatus>;

export interface MapApi {
  createMap: typeof import('./map/arcgis').createMap;
  findPlaces: typeof import('./map/arcgis').findPlaces;
}
const loadMapApi = (): Promise<MapApi> => import('./map/arcgis');

export default function App({ mapApi = loadMapApi }: { mapApi?: () => Promise<MapApi> }) {
  const [sel, dispatch] = useReducer(selectionReducer, initialSelection);
  const [domain, setDomain] = useState<DomainId>('water');
  const [enabled, setEnabled] = useState<Rec<boolean>>(allOff);
  const [status, setStatus] = useState<Rec<LayerStatus>>(allStatusOff);
  const [layersOpen, setLayersOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapDiv = useRef<HTMLDivElement>(null);
  const handle = useRef<MapHandle | null>(null);
  const api = useRef<MapApi | null>(null);
  const currentSelection = useRef(sel.current);
  const tideMarkers = useRef<TideStationMarker[]>([]);
  const showTideStations = useCallback((stations: TideStationMarker[]) => {
    tideMarkers.current = stations;
    handle.current?.setTideStations?.(stations);
  }, []);

  const select = useCallback((point: LatLon, source: 'pointer' | 'keyboard' | 'typed' | 'search', placeName?: string) => {
    if (checkPoint(point).ok) showTideStations([]);
    dispatch({ type: 'select', point, source, placeName });
  }, [showTideStations]);
  const changeDomain = (next: DomainId) => {
    if (next !== domain) showTideStations([]);
    setDomain(next);
  };

  useEffect(() => {
    let cancelled = false;
    mapApi().then(async (m) => {
      api.current = m;
      if (!mapDiv.current || cancelled) return;
      const h = await m.createMap(mapDiv.current, REFERENCE_LAYERS, {
        onClick: (p) => select(p, 'pointer'),
        onEnter: () => handle.current && select(handle.current.center(), 'keyboard'),
        onLayerStatus: (id, s) => setStatus((prev) => ({ ...prev, [id]: s })),
      });
      if (cancelled) h.destroy(); else {
        handle.current = h;
        h.setTideStations?.(tideMarkers.current);
        const selected = currentSelection.current;
        h.setMarker(selected?.point ?? null);
        if (selected && selected.source !== 'pointer') h.goTo(selected.point);
      }
    }).catch(() => setMapError('The map could not load. You can still enter coordinates in the search box.'));
    return () => { cancelled = true; handle.current?.destroy(); handle.current = null; };
  }, [mapApi, select]);

  const selectedPlace = sel.current;
  useEffect(() => {
    currentSelection.current = selectedPlace;
    handle.current?.setMarker(selectedPlace?.point ?? null);
    if (selectedPlace && selectedPlace.source !== 'pointer') handle.current?.goTo(selectedPlace.point);
  }, [selectedPlace]);

  const toggle = (id: ReferenceLayerId) => {
    const next = !enabled[id];
    setEnabled({ ...enabled, [id]: next });
    if (!next) setStatus((p) => ({ ...p, [id]: 'off' }));
    handle.current?.setLayerVisible(id, next);
  };

  const placeLabel = sel.current ? sel.current.placeName ?? 'this spot' : null;
  const devBasemap = !import.meta.env.VITE_ARCGIS_API_KEY;

  return (
    <div className="app">
      <Header domain={domain} onDomain={changeDomain} search={
        <SearchBox
          onCoordinates={(p) => select(p, 'typed')}
          onPlace={(c: PlaceCandidate) => select(c.point, 'search', c.name.split(',')[0])}
          findPlaces={async (t) => (api.current ?? (await mapApi())).findPlaces(t)}
        />
      } />
      <main className="body">
        <div className="mapwrap">
          <div ref={mapDiv} className="map" />
          {mapError && <p className="map-error" role="alert">{mapError}</p>}
          {devBasemap && <p className="dev-banner">Development basemap (OpenStreetMap). The ArcGIS key isn't configured.</p>}
          {sel.rejection && (
            <div className="toast" role="alert">{sel.rejection}
              <button type="button" className="linkbtn" onClick={() => dispatch({ type: 'dismissRejection' })}>Dismiss</button>
            </div>
          )}
          {layersOpen && (
            <div className="layers-float">
              <LayerPanel enabled={enabled} status={status} onToggle={toggle} onRetry={(id) => handle.current?.retryLayer(id)} onClose={() => setLayersOpen(false)} />
            </div>
          )}
          <MapControls layersOpen={layersOpen} onLayers={() => setLayersOpen(!layersOpen)}
            onZoomIn={() => handle.current?.zoom(1)} onZoomOut={() => handle.current?.zoom(-1)}
            onSelectCenter={() => handle.current && select(handle.current.center(), 'keyboard')} />
        </div>
        <aside className="panel" aria-label="This place">
          <div className="pscroll"><PlacePanel selection={sel.current} domain={domain} onStations={showTideStations} /></div>
          <AskPreview placeLabel={placeLabel} />
        </aside>
      </main>
    </div>
  );
}
