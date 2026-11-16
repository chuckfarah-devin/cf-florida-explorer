/** Portable redirect rejection and diagnostics without URLs, questions or credentials. */
export const upstreamFetch: typeof fetch = async (input, init) => {
  const host = new URL(input instanceof Request ? input.url : String(input)).hostname;
  const rejectRedirect = init?.redirect === 'error';
  try {
    // Workers supports manual/follow, but throws before fetching for redirect:error.
    const response = await fetch(input, rejectRedirect ? { ...init, redirect: 'manual' } : init);
    if (rejectRedirect && (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400))) throw new TypeError('Source redirect rejected');
    if (!response.ok) console.warn(JSON.stringify({ event: 'source_http_failure', host, status: response.status }));
    return response;
  } catch (error) {
    console.warn(JSON.stringify({ event: 'source_fetch_failure', host, kind: error instanceof Error ? error.name : 'Unknown' }));
    throw error;
  }
};
