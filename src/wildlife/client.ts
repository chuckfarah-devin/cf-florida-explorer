import { createWildlifeHandler } from './service';

let nextRequestAt = 0;
const sourceFetch: typeof fetch = async (input, init) => {
  const signal = init?.signal;
  signal?.throwIfAborted();
  const delay = Math.max(0, nextRequestAt - Date.now());
  nextRequestAt = Math.max(nextRequestAt, Date.now()) + 1100;
  if (delay) await new Promise<void>((resolve, reject) => {
    const aborted = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', aborted); resolve(); }, delay);
    signal?.addEventListener('abort', aborted, { once: true });
  });
  signal?.throwIfAborted();
  return fetch(input, { ...init, credentials: 'omit' });
};
// Public CORS-enabled reads use the visitor's browser; no server credential is needed.
// Cache, filters, privacy exclusions and source validation are shared with the API.
const handler = createWildlifeHandler(sourceFetch);
export function fetchWildlife(body: string, signal: AbortSignal): Promise<Response> {
  return handler(new Request(`${window.location.origin}/api/wildlife`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal }));
}
