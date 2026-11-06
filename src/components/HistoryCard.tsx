import { useEffect, useState } from 'react';
import type { Selection } from '../state/selection';
import { localHistory } from '../nature/local-history';
interface HistoricalPlace { id: number; title: string; markerYear: string; city: string; county: string; address: string; excerpt: string; url: string; distanceKm: number }
interface HistoryResults { records: HistoricalPlace[]; retrievedAt: string; radiusKm: number }
export function HistoryCard({ selection }: { selection: Selection }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; data?: HistoryResults; error?: boolean }>();
  const key = `${selection.selectionId}/${selection.point.lat}/${selection.point.lon}/${attempt}`;
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection.point), signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); return await r.json() as HistoryResults; })
      .then((data) => { if (current) setState({ key, data }); }, () => { if (current) setState({ key, error: true }); });
    return () => { current = false; controller.abort(); };
  }, [selection.point, key]);
  const active = state?.key === key ? state : undefined;
  const story = localHistory(selection.point);
  return <section className="card history-card" aria-label="History near this place" aria-busy={!active}>
    <div className="kicker">Stories behind the landscape</div><h2>History near this place</h2>
    <p>Explore local stories and Florida’s historical markers.</p>
    {story && <article className="local-history"><p className="kicker">{story.scope}</p><h3>{story.title}</h3><ol className="history-places">{story.events.map((event) => <li key={event.date}><strong>{event.date} · {event.title}</strong><p>{event.text}</p><a href={event.url} target="_blank" rel="noreferrer">{event.source} ↗</a></li>)}</ol></article>}
    <h3>Historical markers nearby</h3>
    <p className="nature-caption">Closest first · within 31.1 mi</p>
    {!active && <p role="status">Finding historical places…</p>}
    {active?.error && <p role="status">Couldn’t load historical places.</p>}
    {active?.data && <>{active.data.records.length === 0 ? <p>No historical markers found nearby.</p> : <ol className="history-places">{active.data.records.map((r) => <li key={r.id}><h3>{r.title}</h3><p className="history-distance">About {(r.distanceKm / 1.609344).toFixed(1)} mi away{r.city && ` · ${r.city}`}</p>{r.excerpt && <p>{r.excerpt}</p>}{r.address && <p className="nature-caption">Marker location: {r.address}</p>}<p className="nature-caption">{r.markerYear ? `Marker year: ${r.markerYear}` : 'Marker year not listed'}{r.county && ` · ${r.county} County`}</p><a href={r.url} target="_blank" rel="noreferrer">Read the state’s marker record ↗</a></li>)}</ol>}
      <details><summary>Florida historical markers · Source details</summary><p>Florida Department of State, Division of Historical Resources. Up to eight closest markers in the state’s published map, within 31.1 mi. Distances are straight-line estimates to marker locations. Marker year is the source’s marker date, not the date of every event in its text.</p><p>Retrieved {active.data.retrievedAt}.</p><a href="https://markers.flheritage.com/home/map" target="_blank" rel="noreferrer">Open the official marker map ↗</a></details>
    </>}
    {active && <button type="button" className="linkbtn" onClick={() => setAttempt((n) => n + 1)}>Retry history lookup</button>}
  </section>;
}
