import { useState } from 'react';
import { parseCoordinates, type LatLon } from '../config/bounds';

export interface PlaceCandidate { name: string; point: LatLon }
interface Props {
  onCoordinates: (p: LatLon) => void;
  onPlace: (c: PlaceCandidate) => void;
  findPlaces: (text: string) => Promise<PlaceCandidate[]>;
}

export function SearchBox({ onCoordinates, onPlace, findPlaces }: Props) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<PlaceCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const coords = parseCoordinates(text);
    if (coords) { setResults(null); onCoordinates(coords); return; }
    if (!text.trim()) return;
    try {
      const found = await findPlaces(text.trim());
      setResults(found);
      if (found.length === 0) setError('No Florida places found.');
    } catch {
      setError('Place search is unavailable right now. You can still enter coordinates.');
    }
  }

  return (
    <div className="search-wrap">
      <form role="search" className="search" onSubmit={submit}>
        <label htmlFor="place-search" className="sr-only">Search a Florida place, address or coordinates</label>
        <input id="place-search" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search a Florida place or lat, lon" autoComplete="off" />
        <button type="submit" className="search-btn">Search</button>
      </form>
      {error && <p className="search-msg" role="status">{error}</p>}
      {results && results.length > 0 && (
        <ul className="search-results" aria-label="Search results">
          {results.map((r) => (
            <li key={`${r.name}-${r.point.lat}`}>
              <button type="button" onClick={() => { setResults(null); onPlace(r); }}>{r.name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
