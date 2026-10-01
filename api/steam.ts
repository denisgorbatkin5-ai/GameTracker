import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleSteamRequest } from '../server/steam-handler.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.url ?? '/api/steam';
  const path = raw.replace(/^\/api\/steam/, '') || '/';

  try {
    const result = await handleSteamRequest(`/api/steam${path}`);
    res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'steam request failed',
    });
  }
}
