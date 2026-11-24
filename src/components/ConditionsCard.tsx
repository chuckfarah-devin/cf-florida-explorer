import { useEffect, useState } from 'react';
import type { Selection } from '../state/selection';
import type { Conditions } from '../../server/conditions';

const time = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: 'America/New_York' }).format(new Date(value));
export function ConditionsCard({ selection }: { selection: Selection }) {
  const [attempt, retry] = useState(0);
  const [state, setState] = useState<{ key: string; data?: Conditions; error?: boolean }>();
  const key = `${selection.selectionId}/${selection.point.lat}/${selection.point.lon}/${attempt}`;
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    fetch('/api/conditions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection.point), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(40000)]) })
      .then(async r => { if (!r.ok) throw new Error(); const d: Conditions = await r.json(); if (d.point?.lat !== selection.point.lat || d.point?.lon !== selection.point.lon || !Number.isFinite(Date.parse(d.checkedAt))) throw new Error(); return d; })
      .then(data => { if (current) setState({ key, data }); }, () => { if (current) setState({ key, error: true }); });
    return () => { current = false; controller.abort(); };
  }, [selection.point, key]);
  const active = state?.key === key ? state : undefined;
  const d = active?.data;
  const forecast = `https://forecast.weather.gov/MapClick.php?lat=${selection.point.lat}&lon=${selection.point.lon}`;
  return <section className="card conditions-card" aria-label="Conditions now" aria-busy={!active}>
    <div className="kicker">Around your selected spot</div><h2>Conditions now</h2>
    <p>Weather, reported road incidents and nearby cameras.</p>
    {!active && <p role="status">Checking current sources…</p>}
    {active?.error && <p role="status">Couldn’t check conditions. Try again.</p>}
    {d && <>
      <p className="nature-caption">Checked {time(d.checkedAt)} · source results may be cached for 2 minutes</p>
      <div className="conditions-section"><h3>Weather alerts</h3>
        {d.alerts.state !== 'ok' ? <p>Alerts unavailable.</p> : d.alerts.items.length === 0 ? <p>No active NWS alerts returned for this spot.</p> : d.alerts.items.map((a,i) => <details key={i} className="conditions-alert"><summary>{a.title}</summary><p style={{ whiteSpace: 'pre-line' }}>{a.description}</p>{a.expires && <p>Expires {time(a.expires)}</p>}</details>)}
        <a href={forecast} target="_blank" rel="noreferrer">Local NWS weather and alerts</a>
      </div>
      <div className="conditions-section"><h3>Nearby weather station</h3>
        {d.observation.state !== 'ok' ? <p>Current station report unavailable.</p> : <>
          <p><strong>{d.observation.description || 'Station report'}</strong>{d.observation.temperatureF != null && ` · ${Math.round(d.observation.temperatureF)}°F`}</p>
          <p>{d.observation.station} · {d.observation.distanceMiles?.toFixed(1)} mi away</p>
          <p>{d.observation.timestamp && time(d.observation.timestamp)}{d.observation.stale && ' · Older report (more than 2 hours)'}</p>
          <p>{d.observation.rainLastHourInches == null ? 'Past-hour rainfall not reported.' : `Past-hour rainfall at station: ${d.observation.rainLastHourInches.toFixed(2)} in`}</p>
          <p className="nature-caption">Station conditions may differ at your spot. Rainfall is not road-water depth.</p>
        </>}
        <div className="conditions-links"><a href="https://radar.weather.gov/region/southeast/standard" target="_blank" rel="noreferrer">Open live rain radar</a><a href="https://water.noaa.gov/precip" target="_blank" rel="noreferrer">Recent rainfall map</a></div>
      </div>
      <div className="conditions-section"><h3>Reported road incidents nearby</h3><p className="nature-caption">Within 15 mi · straight-line distance, not a checked route</p>
        {d.roads.state !== 'ok' ? <p>Road reports unavailable.</p> : d.roads.items.length === 0 ? <p>No nearby incidents returned by FHP. Roads have not been confirmed clear.</p> : <ul className="conditions-list">{d.roads.items.map((r,i) => <li key={i}><strong>{r.kind}</strong> · {r.distanceMiles.toFixed(1)} mi<p>{r.location}</p><p>{r.remarks || 'No road-status detail provided.'}</p><p className="nature-caption">Received {r.received} · time as published by FHP</p></li>)}</ul>}
        <div className="conditions-links"><a href="https://trafficincidents.flhsmv.gov/SmartWebClient/CadView.aspx" target="_blank" rel="noreferrer">FHP live road report</a><a href="https://www.fl511.com/" target="_blank" rel="noreferrer">FL511 closures and traffic map</a></div>
      </div>
      <div className="conditions-section"><h3>Cameras nearby</h3>
        {d.cameras.state === 'outside_coverage' ? <p>Local camera listings aren’t connected here yet. Use FL511 for cameras across Florida.</p> : d.cameras.state === 'unavailable' ? <p>County camera list unavailable.</p> : !d.cameras.items.length ? <p>No connected county cameras found within 15 mi.</p> : <ul className="conditions-list">{d.cameras.items.map(c => <li key={c.url}><a href={c.url} target="_blank" rel="noreferrer">{c.name}</a> · {c.distanceMiles.toFixed(1)} mi</li>)}</ul>}
        <a href="https://www.fl511.com/" target="_blank" rel="noreferrer">Open statewide traffic cameras</a>
        <p className="nature-caption">Camera links open the source viewer. Check its image time; a listed camera may be offline.</p>
      </div>
      <p className="conditions-note">No flooding reported does not mean a road is clear. Never drive through floodwater. Route comparison is not connected yet.</p>
    </>}
    {active && <button type="button" className="linkbtn" onClick={() => retry(n => n + 1)}>Refresh conditions</button>}
  </section>;
}
