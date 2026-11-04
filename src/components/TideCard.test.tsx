import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { TideCard, validTideWindow } from './TideCard';
import type { TideResponse } from '../noaa/types';

const selection = { selectionId: 1, point: { lat: 26.5084, lon: -80.0546 }, source: 'typed' as const };
const response = (id = 1): TideResponse => ({
  point: selection.point, selectionId: id, datum: 'MLLW', units: 'ft', state: 'ok', retrievedAtUtc: '2026-11-04T12:00:00Z',
  window: { startDate: '2026-10-25', endDate: '2026-10-29', startUtc: '2026-10-25T04:00:00Z', endUtc: '2026-10-30T04:00:00Z', timeZone: 'America/New_York' },
  stations: [{ id: '8722670', name: 'Lake Worth Pier', waterBody: 'Atlantic Ocean', lat: 26.6128, lon: -80.0342, distanceKm: 11.7, bearing: 'N', rationale: 'Curated ocean comparison station.', metadataUrl: 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/8722670.json',
    products: [
      { product: 'water_level', state: 'ok', queryUrl: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8722670', retrievedAtUtc: '2026-11-04T12:00:00Z', rows: [
        { timeUtc: '2026-10-25T12:00:00Z', value: 3.0, quality: 'verified', flags: '0,0,0,0' },
        { timeUtc: '2026-10-25T12:06:00Z', value: 3.2, quality: 'preliminary', flags: '0,1,0,0' },
      ] },
      { product: 'predictions', state: 'ok', queryUrl: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8722670&product=predictions', retrievedAtUtc: '2026-11-04T12:00:00Z', rows: [
        { timeUtc: '2026-10-25T12:00:00Z', value: 2.5, kind: 'H' },
        { timeUtc: '2026-10-25T18:00:00Z', value: 0.2, kind: 'L' },
      ] },
    ], htf: { state: 'no_data', datum: 'STND', units: 'ft', queryUrl: 'https://api.tidesandcurrents.noaa.gov/dpapi/prod/webapi/htf/htf_daily.json', retrievedAtUtc: '2026-11-04T12:00:00Z', rows: [] },
  }],
});

describe('NOAA tide card', () => {
  it('shares only the applied dates and datum atomically, never unsubmitted edits or retries', async () => {
    const onWindow = vi.fn();
    const lookup = vi.fn(async () => response());
    const user = userEvent.setup();
    render(<TideCard selection={selection} lookup={lookup} onWindow={onWindow} />);
    await screen.findByRole('heading', { name: 'Lake Worth Pier' });
    expect(onWindow).toHaveBeenCalledExactlyOnceWith({ startDate: '2026-10-25', endDate: '2026-10-29', datum: 'MLLW' });
    await user.clear(screen.getByLabelText('Start date'));
    await user.type(screen.getByLabelText('Start date'), '2026-10-26');
    await user.clear(screen.getByLabelText('End date (included)'));
    await user.type(screen.getByLabelText('End date (included)'), '2026-10-30');
    await user.selectOptions(screen.getByLabelText('Height reference'), 'NAVD');
    expect(onWindow).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Compare tides' }));
    expect(onWindow).toHaveBeenCalledTimes(2);
    expect(onWindow).toHaveBeenLastCalledWith({ startDate: '2026-10-26', endDate: '2026-10-30', datum: 'NAVD' });
    await screen.findByRole('button', { name: 'Retry NOAA lookup' });
    await user.click(screen.getByRole('button', { name: 'Retry NOAA lookup' }));
    expect(onWindow).toHaveBeenCalledTimes(2);
  });

  it('separates measured maxima, predictions, quality, flags and local references', async () => {
    render(<TideCard selection={selection} lookup={vi.fn(async () => response())} />);
    expect(await screen.findByRole('heading', { name: 'Lake Worth Pier' })).toBeVisible();
    expect(screen.getByRole('img', { name: /Lake Worth Pier: tide chart/ })).toBeVisible();
    await userEvent.click(screen.getByText('View tide times and values'));
    const measured = screen.getByRole('region', { name: 'Daily measured maxima table' });
    expect(within(measured).getByText('3.200')).toBeVisible();
    expect(within(measured).getByText(/Preliminary data; may change · 2 samples/)).toBeVisible();
    expect(within(measured).getByText(/8:06 AM EDT/)).toBeVisible();
    const predicted = screen.getByRole('region', { name: 'Predicted high tides table' });
    expect(within(predicted).getByText('2.500')).toBeVisible();
    expect(within(predicted).queryByText('0.200')).toBeNull();
    expect(screen.getByText(/1 sample\(s\) carry nonzero NOAA flags/)).toBeVisible();
    expect(screen.getByText(/This does not mean zero flooding days/)).toBeVisible();
    expect(screen.getByText(/These stations cannot establish water depth/)).toBeVisible();
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-10-25');
    await userEvent.click(screen.getByText(/Sources and details/));
    expect(screen.getByText(/MLLW reference is local/)).toBeVisible();
  });

  it('applies explicit dates and datum together, dropping a delayed previous window', async () => {
    let resolveOld!: (value: TideResponse) => void;
    const newer = { ...response(), datum: 'NAVD' as const, window: { ...response().window, startDate: '2026-10-26' } };
    newer.stations[0].products = newer.stations[0].products.map((p) => ({ ...p, state: 'datum_unavailable' as const, rows: [] }));
    const lookup = vi.fn().mockImplementationOnce(() => new Promise<TideResponse>((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce(newer);
    render(<TideCard selection={selection} lookup={lookup} />);
    await userEvent.clear(screen.getByLabelText('Start date'));
    await userEvent.type(screen.getByLabelText('Start date'), '2026-10-26');
    await userEvent.selectOptions(screen.getByLabelText('Height reference'), 'NAVD');
    await userEvent.click(screen.getByRole('button', { name: 'Compare tides' }));
    expect(await screen.findByText(/Results: 2026-10-26 through 2026-10-29/)).toBeVisible();
    expect(lookup.mock.calls[1][1]).toEqual({ startDate: '2026-10-26', endDate: '2026-10-29', datum: 'NAVD' });
    await act(async () => resolveOld(response()));
    expect(screen.queryByText(/Results: 2026-10-25 through/)).toBeNull();
    expect(screen.getAllByText(/isn’t available in NAVD88/)).toHaveLength(2);
  });

  it('labels unapplied edits and explains an unsupported datum without claiming an outage', async () => {
    const data = response(); data.datum = 'NAVD'; data.state = 'partial';
    data.stations.push({ ...data.stations[0], id: '8722718', name: 'Ocean Ridge', waterBody: 'Intracoastal Waterway', products: [{ ...data.stations[0].products[1], state: 'datum_unavailable', rows: [] }] });
    const lookup = vi.fn(async (_selection, window) => window.datum === 'NAVD' ? data : response());
    render(<TideCard selection={selection} lookup={lookup} />);
    await screen.findByRole('img');
    await userEvent.selectOptions(screen.getByLabelText('Height reference'), 'NAVD');
    expect(screen.getByText(/Changes not applied yet/)).toBeVisible();
    expect(lookup).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Compare tides' }));
    expect(await screen.findByText(/Ocean Ridge isn’t available in NAVD88/)).toBeVisible();
    expect(screen.queryByText(/Changes not applied yet/)).toBeNull();
    expect(screen.getByText(/Some stations do not support/)).toBeVisible();
    expect(screen.queryByText(/sources are unavailable right now/)).toBeNull();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('clears old point markers and ignores late responses even if abort is ignored', async () => {
    let resolveOld!: (value: TideResponse) => void;
    const lookup = vi.fn().mockImplementationOnce(() => new Promise<TideResponse>((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce({ ...response(2), stations: [], state: 'no_suitable_station' });
    const onStations = vi.fn();
    const { rerender, unmount } = render(<TideCard selection={selection} lookup={lookup} onStations={onStations} />);
    rerender(<TideCard selection={{ ...selection, selectionId: 2 }} lookup={lookup} onStations={onStations} />);
    expect(await screen.findByText(/curated set \(provisional\)/)).toBeVisible();
    await act(async () => resolveOld(response()));
    expect(screen.queryByRole('heading', { name: 'Lake Worth Pier' })).toBeNull();
    expect(onStations).toHaveBeenLastCalledWith([]);
    unmount();
    expect(onStations).toHaveBeenLastCalledWith([]);
  });

  it('shows retryable transport failure without interpreting it as no flooding', async () => {
    const lookup = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response());
    render(<TideCard selection={selection} lookup={lookup} />);
    expect(await screen.findByText(/NOAA tide data is unavailable/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Retry NOAA lookup' }));
    expect(await screen.findByRole('heading', { name: 'Lake Worth Pier' })).toBeVisible();
  });

  it('validates real calendar dates and the 30-day inclusive limit across DST', () => {
    expect(validTideWindow({ startDate: '2026-10-01', endDate: '2026-10-30', datum: 'MLLW' })).toBe(true);
    expect(validTideWindow({ startDate: '2026-10-01', endDate: '2026-10-31', datum: 'MLLW' })).toBe(false);
    expect(validTideWindow({ startDate: '2026-10-15', endDate: '2026-11-13', datum: 'MLLW' })).toBe(true);
    expect(validTideWindow({ startDate: '2026-10-15', endDate: '2026-11-14', datum: 'MLLW' })).toBe(false);
    expect(validTideWindow({ startDate: '2026-10-01', endDate: '2026-11-01', datum: 'MLLW' })).toBe(false);
    expect(validTideWindow({ startDate: '2026-02-30', endDate: '2026-03-03', datum: 'MLLW' })).toBe(false);
    expect(validTideWindow({ startDate: '2026-10-29', endDate: '2026-10-25', datum: 'MLLW' })).toBe(false);
  });

  it('keeps valid empty NOAA responses distinct from a service failure', async () => {
    const data = response();
    data.stations[0].products = data.stations[0].products.map((product) => ({ ...product, state: 'no_data', rows: [] }));
    render(<TideCard selection={selection} lookup={vi.fn(async () => data)} />);
    expect(await screen.findByRole('heading', { name: 'Lake Worth Pier' })).toBeVisible();
    expect(screen.getAllByText(/NOAA returned no data for this period/)).toHaveLength(2);
    expect(screen.queryByText(/NOAA tide data is unavailable right now/)).toBeNull();
    expect(screen.queryByText(/Some NOAA sources could not be retrieved/)).toBeNull();
  });

  it('shows HTF report dates, STND heights, station flags and completeness without filling missing days', async () => {
    const data = response();
    data.stations[0].htf = { ...data.stations[0].htf!, state: 'ok', rows: [{ date: '2026-10-26', maxWL: 34.9, minor: true, moderate: false, major: false, percentCompleteness: 95 }] };
    render(<TideCard selection={selection} lookup={vi.fn(async () => data)} />);
    await userEvent.click(await screen.findByText('Station flooding-day reports'));
    const table = screen.getByRole('region', { name: 'Flooding-day reports at Lake Worth Pier' });
    expect(within(table).getByText('2026-10-26')).toBeVisible();
    expect(within(table).getByText('Max (ft STND)')).toBeVisible();
    expect(within(table).getByText('34.900')).toBeVisible();
    expect(within(table).getByText('Minor: yes; moderate: no; major: no')).toBeVisible();
    expect(within(table).getByText('95.0%')).toBeVisible();
    expect(screen.getByText(/their time basis has not been verified/)).toBeVisible();
    expect(screen.getByText(/Missing report dates are not counted as zero flooding days/)).toBeVisible();
    expect(within(table).queryByText('2026-10-25')).toBeNull();
  });
});
