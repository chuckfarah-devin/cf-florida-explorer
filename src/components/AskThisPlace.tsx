import { useEffect, useRef, useState } from 'react';
import type { Selection } from '../state/selection';
import type { TideRequest } from '../noaa/types';
import type { DomainId } from './Header';
import type { AskResponse } from '../ask/types';
import { fetchAnswer } from '../ask/client';
import { formatLatLon } from '../config/bounds';

const SUGGESTIONS = ['What does FEMA say about flooding here?', 'What were the water levels during this period?', 'What can these records tell us about the flooding I saw?'];
export interface AskUiState { scopeKey: string; question?: string; response?: AskResponse; pending?: boolean; failed?: boolean }
export function askScopeKey(selection: Selection | null, window: TideRequest, domain: DomainId) {
  return `${selection?.selectionId ?? 0}/${selection?.point.lat ?? ''}/${selection?.point.lon ?? ''}/${window.startDate}/${window.endDate}/${window.datum}/${domain}`;
}

/** Only the composer is pinned. Answers live in the scrollable place panel. */
export function AskThisPlace({ selection, window, domain, scopeKey, onState, lookup = fetchAnswer }: {
  selection: Selection | null; window: TideRequest; domain: DomainId; scopeKey: string;
  onState: (state: AskUiState) => void; lookup?: typeof fetchAnswer;
}) {
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const canAsk = !!selection && domain === 'water';
  useEffect(() => () => { sequence.current++; controller.current?.abort(); }, []);
  async function submit(text: string) {
    const value = text.trim();
    if (!selection || !canAsk || !value || value.length > 500) return;
    setQuestion(value); controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const attempt = ++sequence.current;
    setPending(true); onState({ scopeKey, pending: true, question: value });
    try {
      const response = await lookup(selection, window, value, abort.signal);
      if (attempt === sequence.current && !abort.signal.aborted) onState({ scopeKey, question: value, response });
    } catch {
      if (attempt === sequence.current && !abort.signal.aborted) onState({ scopeKey, question: value, failed: true });
    } finally { if (attempt === sequence.current) setPending(false); }
  }
  return <section className="askfoot" aria-labelledby="ask-title">
    <div className="ask-head"><h2 id="ask-title" className="kicker">Ask this place</h2><span className="tag soon">Source-based answers</span></div>
    <form className="ask" onSubmit={(e) => { e.preventDefault(); void submit(question); }} aria-describedby="ask-note">
      <label htmlFor="ask-input" className="sr-only">Question</label>
      <input id="ask-input" value={question} maxLength={500} disabled={!canAsk} onChange={(e) => setQuestion(e.target.value)} placeholder={canAsk ? 'Ask about this spot…' : 'Select a place to ask about it…'} />
      <button type="submit" className="btn" disabled={!canAsk || !question.trim()}>{pending ? 'Ask again' : 'Ask'}</button>
    </form>
    <p id="ask-note" className="ask-note">{!selection ? 'Select a Florida place to ask a question.' : domain !== 'water' ? 'Answers currently cover Water & Weather. Switch tabs to ask.' : `${formatLatLon(selection.point)} · ${window.startDate}–${window.endDate} · ${window.datum === 'NAVD' ? 'NAVD88' : 'MLLW'}. Checked FEMA and NOAA records.`}</p>
    <div className="qa" role="group" aria-label="Example questions" tabIndex={0}>{SUGGESTIONS.map((q) => <button key={q} type="button" className="chip q" disabled={!canAsk} onClick={() => void submit(q)}>{q}</button>)}</div>
  </section>;
}
