// @vitest-environment node
import { createHash } from 'node:crypto';
import { vi } from 'vitest';
import { createNatureAnswerService } from './nature-answer';
import { natureQuery } from './nature';
import { nearestBoundary } from './nature-geometry';
import type { NatureResponse, NatureFeature } from '../src/nature/types';
import { validateClaim, CLAIM_RULES, type Claim } from './claim-validation';
const point = { lat: 26.5, lon: -80.05 };
const window = { startDate: '2026-10-25', endDate: '2026-10-29', datum: 'MLLW' as const };
function fixture(): Omit<NatureResponse, 'selectionId'> {
  return { point, radiusMeters: 5000, retrievedAtUtc: '2026-11-05T12:00:00Z', nearby: [], sources: (['wetlands', 'conservation', 'preserves', 'nearby'] as const).map((id) => ({ id, state: 'ok', queryUrl: natureQuery(point, id), retrievedAtUtc: '2026-11-05T12:00:00Z', features: [] })) };
}
function park(): NatureFeature {
  const geometry = { rings: [[[-80.04, 26.49], [-80.039, 26.49], [-80.039, 26.51], [-80.04, 26.51], [-80.04, 26.49]]], spatialReference: { wkid: 4326 as const } };
  return { id: 'conservation:1', name: 'Synthetic park', agency: 'Synthetic agency', geometry, geometryHash: createHash('sha256').update(JSON.stringify(geometry)).digest('hex'), ...nearestBoundary(point, geometry), inside: false };
}
function service(data = fixture()) { const lookup = vi.fn(async () => data); return { lookup, answer: createNatureAnswerService({ service: { lookup } }).answer }; }
it('cites empty queries without inferring absence on the ground', async () => {
  const a = await service().answer(point, 1, 'What is mapped at this spot?', window);
  expect(a.findings).toHaveLength(3); expect(a.findings.every((f) => f.evidenceClass === 'mapped_feature' && f.text.includes('does not prove'))).toBe(true);
  expect(a.findings.every((f) => f.citations.every((ref) => a.sources.some((s) => s.ref === ref)))).toBe(true);
  expect(Object.isFrozen(a.point)).toBe(true); expect(a.domain).toBe('nature');
});
it('renders source-provided positive wetland and preserve names separately from failed conservation', async () => {
  const n = fixture(); n.sources[0].features = [{ id: 'wetlands:1', name: 'Freshwater Emergent Wetland', code: 'PEM1F' }];
  n.sources[1].state = 'unavailable'; n.sources[2].features = [{ id: 'preserves:1', name: 'Synthetic Aquatic Preserve', agency: 'Florida DEP' }];
  const a = await service(n).answer(point, 1, 'Is this spot in a mapped wetland or aquatic preserve?', window);
  expect(a.findings.map((f) => f.text).join(' ')).toMatch(/PEM1F.*Synthetic Aquatic Preserve/);
  expect(a.limitations.join(' ')).toContain('conservation'); expect(a.sources).toHaveLength(2);
});
it('binds the nearby feature and distance to the original geometry digest', async () => {
  const n = fixture(); const p = park(); n.nearby = [p]; n.sources[3].features = [{ ...p, geometry: undefined }];
  const a = await service(n).answer(point, 1, 'What protected places are nearby?', window);
  expect(a.findings[0].text).toContain('Synthetic park'); expect(a.findings[0].text).toContain('1.00 km E');
  for (const change of ['distance', 'name', 'geometry', 'query'] as const) {
    const altered = structuredClone(n);
    if (change === 'distance') altered.nearby[0].distanceMeters = 20;
    if (change === 'name') altered.nearby[0].name = 'Another park';
    if (change === 'geometry') { altered.nearby[0].geometry!.rings[0].forEach((v) => { v[0] += 0.01; }); Object.assign(altered.nearby[0], nearestBoundary(point, altered.nearby[0].geometry!)); }
    if (change === 'query') altered.sources[3].queryUrl = natureQuery({ ...point, lat: 27 }, 'nearby');
    await expect(service(altered).answer(point, 1, 'What protected places are nearby?', window)).rejects.toThrow();
  }
});
it('never turns a preserve outage or nearby outage into a negative match', async () => {
  const n = fixture(); n.sources[2].state = 'unavailable'; n.sources[3].state = 'unavailable';
  const a = await service(n).answer(point, 1, 'What is mapped at this spot?', window);
  expect(a.findings.some((f) => f.text.includes('aquatic-preserve'))).toBe(false);
  const near = await service(n).answer(point, 1, 'What protected places are nearby?', window);
  expect(near.findings).toEqual([]); expect(near.limitations.join(' ')).toContain('search is unavailable');
});
it.each(['Which birds live here?', 'What species habitat is here?', 'Are parks open?', 'What wetlands were here in 2020?', 'Which parks were here last year?', 'Did wetlands cause flooding?'])('abstains without retrieving unsupported nature claims: %s', async (q) => {
  const s = service(); const a = await s.answer(point, 1, q, window); expect(s.lookup).not.toHaveBeenCalled(); expect(a.findings).toEqual([]); expect(a.supported).toBe(false);
});
it('rejects wrong scope and refuses fabricated mapped fact values/classes', async () => {
  const n = fixture(); n.point = { ...point, lat: 27 }; await expect(service(n).answer(point, 1, 'What is mapped here?', window)).rejects.toThrow();
  const a = await service().answer(point, 1, 'What is mapped here?', window); const source = a.sources[0];
  const claim: Claim = { type: 'nature_empty', evidenceClass: 'mapped_feature', citations: [source.ref], facts: CLAIM_RULES.nature_empty.fields.map((field) => ({ ref: source.ref, field, value: source.fields[field] })) };
  expect(validateClaim(claim, a.sources)).toBe(true); claim.facts[1].value = 1; expect(validateClaim(claim, a.sources)).toBe(false);
  claim.facts[1].value = 0; claim.evidenceClass = 'measured_observation'; expect(validateClaim(claim, a.sources)).toBe(false);
});
