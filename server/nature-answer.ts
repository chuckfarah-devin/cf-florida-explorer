import { createHash } from 'node:crypto';
import type { LatLon } from '../src/config/bounds.ts';
import type { TideRequest } from '../src/noaa/types.ts';
import type { NatureFeature, NatureResponse, NatureSource } from '../src/nature/types.ts';
import { createNatureService, natureQuery, NATURE_RADIUS } from './nature.ts';
import { nearestBoundary } from './nature-geometry.ts';
import { CLAIM_RULES, validateClaim, immutable, type Claim, type AnswerSource } from './claim-validation.ts';

const labels = { wetlands: 'Wetlands inventory', conservation: 'Florida conservation lands', preserves: 'Florida aquatic preserves', nearby: 'Florida conservation lands · nearby' };
export function supportedNatureQuestion(question: string) {
  if (/\b(19|20)\d{2}\b|\b(today|tonight|yesterday|historical|formerly)\b|\b(last|next)\s+(week|month|year|day)\b|\bused to\b|\b\d{1,2}[/-]\d{1,2}\b/i.test(question)) return false;
  if (/\b(species|bird|birds|animal|animals|wildlife|sighting|sightings|habitat|live|lives|safe|open|hours|access|visit|tomorrow|flood|flooding|caused|cause|insurance)\b/i.test(question)) return false;
  return /\b(map|mapped|mapping|wetland|wetlands|protect|protected|conservation|preserve|preserves|nature|natural|park|parks|nearby|near|around)\b/i.test(question);
}
interface Options { service?: Pick<ReturnType<typeof createNatureService>, 'lookup'>; now?: () => number }
export function createNatureAnswerService(options: Options = {}) {
  const service = options.service ?? createNatureService(); const now = options.now ?? Date.now;
  return { async answer(point: LatLon, selectionId: number, question: string, window: TideRequest) {
    const accepted = supportedNatureQuestion(question); const sources: AnswerSource[] = []; const candidates: { claim: Claim; text: string }[] = [];
    const limitations = ['These are mapped features, not surveyed boundaries or regulatory wetland determinations. Retrieval time is not the imagery or survey date.', 'Protected land does not always mean public access. Check with the managing agency before visiting.', 'These maps cannot establish wildlife sightings, species presence, likely habitat, or where water went during a flood.'];
    const statuses: { source: string; state: string }[] = [];
    const add = (type: Claim['type'], source: NatureSource, fields: AnswerSource['fields'], text: string) => {
      const ref = `E${sources.length + 1}`;
      sources.push({ ref, label: labels[source.id], url: source.queryUrl, retrievedAtUtc: source.retrievedAtUtc, kind: 'mapped_feature', fields: { sourceId: source.id, ...fields } });
      const record = sources.at(-1)!;
      candidates.push({ claim: { type, citations: [ref], evidenceClass: 'mapped_feature', facts: CLAIM_RULES[type].fields.map((field) => ({ ref, field, value: record.fields[field] })) }, text });
    };
    const match = (s: NatureSource, f: NatureFeature) => add('nature_match', s, { featureId: f.id, name: f.name, agency: f.agency ?? null, code: f.code ?? null }, s.id === 'wetlands' ? `The inventory maps ${f.name}${f.code ? ` (${f.code})` : ''} at your selected spot. This inventory includes both wetlands and deepwater habitats.` : `Your spot intersects mapped ${s.id === 'preserves' ? 'aquatic preserve' : 'conservation land'}: ${f.name}${f.agency ? `, managed by ${f.agency}` : ''}.`);
    if (accepted) {
      let n: Omit<NatureResponse, 'selectionId'> | null = null;
      try { n = await service.lookup(point); } catch { statuses.push({ source: 'Nature maps', state: 'unavailable' }); limitations.push('Nature records are unavailable. No presence or absence can be inferred.'); }
      if (n) {
        if (n.point.lat !== point.lat || n.point.lon !== point.lon || n.radiusMeters !== NATURE_RADIUS || n.sources.length !== 4 || new Set(n.sources.map((s) => s.id)).size !== 4) throw new Error('Wrong nature evidence scope');
        for (const s of n.sources) { if (!Object.hasOwn(labels, s.id) || s.queryUrl !== natureQuery(point, s.id)) throw new Error('Wrong nature source query'); statuses.push({ source: labels[s.id], state: s.state }); }
        const nearbyOnly = /\b(near|nearby|around)\b/i.test(question);
        if (!nearbyOnly) for (const s of n.sources.filter((s) => s.id !== 'nearby')) {
          if (s.state !== 'ok') { limitations.push(`${labels[s.id]} is unavailable; no mapped presence or absence is inferred.`); continue; }
          if (!s.features.length) add('nature_empty', s, { count: 0 }, `No ${s.id === 'wetlands' ? 'wetland or deepwater feature' : s.id === 'preserves' ? 'aquatic-preserve polygon' : 'conservation-land polygon'} was returned at your spot by this map. This does not prove the feature is absent on the ground.`);
          else s.features.slice(0, 10).forEach((f) => match(s, f));
          if (s.features.length > 10) limitations.push('Only the first ten mapped matches per inventory are summarized; inspect the source query for all returned records.');
        }
        if (nearbyOnly) {
          const s = n.sources.find((s) => s.id === 'nearby')!; const exact = n.sources.find((s) => s.id === 'conservation')!;
          if (s.state !== 'ok') limitations.push('The nearby conservation-land search is unavailable. This does not establish that no protected places are nearby.');
          else {
            limitations.push('The nearby search uses a provisional 5 km radius and lists up to five names. Distances estimate the nearest mapped boundary, not a route, entrance or surveyed separation.');
            if (!n.nearby.length) add('nature_empty', s, { count: 0 }, 'No protected-place boundary could be listed from the conservation-land map within this search radius. This does not prove there are no protected places on the ground.');
            for (const f of n.nearby) {
              const original = s.features.find((row) => row.id === f.id);
              if (!original || original.name !== f.name || original.agency !== f.agency || !f.geometry || !Number.isFinite(f.distanceMeters)) throw new Error('Unbound nearby nature feature');
              const geometryHash = createHash('sha256').update(JSON.stringify(f.geometry)).digest('hex');
              if (!original.geometryHash || original.geometryHash !== geometryHash || f.geometryHash !== geometryHash) throw new Error('Unbound nature geometry');
              const distance = nearestBoundary(point, f.geometry);
              if (Math.abs(distance.distanceMeters - f.distanceMeters!) > 0.01 || distance.bearing !== f.bearing) throw new Error('Wrong nature boundary distance');
              if (f.inside) {
                const hit = exact.state === 'ok' ? exact.features.find((r) => r.id === f.id && r.name === f.name) : null;
                if (!hit) throw new Error('Unverified mapped membership'); match(exact, hit); continue;
              }
              if (f.distanceMeters! > NATURE_RADIUS) throw new Error('Outside nearby radius');
              add('nature_nearby', s, { featureId: f.id, name: f.name, agency: f.agency ?? null, distanceMeters: f.distanceMeters!, bearing: f.bearing! }, `The mapped boundary of ${f.name} is about ${(f.distanceMeters! / 1000).toFixed(2)} km ${f.bearing} from your spot${f.agency ? `; managing agency: ${f.agency}` : ''}.`);
            }
          }
        }
      }
    } else limitations.push('I can summarize mapped wetlands, conservation land, aquatic preserves and nearby protected places. These inventories cannot answer this question.');
    const pack = immutable(structuredClone({ point, selectionId, domain: 'nature', sources, statuses, limitations }));
    const packId = createHash('sha256').update(JSON.stringify(pack)).digest('hex');
    const findings = candidates.filter((c) => validateClaim(c.claim, pack.sources)).map((c, i) => ({ id: `F${i + 1}`, text: c.text, evidenceClass: 'mapped_feature' as const, citations: c.claim.citations, facts: c.claim.facts }));
    return immutable({ domain: 'nature' as const, point: structuredClone(point), selectionId, question, window: structuredClone(window), mode: 'template' as const, intent: accepted ? 'nature' as const : 'unsupported' as const, supported: findings.length > 0, packId, createdAtUtc: new Date(now()).toISOString(), findings, sources: pack.sources, statuses: pack.statuses, limitations: pack.limitations });
  } };
}
