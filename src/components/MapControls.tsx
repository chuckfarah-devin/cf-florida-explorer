interface Props { onZoomIn: () => void; onZoomOut: () => void; onSelectCenter: () => void; onLayers: () => void; layersOpen: boolean }

/** Every map control has a visible text label that matches its accessible name (N32). */
export function MapControls({ onZoomIn, onZoomOut, onSelectCenter, onLayers, layersOpen }: Props) {
  return (
    <>
      <div className="mapctl">
        <button type="button" onClick={onLayers} aria-expanded={layersOpen} className="ctl ctl-layers">Map layers</button>
        <button type="button" onClick={onZoomIn} className="ctl">+ Zoom in</button>
        <button type="button" onClick={onZoomOut} className="ctl">− Zoom out</button>
      </div>
      <button type="button" className="selcenter" onClick={onSelectCenter}>⊕ Select map center</button>
    </>
  );
}
