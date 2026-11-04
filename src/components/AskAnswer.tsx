import { useEffect, useRef } from 'react';
import type { AskUiState } from './AskThisPlace';

export function AskAnswer({ state, onClose }: { state: AskUiState | null; onClose?: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (state?.response || state?.failed) {
      heading.current?.focus({ preventScroll: true });
      const scroller = heading.current?.closest('.pscroll');
      if (scroller) scroller.scrollTop = 0;
    }
  }, [state]);
  if (!state?.question) return null;
  const answer = state.response;
  return <section className="card ask-answer" aria-label="Answer for this place" aria-busy={state.pending || false}>
    {onClose && !state.pending && <button type="button" className="linkbtn" onClick={onClose}>← Back to place</button>}
    <h2 ref={heading} tabIndex={-1}>About this place</h2>
    <p className="ask-question">{state.question}</p>
    {state.pending && <p role="status">Checking the source records for this place and period…</p>}
    {state.failed && <p role="alert">The answer could not be prepared right now. Try asking again. This does not tell us whether this spot could flood.</p>}
    {answer && <>
      <p className="tide-caption">Source-based answer · {answer.window.startDate}–{answer.window.endDate} · {answer.window.datum === 'NAVD' ? 'NAVD88' : 'MLLW'}. Records retrieved for this answer may be newer than the cards below.</p>
      {!answer.supported && <p>I can answer questions about the mapped FEMA flood classification and the selected NOAA tide period. I cannot answer this question from those records.</p>}
      {answer.findings.map((finding) => <div key={finding.id} className="ask-finding"><p>{finding.text}</p><div className="ask-citations">{finding.citations.map((ref) => {
        const source = answer.sources.find((s) => s.ref === ref);
        return source ? <a key={ref} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a> : null;
      })}</div></div>)}
      {answer.limitations.length > 0 && <div className="ask-limits"><h3>What this can’t tell us</h3><ul>{answer.limitations.map((line, i) => <li key={i}>{line}</li>)}</ul></div>}
      <details className="tide-details"><summary>Sources and answer details ({answer.sources.length})</summary>
        <p>Selected point: {answer.point.lat}, {answer.point.lon}. Evidence pack {answer.packId}; prepared {answer.createdAtUtc}. Only checked facts from these records are used.</p>
        {answer.sources.map((source) => <div className="ask-source" key={source.ref}><p><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></p><p>{source.ref} · {source.kind}{source.stationId ? ` · station ${source.stationId}` : ''} · retrieved {source.retrievedAtUtc}.</p>{source.fields && <dl className="ask-fields">{Object.entries(source.fields).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value === null ? 'Not stated' : String(value)}</dd></div>)}</dl>}</div>)}
        {answer.statuses.map((source, i) => <p key={i}>{source.source}: {source.state}.</p>)}
      </details>
    </>}
  </section>;
}
