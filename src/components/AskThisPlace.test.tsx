import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { AskThisPlace, askScopeKey, type AskUiState } from './AskThisPlace';
import { AskAnswer } from './AskAnswer';
import type { AskResponse } from '../ask/types';
import type { Selection } from '../state/selection';
import type { TideRequest } from '../noaa/types';
import type { DomainId } from './Header';

const selection: Selection = { selectionId: 1, point: { lat: 26.5, lon: -80.05 }, source: 'typed' };
const window: TideRequest = { startDate: '2026-10-25', endDate: '2026-10-29', datum: 'MLLW' };
const fixture = (question: string, id = 1): AskResponse => ({
  point: selection.point, selectionId: id, window, question, packId: 'synthetic-pack', createdAtUtc: '2026-11-04T12:00:00Z', mode: 'template', intent: 'flood', supported: true,
  findings: [{ id: 'flood-zone', text: 'FEMA maps this spot in Zone AE.', evidenceClass: 'regulatory_classification', citations: ['E1'] }], limitations: ['This map does not establish actual flooding.'], statuses: [{ source: 'FEMA', state: 'ok' }],
  sources: [{ ref: 'E1', label: 'FEMA flood map', kind: 'regulatory_classification', url: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?f=json', retrievedAtUtc: '2026-11-04T12:00:00Z' }],
});
const defaultLookup = vi.fn(async (_s: Selection, _w: TideRequest, q: string) => fixture(q));
function Harness({ point = selection, period = window, domain = 'water', lookup = defaultLookup }: { point?: Selection | null; period?: TideRequest; domain?: DomainId; lookup?: typeof defaultLookup }) {
  const [state, setState] = useState<AskUiState | null>(null);
  const key = askScopeKey(point, period, domain);
  return <><AskAnswer state={state?.scopeKey === key ? state : null} /><AskThisPlace key={key} selection={point} window={period} domain={domain} scopeKey={key} onState={setState} lookup={lookup} /></>;
}

it('answers in a separate card with readable per-claim citations and source provenance', async () => {
  render(<Harness />);
  await userEvent.type(screen.getByRole('textbox', { name: 'Question' }), 'Could this spot flood?');
  await userEvent.click(screen.getByRole('button', { name: /^Ask$/ }));
  const answer = await screen.findByRole('region', { name: 'Answer for this place' });
  expect(within(answer).getByText('FEMA maps this spot in Zone AE.')).toBeVisible();
  expect(within(answer).getAllByRole('link', { name: /FEMA flood map/ })[0]).toHaveAttribute('href', fixture('').sources[0].url);
  const footer = screen.getByRole('region', { name: 'Ask this place' });
  expect(within(footer).queryByText('FEMA maps this spot in Zone AE.')).toBeNull();
  expect(within(footer).getByText(/2026-10-25–2026-10-29 · MLLW/)).toBeVisible();
  expect(within(answer).getByRole('heading', { name: 'About this place' })).toHaveFocus();
  await userEvent.click(within(answer).getByText(/Sources and answer details/));
  expect(within(answer).getByText(/synthetic-pack/)).toBeVisible();
});

it('drops a delayed old-point answer and clears its question when the point changes', async () => {
  let finish!: (answer: AskResponse) => void;
  const lookup = vi.fn(() => new Promise<AskResponse>((resolve) => { finish = resolve; }));
  const { rerender } = render(<Harness lookup={lookup} />);
  await userEvent.click(screen.getByRole('button', { name: 'What does FEMA say about flooding here?' }));
  expect(screen.getByRole('status')).toHaveTextContent(/Checking/);
  rerender(<Harness point={{ ...selection, selectionId: 2, point: { lat: 26.6, lon: -80.04 } }} lookup={lookup} />);
  expect(screen.queryByRole('region', { name: 'Answer for this place' })).toBeNull();
  expect(screen.getByRole('textbox', { name: 'Question' })).toHaveValue('');
  await act(async () => finish(fixture('What does FEMA say about flooding here?')));
  expect(screen.queryByText('FEMA maps this spot in Zone AE.')).toBeNull();
});

it('keeps only the latest question and discards older responses even if cancellation is ignored', async () => {
  let first!: (answer: AskResponse) => void;
  const lookup = vi.fn().mockImplementationOnce(() => new Promise<AskResponse>((resolve) => { first = resolve; })).mockImplementationOnce(async (_s, _w, q) => ({ ...fixture(q), findings: [{ ...fixture(q).findings[0], text: 'Latest source-bound answer.' }] }));
  render(<Harness lookup={lookup} />);
  await userEvent.click(screen.getByRole('button', { name: 'What does FEMA say about flooding here?' }));
  await userEvent.click(screen.getByRole('button', { name: 'What were the water levels during this period?' }));
  expect(await screen.findByText('Latest source-bound answer.')).toBeVisible();
  await act(async () => first(fixture('What does FEMA say about flooding here?')));
  expect(screen.queryByText('FEMA maps this spot in Zone AE.')).toBeNull();
});

it('clears answers on applied period/domain changes and disables unsupported domains or missing points', async () => {
  const { rerender } = render(<Harness />);
  await userEvent.click(screen.getByRole('button', { name: 'What does FEMA say about flooding here?' }));
  expect(await screen.findByText('FEMA maps this spot in Zone AE.')).toBeVisible();
  rerender(<Harness period={{ ...window, startDate: '2026-10-18' }} />);
  expect(screen.queryByRole('region', { name: 'Answer for this place' })).toBeNull();
  expect(screen.getByText(/2026-10-18–2026-10-29/)).toBeVisible();
  rerender(<Harness domain="nature" />);
  expect(screen.getByRole('textbox', { name: 'Question' })).toBeDisabled();
  expect(screen.getByText(/Switch tabs to ask/)).toBeVisible();
  rerender(<Harness point={null} />);
  expect(screen.getByRole('button', { name: /^Ask$/ })).toBeDisabled();
});
