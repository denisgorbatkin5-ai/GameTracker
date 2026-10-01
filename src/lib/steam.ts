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

interface SearchPayload {
  results: { appid: number; name: string; icon?: string | null; logo?: string | null }[];
}

export interface SteamSearchHit {
  appid: number;
  name: string;
  header: string;
  icon: string | null;
  logo: string | null;
  /** filled in for the first few hits so DLC can be pushed below the main game */
  kind?: string;
  reviews?: number;
  studio?: string | null;
  year?: number | null;
  price?: string | null;
}

function toHit(appid: number, name: string, image: string | null): SteamSearchHit {
  return { appid, name, header: steamHeader(appid), icon: image, logo: image };
}

interface HitDetails {
  kind: string;
  reviews: number;
  studio: string | null;
  year: number | null;
  price: string | null;
}

const detailsCache = new Map<number, HitDetails>();

/**
 * Steam's own relevance order likes DLC: search "witcher" and the expansions of the
 * remastered game come before the game itself. So the first few hits get one extra
 * (cached) lookup to learn what they actually are and how popular they are.
 */
async function loadDetails(appid: number): Promise<HitDetails> {
  const cached = detailsCache.get(appid);
  if (cached) return cached;

  const payload = await viaDatabase<{ game: SteamGameLite | null }>('app', null, appid);
  const game = payload?.game;
  const details: HitDetails = {
    kind: game?.type ?? 'game',
    reviews: game?.reviews ?? 0,
    studio: game?.developers?.[0] ?? null,
    year: game?.releaseDate ? Number(game.releaseDate.slice(0, 4)) : null,
    price: game?.price ?? null,
  };
  detailsCache.set(appid, details);
  return details;
}

const RANKED_HITS = 8;

export async function searchSteam(
  term: string,
  signal?: AbortSignal,
): Promise<SteamSearchHit[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  const raw = await viaProxy<SearchPayload>(`/search?q=${encodeURIComponent(query)}`, signal);
  const payload = raw ?? (await viaDatabase<SearchPayload>('search', query, null, signal));
  const hits = (payload?.results ?? []).map((hit) =>
    toHit(Number(hit.appid), hit.name, hit.icon ?? hit.logo ?? null),
  );
  if (hits.length === 0) return hits;

  // Steam answers in its own relevance order; only the head of the list is worth a lookup
  const head = hits.slice(0, RANKED_HITS);
  const details = await Promise.all(
    head.map((hit) => loadDetails(hit.appid).catch(() => undefined)),
  );

  const ranked = head
    .map((hit, index) => ({ hit, details: details[index], order: index }))
    .filter((row): row is { hit: SteamSearchHit; details: HitDetails; order: number } =>
      Boolean(row.details),
    )
    .map((row) => ({
      ...row.hit,
      kind: row.details.kind,
      reviews: row.details.reviews,
      studio: row.details.studio,
      year: row.details.year,
      price: row.details.price,
    }))
    .sort((a, b) => {
      // the base game always wins over its DLC, expansions and soundtracks
      const aGame = (a.kind ?? 'game') === 'game';
      const bGame = (b.kind ?? 'game') === 'game';
      if (aGame !== bGame) return aGame ? -1 : 1;
      // then the most reviewed (i.e. the most played) title
      if ((b.reviews ?? 0) !== (a.reviews ?? 0)) return (b.reviews ?? 0) - (a.reviews ?? 0);
      return 0;
    });

  return [...ranked, ...hits.slice(RANKED_HITS)];
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
