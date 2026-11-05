import { useState } from 'react';
import { REFERENCE_LAYERS, type LayerStatus, type ReferenceLayerId } from '../config/layers';

interface Props {
  enabled: Record<ReferenceLayerId, boolean>;
  status: Record<ReferenceLayerId, LayerStatus>;
  onToggle: (id: ReferenceLayerId) => void;
  onRetry: (id: ReferenceLayerId) => void;
  onClose?: () => void;
}

const STATUS_TEXT: Record<LayerStatus, string> = { off: '', loading: 'Loading…', visible: 'Shown', error: "Couldn't load" };

export function LayerPanel({ enabled, status, onToggle, onRetry, onClose }: Props) {
  const [openInfo, setOpenInfo] = useState<ReferenceLayerId | null>(null);
  return (
    <section className="layers" aria-labelledby="layers-title">
      <div className="layers-head">
        <h2 id="layers-title">Map layers</h2>
        {onClose && <button type="button" className="linkbtn" onClick={onClose}>Done</button>}
      </div>
      <ul>
        {REFERENCE_LAYERS.map((l) => {
          const st = status[l.id];
          return (
            <li key={l.id} className="lrow">
              <span className="swatch" style={{ background: l.swatch }} aria-hidden="true" />
              <span className="lname">
                <button type="button" className="lname-btn" aria-expanded={openInfo === l.id} aria-controls={`info-${l.id}`}
                  onClick={() => setOpenInfo(openInfo === l.id ? null : l.id)}>
                  {l.label}
                </button>
                <span className="lsub">{l.sourceLabel}</span>
                {l.id === 'flood' && enabled[l.id] && <span className="lsub">Zoom in for flood shading and legend</span>}
                {enabled[l.id] && st !== 'off' && (
                  <span className={`lstatus ${st}`} role={st === 'error' ? 'alert' : 'status'}>
                    {STATUS_TEXT[st]}
                    {st === 'error' && <button type="button" className="linkbtn" onClick={() => onRetry(l.id)}>Retry</button>}
                  </span>
                )}
              </span>
              <label className="toggle">
                <input type="checkbox" role="switch" checked={enabled[l.id]} onChange={() => onToggle(l.id)} aria-label={`Show ${l.label}`} />
                <span aria-hidden="true" />
              </label>
              {openInfo === l.id && (
                <div id={`info-${l.id}`} className="linfo">
                  <p>{l.about}</p>
                  <p><strong>Source:</strong> {l.provider}</p>
                  <p><strong>Limits:</strong> {l.limitation}</p>
                  <p><a href={l.sourcePage} target="_blank" rel="noreferrer">About this data ↗</a></p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="lnote">Layers help you look around. Flood and nature facts come from separate source lookups for your selected point, not from the map shading.</p>
    </section>
  );
}
