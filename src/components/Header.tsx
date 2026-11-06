import type { ReactNode } from 'react';

const DOMAINS = [
  { id: 'water', label: 'Water & Weather', soon: false },
  { id: 'nature', label: 'Nature & Wildlife', soon: false },
  { id: 'history', label: 'History & Change', soon: false },
  { id: 'land', label: 'Land & Infrastructure', soon: false },
] as const;
export type DomainId = (typeof DOMAINS)[number]['id'];

export function Header({ domain, onDomain, search }: { domain: DomainId; onDomain: (d: DomainId) => void; search: ReactNode }) {
  return (
    <header className="hdr">
      <div className="logo"><span className="mark" aria-hidden="true" />Florida Explorer</div>
      {search}
      <nav className="domains" aria-label="Topics">
        {DOMAINS.map((d) => (
          <button key={d.id} type="button" className={`dom${domain === d.id ? ' on' : ''}`} aria-pressed={domain === d.id}
            disabled={d.soon} onClick={() => onDomain(d.id)}>
            {d.label}{d.soon && <span className="tag soon">Soon</span>}
          </button>
        ))}
      </nav>
    </header>
  );
}
