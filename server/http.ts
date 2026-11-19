import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleFemaRequest } from './api.ts';

/** Shared bridge for Vite development and the optional local production server. */
export async function serveFema(req: IncomingMessage, res: ServerResponse, publicOrigin = process.env.PUBLIC_ORIGIN) {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > 4096) { res.writeHead(413).end(); return; }
    chunks.push(Buffer.from(chunk));
  }
  // HTTPS reverse proxies must configure PUBLIC_ORIGIN. Never trust forwarded protocol headers.
  const origin = publicOrigin ? new URL(publicOrigin).origin : `http://${req.headers.host ?? 'localhost'}`;
  const request = new Request(new URL(req.url ?? '/', origin), { method: req.method, headers: Object.fromEntries(Object.entries(req.headers).filter(([, v]) => typeof v === 'string')) as Record<string, string>, ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) });
  const response = await handleFemaRequest(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
}
