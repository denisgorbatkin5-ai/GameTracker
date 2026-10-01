import type { FeaturedLists, SteamGameLite } from './types';

const TIMEOUT = 15000;

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Steam responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface SteamSearchHit {
  appid: number;
  name: string;
  header: string;
  icon: string | null;
  logo: string | null;
}

export async function searchSteam(
  term: string,
  signal?: AbortSignal,
): Promise<SteamSearchHit[]> {
  const query = term.trim();
  if (query.length < 2) return [];
  const data = await getJson<{
    results: { appid: number; name: string; icon?: string | null; logo?: string | null }[];
  }>(`/api/steam/search?q=${encodeURIComponent(query)}`, signal);
  return (data.results ?? []).map((hit) => ({
    appid: Number(hit.appid),
    name: hit.name,
    header: `https://cdn.cloudflare.steamstatic.com/steam/apps/${hit.appid}/header.jpg`,
    icon: hit.icon ?? null,
    logo: hit.logo ?? null,
  }));
}

export async function fetchGame(appid: number): Promise<SteamGameLite | null> {
  try {
    const data = await getJson<{ game: SteamGameLite | null }>(`/api/steam/app?id=${appid}`);
    return data.game ?? null;
  } catch {
    return null;
  }
}

export async function fetchGames(appids: number[]): Promise<SteamGameLite[]> {
  if (appids.length === 0) return [];
  try {
    const data = await getJson<{ games: SteamGameLite[] }>(
      `/api/steam/apps?ids=${appids.slice(0, 40).join(',')}`,
    );
    return data.games ?? [];
  } catch {
    return [];
  }
}

export async function fetchFeatured(): Promise<FeaturedLists | null> {
  try {
    return await getJson<FeaturedLists>('/api/steam/featured');
  } catch {
    return null;
  }
}

const memory = new Map<string, SteamGameLite>();

export function cacheGame(game: SteamGameLite): SteamGameLite {
  memory.set(String(game.steamAppid), game);
  return game;
}

export function cachedGame(appid: number): SteamGameLite | undefined {
  return memory.get(String(appid));
}
