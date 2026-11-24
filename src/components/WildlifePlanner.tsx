import { useEffect, useState } from 'react';
import { fetchWildlife } from '../wildlife/client';
import { wildlifeGroups } from '../nature/wildlife-categories';
import type { Selection } from '../state/selection';

interface RecordItem { id: number; name: string; scientificName: string; observedOn: string; url: string; reportCount?: number; distanceKm?: number; nativeStatus?: 'native' | 'introduced' | 'unknown' }
interface Results { records: RecordItem[]; retrievedAt: string; radiusKm: number; reportsLoaded?: number; canExpand?: boolean }
const places = [
  { id: 'panther', name: 'Florida Panther refuge public trails', lat: 26.17, lon: -81.35, description: 'Two daylight trails through refuge habitats.', url: 'https://www.fws.gov/refuge/florida-panther/visit-us' },
  { id: 'cypress', name: 'Big Cypress National Preserve', lat: 25.86, lon: -81.03, description: 'Explore visitor sites and walking trails.', url: 'https://www.nps.gov/bicy/planyourvisit/index.htm' },
];
function distance(a: Selection['point'], b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function restore(): { interests: string[]; stops: string[]; date: string } {
  try { const v = JSON.parse(localStorage.getItem('florida-explorer-outing') ?? '{}'); return { interests: Array.isArray(v.interests) ? v.interests.filter((s: unknown) => typeof s === 'string').slice(0, 30) : [], stops: Array.isArray(v.stops) ? v.stops.filter((s: unknown) => typeof s === 'string' && places.some((p) => p.id === s)) : [], date: typeof v.date === 'string' ? v.date : '' }; } catch { return { interests: [], stops: [], date: '' }; }
}
export function WildlifePlanner({ selection }: { selection: Selection }) {
  const [view, setView] = useState<'wildlife' | 'plan'>('wildlife');
  const [plan, setPlan] = useState(restore);
  const [attempt, setAttempt] = useState(0);
  const [depth, setDepth] = useState(1);
  const [group, setGroup] = useState('all');
  const [animalType, setAnimalType] = useState('all');
  const [status, setStatus] = useState('all');
  const types = wildlifeGroups.find((g) => g.id === group)?.types ?? [];
  const [result, setResult] = useState<{ key: string; data?: Results; error?: boolean; busy?: boolean }>();
  const key = `${selection.selectionId}/${selection.point.lat}/${selection.point.lon}/${attempt}/${group}/${animalType}/${status}/${depth}`;
  useEffect(() => { try { localStorage.setItem('florida-explorer-outing', JSON.stringify(plan)); } catch { /* Storage may be disabled. */ } }, [plan]);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    fetchWildlife(JSON.stringify({ ...selection.point, group, type: animalType, status, depth }), controller.signal)
      .then(async (r) => { if (!r.ok) throw new Error(r.status === 429 ? 'rate_limit' : 'lookup_error'); return await r.json() as Results; })
      .then((data) => { if (current) setResult({ key, data }); }, (error) => { if (current) setResult({ key, error: true, busy: error instanceof Error && error.message === 'rate_limit' }); });
    return () => { current = false; controller.abort(); };
  }, [key, selection.point, group, animalType, status, depth]);
  const active = result?.key === key ? result : undefined;
  const toggle = (field: 'interests' | 'stops', value: string) => setPlan((p) => ({ ...p, [field]: p[field].includes(value) ? p[field].filter((s) => s !== value) : [...p[field], value] }));
  const nearby = places.filter((p) => distance(selection.point, p) <= 100).sort((a, b) => distance(selection.point, a) - distance(selection.point, b));
  return <section className="card wildlife-planner" aria-label="Wildlife and day planner">
    <nav aria-label="Wildlife views"><button type="button" aria-pressed={view === 'wildlife'} onClick={() => setView('wildlife')}>Wildlife nearby</button><button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Plan a day</button></nav>
    {view === 'wildlife' ? <><h2>Wildlife people have reported</h2><div className="wildlife-filters"><label>Native status <select value={status} onChange={(e) => { setStatus(e.target.value); setDepth(1); }}><option value="all">All wildlife</option><option value="native">Native</option><option value="introduced">Non-native / introduced</option></select></label><label>Animal group <select value={group} onChange={(e) => { setGroup(e.target.value); setAnimalType('all'); setDepth(1); }}><option value="all">All animals</option>{wildlifeGroups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>{types.length > 0 && <label>Animal type <select value={animalType} onChange={(e) => { setAnimalType(e.target.value); setDepth(1); }}><option value="all">All in this group</option>{types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>}</div><p className="nature-caption">Recent iNaturalist reports · closest loaded first · within 31.1 mi · counts from returned reports</p>
      {!active && <p role="status">Finding sightings…</p>}
      {active?.error && <p role="status">{active.busy ? 'Sightings source is busy. Try again in a minute.' : 'Couldn’t load sightings.'}</p>}
      {active?.data && <>{active.data.records.length === 0 ? <p>No sightings found in the connected sources.</p> : <ul className="wildlife-records">{active.data.records.map((r) => <li key={r.id}><strong>{r.name}</strong><span className="wildlife-status">{r.reportCount ?? 1} {(r.reportCount ?? 1) === 1 ? 'report' : 'reports'}</span><span className="wildlife-status">{r.nativeStatus === 'native' ? 'Native' : r.nativeStatus === 'introduced' ? 'Non-native' : 'Status unknown'}</span><p className="nature-caption">{r.scientificName} · closest report {r.observedOn}{r.distanceKm !== undefined && ` · about ${(r.distanceKm / 1.609344).toFixed(1)} mi away`}</p><a href={r.url} target="_blank" rel="noreferrer">View closest report ↗</a> <button type="button" aria-pressed={plan.interests.includes(r.name)} onClick={() => toggle('interests', r.name)}>{plan.interests.includes(r.name) ? 'Remove interest' : 'Add to interests'}</button></li>)}</ul>}<p className="nature-caption">{active.data.records.length} unique animals{active.data.reportsLoaded !== undefined && ` from ${active.data.reportsLoaded} loaded reports`}</p>{active.data.canExpand && depth === 1 && <button type="button" onClick={() => setDepth(2)}>Search more reports</button>}<details><summary>Source details</summary><p>iNaturalist · research-grade public records · up to 100 recent reports initially, or 200 with Search more reports, grouped by scientific name and sorted by closest distance. Counts refer to these returned reports, not all reports in the region. Retrieved {active.data.retrievedAt}. Native status is iNaturalist’s classification where the observation was reported. Non-native does not automatically mean invasive. Exact animal locations are not displayed.</p></details></>}
      <p><a href="https://app.myfwc.com/hsc/PantherSightings/Home/Locations" target="_blank" rel="noreferrer">Explore FWC panther reports ↗</a></p>
      <button type="button" className="linkbtn" onClick={() => setAttempt((n) => n + 1)}>Refresh sightings</button>
    </> : <><h2>Plan a nature day</h2><label>Trip date <input type="date" value={plan.date} onChange={(e) => setPlan((p) => ({ ...p, date: e.target.value }))} /></label><p>Wildlife interests: {plan.interests.join(', ') || 'None selected'}</p>
      {plan.interests.length > 0 && <button type="button" className="linkbtn" onClick={() => setPlan((p) => ({ ...p, interests: [] }))}>Clear interests</button>}
      <h3>Public places to explore</h3><p className="nature-caption">Curated visitor sites within 62.1 mi · southwest Florida starter collection</p>
      {nearby.length === 0 && <p>No curated visitor sites found near this spot yet.</p>}
      {nearby.map((p) => <article className="outing-stop" key={p.id}><h4>{p.name}</h4><p>{p.description}</p><a href={p.url} target="_blank" rel="noreferrer">Visitor information & conditions ↗</a><button type="button" aria-pressed={plan.stops.includes(p.id)} onClick={() => toggle('stops', p.id)}>{plan.stops.includes(p.id) ? 'Remove stop' : 'Add stop'}</button></article>)}
      <h3>Your day plan</h3>{plan.stops.length === 0 ? <p>No stops added.</p> : <ol>{plan.stops.map((id) => { const p = places.find((p) => p.id === id)!; return <li key={id}><a href={p.url} target="_blank" rel="noreferrer">{p.name} ↗</a> <button type="button" onClick={() => toggle('stops', id)} aria-label={`Remove ${p.name}`}>Remove</button></li>; })}</ol>}
      <p className="nature-caption">Saved on this device. Weather, flood conditions and closures: not checked.</p>
    </>}
  </section>;
}
