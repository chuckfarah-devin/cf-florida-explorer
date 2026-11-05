// Read-only authoritative-source checks. Raw data stays in ignored scripts/out.
import { mkdir, writeFile } from 'node:fs/promises';
import { createNatureService } from '../server/nature.ts';
const service = createNatureService();
await mkdir('scripts/out', { recursive: true });
const results = [];
for (const [name, point] of [['briny', { lat: 26.5089022, lon: -80.0522463 }], ['refuge', { lat: 26.5, lon: -80.25 }], ['biscayne', { lat: 25.6, lon: -80.2 }]]) {
  const result = await service.lookup(point);
  await writeFile(`scripts/out/nature-${name}-live.json`, JSON.stringify(result, null, 2));
  const summary = { name, sources: result.sources.map((s) => ({ id: s.id, state: s.state, count: s.features.length, names: s.features.map((f) => f.name).slice(0, 5) })), nearby: result.nearby.map((f) => ({ id: f.id, name: f.name, distanceMeters: f.distanceMeters, bearing: f.bearing })) };
  console.log(JSON.stringify(summary)); results.push(summary);
  if (name === 'briny') for (const feature of result.nearby) {
    const body = new URLSearchParams({ f: 'json', sr: '4326', distanceUnit: '9001', geodesic: 'true', geometry1: JSON.stringify({ geometryType: 'esriGeometryPoint', geometry: { x: point.lon, y: point.lat } }), geometry2: JSON.stringify({ geometryType: 'esriGeometryPolyline', geometry: { paths: feature.geometry.rings } }) });
    const response = await fetch('https://utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer/distance', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(20000) });
    const reference = await response.json();
    const difference = Math.abs(reference.distance - feature.distanceMeters);
    console.log(JSON.stringify({ reference: feature.name, differenceMeters: difference }));
    if (!Number.isFinite(difference) || difference > 10) throw new Error('GIS boundary-distance cross-check failed or unavailable');
  }
}
await writeFile('scripts/out/nature-smoke-summary.json', JSON.stringify({ checkedAtUtc: new Date().toISOString(), results }, null, 2));
