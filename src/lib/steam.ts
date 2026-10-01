import { supabase } from './supabase';
import type { FeaturedLists, SteamGameLite } from './types';
import { steamHeader } from './utils';

const TIMEOUT = 20000;
/**
 * Steam sends no CORS headers, so a browser can never call it directly. Two transports
 * are tried in order:
 *
 * 1. `/api/steam` - the Vercel/local-dev serverless proxy, when the host runs one;
 * 2. the `steam_fetch` RPC - Postgres proxies Steam through the `http` extension, which
 *    works from any static host such as GitHub Pages.
 *
 * The probe timeout is short so a static host does not delay every search.
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
    if (!res.ok) throw new Error(`upstream responded ${res.status}`);
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

async function viaDatabase<T>(
  p_path: 'search' | 'app' | 'featured',
  p_q: string | null,
  p_id: number | null,
  signal?: AbortSignal,
): Promise<T> {
  const query = supabase.rpc('steam_fetch', { p_path, p_q, p_id });
  if (signal) query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as T;
}

export interface SteamSearchHit {
  appid: number;
  name: string;
  header: string;
  icon: string | null;
  logo: string | null;
}

function toHit(appid: number, name: string, image: string | null): SteamSearchHit {
  return { appid, name, header: steamHeader(appid), icon: image, logo: image };
}

export async function searchSteam(
  term: string,
  signal?: AbortSignal,
): Promise<SteamSearchHit[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  const proxied = await viaProxy<{ results: { appid: number; name: string; icon?: string | null; logo?: string | null }[] }>(
    `/search?q=${encodeURIComponent(query)}`,
    signal,
  );
  const payload =
    proxied ?? (await viaDatabase<{ results: { appid: number; name: string; icon?: string | null; logo?: string | null }[] }>('search', query, null, signal));

  return (payload?.results ?? []).map((hit) =>
    toHit(Number(hit.appid), hit.name, hit.icon ?? hit.logo ?? null),
  );
}

export async function fetchGame(appid: number): Promise<SteamGameLite | null> {
  const proxied = await viaProxy<{ game: SteamGameLite | null }>(`/app?id=${appid}`);
  if (proxied) return proxied.game ?? null;
  const payload = await viaDatabase<{ game: SteamGameLite | null }>('app', null, appid);
  return payload?.game ?? null;
}

export async function fetchFeatured(): Promise<FeaturedLists | null> {
  const proxied = await viaProxy<FeaturedLists>('/featured');
  if (proxied) return proxied;
  return await viaDatabase<FeaturedLists>('featured', null, null);
}

const memory = new Map<string, SteamGameLite>();

export function cacheGame(game: SteamGameLite): SteamGameLite {
  memory.set(String(game.steamAppid), game);
  return game;
}

export function cachedGame(appid: number): SteamGameLite | undefined {
  return memory.get(String(appid));
}

export type { SteamGameLite };
