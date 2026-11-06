import { useEffect, useState } from 'react';
import type { Selection } from '../state/selection';
interface InfraSource { id: string; label: string; state: 'ok' | 'error'; records: { name: string; canal?: string }[]; queryUrl: string; retrievedAt: string }
interface InfrastructureResults { sources: InfraSource[] }
export function InfrastructureCard({ selection }: { selection: Selection }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; data?: InfrastructureResults; error?: boolean }>();
  const key = `${selection.selectionId}/${selection.point.lat}/${selection.point.lon}/${attempt}`;
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    fetch('/api/infrastructure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection.point), signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); return await r.json() as InfrastructureResults; })
      .then((data) => { if (current) setState({ key, data }); }, () => { if (current) setState({ key, error: true }); });
    return () => { current = false; controller.abort(); };
  }, [selection.point, key]);
  const active = state?.key === key ? state : undefined;
  return <section className="card infrastructure-card" aria-label="Drainage and infrastructure">
    <div className="kicker">Land & Infrastructure</div><h2>Where does the water go?</h2>
    <p>Explore the mapped watershed, canals and water-control structures around this spot.</p>
    {!active && <p role="status">Checking drainage maps…</p>}
    {active?.error && <p role="status">Couldn’t load drainage maps.</p>}
    {active?.data?.sources.map((source) => <div className="infrastructure-source" key={source.id}><h3>{source.label}</h3>
      {source.state === 'error' ? <p role="status">Couldn’t load this source.</p> : source.records.length === 0 ? <p>No named features found in this source.</p> : <ul>{source.records.map((record) => <li key={`${record.name}/${record.canal}`}><strong>{record.name}</strong>{record.canal && <span> · Canal: {record.canal}</span>}</li>)}</ul>}
      <details><summary>SFWMD · Source details</summary><p>{source.id === 'watershed' ? 'Mapped watershed intersecting the selected point.' : 'Mapped features intersecting a 3.1 mi search around the selected point. Nearby features are not a traced drain connection.'}</p><p>Retrieved {source.retrievedAt}.</p><a href="https://www.sfwmd.gov/science-data/gis" target="_blank" rel="noreferrer">Explore SFWMD maps ↗</a><p><a href={source.queryUrl} target="_blank" rel="noreferrer">Technical source data (JSON) ↗</a></p></details>
    </div>)}
    <details className="infrastructure-help"><summary>Find a drain’s pipe and outlet records</summary><p>Look for the stormwater as-built drawings, drainage plan or permit for the street or property. These identify inlets, pipe connections and outfalls.</p><p><a href="https://discover.pbcgov.org/engineering/Pages/Stormwater-Section.aspx" target="_blank" rel="noreferrer">Palm Beach County Stormwater ↗</a></p><p><a href="https://www.sfwmd.gov/science-data/gis" target="_blank" rel="noreferrer">SFWMD mapping and data ↗</a></p></details>
    {active && <button type="button" className="linkbtn" onClick={() => setAttempt((n) => n + 1)}>Retry drainage lookup</button>}
  </section>;
}
