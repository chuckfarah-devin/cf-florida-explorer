import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FloodCard, floodSummary } from './FloodCard';
import type { FemaResponse } from '../fema/types';

const selection = { selectionId: 1, point: { lat: 26.5, lon: -80.05 }, source: 'typed' as const };
const response = (id = 1): FemaResponse => ({
  selectionId: id, point: selection.point, batchId: 'synthetic-unit-fixture', state: 'classified_near_boundary',
  zones: [{ FLD_ZONE: 'AE', FLD_AR_ID: 'synthetic-ae', ZONE_SUBTY: 'COASTAL FLOODPLAIN', STATIC_BFE: 8, LEN_UNIT: '', V_DATUM: 'NAVD88' }],
  nearbyZones: [{ FLD_ZONE: 'X' }], sources: [], radiusMeters: 15, boundaryCheckAvailable: true, freshness: 'fresh', retrievedAtUtc: '2026-11-03T12:00:00.000Z', refreshFailures: [],
});

describe('Flood card', () => {
  it('renders plain language and a sourced nearby-zone note; unknown units are never invented', async () => {
    const lookup = vi.fn(async () => response());
    render(<FloodCard selection={selection} lookup={lookup} />);
    expect(await screen.findByText('FEMA maps this spot in an area with a 1% annual chance of flooding.')).toBeVisible();
    expect(screen.getByText('Another mapped flood zone was found within 15 m.')).toBeVisible();
    await userEvent.click(screen.getByText(/Technical details and sources/));
    expect(screen.getByText(/units: Not stated by source/)).toBeVisible();
    expect(screen.queryByText(/8 ft/)).toBeNull();
  });

  it('does not default an unrecognized X subtype to minimal hazard', () => {
    expect(floodSummary({ FLD_ZONE: 'X', ZONE_SUBTY: '' })).toBe('FEMA returned zone X. Open the source details to see its classification.');
  });

  it('drops old point responses even when the transport ignores abort', async () => {
    let resolveOld!: (value: FemaResponse) => void;
    const lookup = vi.fn().mockImplementationOnce(() => new Promise<FemaResponse>((r) => { resolveOld = r; })).mockResolvedValueOnce({ ...response(2), state: 'outside_nfhl_coverage', zones: [], nearbyZones: [] });
    const { rerender } = render(<FloodCard selection={selection} lookup={lookup} />);
    rerender(<FloodCard selection={{ ...selection, selectionId: 2 }} lookup={lookup} />);
    await screen.findByText("FEMA's digital flood map doesn't cover this spot.");
    await act(async () => resolveOld(response()));
    expect(screen.queryByText(/FEMA maps this spot in an area with/)).toBeNull();
  });

  it('shows a stale label, unavailable boundary check, and retries a transport failure', async () => {
    const lookup = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...response(), freshness: 'stale', boundaryCheckAvailable: false });
    render(<FloodCard selection={selection} lookup={lookup} />);
    const card = screen.getByRole('region', { name: 'FEMA flooding' });
    expect(await within(card).findByText(/FEMA flood data is unavailable/)).toBeVisible();
    await userEvent.click(within(card).getByRole('button', { name: 'Retry FEMA lookup' }));
    expect(await within(card).findByText(/\(stale\)/)).toBeVisible();
    expect(within(card).getByText(/nearby-zone check is unavailable/)).toBeVisible();
  });
});
