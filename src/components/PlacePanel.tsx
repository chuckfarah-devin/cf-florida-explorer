import { useState } from 'react';
import { formatLatLon } from '../config/bounds';
import type { Selection } from '../state/selection';
import type { DomainId } from './Header';

/** Shows only what is known in I1: the selected spot. Facts arrive in later, separately approved increments. */
export function PlacePanel({ selection, domain }: { selection: Selection | null; domain: DomainId }) {
  const [showExact, setShowExact] = useState(false);
  if (!selection) {
    return (
      <div className="place-empty">
        <div className="kicker">Explore Florida</div>
        <h1 className="serif">Pick a place to explore</h1>
        <p className="muted">Search for a town or address, click the map, or use “Select map center”.</p>
      </div>
    );
  }
  const title = selection.placeName ?? 'Selected spot';
  return (
    <div className="place" aria-live="polite">
      <div className="kicker">{domain === 'nature' ? 'Nature & Wildlife' : 'Explore this place'}</div>
      <h1 className="serif">{title}</h1>
      <button type="button" className="linkbtn" aria-expanded={showExact} onClick={() => setShowExact(!showExact)}>
        {showExact ? 'Hide exact location' : 'Show exact location'}
      </button>
      {showExact && <p className="coords">{formatLatLon(selection.point)}</p>}
      <div className="pending card">
        <h3>{domain === 'nature' ? 'Nature nearby' : 'Flooding and tides'}</h3>
        <p className="muted">
          {domain === 'nature'
            ? 'Turn on wetlands, conservation areas, aquatic preserves or shoreline under Map layers to look around. Nearby-place details come in a later step.'
            : 'FEMA flood map and NOAA tide details for this spot come in a later step. Nothing is shown here until it comes from those sources.'}
        </p>
      </div>
    </div>
  );
}
