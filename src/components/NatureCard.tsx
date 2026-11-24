import { useEffect, useState } from 'react';
import type { Selection } from '../state/selection';
import type { NatureFeature, NatureResponse, NatureSourceId } from '../nature/types';
import { fetchNature } from '../nature/client';

const labels: Record<NatureSourceId, string> = { wetlands: 'Wetlands inventory', conservation: 'Florida conservation lands', preserves: 'Florida aquatic preserves', nearby: 'Nearby conservation lands' };
const providers: Record<NatureSourceId, string> = { wetlands: 'U.S. Fish & Wildlife Service National Wetlands Inventory, hosted by Florida DEP', conservation: 'Florida DEP / Florida Natural Areas Inventory', preserves: 'Florida DEP Division of State Lands', nearby: 'Florida DEP / Florida Natural Areas Inventory' };
function FeatureName({ feature, onShowFeature }: { feature: NatureFeature; onShowFeature?: (feature: NatureFeature) => void }) {
  return <div className="nature-feature"><div><strong>{feature.name}</strong>{feature.agency && <p className="nature-caption">Managed by {feature.agency}</p>}</div>{feature.geometry && onShowFeature && <button type="button" className="nature-map-button" onClick={() => onShowFeature(feature)} aria-label={`Show ${feature.name} on map`}>Show on map</button>}</div>;
}

export function NatureCard({ selection, lookup = fetchNature, onShowFeature, onClearFeature }: { selection: Selection; lookup?: typeof fetchNature; onShowFeature?: (feature: NatureFeature) => void; onClearFeature?: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{ key: string; result?: NatureResponse; failed?: boolean } | null>(null);
  const key = `${selection.selectionId}/${selection.point.lat}/${selection.point.lon}/${attempt}`;
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    lookup(selection, controller.signal).then((result) => { if (current) setResponse({ key, result }); }, () => { if (current) setResponse({ key, failed: true }); });
    return () => { current = false; controller.abort(); };
  }, [selection, attempt, key, lookup]);
  const active = response?.key === key ? response : null;
  const result = active?.result;
  const source = (id: NatureSourceId) => result?.sources.find((s) => s.id === id);
  return <section className="card nature-card" aria-label="Nature at this place" aria-busy={!active}>
    <h2>Nature at this place</h2>
    <p>Explore mapped habitats and protected places around your spot.</p>
    {!active && <p role="status">Checking wetlands and protected-area maps…</p>}
    {active?.failed && <p role="status">Nature maps are unavailable right now. We cannot tell whether this spot overlaps a mapped feature.</p>}
    {result && <>
      <div className="nature-point"><h3>At your selected spot</h3>
        <h4>Wetlands & water habitats</h4>
        {source('wetlands')?.state !== 'ok' ? <p className="nature-notice">Wetland lookup unavailable. No presence or absence is inferred.</p> : source('wetlands')!.features.length === 0 ? <p>No wetland or deepwater feature was returned by this inventory at your spot. Some habitats are not mapped.</p> : <ul className="nature-matches">{source('wetlands')!.features.map((feature) => <li key={feature.id}><strong>{feature.wetlandType ?? feature.name}</strong>{feature.code && <span className="nature-caption"> · inventory code {feature.code}</span>}</li>)}</ul>}
        <p className="nature-caption">The inventory includes wetlands and deepwater habitats. A mapped water feature is not necessarily a wetland, and this map is not a regulatory wetland survey.</p>
        <h4>Conservation land</h4>
        {source('conservation')?.state !== 'ok' ? <p className="nature-notice">Conservation-land lookup unavailable. We cannot determine membership.</p> : source('conservation')!.features.length === 0 ? <p>No conservation-land polygon was returned at your spot.</p> : <><p>Your spot intersects these mapped conservation areas:</p>{source('conservation')!.features.map((feature) => <FeatureName key={feature.id} feature={feature} onShowFeature={onShowFeature} />)}</>}
        <h4>Aquatic preserves</h4>
        {source('preserves')?.state !== 'ok' ? <p className="nature-notice">Aquatic-preserve lookup unavailable. We cannot determine membership.</p> : source('preserves')!.features.length === 0 ? <p>No aquatic-preserve polygon was returned at your spot.</p> : <><p>Your spot intersects these mapped aquatic preserves:</p>{source('preserves')!.features.map((feature) => <FeatureName key={feature.id} feature={feature} onShowFeature={onShowFeature} />)}</>}
      </div>
      <div className="nature-nearby"><h3>Protected places nearby</h3><p className="nature-caption">Up to five closest mapped areas in a provisional 3.1 mi search. Distances are straight-line estimates to mapped polygon boundaries, not walking routes or entrances.</p>
        {source('nearby')?.state !== 'ok' ? <p className="nature-notice">The nearby-place search is unavailable. This does not mean there are no protected places nearby.</p> : result.nearby.length === 0 ? <p>No conservation-area boundaries were returned within this search radius.</p> : <ul className="nature-nearby-list">{result.nearby.map((feature) => <li key={feature.id}><FeatureName feature={feature} onShowFeature={onShowFeature} /><p className="nature-distance">{feature.inside ? 'Your spot is inside this mapped area' : `${((feature.distanceMeters ?? 0) / 1609.344).toFixed(2)} mi${feature.bearing ? ` ${feature.bearing}` : ''} to mapped boundary`}</p></li>)}</ul>}
        <p className="nature-access">Protected does not always mean open to the public. Check with the managing agency before visiting.</p>
      </div>
      <p className="nature-caption">Mapped boundaries are approximate. These records do not show wildlife sightings, establish that a species lives here, or describe where floodwater went.</p>
      <details className="nature-details"><summary>Nature maps · Sources and details</summary>
        <p>Selected point: {result.point.lat}, {result.point.lon} · WGS84 / EPSG:4326.</p><p>Source maps use NAD83(2011) / Florida GDL Albers. Florida DEP transforms the queries and returned geometry; the transformation method is unverified. Mapped boundaries are not surveyed property lines.</p>
        {result.sources.map((s) => <div className="nature-source" key={s.id}><h4>{labels[s.id]}</h4><p>{providers[s.id]}</p><p>{s.id === 'nearby' ? 'Nearby boundary search, 3.1 mi' : 'Exact selected-point intersection'} · {s.state === 'ok' ? `${s.features.length} record(s)` : 'Unavailable'} · retrieved {s.retrievedAtUtc}.</p><a href={s.queryUrl} target="_blank" rel="noreferrer">View {labels[s.id]} query ↗</a></div>)}
        <p>Retrieved for this comparison: {result.retrievedAtUtc}. Mapping dates vary by area; retrieval time is not the imagery or survey date.</p>
      </details>
    </>}
    {active && <button type="button" className="linkbtn" onClick={() => { onClearFeature?.(); setAttempt((value) => value + 1); }}>Retry nature lookup</button>}
  </section>;
}
