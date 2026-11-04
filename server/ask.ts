import { createHash } from 'node:crypto';
import type { LatLon } from '../src/config/bounds.ts';
import type { FemaResult } from '../src/fema/types.ts';
import type { TideRequest, TideResponse } from '../src/noaa/types.ts';
import { createFemaService } from './fema.ts';
import { createNoaaService, tideWindow } from './noaa.ts';

type EvidenceClass = 'regulatory_classification' | 'measured_observation' | 'predicted_tide';
type Value = string | number | null;
export interface AnswerSource { ref: string; label: string; url: string; retrievedAtUtc: string; kind: EvidenceClass; stationId?: string; fields: Record<string, Value> }
export interface Claim { type: 'zone' | 'observed_max' | 'predicted_high'; evidenceClass: EvidenceClass; citations: string[]; facts: { ref: string; field: string; value: Value }[] }
const allowed = {
  zone: { kind: 'regulatory_classification', fields: ['zone', 'subtype'] },
  observed_max: { kind: 'measured_observation', fields: ['stationId', 'stationName', 'value', 'timeUtc', 'units', 'datum', 'quality', 'flags', 'samples'] },
  predicted_high: { kind: 'predicted_tide', fields: ['stationId', 'stationName', 'value', 'timeUtc', 'units', 'datum'] },
} as const;

/** Only allow-listed facts exactly equal to this frozen pack may reach a template. */
export function validateClaim(claim: Claim, sources: AnswerSource[]): boolean {
  if (!Object.hasOwn(allowed, claim.type)) return false;
  const rule = allowed[claim.type];
  if (!rule || claim.evidenceClass !== rule.kind || claim.citations.length !== 1) return false;
  const source = sources.find((s) => s.ref === claim.citations[0]);
  if (!source || source.kind !== rule.kind || claim.facts.length !== rule.fields.length) return false;
  if (claim.type !== 'zone' && (source.stationId !== source.fields.stationId || source.fields.units !== 'ft' || !['MLLW', 'NAVD'].includes(String(source.fields.datum)))) return false;
  return rule.fields.every((field) => claim.facts.filter((f) => f.ref === source.ref && f.field === field && f.value === source.fields[field]).length === 1);
}
function immutable<T>(value: T): T {
  if (value && typeof value === 'object') { Object.freeze(value); for (const item of Object.values(value)) immutable(item); }
  return value;
}
function exactQuery(url: string, point: LatLon) {
  const u = new URL(url); const p = u.searchParams;
  return u.origin === 'https://hazards.fema.gov' && u.pathname === '/arcgis/rest/services/public/NFHL/MapServer/28/query' && p.get('geometry') === `${point.lon},${point.lat}` && p.get('inSR') === '4326' && p.get('spatialRel') === 'esriSpatialRelIntersects' && !p.has('distance');
}
function tideQuery(url: string, stationId: string, product: string, window: TideRequest) {
  const u = new URL(url); const p = u.searchParams; const bounds = tideWindow(window.startDate, window.endDate);
  const minute = (s: string) => s.slice(0, 16).replace('T', ' ');
  return u.origin === 'https://api.tidesandcurrents.noaa.gov' && u.pathname === '/api/prod/datagetter' && p.get('station') === stationId && p.get('product') === product && p.get('datum') === window.datum && p.get('units') === 'english' && p.get('time_zone') === 'gmt' && p.get('begin_date') === minute(bounds.startUtc) && p.get('end_date') === minute(new Date(Date.parse(bounds.endUtc) - 60_000).toISOString());
}
export function questionIntent(question: string, window: TideRequest): 'flood' | 'tides' | 'event' | 'unsupported' {
  const q = question.toLowerCase();
  if (/\b(today|tonight|yesterday|tomorrow)\b|\b(last|next)\s+(week|month|year|night|day)\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/-]\d{1,2}\b|\b(jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)\s+\d|\b(define|what are|what is the meaning)\b/.test(q)) return 'unsupported';
  if (/\b(will|tomorrow|safe|safest|insurance|buy|guarantee|yesterday|last week|last month|forecast|protected|wildlife|wetland|species)\b/.test(q)) return 'unsupported';
  const years = q.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  if (years.some((year) => year !== window.startDate.slice(0, 4) && year !== window.endDate.slice(0, 4))) return 'unsupported';
  if (/\b(saw|happened|cause|caused|why|event|king tide|flooded)\b/.test(q)) return 'event';
  if (/\b(tide|tides|water|levels|unusual|measured|measurement|predicted|prediction|high|higher)\b/.test(q)) return 'tides';
  if (/\b(fema|flood|flooding|zone|risk|map)\b/.test(q)) return 'flood';
  return 'unsupported';
}
const number = (v: Value) => typeof v === 'number' && Number.isFinite(v);
function renderClaim(c: Claim, s: AnswerSource): string | null {
  if (!validateClaim(c, [s])) return null;
  const f = s.fields;
  if (c.type === 'zone') {
    const z = String(f.zone); const sub = String(f.subtype).toUpperCase();
    if (['A', 'AE', 'AH', 'AO', 'AR', 'A99', 'V', 'VE'].includes(z)) return `FEMA maps this spot in Zone ${z}, an area with a 1% annual chance of flooding.${['V', 'VE'].includes(z) ? ' Waves add to the mapped coastal hazard.' : ''}`;
    if (z === 'X' && sub.includes('0.2 PCT')) return 'FEMA maps this spot in Zone X, in its 0.2% annual-chance flood area.';
    if (z === 'X' && sub.includes('MINIMAL')) return 'FEMA maps this spot in Zone X, outside its mapped 1% and 0.2% annual-chance flood areas. Flooding can still happen.';
    if (z === 'D') return 'FEMA maps the flood hazard at this spot as undetermined (Zone D).';
    return null;
  }
  if (!number(f.value) || f.units !== 'ft' || !['MLLW', 'NAVD'].includes(String(f.datum)) || typeof f.timeUtc !== 'string' || !Number.isFinite(Date.parse(f.timeUtc))) return null;
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(f.timeUtc));
  const height = `${(f.value as number).toFixed(2)} feet ${f.datum === 'NAVD' ? 'NAVD88' : 'MLLW'}`;
  return c.type === 'observed_max'
    ? `At ${f.stationName}, the highest returned measurement in the selected period was ${height} on ${time}. These are ${f.quality} observations at the gauge.`
    : `At ${f.stationName}, the highest predicted astronomical high tide in the selected period was ${height} on ${time}. This is a prediction, not a measurement or weather forecast.`;
}

interface Options { fema?: Pick<ReturnType<typeof createFemaService>, 'lookup'>; noaa?: Pick<ReturnType<typeof createNoaaService>, 'lookup'>; now?: () => number }
export function createAskService(options: Options = {}) {
  const fema = options.fema ?? createFemaService(); const noaa = options.noaa ?? createNoaaService(); const now = options.now ?? Date.now;
  return {
    async answer(point: LatLon, selectionId: number, question: string, window: TideRequest) {
      const intent = questionIntent(question, window);
      const sources: AnswerSource[] = []; const candidates: Claim[] = []; const limitations: string[] = [];
      const statuses: { source: string; state: string }[] = [];
      const add = (type: Claim['type'], source: Omit<AnswerSource, 'ref'>) => {
        const ref = `E${sources.length + 1}`; sources.push({ ...source, ref });
        candidates.push({ type, evidenceClass: source.kind, citations: [ref], facts: allowed[type].fields.map((field) => ({ ref, field, value: source.fields[field] })) });
      };
      if (intent !== 'unsupported') {
        const [fr, nr] = await Promise.allSettled([
          intent === 'tides' ? Promise.resolve(null) : fema.lookup(point),
          intent === 'flood' ? Promise.resolve(null) : noaa.lookup(point, window.startDate, window.endDate, window.datum),
        ]);
        const f: FemaResult | null = fr.status === 'fulfilled' ? fr.value : null;
        if (intent !== 'tides') {
          statuses.push({ source: 'FEMA flood map', state: f?.state ?? 'unavailable' });
          limitations.push('FEMA describes a mapped-area classification, not a property forecast or a record of actual flooding.');
          if (f && (f.point.lat !== point.lat || f.point.lon !== point.lon)) throw new Error('Wrong FEMA point');
          const exact = f?.sources.find((s) => s.name === 'exact' && s.status === 'ok' && s.layer === 28 && s.spatialRelation === 'point_intersection' && s.evidenceClass === 'regulatory_classification');
          // Re-derive membership from the exact source, never from the overlay or nearby buffer.
          if (f && exact && exact.records.length === 1 && ['classified', 'classified_near_boundary'].includes(f.state)) {
            if (!exactQuery(exact.queryUrl, point)) throw new Error('Wrong FEMA source query');
            const record = exact.records[0];
            add('zone', { label: 'FEMA flood map', url: exact.queryUrl, retrievedAtUtc: exact.retrievedAtUtc, kind: 'regulatory_classification', fields: { zone: String(record.FLD_ZONE).trim().toUpperCase(), subtype: String(record.ZONE_SUBTY ?? ''), freshness: f.freshness, batchId: f.batchId } });
          }
          if (f?.freshness === 'stale') limitations.push(`FEMA is using saved data retrieved ${f.retrievedAtUtc}; the live refresh failed.`);
          if (f?.state === 'ambiguous_overlap') limitations.push('FEMA returned overlapping zone records; a single classification cannot be stated.');
          if (f?.state === 'outside_nfhl_coverage') limitations.push('FEMA’s digital map does not cover this point. Missing coverage is not evidence of low risk.');
          if (f?.state === 'in_coverage_no_zone') limitations.push('FEMA’s map covers this point but returns no zone. That gap is not evidence of low risk.');
          if (!f || ['unavailable', 'coverage_unknown'].includes(f.state)) limitations.push('FEMA classification is unavailable; this is not a finding of no flood risk.');
          if (f?.nearbyZones.length && f.boundaryCheckAvailable) limitations.push('Another mapped zone was found within our 15 m search radius. This radius is our check, not FEMA accuracy or a surveyed boundary distance.');
        }
        const n: Omit<TideResponse, 'selectionId'> | null = nr.status === 'fulfilled' ? nr.value : null;
        if (intent !== 'flood') {
          statuses.push({ source: 'NOAA station comparison', state: n?.state ?? 'unavailable' });
          limitations.push('Gauge measurements and predictions describe their stations, not water depth, flood extent or conditions in these streets.');
          limitations.push('No long-term statistical baseline is included, so these records cannot quantify how unusual the event was. Heights are not compared with property ground levels or FEMA base flood elevations.');
          if (n && (n.point.lat !== point.lat || n.point.lon !== point.lon || n.datum !== window.datum || n.window.startDate !== window.startDate || n.window.endDate !== window.endDate || n.units !== 'ft')) throw new Error('Wrong NOAA scope');
          const expected = tideWindow(window.startDate, window.endDate);
          if (n && (n.window.timeZone !== expected.timeZone || Date.parse(n.window.startUtc) !== Date.parse(expected.startUtc) || Date.parse(n.window.endUtc) !== Date.parse(expected.endUtc))) throw new Error('Invalid NOAA time window');
          if (!n || n.state === 'unavailable') limitations.push('NOAA records are unavailable for this comparison; missing data cannot establish low water.');
          if (n?.state === 'no_suitable_station') limitations.push('This point is outside the current curated NOAA station comparison; other Florida stations have not been assessed.');
          for (const station of n?.stations ?? []) {
            for (const product of station.products) {
              statuses.push({ source: `${station.id}/${product.product}`, state: product.state });
              if (product.state !== 'ok') {
                if (product.state === 'datum_unavailable') limitations.push(`${station.name} does not provide this requested height reference. Choose MLLW; no offset was borrowed from another station.`);
                else limitations.push(`${station.name}: ${product.product === 'water_level' ? 'measurements' : 'predictions'} ${product.state === 'no_data' ? 'were not returned for this period' : 'are unavailable'}. Missing records do not establish low water.`);
                continue;
              }
              if (!tideQuery(product.queryUrl, station.id, product.product, window)) throw new Error('Wrong NOAA source query');
              const rows = product.rows.filter((r) => product.product === 'water_level' || r.kind === 'H');
              if (!rows.length) continue;
              if (rows.some((r) => !Number.isFinite(r.value) || !Number.isFinite(Date.parse(r.timeUtc)) || Date.parse(r.timeUtc) < Date.parse(n!.window.startUtc) || Date.parse(r.timeUtc) >= Date.parse(n!.window.endUtc))) throw new Error('Invalid NOAA evidence');
              if (product.product === 'water_level' && rows.some((r) => !['verified', 'preliminary'].includes(String(r.quality)) || typeof r.flags !== 'string' || !/^\d,\d,\d,\d$/.test(r.flags))) throw new Error('Missing observation quality');
              const peak = rows.reduce((a, b) => a.value > b.value ? a : b);
              const measured = product.product === 'water_level';
              add(measured ? 'observed_max' : 'predicted_high', { label: `NOAA ${measured ? 'tide gauge' : 'tide prediction'} · ${station.name}`, url: product.queryUrl, retrievedAtUtc: product.retrievedAtUtc, kind: measured ? 'measured_observation' : 'predicted_tide', stationId: station.id, fields: { stationId: station.id, stationName: station.name, value: peak.value, timeUtc: peak.timeUtc, units: n!.units, datum: n!.datum, ...(measured ? { quality: rows.some((r) => r.quality === 'preliminary') ? 'preliminary' : 'verified', flags: rows.filter((r) => r.flags?.split(',').some((v) => v !== '0')).length, samples: rows.length } : {}) } });
              if (measured) limitations.push(`${station.name}: preliminary data may change where marked, NOAA quality flags are retained and flagged samples remain included. Missing samples may hide a higher level.`);
            }
          }
        }
        if (intent === 'event') limitations.push('These sources cannot establish the cause of flooding, which homes were affected or the depth at your selected point. Your firsthand report remains separate from gauge evidence.');
      } else limitations.push('I can summarize FEMA flood mapping and NOAA station records for the selected point and applied dates. I cannot provide safety, insurance, property advice, future street flooding, wildlife findings or an unsupported cause. Use the date controls for a different period.');
      const pack = immutable(JSON.parse(JSON.stringify({ point, selectionId, window, sources, statuses, limitations })) as { sources: AnswerSource[] });
      const packId = createHash('sha256').update(JSON.stringify(pack)).digest('hex');
      const findings = candidates.flatMap((candidate, i) => {
        if (!validateClaim(candidate, pack.sources)) return [];
        const text = renderClaim(candidate, pack.sources.find((s) => s.ref === candidate.citations[0])!);
        return text ? [{ id: `F${i + 1}`, text, evidenceClass: candidate.evidenceClass, citations: candidate.citations, facts: candidate.facts }] : [];
      });
      if (!findings.length && intent !== 'unsupported') limitations.push('No supported factual finding is available from the retrieved records. Try again or inspect the source cards.');
      return immutable({ selectionId, point: structuredClone(point), window: structuredClone(window), question, packId, createdAtUtc: new Date(now()).toISOString(), mode: 'template' as const, intent, supported: findings.length > 0, findings, limitations: [...new Set(limitations)], sources: pack.sources, statuses: structuredClone(statuses) });
    },
  };
}
