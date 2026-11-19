// @vitest-environment node
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { vi } from 'vitest';

vi.mock('./api.ts', () => ({
  handleFemaRequest: async (req: Request) => {
    const sameOrigin = req.headers.get('origin') === new URL(req.url).origin;
    return Response.json({ origin: new URL(req.url).origin }, { status: sameOrigin ? 200 : 403 });
  },
}));
import { serveFema } from './http';

async function bridge(origin: string, publicOrigin: string) {
  const req = Readable.from([Buffer.from('{}')]) as unknown as IncomingMessage;
  Object.assign(req, { headers: { host: 'localhost:4173', origin, 'content-type': 'application/json' }, method: 'POST', url: '/api/fema' });
  const res = { writeHead: vi.fn(), end: vi.fn() };
  await serveFema(req, res as unknown as ServerResponse, publicOrigin);
  return res;
}

it('uses the explicitly configured HTTPS public origin behind a preview proxy', async () => {
  const origin = 'https://florida-explorer.example.test';
  const res = await bridge(origin, origin);
  expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
  expect(JSON.parse(res.end.mock.calls[0][0]).origin).toBe(origin);
});

it('does not grant an unrelated browser origin access just because a proxy is configured', async () => {
  const res = await bridge('https://unrelated.example.test', 'https://florida-explorer.example.test');
  expect(res.writeHead).toHaveBeenCalledWith(403, expect.any(Object));
});
