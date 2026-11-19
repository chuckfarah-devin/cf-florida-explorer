// Read-only public-source probe. No API keys; output is ignored by git.
import { mkdir, writeFile } from 'node:fs/promises';
import { createFemaService } from '../server/fema.ts';

const service = createFemaService();
const points = [
  { id: 'BB-P1', lat: 26.5089022, lon: -80.0522463 },
  { id: 'BB-P2', lat: 26.5087, lon: -80.0517 },
];
const results = [];
for (const point of points) {
  const result = await service.lookup({ lat: point.lat, lon: point.lon });
  results.push({ fixture: point.id, ...result });
  console.log(JSON.stringify({ fixture: point.id, state: result.state, zones: result.zones.map((z) => z.FLD_ZONE), sourceStatus: result.sources.map((s) => [s.name, s.status]), retrievedAtUtc: result.retrievedAtUtc }));
}
await mkdir('scripts/out', { recursive: true });
await writeFile('scripts/out/i2-live-probe.json', JSON.stringify(results, null, 2));
if (results.some((r) => r.state === 'unavailable' || r.state === 'coverage_unknown')) process.exitCode = 1;
