/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { serveFema } from './server/http';

export default defineConfig({
  plugins: [react(), {
    name: 'florida-explorer-local-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/fema') { next(); return; }
        void serveFema(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/fema') { next(); return; }
        void serveFema(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
      });
    },
  }],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
  },
});
