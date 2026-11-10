const SUGGESTIONS = ['Could this area flood?', 'What are king tides?', "What's protected near here?"];

/** Pinned Ask This Place area. Answers are not authorized in I1, so it is a labelled preview. */
export function AskPreview({ placeLabel }: { placeLabel: string | null }) {
  return (
    <section className="askfoot" aria-labelledby="ask-title">
      <div className="ask-head">
        <h2 id="ask-title" className="kicker">Ask this place</h2>
        <span className="tag soon">Preview</span>
      </div>
      <form className="ask" onSubmit={(e) => e.preventDefault()} aria-describedby="ask-note">
        <label htmlFor="ask-input" className="sr-only">Question</label>
        <input id="ask-input" disabled placeholder={placeLabel ? `Ask about ${placeLabel}…` : 'Select a place to ask about it…'} />
        <button type="submit" className="btn" disabled>Ask</button>
      </form>
      <p id="ask-note" className="ask-note">Answers from source records arrive in a later step. Nothing is answered yet.</p>
      <div className="qa" role="group" aria-label="Example questions">
        {SUGGESTIONS.map((q) => <span key={q} className="chip q" aria-disabled="true">{q}</span>)}
      </div>
    </section>
  );
}
