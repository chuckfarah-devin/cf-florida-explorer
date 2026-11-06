import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Header, type DomainId } from './components/Header';
import { SearchBox, type PlaceCandidate } from './components/SearchBox';
import { LayerPanel } from './components/LayerPanel';
import { MapControls } from './components/MapControls';
import { PlacePanel } from './components/PlacePanel';
import { AskThisPlace, askScopeKey, type AskUiState } from './components/AskThisPlace';
import { AskAnswer } from './components/AskAnswer';
import { REFERENCE_LAYERS, type LayerStatus, type ReferenceLayerId } from './config/layers';
import { initialSelection, selectionReducer } from './state/selection';
import { checkPoint, type LatLon } from './config/bounds';
import type { MapHandle } from './map/arcgis';
import type { TideStationMarker } from './map/noaaStations';
import type { TideRequest } from './noaa/types';
import type { NatureMapFeature } from './map/natureFeature';

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
  const [basemapFallback, setBasemapFallback] = useState(false);
  const [askWindow, setAskWindow] = useState<TideRequest>({ startDate: '2026-10-25', endDate: '2026-10-29', datum: 'MLLW' });
  const [askState, setAskState] = useState<AskUiState | null>(null);
  const applyAskWindow = useCallback((window: TideRequest) => {
    setAskWindow((old) => old.startDate === window.startDate && old.endDate === window.endDate && old.datum === window.datum ? old : window);
    setAskState(null);
  }, []);
  const mapDiv = useRef<HTMLDivElement>(null);
  const handle = useRef<MapHandle | null>(null);
  const currentLayers = useRef(enabled);
  const api = useRef<MapApi | null>(null);
  const currentSelection = useRef(sel.current);
  const tideMarkers = useRef<TideStationMarker[]>([]);
  const highlightedNature = useRef<NatureMapFeature | null>(null);
  const clearNatureHighlight = useCallback(() => {
    highlightedNature.current = null;
    handle.current?.clearNatureFeature?.();
  }, []);
  const showNatureFeature = useCallback((feature: NatureMapFeature) => {
    highlightedNature.current = feature;
    handle.current?.showNatureFeature?.(feature);
  }, []);
  const showTideStations = useCallback((stations: TideStationMarker[]) => {
    tideMarkers.current = stations;
    handle.current?.setTideStations?.(stations);
  }, []);

  const select = useCallback((point: LatLon, source: 'pointer' | 'keyboard' | 'typed' | 'search', placeName?: string) => {
    if (checkPoint(point).ok) { showTideStations([]); clearNatureHighlight(); setAskState(null); }
    dispatch({ type: 'select', point, source, placeName });
  }, [showTideStations, clearNatureHighlight]);
  const changeDomain = (next: DomainId) => {
    if (next !== domain) { showTideStations([]); clearNatureHighlight(); setAskState(null); }
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
        onBasemapFallback: () => setBasemapFallback(true),
      });
      if (cancelled) h.destroy(); else {
        handle.current = h;
        for (const layer of REFERENCE_LAYERS) {
          if (currentLayers.current[layer.id]) h.setLayerVisible(layer.id, true);
        }
        h.setTideStations?.(tideMarkers.current);
        const selected = currentSelection.current;
        h.setMarker(selected?.point ?? null);
        if (selected && selected.source !== 'pointer') h.goTo(selected.point);
        if (highlightedNature.current) h.showNatureFeature?.(highlightedNature.current);
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
    currentLayers.current = { ...enabled, [id]: next };
    setEnabled(currentLayers.current);
    if (!next) setStatus((p) => ({ ...p, [id]: 'off' }));
    handle.current?.setLayerVisible(id, next);
  };

  const scopeKey = askScopeKey(sel.current, askWindow, domain);
  const activeAnswer = askState?.scopeKey === scopeKey && (domain === 'water' || domain === 'nature') ? askState : null;
  const devBasemap = !import.meta.env.VITE_ARCGIS_API_KEY;

  return (
    <div className={`app${activeAnswer ? ' has-answer' : ''}`}>
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
          {basemapFallback && <p className="dev-banner" role="status">OpenStreetMap basemap · ArcGIS is unavailable. You can still select a spot or enter coordinates.</p>}
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
          <div className="pscroll"><AskAnswer state={activeAnswer} onClose={() => setAskState(null)} /><PlacePanel selection={sel.current} domain={domain} onStations={showTideStations} onWindow={applyAskWindow} onShowFeature={showNatureFeature} onClearFeature={clearNatureHighlight} /></div>
          <AskThisPlace key={scopeKey} selection={sel.current} window={askWindow} domain={domain} scopeKey={scopeKey} onState={setAskState} />
        </aside>
      </main>
    </div>
  );
}
