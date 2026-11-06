import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InfrastructureCard } from './InfrastructureCard';
const selection = { selectionId: 1, point: { lat: 26.5, lon: -80.05 }, source: 'typed' as const };
afterEach(() => vi.unstubAllGlobals());
it('shows source context separately from a street-drain route', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ sources: [{ id: 'watershed', label: 'Watershed at this point', state: 'ok', records: [{ name: 'LAKE WORTH LAGOON' }], queryUrl: 'https://geoweb.sfwmd.gov/', retrievedAt: '2026-11-05' }] })));
  render(<InfrastructureCard selection={selection} />);
  expect(await screen.findByText('LAKE WORTH LAGOON')).toBeInTheDocument();
  expect(screen.queryByText('Where does this drain go?')).not.toBeInTheDocument();
  expect(screen.getByText('Technical source data (JSON) ↗')).toHaveAttribute('href', 'https://geoweb.sfwmd.gov/');
});
it('shows a source failure as an error rather than no mapped infrastructure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error())); render(<InfrastructureCard selection={selection} />);
  expect(await screen.findByText('Couldn’t load drainage maps.')).toBeInTheDocument();
  expect(screen.queryByText('No named features found in this source.')).not.toBeInTheDocument();
});
