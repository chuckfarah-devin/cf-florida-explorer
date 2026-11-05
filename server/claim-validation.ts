export type EvidenceClass = 'regulatory_classification' | 'measured_observation' | 'predicted_tide' | 'mapped_feature';
export type Value = string | number | null;
export interface AnswerSource { ref: string; label: string; url: string; retrievedAtUtc: string; kind: EvidenceClass; stationId?: string; fields: Record<string, Value> }
export const CLAIM_RULES = {
  zone: { kind: 'regulatory_classification', fields: ['zone', 'subtype'] },
  observed_max: { kind: 'measured_observation', fields: ['stationId', 'stationName', 'value', 'timeUtc', 'units', 'datum', 'quality', 'flags', 'samples'] },
  predicted_high: { kind: 'predicted_tide', fields: ['stationId', 'stationName', 'value', 'timeUtc', 'units', 'datum'] },
  nature_match: { kind: 'mapped_feature', fields: ['sourceId', 'featureId', 'name', 'agency', 'code'] },
  nature_empty: { kind: 'mapped_feature', fields: ['sourceId', 'count'] },
  nature_nearby: { kind: 'mapped_feature', fields: ['sourceId', 'featureId', 'name', 'agency', 'distanceMeters', 'bearing'] },
} as const;
export interface Claim { type: keyof typeof CLAIM_RULES; evidenceClass: EvidenceClass; citations: string[]; facts: { ref: string; field: string; value: Value }[] }
export function validateClaim(claim: Claim, sources: AnswerSource[]): boolean {
  if (!Object.hasOwn(CLAIM_RULES, claim.type)) return false;
  const rule = CLAIM_RULES[claim.type];
  if (claim.evidenceClass !== rule.kind || claim.citations.length !== 1) return false;
  const source = sources.find((s) => s.ref === claim.citations[0]);
  if (!source || source.kind !== rule.kind || claim.facts.length !== rule.fields.length) return false;
  if ((claim.type === 'observed_max' || claim.type === 'predicted_high') && (source.stationId !== source.fields.stationId || source.fields.units !== 'ft' || !['MLLW', 'NAVD'].includes(String(source.fields.datum)))) return false;
  return rule.fields.every((field) => claim.facts.filter((f) => f.ref === source.ref && f.field === field && f.value === source.fields[field]).length === 1);
}
export function immutable<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); for (const item of Object.values(value)) immutable(item); } return value; }
