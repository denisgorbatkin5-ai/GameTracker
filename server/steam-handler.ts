import { getFeatured, type FeaturedList } from './steam-core.ts';

export interface HandlerResult {
  status: number;
  body: unknown;
}

export async function handleSteamRequest(requestUrl: string): Promise<HandlerResult> {
  const url = new URL(requestUrl, 'http://localhost');

  if (url.pathname === '/api/steam/search') {
    const term = url.searchParams.get('q') ?? '';
    const { searchApps } = await import('./steam-core.ts');
    return { status: 200, body: { results: await searchApps(term) } };
  }

  if (url.pathname === '/api/steam/app') {
    const id = Number(url.searchParams.get('id'));
    const { getAppDetails } = await import('./steam-core.ts');
    const game = await getAppDetails(id);
    if (!game) return { status: 404, body: { error: 'game not found' } };
    return { status: 200, body: { game } };
  }

  if (url.pathname === '/api/steam/apps') {
    const ids = (url.searchParams.get('ids') ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0)
      .slice(0, 40);
    const { getAppDetails } = await import('./steam-core.ts');
    const games = await Promise.all(ids.map((id) => getAppDetails(id)));
    return { status: 200, body: { games: games.filter(Boolean) } };
  }

  if (url.pathname === '/api/steam/featured') {
    try {
      return { status: 200, body: await getFeatured() };
    } catch {
      return { status: 502, body: { error: 'steam unavailable' } };
    }
  }

  return { status: 404, body: { error: 'unknown endpoint' } };
}

export type { FeaturedList };
