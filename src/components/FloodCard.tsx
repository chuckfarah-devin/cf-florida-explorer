import { useEffect, useState } from 'react';
import type { Selection } from '../state/selection';
import type { Attributes, FemaResponse } from '../fema/types';
import { fetchFema } from '../fema/client';

export function floodSummary(zone: Attributes): string {
  const code = String(zone.FLD_ZONE).trim().toUpperCase();
  const subtype = String(zone.ZONE_SUBTY ?? '').toUpperCase();
  if (['V', 'VE'].includes(code)) return 'FEMA maps this spot in a coastal area with a 1% annual chance of flooding, where waves add to the hazard.';
  if (['A', 'AE', 'AH', 'AO', 'AR', 'A99'].includes(code)) return 'FEMA maps this spot in an area with a 1% annual chance of flooding.';
  if (code === 'X' && subtype.includes('0.2 PCT')) return 'FEMA maps this spot in an area with a 0.2% annual chance of flooding.';
  if (code === 'X' && subtype.includes('MINIMAL')) return 'FEMA maps this spot outside its 1% and 0.2% annual-chance flood areas. Flooding can still happen.';
  if (code === 'D') return "FEMA's map shows the flood hazard here as undetermined.";
  return `FEMA returned zone ${code}. Open the source details to see its classification.`;
}

function field(value: unknown): string { return value === null || value === undefined || value === '' || value === -9999 ? 'Not stated by source' : String(value); }
function date(value: unknown): string {
  if (typeof value !== 'number' || value <= 0 || !Number.isFinite(value)) return 'Not stated by source';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? 'Not stated by source' : parsed.toISOString().slice(0, 10);
}

export function FloodCard({ selection, lookup = fetchFema }: { selection: Selection; lookup?: typeof fetchFema }) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{ id: number; attempt: number; result?: FemaResponse; failed?: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    lookup(selection, controller.signal).then(
      (result) => { if (current) setResponse({ id: selection.selectionId, attempt, result }); },
      () => { if (current) setResponse({ id: selection.selectionId, attempt, failed: true }); },
    );
    return () => { current = false; controller.abort(); };
  }, [selection, attempt, lookup]);
  const active = response?.id === selection.selectionId && response.attempt === attempt ? response : null;
  const result = active?.result;
  const unavailable = active?.failed || result?.state === 'unavailable' || result?.state === 'coverage_unknown';
  const summary = !result ? '' : result.state === 'in_coverage_no_zone' ? "FEMA's map covers this spot but shows no flood zone here. That's a gap in the map, not a sign of low risk." : result.state === 'outside_nfhl_coverage' ? "FEMA's digital flood map doesn't cover this spot." : result.state === 'ambiguous_overlap' ? 'FEMA returned more than one flood-zone record at this spot. The classification is ambiguous.' : result.zones[0] ? floodSummary(result.zones[0]) : '';
  return (
    <section className="card flood-card" aria-label="FEMA flooding" aria-busy={!active}>
      <h2>Flooding</h2>
      {!active && <p role="status">Checking FEMA flood map…</p>}
      {unavailable && <p role="status">FEMA flood data is unavailable right now. This does not tell us whether this spot could flood.</p>}
      {result && <>
        {!unavailable && <p>{summary}</p>}
        {result.freshness === 'stale' && <p className="flood-notice">Saved FEMA data, retrieved {result.retrievedAtUtc} (stale). The live lookup failed.</p>}
        {result.nearbyZones.length > 0 && <p className="flood-notice">Another mapped flood zone was found within 15 m.</p>}
        {!result.boundaryCheckAvailable && <p className="flood-notice">The nearby-zone check is unavailable. We cannot tell whether another zone is nearby.</p>}
        <p className="flood-limits">A mapped-area classification, not a property forecast or a record of actual flooding.</p>
        <details className="flood-details">
          <summary>FEMA flood map · Technical details and sources</summary>
          <p>Selected point: {result.point.lat}, {result.point.lon} (WGS84 / EPSG:4326).</p>
          <p>FEMA source coordinates: NAD83 / EPSG:4269; transformation performed by FEMA's server. The transformation method is unverified. Mapped boundaries are approximate.</p>
          <p>The 15 m check radius is our choice, not FEMA's stated accuracy or a surveyed distance.</p>
          <p>Retrieved {result.retrievedAtUtc} · {result.freshness}. Batch {result.batchId}.</p>
          {result.zones.map((z, i) => <div key={i} className="flood-record">
            <p><strong>Zone {field(z.FLD_ZONE)}</strong> · {field(z.ZONE_SUBTY)}</p>
            <p>Feature {field(z.FLD_AR_ID)} · Special Flood Hazard Area: {field(z.SFHA_TF)}</p>
            {typeof z.STATIC_BFE === 'number' && z.STATIC_BFE !== -9999 && <p>Base flood elevation: {z.STATIC_BFE} · units: {field(z.LEN_UNIT)} · datum: {field(z.V_DATUM)}.</p>}
          </div>)}
          {result.nearbyZones.length > 0 && <p>Nearby zones: {result.nearbyZones.map((z) => `${field(z.FLD_ZONE)} (${field(z.ZONE_SUBTY)})`).join('; ')}. Found in our 15 m search; no surveyed boundary distance is asserted.</p>}
          {result.sources.map((s) => <div key={s.name} className="flood-record">
            <p><strong>{s.name === 'exact' ? 'Flood zones at point' : s.name === 'buffer' ? 'Nearby-zone check' : s.name === 'panels' ? 'Map panels' : s.name === 'coverage' ? 'Digital coverage' : 'Map revisions'}</strong>: {s.status === 'ok' ? `${s.records.length} record(s)` : `Unavailable (${s.status})`}</p>
            <p>FEMA NFHL layer {s.layer} · regulatory classification · {s.spatialRelation === 'buffer_intersection' ? '15 m buffer intersection' : 'point intersection'}. Evidence reference: {result.batchId}/{s.name}.</p>
            {s.name === 'panels' && s.records.map((p, i) => <p key={i}>Panel {field(p.FIRM_PAN)} · effective {date(p.EFF_DATE)} · scale 1:{field(p.SCALE)}.</p>)}
            {s.name === 'revisions' && s.records.map((r, i) => <p key={i}>A map revision exists here: {field(r.CASE_NO)} · effective {date(r.EFF_DATE)} · status {field(r.STATUS)}. Not silently merged into the classification.</p>)}
            <p>Retrieved {s.retrievedAtUtc}. <a href={s.queryUrl} target="_blank" rel="noreferrer">View FEMA query: {s.name} ↗</a></p>
          </div>)}
          {result.refreshFailures.length > 0 && <p>Unavailable in the latest lookup: {result.refreshFailures.join(', ')}.</p>}
          <p>Source: FEMA National Flood Hazard Layer. Screening context only; consult the effective FIRM and applicable map revisions for official information.</p>
          <a href="https://msc.fema.gov/portal/home" target="_blank" rel="noreferrer">Open FEMA Map Service Center ↗</a>
        </details>
      </>}
      {active && <button type="button" className="linkbtn" onClick={() => setAttempt((n) => n + 1)}>Retry FEMA lookup</button>}
    </section>
  );
}
