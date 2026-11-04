import { useId } from 'react';
import type { TideResponse, TideRow, TideStation } from '../noaa/types';

export function TideChart({ station, result }: { station: TideStation; result: TideResponse }) {
  const id = useId();
  const measured = station.products.find((p) => p.product === 'water_level' && p.state === 'ok')?.rows ?? [];
  const predicted = station.products.find((p) => p.product === 'predictions' && p.state === 'ok')?.rows.filter((r) => r.kind === 'H') ?? [];
  const all = [...measured, ...predicted];
  if (!all.length) return null;
  const start = Date.parse(result.window.startUtc); const end = Date.parse(result.window.endUtc);
  const min = Math.floor(Math.min(...all.map((r) => r.value)) - 0.25); const max = Math.ceil(Math.max(...all.map((r) => r.value)) + 0.25);
  const x = (r: TideRow) => 48 + (Date.parse(r.timeUtc) - start) / (end - start) * 334;
  const y = (v: number) => 192 - (v - min) / (max - min) * 156;
  const lines: TideRow[][] = [];
  for (const row of measured) {
    const last = lines.at(-1);
    if (!last || Date.parse(row.timeUtc) - Date.parse(last.at(-1)!.timeUtc) > 360_000) lines.push([row]);
    else last.push(row);
  }
  const datum = result.datum === 'NAVD' ? 'NAVD88' : 'MLLW';
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
  const peak = measured.length ? measured.reduce((a, b) => a.value > b.value ? a : b) : null;
  const flagged = measured.filter((r) => r.flags?.split(',').some((f) => f !== '0')).length;
  return <figure className="tide-chart">
    <figcaption>{measured.length && predicted.length ? 'Measured water and predicted high tides' : measured.length ? 'Measured water levels' : 'Predicted high tides'}</figcaption>
    <p className="tide-caption">Feet · {datum} · local Florida time. Scale applies to this station only.</p>
    <svg viewBox="0 0 400 245" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{station.name}: tide chart in feet {datum}</title>
      <desc id={`${id}-desc`}>Time runs left to right. {measured.length > 0 && 'Solid teal lines show six-minute measurements with breaks for missing samples. '}{predicted.length > 0 && 'Orange outlined dots show predicted high tides only. '}Exact values are in the expandable tables. Heights describe this station, not street flooding.</desc>
      {[0, 1, 2, 3].map((i) => { const v = min + (max - min) * i / 3; return <g key={i}><line x1="48" x2="382" y1={y(v)} y2={y(v)} className="tide-grid" /><text x="40" y={y(v) + 5} textAnchor="end">{v.toFixed(1)}</text></g>; })}
      {[0, 1, 2].map((i) => <text key={i} x={48 + 334 * i / 2} y="220" textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>{day.format(start + (end - start - 60_000) * i / 2)}</text>)}
      {lines.map((rows, i) => rows.length > 1 ? <polyline key={i} points={rows.map((r) => `${x(r)},${y(r.value)}`).join(' ')} className="tide-measured" /> : <circle key={i} cx={x(rows[0])} cy={y(rows[0].value)} r="2" fill="#007080" />)}
      {predicted.map((r) => <circle key={r.timeUtc} cx={x(r)} cy={y(r.value)} r="4.5" className="tide-predicted"><title>{time.format(new Date(r.timeUtc))}: predicted high {r.value.toFixed(3)} feet {datum}</title></circle>)}
    </svg>
    <div className="tide-legend">{measured.length > 0 && <span><b className="tide-line-key" /> Measured water</span>}{predicted.length > 0 && <span><b className="tide-dot-key" /> Predicted high tide</span>}</div>
    {peak && <p>Highest returned measurement: <strong>{peak.value.toFixed(2)} ft {datum}</strong> · {time.format(new Date(peak.timeUtc))}.</p>}
    {measured.length > 0 && <p className="tide-caption">{measured.some((r) => r.quality === 'preliminary') ? 'Preliminary measurements; may change. ' : 'Verified measurements. '}{flagged} sample(s) carry NOAA quality flags and remain included. Missing samples can hide a higher level.</p>}
    <p className="tide-caption">Dots are predicted highs, not a continuous prediction curve. Station heights do not establish flooding at your spot.</p>
  </figure>;
}
