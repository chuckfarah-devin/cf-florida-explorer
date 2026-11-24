import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { HistoryCard } from './HistoryCard';
const selection = { selectionId: 1, point: { lat: 26.5, lon: -80.05 }, source: 'typed' as const };
afterEach(() => vi.unstubAllGlobals());
it('shows cited historical places and labels the marker year', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ records: [{ id: 560, title: '1913 Boynton School', markerYear: '2007', city: 'Boynton Beach', county: 'Palm Beach', address: 'Ocean Avenue', excerpt: 'Opened in 1913.', url: 'https://markers.flheritage.com/home/details/560', distanceKm: 2.5 }], retrievedAt: '2026-11-05' })));
  render(<HistoryCard selection={selection} />);
  expect(await screen.findByText('1913 Boynton School')).toBeInTheDocument();
  expect(screen.getByText(/Marker year: 2007/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Read the state/ })).toHaveAttribute('href', 'https://markers.flheritage.com/home/details/560');
});
it('keeps source errors distinct from no nearby historical places', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error())); render(<HistoryCard selection={selection} />);
  expect(await screen.findByText('Couldn’t load historical places.')).toBeInTheDocument();
  expect(screen.queryByText('No historical markers found nearby.')).not.toBeInTheDocument();
});
