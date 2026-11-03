import { checkPoint, parseCoordinates, messageFor, formatLatLon } from './bounds';

describe('checkPoint', () => {
  it('accepts Briny Breezes', () => {
    expect(checkPoint({ lat: 26.5089022, lon: -80.0522463 })).toEqual({ ok: true, point: { lat: 26.5089022, lon: -80.0522463 } });
  });
  it('rejects points outside Florida (OUT-1, N02)', () => {
    expect(checkPoint({ lat: 25.0, lon: -78.0 })).toMatchObject({ ok: false, reason: 'outside_florida' });
  });
  it('detects swapped order (N10)', () => {
    const r = checkPoint({ lat: -80.05, lon: 26.51 });
    expect(r).toMatchObject({ ok: false, reason: 'swapped', suggestion: { lat: 26.51, lon: -80.05 } });
  });
  it('rejects non-finite input', () => {
    expect(checkPoint({ lat: Number.NaN, lon: -80 })).toMatchObject({ ok: false, reason: 'invalid' });
  });
  it('accepts the Keys and the western Panhandle', () => {
    expect(checkPoint({ lat: 24.555, lon: -81.78 }).ok).toBe(true);
    expect(checkPoint({ lat: 30.42, lon: -87.21 }).ok).toBe(true);
  });
});

describe('parseCoordinates', () => {
  it('parses comma and space separated pairs', () => {
    expect(parseCoordinates('26.50890, -80.05225')).toEqual({ lat: 26.5089, lon: -80.05225 });
    expect(parseCoordinates(' 26.5 -80.05 ')).toEqual({ lat: 26.5, lon: -80.05 });
  });
  it('returns null for place names', () => {
    expect(parseCoordinates('Briny Breezes')).toBeNull();
  });
});

describe('messages', () => {
  it('uses one outside-Florida message for every input path', () => {
    const r = checkPoint({ lat: 25, lon: -78 });
    if (r.ok) throw new Error('expected rejection');
    expect(messageFor(r)).toBe('This point is outside Florida; Florida Explorer covers Florida only.');
  });
  it('formats with typographic minus', () => {
    expect(formatLatLon({ lat: 26.5089022, lon: -80.0522463 })).toBe('26.50890, −80.05225');
  });
});
