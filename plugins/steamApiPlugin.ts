import type { Plugin } from 'vite';
import { handleSteamRequest } from '../server/steam-handler.ts';

export function steamApiPlugin(): Plugin {
  return {
    name: 'gametracker:steam-api',
    configureServer(server) {
      server.middlewares.use('/api/steam', (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const full = `/api/steam${url.pathname}${url.search}`;

        handleSteamRequest(full)
          .then((result) => {
            res.statusCode = result.status;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.setHeader('cache-control', 'public, max-age=60');
            res.end(JSON.stringify(result.body));
          })
          .catch((error: unknown) => {
            res.statusCode = 502;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'steam request failed',
            }));
          });
      });
    },
  };
}
