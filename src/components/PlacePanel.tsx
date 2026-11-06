import { useState } from 'react';
import { formatLatLon } from '../config/bounds';
import type { Selection } from '../state/selection';
import type { DomainId } from './Header';
import { FloodCard } from './FloodCard';
import { TideCard } from './TideCard';
import type { TideStationMarker } from '../map/noaaStations';
import type { TideRequest } from '../noaa/types';
import { InfrastructureCard } from './InfrastructureCard';
import { HistoryCard } from './HistoryCard';
import { WildlifePlanner } from './WildlifePlanner';
import { NatureCard } from './NatureCard';
import type { NatureFeature } from '../nature/types';

/** Shows only what is known in I1: the selected spot. Facts arrive in later, separately approved increments. */
export function PlacePanel({ selection, domain, onStations, onWindow, onShowFeature, onClearFeature }: { selection: Selection | null; domain: DomainId; onStations?: (stations: TideStationMarker[]) => void; onWindow?: (window: TideRequest) => void; onShowFeature?: (feature: NatureFeature) => void; onClearFeature?: () => void }) {
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
      <div className="kicker">{domain === 'history' ? 'History & Change' : domain === 'nature' ? 'Nature & Wildlife' : 'Explore this place'}</div>
      <h1 className="serif">{title}</h1>
      <button type="button" className="linkbtn" aria-expanded={showExact} onClick={() => setShowExact(!showExact)}>
        {showExact ? 'Hide exact location' : 'Show exact location'}
      </button>
      {showExact && <p className="coords">{formatLatLon(selection.point)}</p>}
      {domain === 'land' && <InfrastructureCard selection={selection} />}
      {domain === 'history' && <HistoryCard selection={selection} />}
      {domain === 'water' && <FloodCard selection={selection} />}
      {domain === 'water' && <TideCard selection={selection} onStations={onStations} onWindow={onWindow} />}
      {domain === 'nature' && <WildlifePlanner selection={selection} />}
      {domain === 'nature' && <NatureCard selection={selection} onShowFeature={onShowFeature} onClearFeature={onClearFeature} />}
    </div>
  );
}
