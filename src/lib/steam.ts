import type { FeaturedLists, SteamGameLite } from './types';
import {
  getAppDetails,
  getFeatured,
  headerImage,
  searchApps,
  type SteamGame,
  type SteamSearchResult,
} from '../../server/steam-core';

const TIMEOUT = 15000;
/**
 * The /api/steam proxy only exists on hosts that run a serverless function (Vercel, local
 * dev). On static hosting the route 404s, so we remember that and talk to Steam directly -
 * it sends Access-Control-Allow-Origin: * and needs no key.
 */
const PROBE_TIMEOUT = 2500;
let proxyUsable = true;

async function getJson<T>(url: string, signal?: AbortSignal, timeout = TIMEOUT): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
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

async function viaProxy<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  if (!proxyUsable) return null;
  try {
    return await getJson<T>(`${import.meta.env.BASE_URL}api/steam${path}`, signal, PROBE_TIMEOUT);
  } catch {
    proxyUsable = false;
    return null;
  }
}

export interface SteamSearchHit {
  appid: number;
  name: string;
  header: string;
  icon: string | null;
  logo: string | null;
}

function toHit(appid: number, name: string, image: string | null): SteamSearchHit {
  return { appid, name, header: headerImage(appid), icon: image, logo: image };
}

export async function searchSteam(
  term: string,
  signal?: AbortSignal,
): Promise<SteamSearchHit[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  const proxied = await viaProxy<{ results: SteamSearchResult[] }>(
    `/search?q=${encodeURIComponent(query)}`,
    signal,
  );
  const results = proxied?.results ?? (await searchApps(query));
  return results.map((hit) => toHit(Number(hit.appid), hit.name, hit.icon ?? hit.logo ?? null));
}

export async function fetchGame(appid: number): Promise<SteamGameLite | null> {
  try {
    const proxied = await viaProxy<{ game: SteamGameLite | null }>(`/app?id=${appid}`);
    if (proxied) return proxied.game ?? null;
    return (await getAppDetails(appid)) as SteamGameLite | null;
  } catch {
    return null;
  }
}

export async function fetchGames(appids: number[]): Promise<SteamGameLite[]> {
  if (appids.length === 0) return [];
  try {
    const proxied = await viaProxy<{ games: SteamGameLite[] }>(
      `/apps?ids=${appids.slice(0, 40).join(',')}`,
    );
    if (proxied) return proxied.games ?? [];
    const games = await Promise.all(appids.slice(0, 40).map((id) => getAppDetails(id)));
    return games.filter(Boolean) as SteamGameLite[];
  } catch {
    return [];
  }
}

export async function fetchFeatured(): Promise<FeaturedLists | null> {
  try {
    const proxied = await viaProxy<FeaturedLists>('/featured');
    if (proxied) return proxied;
    const lists = (await getFeatured()) as FeaturedListShape;
    return lists;
  } catch {
    return null;
  }
}

type FeaturedListShape = {
  topSellers: FeaturedLists['topSellers'];
  specials: FeaturedLists['specials'];
  newReleases: FeaturedLists['newReleases'];
};

const memory = new Map<string, SteamGameLite>();

export function cacheGame(game: SteamGameLite): SteamGameLite {
  memory.set(String(game.steamAppid), game);
  return game;
}

export function cachedGame(appid: number): SteamGameLite | undefined {
  return memory.get(String(appid));
}

export type { SteamGame };
