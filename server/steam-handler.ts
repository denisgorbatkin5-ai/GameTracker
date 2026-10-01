import { getAppDetails, searchApps } from './steam-core.ts';

export interface HandlerResult {
  status: number;
  body: unknown;
}

interface FeaturedItem {
  id?: number;
  name?: string;
  header_image?: string;
  large_capsule_image?: string;
}

async function featured(): Promise<HandlerResult> {
  const res = await fetch('https://store.steampowered.com/api/featuredcategories?cc=us&l=english', {
    headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' },
  });
  if (!res.ok) return { status: res.status, body: { error: 'steam unavailable' } };
  const json = (await res.json()) as Record<string, unknown>;

  const extract = (key: string): { appid: number; name: string; header: string }[] => {
    const group = json[key] as { items?: FeaturedItem[] } | undefined;
    if (!group?.items) return [];
    const seen = new Set<number>();
    const list: { appid: number; name: string; header: string }[] = [];
    for (const item of group.items) {
      const appid = Number(item.id);
      if (!Number.isFinite(appid) || appid <= 0 || seen.has(appid)) continue;
      if (!item.name) continue;

      // Steam hosts brand-new assets under hashed paths, so prefer the URLs it gives us
      // and only fall back to the predictable CDN path for older titles.
      const header =
        item.header_image ??
        item.large_capsule_image ??
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
      if (!header) continue;

      seen.add(appid);
      list.push({ appid, name: item.name, header });
      if (list.length >= 18) break;
    }
    return list;
  };

  return {
    status: 200,
    body: {
      topSellers: extract('top_sellers'),
      specials: extract('specials'),
      newReleases: extract('new_releases'),
    },
  };
}

export async function handleSteamRequest(requestUrl: string): Promise<HandlerResult> {
  const url = new URL(requestUrl, 'http://localhost');

  if (url.pathname === '/api/steam/search') {
    const term = url.searchParams.get('q') ?? '';
    const results = await searchApps(term);
    return { status: 200, body: { results } };
  }

  if (url.pathname === '/api/steam/app') {
    const id = Number(url.searchParams.get('id'));
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
    const games = await Promise.all(ids.map((id) => getAppDetails(id)));
    return { status: 200, body: { games: games.filter(Boolean) } };
  }

  if (url.pathname === '/api/steam/featured') {
    return featured();
  }

  return { status: 404, body: { error: 'unknown endpoint' } };
}
