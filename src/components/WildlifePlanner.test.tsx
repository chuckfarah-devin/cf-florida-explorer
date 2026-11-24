import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WildlifePlanner } from './WildlifePlanner';
vi.mock('../wildlife/client', () => ({ fetchWildlife: (body: string, signal: AbortSignal) => fetch('/api/wildlife', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal }) }));
const selection = { selectionId: 1, point: { lat: 26.1, lon: -81.4 }, source: 'typed' as const };
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it('shows the larger search size and expands to more reports on request', async () => {
  const fetcher = vi.fn().mockImplementation((_url: string, options: { body: string }) => {
    const expanded = JSON.parse(options.body).depth === 2;
    return Promise.resolve(Response.json({ records: [], reportsLoaded: expanded ? 200 : 100, canExpand: !expanded, radiusKm: 50, retrievedAt: '2026-11-06' }));
  });
  vi.stubGlobal('fetch', fetcher); render(<WildlifePlanner selection={selection} />);
  expect(await screen.findByText('0 unique animals from 100 loaded reports')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Search more reports' }));
  expect(await screen.findByText('0 unique animals from 200 loaded reports')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Search more reports' })).not.toBeInTheDocument();
});
it('offers five animal groups and resets the type when switching groups', async () => {
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ records: [], radiusKm: 50, retrievedAt: '2026-11-05' })));
  vi.stubGlobal('fetch', fetcher);
  render(<WildlifePlanner selection={selection} />);
  expect(screen.getByLabelText('Animal group').querySelectorAll('option')).toHaveLength(6);
  fireEvent.change(screen.getByLabelText('Animal group'), { target: { value: 'reptiles' } });
  fireEvent.change(screen.getByLabelText('Animal type'), { target: { value: 'snakes' } });
  fireEvent.change(screen.getByLabelText('Native status'), { target: { value: 'introduced' } });
  await waitFor(() => expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body)).toMatchObject({ group: 'reptiles', type: 'snakes', status: 'introduced' }));
  fireEvent.change(screen.getByLabelText('Animal group'), { target: { value: 'birds' } });
  expect(screen.getByLabelText('Animal type')).toHaveValue('all');
});
it('loads source records and saves interests and public stops', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ records: [{ id: 123, reportCount: 3, name: 'Bobcat', scientificName: 'Lynx rufus', observedOn: '2026-10-24', url: 'https://www.inaturalist.org/observations/123' }], radiusKm: 50, retrievedAt: '2026-11-05' })));
  render(<WildlifePlanner selection={selection} />);
  expect(await screen.findByText('Bobcat')).toBeInTheDocument();
  expect(screen.getByText('3 reports')).toBeInTheDocument();
  expect(screen.getByText('View closest report ↗')).toHaveAttribute('href', 'https://www.inaturalist.org/observations/123');
  fireEvent.click(screen.getByText('Add to interests')); fireEvent.click(screen.getByText('Plan a day'));
  expect(screen.getByText('Wildlife interests: Bobcat')).toBeInTheDocument();
  fireEvent.click(screen.getAllByText('Add stop')[0]);
  expect(screen.getByLabelText('Remove Florida Panther refuge public trails')).toBeInTheDocument();
  await waitFor(() => expect(JSON.parse(localStorage.getItem('florida-explorer-outing')!).stops).toContain('panther'));
});
it('shows a loading error instead of an empty result', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error())); render(<WildlifePlanner selection={selection} />);
  expect(await screen.findByText('Couldn’t load sightings.')).toBeInTheDocument(); expect(screen.queryByText('No sightings found in the connected sources.')).not.toBeInTheDocument();
});
