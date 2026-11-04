// Read-only public-source verification; Node24+. Raw results stay in ignored scripts/out.
import { mkdir, writeFile } from 'node:fs/promises';
import { createNoaaService } from '../server/noaa.ts';

const service = createNoaaService();
const point = { lat: 26.50844824511624, lon: -80.05460169017356 };
const mllw = await service.lookup(point, '2026-10-25', '2026-10-29', 'MLLW');
const navd = await service.lookup(point, '2026-10-25', '2026-10-29', 'NAVD');
const lake = mllw.stations.find((s) => s.id === '8722670');
if (!lake) throw new Error('Lake Worth Pier metadata unavailable');
const metadata = await (await fetch(lake.metadataUrl, { signal: AbortSignal.timeout(10000) })).json();
const datums = metadata.stations[0].datums;
const z = (name) => datums.datums.find((d) => d.name === name)?.value;
if (datums.units !== 'feet' || !Number.isFinite(z('MLLW')) || !Number.isFinite(z('NAVD88'))) throw new Error('Datum pair unavailable');
const offset = z('MLLW') - z('NAVD88');
const observed = lake.products.find((p) => p.product === 'water_level');
const observedNavd = navd.stations.find((s) => s.id === lake.id)?.products.find((p) => p.product === 'water_level');
const pairs = new Map(observedNavd?.rows.map((r) => [r.timeUtc, r.value]));
const differences = observed.rows.filter((r) => pairs.has(r.timeUtc)).map((r) => Math.abs(r.value + offset - pairs.get(r.timeUtc)));
if (!differences.length || Math.max(...differences) > 0.01) throw new Error('Same-station datum cross-check failed or unavailable');
const summary = {
  checkedAtUtc: new Date().toISOString(), point, window: mllw.window,
  stations: mllw.stations.map((s) => ({ id: s.id, name: s.name, distanceKm: s.distanceKm, products: s.products.map((p) => ({ product: p.product, state: p.state, rows: p.rows.length })), htf: s.htf?.state })),
  sameStationCrossCheck: { station: lake.id, epoch: datums.epoch, units: 'ft', formula: 'h_NAVD88 = h_MLLW + (Z_MLLW - Z_NAVD88)', offset, pairedSamples: differences.length, maxDifferenceFt: Math.max(...differences), toleranceFt: 0.01 },
  oceanRidgeNavd: navd.stations.find((s) => s.id === '8722718')?.products.map((p) => p.state),
};
await mkdir('scripts/out', { recursive: true });
await writeFile('scripts/out/i3-noaa-smoke.json', JSON.stringify({ summary, mllw, navd, metadata }, null, 2));
console.log(JSON.stringify(summary, null, 2));
