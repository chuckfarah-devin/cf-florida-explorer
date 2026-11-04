// @vitest-environment node
import { vi } from 'vitest';
import { createNoaaService, inCuratedArea, stationDistance, tideWindow } from './noaa';

const POINT = { lat: 26.50844824511624, lon: -80.05460169017356 };
const START = '2026-10-25'; const END = '2026-10-29';
const noSleep = async () => {};
function metadata(id: string) {
  return { stations: [{ id, name: id === '8722670' ? 'Lake Worth Pier, Atlantic Ocean' : 'Ocean Ridge, ICWW', lat: id === '8722670' ? 26.612778 : 26.5267, lng: -80.034164,
    datums: { units: 'feet', epoch: '1983-2001', datums: [{ name: 'MLLW', value: id === '8722670' ? 29.99 : 1.44 }, ...(id === '8722670' ? [{ name: 'NAVD88', value: 32.50 }] : [])] } }] };
}
function productBody(url: URL) {
  const id = url.searchParams.get('station')!;
  const t = url.searchParams.get('begin_date')!;
  if (url.searchParams.get('product') === 'water_level') return { metadata: { id }, data: [{ t, v: '3.000', q: 'p', f: '1,0,0,0' }] };
  return { predictions: [{ t, v: id === '8722670' ? '2.500' : '1.750', type: 'H' }] };
}
type Override = (url: URL) => Response | undefined;
function upstream(override: Override = () => undefined) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const special = override(url); if (special) return special;
    if (url.pathname.includes('/mdapi/')) return Response.json(metadata(url.pathname.match(/\/(\d{7})\.json/)![1]));
    if (url.pathname.includes('/dpapi/')) return Response.json({ count: 0, units: 'feet', DailyFloodCount: [] });
    return Response.json(productBody(url));
  });
}
const water = (r: Awaited<ReturnType<ReturnType<typeof createNoaaService>['lookup']>>) => r.stations.find((s) => s.id === '8722670')!.products.find((p) => p.product === 'water_level')!;
const dataCalls = (fetcher: ReturnType<typeof upstream>) => fetcher.mock.calls.map(([url]) => new URL(String(url))).filter((url) => url.pathname.includes('/api/prod/'));

describe('NOAA deterministic connector (synthetic records)', () => {
  it('uses inclusive Florida calendar days and correct DST offsets', () => {
    expect(tideWindow(START, END)).toEqual({ startDate: START, endDate: END, startUtc: '2026-10-25T04:00:00.000Z', endUtc: '2026-10-30T04:00:00.000Z', timeZone: 'America/New_York' });
    const fall = tideWindow('2026-11-01', '2026-11-01');
    expect((Date.parse(fall.endUtc) - Date.parse(fall.startUtc)) / 3_600_000).toBe(25);
    const spring = tideWindow('2026-03-08', '2026-03-08');
    expect((Date.parse(spring.endUtc) - Date.parse(spring.startUtc)) / 3_600_000).toBe(23);
  });
  it.each([['2026-02-30', '2026-03-01'], ['2026-10-30', START], ['2026-10-01', '2026-11-01'], ['1899-01-01', '1899-01-01'], ['2026-1-01', '2026-01-01']])('rejects invalid or overlong windows %s – %s', (a, b) => {
    expect(() => tideWindow(a, b)).toThrow();
  });
  it('accepts 30 calendar dates across DST, rejects 31 and discloses curated coverage instead of statewide nearest stations', async () => {
    expect(tideWindow('2026-10-15', '2026-11-13').endDate).toBe('2026-11-13');
    expect(() => tideWindow('2026-10-15', '2026-11-14')).toThrow();
    expect(inCuratedArea(POINT)).toBe(true);
    const fetcher = upstream();
    const result = await createNoaaService({ fetcher }).lookup({ lat: 28.5, lon: -81.4 }, START, END, 'MLLW');
    expect(result.state).toBe('no_suitable_station'); expect(result.stations).toEqual([]); expect(fetcher).not.toHaveBeenCalled();
    expect(() => stationDistance(POINT, POINT)).not.toThrow();
    expect(stationDistance(POINT, { lat: POINT.lat + 0.1, lon: POINT.lon }).bearing).toBe('N');
  });
  it('keeps station identities, water bodies, predictions, observed flags and full point precision separate', async () => {
    const fetcher = upstream(); const result = await createNoaaService({ fetcher }).lookup(POINT, START, END, 'MLLW');
    expect(result.state).toBe('ok'); expect(result.point).toEqual(POINT); expect(result.units).toBe('ft');
    expect(result.stations.map((s) => [s.id, s.name, s.waterBody])).toEqual([['8722670', 'Lake Worth Pier, Atlantic Ocean', 'Atlantic Ocean'], ['8722718', 'Ocean Ridge, ICWW', 'Intracoastal Waterway']]);
    expect(water(result).rows).toEqual([{ timeUtc: '2026-10-25T04:00:00.000Z', value: 3, quality: 'preliminary', flags: '1,0,0,0' }]);
    expect(result.stations[1].products.map((p) => p.product)).toEqual(['predictions']);
    expect(result.stations[0].products[1].rows[0].value).toBe(2.5);
    expect(result.stations[1].products[0].rows[0].value).toBe(1.75);
    for (const url of dataCalls(fetcher)) {
      expect(url.searchParams.get('units')).toBe('english'); expect(url.searchParams.get('time_zone')).toBe('gmt');
      expect(url.searchParams.get('end_date')).toBe('2026-10-30 03:59');
    }
  });
  it('requests NAVD directly only where the same station supplies a numeric datum; never borrows Lake Worth offset for Ocean Ridge', async () => {
    const fetcher = upstream(); const result = await createNoaaService({ fetcher }).lookup(POINT, START, END, 'NAVD');
    expect(result.state).toBe('partial');
    expect(result.stations[1].products[0]).toMatchObject({ state: 'datum_unavailable', rows: [] });
    expect(dataCalls(fetcher).every((u) => u.searchParams.get('station') === '8722670' && u.searchParams.get('datum') === 'NAVD')).toBe(true);
  });
  it('rejects wrong metadata identity before retrieving that station product', async () => {
    const fetcher = upstream((url) => url.pathname.endsWith('/8722718.json') ? Response.json(metadata('8722670')) : undefined);
    const result = await createNoaaService({ fetcher }).lookup(POINT, START, END, 'MLLW');
    expect(result.state).toBe('partial'); expect(result.stations).toHaveLength(1);
    expect(dataCalls(fetcher).some((u) => u.searchParams.get('station') === '8722718')).toBe(false);
  });
  it('does not silently coerce blank measurements to zero or fill missing samples', async () => {
    const fetcher = upstream((url) => {
      if (url.searchParams.get('product') !== 'water_level') return;
      return Response.json({ metadata: { id: '8722670' }, data: [{ t: '2026-10-25 04:00', v: '', q: 'p', f: '0,0,0,0' }, { t: '2026-10-25 04:12', v: '0', q: 'v', f: '0,0,0,0' }] });
    });
    const result = await createNoaaService({ fetcher }).lookup(POINT, START, END, 'MLLW');
    expect(water(result).rows).toEqual([{ timeUtc: '2026-10-25T04:12:00.000Z', value: 0, quality: 'verified', flags: '0,0,0,0' }]);
  });
  it.each([
    { v: 'not-a-number' }, { v: '0x10' }, { t: '2026-02-30 04:00' }, { t: '2026-10-24 04:00' }, { q: '?' }, { f: '' },
  ])('rejects malformed observations rather than showing an invented maximum: %j', async (change) => {
    const fetcher = upstream((url) => url.searchParams.get('product') === 'water_level' ? Response.json({ metadata: { id: '8722670' }, data: [{ t: '2026-10-25 04:00', v: '3', q: 'p', f: '0,0,0,0', ...change }] }) : undefined);
    const result = await createNoaaService({ fetcher }).lookup(POINT, START, END, 'MLLW');
    expect(water(result)).toMatchObject({ state: 'unavailable', rows: [] }); expect(result.state).toBe('partial');
  });
  it('rejects duplicate timestamps and observation responses belonging to a different station', async () => {
    for (const duplicate of [true, false]) {
      const fetcher = upstream((url) => {
        if (url.searchParams.get('product') !== 'water_level') return;
        const row = { t: '2026-10-25 04:00', v: '3', q: 'p', f: '0,0,0,0' };
        return Response.json({ metadata: { id: duplicate ? '8722670' : '8722718' }, data: duplicate ? [row, row] : [row] });
      });
      expect(water(await createNoaaService({ fetcher }).lookup(POINT, START, END, 'MLLW')).state).toBe('unavailable');
    }
  });
  it('parses HTTP-200 no-data error objects without claiming zero water or caching a successful product', async () => {
    const fetcher = upstream((url) => url.searchParams.get('product') === 'water_level' ? Response.json({ error: { message: 'No data was found. This product may not be offered at this station at the requested time.' } }) : undefined);
    const service = createNoaaService({ fetcher });
    const result = await service.lookup(POINT, START, END, 'MLLW');
    expect(water(result)).toMatchObject({ state: 'no_data', rows: [] }); expect(result.state).not.toBe('unavailable');
    await service.lookup(POINT, START, END, 'MLLW');
    expect(dataCalls(fetcher).filter((u) => u.searchParams.get('product') === 'water_level')).toHaveLength(2);
  });
  it('does not retry HTTP 429; retries a transient HTTP 503 once', async () => {
    for (const status of [429, 503]) {
      const fetcher = upstream((url) => url.searchParams.get('product') === 'water_level' ? new Response('upstream failure', { status }) : undefined);
      const result = await createNoaaService({ fetcher, sleep: noSleep }).lookup(POINT, START, END, 'MLLW');
      expect(water(result).state).toBe('unavailable');
      expect(dataCalls(fetcher).filter((u) => u.searchParams.get('product') === 'water_level')).toHaveLength(status === 429 ? 1 : 2);
    }
  });
  it('times out a stuck product, retries once and preserves independent predictions', async () => {
    const normal = upstream();
    let observationCalls = 0;
    const fetcher: typeof fetch = async (input, init) => {
      if (new URL(String(input)).searchParams.get('product') !== 'water_level') return normal(input);
      observationCalls++;
      return new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    };
    const result = await createNoaaService({ fetcher, timeoutMs: 2, sleep: noSleep }).lookup(POINT, START, END, 'MLLW');
    expect(observationCalls).toBe(2); expect(water(result).state).toBe('unavailable'); expect(result.state).toBe('partial');
    expect(result.stations[1].products[0].state).toBe('ok');
  });
  it('preserves original product retrieval time in cache and isolates station, period and datum keys', async () => {
    let clock = Date.parse('2026-11-04T12:00:00Z'); const fetcher = upstream();
    const service = createNoaaService({ fetcher, now: () => clock });
    const first = await service.lookup(POINT, START, END, 'MLLW'); const initialCount = dataCalls(fetcher).length;
    clock += 60_000;
    const cached = await service.lookup({ ...POINT, lat: POINT.lat + 0.001 }, START, END, 'MLLW');
    expect(dataCalls(fetcher)).toHaveLength(initialCount); expect(water(cached).retrievedAtUtc).toBe(water(first).retrievedAtUtc);
    expect(cached.point.lat).not.toBe(first.point.lat);
    await service.lookup(POINT, '2026-10-26', END, 'MLLW');
    expect(dataCalls(fetcher).filter((u) => u.searchParams.get('begin_date') === '2026-10-26 04:00')).toHaveLength(3);
    await service.lookup(POINT, START, END, 'NAVD');
    expect(dataCalls(fetcher).filter((u) => u.searchParams.get('datum') === 'NAVD')).toHaveLength(2);
    clock += 16 * 60_000; await service.lookup(POINT, START, END, 'MLLW');
    expect(water(await service.lookup(POINT, START, END, 'MLLW')).retrievedAtUtc).not.toBe(water(first).retrievedAtUtc);
  });
  it('deduplicates concurrent identical upstream queries while keeping each selected point binding', async () => {
    const fetcher = upstream(); const service = createNoaaService({ fetcher });
    const [a, b] = await Promise.all([service.lookup(POINT, START, END, 'MLLW'), service.lookup({ ...POINT, lon: POINT.lon + 0.001 }, START, END, 'MLLW')]);
    expect(dataCalls(fetcher)).toHaveLength(3); expect(a.point).toEqual(POINT); expect(b.point.lon).not.toBe(a.point.lon);
  });
  it('allows an explicit retry to recover after a malformed product instead of caching the bad HTTP-200 payload', async () => {
    let bad = true;
    const fetcher = upstream((url) => url.searchParams.get('product') === 'water_level' && bad ? Response.json({ metadata: { id: '8722670' }, data: [{ t: '2026-10-25 04:00', v: 'bad', q: 'p', f: '0,0,0,0' }] }) : undefined);
    const service = createNoaaService({ fetcher });
    expect(water(await service.lookup(POINT, START, END, 'MLLW')).state).toBe('unavailable');
    bad = false;
    expect(water(await service.lookup(POINT, START, END, 'MLLW')).state).toBe('ok');
    expect(dataCalls(fetcher).filter((u) => u.searchParams.get('product') === 'water_level')).toHaveLength(2);
  });
  it('keeps empty daily flood reports distinct from zero exceedances and retains their independent height reference', async () => {
    const result = await createNoaaService({ fetcher: upstream() }).lookup(POINT, START, END, 'MLLW');
    expect(result.stations[0].htf).toMatchObject({ state: 'no_data', datum: 'STND', units: 'ft', rows: [] });
    expect(result.stations[1].htf).toBeUndefined();
  });
  it('validates report identity and flags, omits declared missing sentinel heights and preserves completeness', async () => {
    const valid = { day: '10/25/2026', maxWL: 34.9, minFlag: 1, modFlag: 0, majFlag: 0, nanFlag: 0, percent_completeness: 97.5 };
    const reports = [
      { count: 2, stnId: '8722670', units: 'feet', DailyFloodCount: [valid, { ...valid, day: '10/26/2026', nanFlag: 1, maxWL: -9999 }] },
      { count: 1, stnId: '8722718', units: 'feet', DailyFloodCount: [valid] },
      { count: 1, stnId: '8722670', units: 'feet', DailyFloodCount: [{ ...valid, minFlag: 2 }] },
      { count: 1, stnId: '8722670', units: 'feet', DailyFloodCount: [{ ...valid, percent_completeness: 101 }] },
    ];
    for (const [i, report] of reports.entries()) {
      const fetcher = upstream((url) => url.pathname.includes('/dpapi/') ? Response.json(report) : undefined);
      const result = await createNoaaService({ fetcher }).lookup(POINT, START, END, 'MLLW');
      const htf = result.stations[0].htf!;
      if (i === 0) expect(htf).toMatchObject({ state: 'ok', rows: [{ date: '2026-10-25', maxWL: 34.9, minor: true, moderate: false, major: false, percentCompleteness: 97.5 }] });
      else expect(htf).toMatchObject({ state: 'unavailable', rows: [] });
    }
  });
});
