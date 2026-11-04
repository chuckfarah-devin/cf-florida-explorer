import { useEffect, useId, useState } from 'react';
import type { Selection } from '../state/selection';
import { fetchTides } from '../noaa/client';
import type { TideProduct, TideRequest, TideResponse, TideRow } from '../noaa/types';
import type { TideStationMarker } from '../map/noaaStations';
import { TideChart } from './TideChart';

const initialWindow: TideRequest = { startDate: '2026-10-25', endDate: '2026-10-29', datum: 'MLLW' };
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
const datumLabel = (datum: TideRequest['datum']) => datum === 'NAVD' ? 'NAVD88' : 'MLLW';
const flagged = (row: TideRow) => row.flags?.split(',').some((flag) => flag.trim() !== '' && flag.trim() !== '0');
export function validTideWindow(window: TideRequest): boolean {
  const start = Date.parse(`${window.startDate}T00:00:00Z`);
  const end = Date.parse(`${window.endDate}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(window.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(window.endDate) && Number.isFinite(start) && Number.isFinite(end) && new Date(start).toISOString().slice(0, 10) === window.startDate && new Date(end).toISOString().slice(0, 10) === window.endDate && end >= start && (end - start) / 86_400_000 < 30;
}

function quality(rows: TideRow[]): string {
  if (rows.some((r) => r.quality === 'preliminary')) return 'Preliminary data; may change';
  if (rows.length && rows.every((r) => r.quality === 'verified')) return 'Verified';
  return 'Quality not stated';
}

function ProductTable({ product, datum }: { product: TideProduct; datum: TideRequest['datum'] }) {
  const observed = product.product === 'water_level';
  if (product.state !== 'ok') return <p className="tide-notice">{observed ? 'Measured water levels' : 'Predicted tides'}: {product.state === 'datum_unavailable' ? 'this height reference is not available for this station. Try MLLW; no conversion was assumed.' : product.state === 'no_data' ? 'NOAA returned no data for this period. This is not evidence that water levels were low.' : 'unavailable right now. Other station results remain separate.'}</p>;
  const grouped = new Map<string, TideRow[]>();
  for (const row of product.rows) {
    if (!observed && row.kind !== 'H') continue;
    const day = dayFormat.format(new Date(row.timeUtc));
    grouped.set(day, [...(grouped.get(day) ?? []), row]);
  }
  const rows = observed
    ? [...grouped.values()].map((samples) => ({ row: samples.reduce((best, row) => row.value > best.value ? row : best), samples }))
    : product.rows.filter((row) => row.kind === 'H').map((row) => ({ row, samples: [row] }));
  return <>
    <h4>{observed ? 'Daily measured maximum' : 'Predicted high tides'}</h4>
    <p className="tide-caption">Feet · {datumLabel(datum)} · America/New_York (EST/EDT). {observed ? 'Maximum among returned 6-minute samples, not a surveyed flood depth.' : 'Astronomical tide predictions, not measured water levels or a weather forecast.'}</p>
    {!rows.length ? <p>No {observed ? 'measured samples' : 'high tides'} were returned for this period.</p> : <div className="tide-table-wrap" tabIndex={0} role="region" aria-label={observed ? 'Daily measured maxima table' : 'Predicted high tides table'}><table className="tide-table">
      <caption className="sr-only">{observed ? 'Measured water levels' : 'Predicted high tides'} in feet {datumLabel(datum)}, local times</caption>
      <thead><tr><th scope="col">Local date and time</th><th scope="col">Height (ft)</th><th scope="col">{observed ? 'Quality / samples' : 'Type'}</th></tr></thead>
      <tbody>{rows.map(({ row, samples }) => <tr key={row.timeUtc}><th scope="row">{timeFormat.format(new Date(row.timeUtc))}</th><td>{row.value.toFixed(3)}</td><td>{observed ? `${quality(samples)} · ${samples.length} sample${samples.length === 1 ? '' : 's'}` : 'Predicted high'}</td></tr>)}</tbody>
    </table></div>}
    {observed && <p className="tide-caption">A full ordinary day has 240 six-minute samples (230 or 250 on daylight-saving transitions). Missing samples can hide a higher water level. {product.rows.filter(flagged).length} sample(s) carry nonzero NOAA flags; inspect flagged records before interpreting the maximum. Returned flagged samples are included.</p>}
  </>;
}

export function TideCard({ selection, lookup = fetchTides, onStations }: { selection: Selection; lookup?: typeof fetchTides; onStations?: (stations: TideStationMarker[]) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<TideRequest>(initialWindow);
  const [request, setRequest] = useState({ window: initialWindow, attempt: 0 });
  const [error, setError] = useState('');
  const [response, setResponse] = useState<{ key: string; result?: TideResponse; failed?: boolean } | null>(null);
  const key = `${selection.selectionId}/${selection.point.lat}/${selection.point.lon}/${request.window.startDate}/${request.window.endDate}/${request.window.datum}/${request.attempt}`;
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    lookup(selection, request.window, controller.signal).then(
      (result) => { if (current) setResponse({ key, result }); },
      () => { if (current) setResponse({ key, failed: true }); },
    );
    return () => { current = false; controller.abort(); };
  }, [selection, request, key, lookup]);
  const active = response?.key === key ? response : null;
  const result = active?.result;
  useEffect(() => {
    onStations?.(result?.stations.map((station) => ({ id: station.id, name: station.name, lat: station.lat, lon: station.lon, waterBody: station.waterBody, observed: station.products.some((product) => product.product === 'water_level') })) ?? []);
    return () => onStations?.([]);
  }, [result, onStations]);
  return <section className="card tide-card" aria-label="NOAA tides nearby">
    <h2>Tides nearby</h2>
    <p>Compare tides at nearby stations—not water in these streets.</p>
    <form className="tide-form" onSubmit={(event) => {
      event.preventDefault();
      if (!validTideWindow(draft)) { setError('Choose valid dates in order, covering no more than 30 days.'); return; }
      setError(''); setRequest({ window: { ...draft }, attempt: request.attempt + 1 });
    }}>
      <fieldset><legend>Comparison period · local Florida dates</legend>
        <label htmlFor={`${id}-start`}>Start date<input id={`${id}-start`} type="date" value={draft.startDate} required onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
        <label htmlFor={`${id}-end`}>End date (included)<input id={`${id}-end`} type="date" value={draft.endDate} required onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></label>
        <label htmlFor={`${id}-datum`}>Height reference<select id={`${id}-datum`} value={draft.datum} onChange={(e) => setDraft({ ...draft, datum: e.target.value as TideRequest['datum'] })}><option value="MLLW">MLLW · local low-tide reference</option><option value="NAVD">NAVD88 · land elevation reference</option></select></label>
      </fieldset>
      <p className="tide-caption">Starts with your reported October 25–29, 2026 event window. Dates are inclusive in America/New_York.</p>
      {error && <p role="alert">{error}</p>}
      {(draft.startDate !== request.window.startDate || draft.endDate !== request.window.endDate || draft.datum !== request.window.datum) && <p className="tide-notice" role="status">Changes not applied yet. Press Compare tides to update the results.</p>}
      <button className="btn" type="submit">Compare tides</button>
    </form>
    <div aria-busy={!active}>
      {!active && <p role="status">Checking NOAA stations and tide records…</p>}
      {(active?.failed || result?.state === 'unavailable') && <p role="status">NOAA tide data is unavailable right now. This does not tell us whether flooding happened.</p>}
      {result?.state === 'no_suitable_station' && <p>Station comparisons currently cover a limited Briny Breezes–Ocean Ridge coastal area. This point has no suitable station in that curated set (provisional); we have not assessed all Florida stations.</p>}
      {result && result.stations.length > 0 && <>
        <p className="tide-window"><strong>Results: {result.window.startDate} through {result.window.endDate}</strong> · feet {datumLabel(result.datum)} · America/New_York (EST/EDT).</p>
        {result.state === 'partial' && <p className="tide-notice">{result.stations.some((s) => s.products.some((p) => p.state === 'unavailable') || s.htf?.state === 'unavailable') || result.stations.length < 2 ? 'Some NOAA sources are unavailable right now. Missing results are not a sign of low water.' : 'Some stations do not support the selected height reference. Available results are shown below.'}</p>}
        <p className="tide-limits">The ocean and Intracoastal are different water bodies. No nearby measured Intracoastal record is included in this curated comparison. These stations cannot establish water depth, flooding, or its cause at your selected spot. Tide heights and FEMA base flood elevations are not compared here.</p>
        {result.stations.map((station) => <article className="tide-station" key={station.id}>
          <h3>{station.name}</h3><p>{station.waterBody} · {station.distanceKm.toFixed(1)} km {station.bearing} from your spot (straight-line distance).</p>
          <TideChart station={station} result={result} />
          {station.products.filter((p) => p.state !== 'ok').map((product) => <p key={product.product} className="tide-notice">{product.state === 'datum_unavailable' ? `${station.name} isn’t available in ${datumLabel(result.datum)}. Choose MLLW to see its ${product.product === 'predictions' ? 'predictions' : 'measurements'}. No conversion was assumed.` : product.state === 'no_data' ? `${product.product === 'water_level' ? 'Measured water levels' : 'Predicted tides'}: NOAA returned no data for this period. This is not evidence that water levels were low.` : `${product.product === 'water_level' ? 'Measured water levels' : 'Predicted tides'} are unavailable right now.`}</p>)}
          {station.products.some((p) => p.state === 'ok') && <details className="tide-details"><summary>View tide times and values</summary>{station.products.filter((p) => p.state === 'ok').map((product) => <div key={product.product} className="tide-product"><ProductTable product={product} datum={result.datum} /></div>)}</details>}
          {station.htf && <p className="tide-caption">High-tide-flooding daily product: {station.htf.state === 'ok' && station.htf.rows.length ? `${station.htf.rows.length} daily station record(s) available; see the source for station-only flags and completeness.` : station.htf.state === 'no_data' ? 'NOAA returned no daily records for this period. This does not mean zero flooding days.' : 'unavailable; no flooding-day count is inferred.'}</p>}
          {station.htf?.state === 'ok' && station.htf.rows.length > 0 && <details className="tide-details"><summary>Station flooding-day reports</summary>
            <p>Dates below are NOAA report dates; their time basis has not been verified against the local calendar-day maxima above. Heights are feet relative to station datum (STND), regardless of the height reference selected above. Flood-threshold flags describe this station only.</p>
            <div className="tide-table-wrap" tabIndex={0} role="region" aria-label={`Flooding-day reports at ${station.name}`}><table className="tide-table">
              <caption className="sr-only">NOAA flooding-day reports at {station.name}; station-only thresholds, heights in feet STND</caption>
              <thead><tr><th scope="col">NOAA report date</th><th scope="col">Max (ft STND)</th><th scope="col">Threshold flags</th><th scope="col">Complete</th></tr></thead>
              <tbody>{station.htf.rows.map((row) => <tr key={row.date}><th scope="row">{row.date}</th><td>{row.maxWL.toFixed(3)}</td><td>Minor: {row.minor ? 'yes' : 'no'}; moderate: {row.moderate ? 'yes' : 'no'}; major: {row.major ? 'yes' : 'no'}</td><td>{row.percentCompleteness.toFixed(1)}%</td></tr>)}</tbody>
            </table></div>
            <p>Only the {station.htf.rows.length} returned report(s) are shown. Missing report dates are not counted as zero flooding days. These flags do not establish flooding at your selected spot.</p>
          </details>}
          <details className="tide-details"><summary>NOAA · {station.name} · Sources and details</summary>
            <p>Station {station.id} · {station.lat}, {station.lon}. {station.rationale}</p>
            <p>Station metadata retrieved {station.metadataRetrievedAtUtc ?? 'time not stated'}; datum epoch: {station.datumEpoch ?? 'not stated'}.</p>
            <p>Selected point: {result.point.lat}, {result.point.lon}. Period: {result.window.startUtc} to {result.window.endUtc} (UTC; end exclusive).</p>
            <p>Requested directly in {datumLabel(result.datum)}, feet; no datum conversion or offset borrowed from another station. Each station's MLLW reference is local, so heights do not share a common land-elevation zero.</p>
            <p><a href={station.metadataUrl} target="_blank" rel="noreferrer">Station metadata ↗</a></p>
            {station.products.map((product) => <p key={product.product}>{product.product === 'water_level' ? 'NOAA tide gauge' : 'NOAA tide prediction'} · {station.name} · {product.state} · retrieved {product.retrievedAtUtc}. <a href={product.queryUrl} target="_blank" rel="noreferrer">View {product.product === 'water_level' ? 'measured' : 'predicted'} records ↗</a></p>)}
            {station.htf && <p>NOAA high-tide-flooding daily records · {station.htf.state} · feet relative to station datum (STND), not {datumLabel(result.datum)} · retrieved {station.htf.retrievedAtUtc}. <a href={station.htf.queryUrl} target="_blank" rel="noreferrer">View station flooding-day product ↗</a></p>}
            <p>Source: NOAA/NOS/CO-OPS. Retrieved {result.retrievedAtUtc}. <a href="https://tidesandcurrents.noaa.gov/disclaimers.html" target="_blank" rel="noreferrer">NOAA disclaimers ↗</a></p>
          </details>
        </article>)}
      </>}
      {active && <button type="button" className="linkbtn" onClick={() => setRequest({ ...request, attempt: request.attempt + 1 })}>Retry NOAA lookup</button>}
    </div>
  </section>;
}
