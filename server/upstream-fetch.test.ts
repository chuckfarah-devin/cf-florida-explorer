import { afterEach, expect, it, vi } from 'vitest';
import { upstreamFetch } from './upstream-fetch';
afterEach(() => vi.unstubAllGlobals());
it('uses Worker-supported manual redirects while retaining source redirect rejection', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, {status:302,headers:{Location:'https://untrusted.example'}}));
  vi.stubGlobal('fetch',fetcher);
  await expect(upstreamFetch('https://hazards.fema.gov', {redirect:'error'})).rejects.toThrow('Source redirect rejected');
  expect(fetcher).toHaveBeenCalledWith('https://hazards.fema.gov', {redirect:'manual'});
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('returns successful source responses and preserves signals and headers', async () => {
  const response=Response.json({features:[]});const fetcher=vi.fn().mockResolvedValue(response);vi.stubGlobal('fetch',fetcher);
  const init={redirect:'error' as const,signal:new AbortController().signal,headers:{Accept:'application/json'}};
  expect(await upstreamFetch('https://hazards.fema.gov',init)).toBe(response);
  expect(fetcher).toHaveBeenCalledWith('https://hazards.fema.gov',{...init,redirect:'manual'});
});
