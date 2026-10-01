export interface SteamSearchResult {
  appid: number;
  name: string;
  icon: string | null;
  logo: string | null;
}

export interface SteamGame {
  steamAppid: number;
  name: string;
  headerImage: string;
  backgroundImage: string;
  capsuleImage: string;
  libraryImage: string;
  releaseDate: string | null;
  developers: string[];
  publishers: string[];
  genres: string[];
  shortDescription: string;
  metacritic: number | null;
  price: string | null;
  platforms: string[];
}

const SEARCH_URL = 'https://store.steampowered.com/api/storesearch/';
const DETAILS_URL = 'https://store.steampowered.com/api/appdetails';
const FEATURED_URL = 'https://store.steampowered.com/api/featuredcategories';

export interface FeaturedList {
  topSellers: { appid: number; name: string; header: string }[];
  specials: { appid: number; name: string; header: string }[];
  newReleases: { appid: number; name: string; header: string }[];
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_TTL = 1000 * 60 * 30;

function remember<T>(key: string, value: T): T {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  return value;
}

function recall<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function headerImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export function capsuleImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_616x353.jpg`;
}

export function libraryImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
}

export function backgroundImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/page_bg.jpg`;
}

async function fetchJson(url: string, attempts = 3): Promise<unknown> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'user-agent': UA, accept: 'application/json, text/plain, */*' },
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`steam responded ${res.status}`);
      }
      if (!res.ok) throw new Error(`steam responded ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('steam request failed');
}

/**
 * Steam's storesearch is the only endpoint that understands Cyrillic, and it only
 * indexes titles that are visible in the requested store country - cc=US returns the
 * full catalogue while cc=RU hides region-locked titles (e.g. "Ведьмак 3"). So we run
 * the Russian and English passes in parallel and merge them, keeping the English name
 * as canonical because that is what appdetails stores.
 */
export async function searchApps(term: string, limit = 24): Promise<SteamSearchResult[]> {
  const clean = term.trim().slice(0, 80);
  if (clean.length < 2) return [];
  const key = `search:${clean.toLowerCase()}:${limit}`;
  const cached = recall<SteamSearchResult[]>(key);
  if (cached) return cached;

  const url = (lang: 'russian' | 'english') =>
    `${SEARCH_URL}?term=${encodeURIComponent(clean)}&l=${lang}&cc=US`;

  const passes = await Promise.allSettled([
    fetchJson(url('english')),
    fetchJson(url('russian')),
  ]);

  const seen = new Set<number>();
  const out: SteamSearchResult[] = [];

  for (const pass of passes) {
    if (pass.status !== 'fulfilled') continue;
    const body = pass.value as { items?: Record<string, unknown>[] } | undefined;
    const items = Array.isArray(body?.items) ? body.items : [];
    for (const entry of items) {
      // storesearch sends `id`, the community endpoint sent `appid`
      const appid = Number(entry.id ?? (entry as { appid?: unknown }).appid);
      const name = typeof entry.name === 'string' ? entry.name.trim() : '';
      if (!Number.isFinite(appid) || appid <= 0 || name === '') continue;
      if (seen.has(appid)) continue;
      seen.add(appid);
      const image =
        typeof entry.tiny_image === 'string' ? entry.tiny_image : typeof entry.logo === 'string' ? entry.logo : null;
      out.push({ appid, name, icon: image, logo: image });
      if (out.length >= limit) break;
    }
  }

  if (out.length === 0) return [];
  return remember(key, out);
}

function cleanDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = /^(\d{1,2}) (\w{3,}) (\d{4})$/.exec(raw.trim());
  if (!match) return null;
  const months: Record<string, string> = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
  };
  const month = months[match[2]] ?? months[match[2].slice(0, 3)];
  if (!month) return null;
  return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
}

function formatPrice(price: Record<string, unknown> | undefined): string | null {
  if (!price) return null;
  const initial = typeof price.initial === 'number' ? (price.initial / 100).toFixed(2) : null;
  const final = typeof price.final === 'number' ? (price.final / 100).toFixed(2) : null;
  const percent = typeof price.discount_percent === 'number' ? price.discount_percent : 0;
  if (final === null) return initial;
  if (percent > 0 && initial !== null) return `$${initial} → $${final}`;
  return `$${final}`;
}

export async function getAppDetails(appid: number): Promise<SteamGame | null> {
  const id = Math.trunc(appid);
  if (!Number.isFinite(id) || id <= 0) return null;
  const key = `app:${id}`;
  const cached = recall<SteamGame | null>(key);
  if (cached !== undefined) return cached;

  const url =
    `${DETAILS_URL}?appids=${id}` +
    '&cc=us&l=english&filters=basic,categories,genres,release_date,price_overview,metacritic,short_description';

  const raw = (await fetchJson(url)) as Record<string, { success: boolean; data?: Record<string, unknown> }>;
  const entry = raw?.[String(id)];
  if (!entry?.success || !entry.data) return remember(key, null);

  const d = entry.data;
  const platforms: string[] = [];
  const plat = d.platforms as Record<string, boolean> | undefined;
  if (plat?.windows) platforms.push('Windows');
  if (plat?.mac) platforms.push('macOS');
  if (plat?.linux) platforms.push('Linux');

  const game: SteamGame = {
    steamAppid: id,
    name: typeof d.name === 'string' ? d.name : 'Unknown',
    headerImage: headerImage(id),
    backgroundImage: backgroundImage(id),
    capsuleImage: capsuleImage(id),
    libraryImage: libraryImage(id),
    releaseDate: cleanDate(typeof d.release_date === 'string' ? d.release_date : undefined),
    developers: Array.isArray(d.developers) ? (d.developers as string[]) : [],
    publishers: Array.isArray(d.publishers) ? (d.publishers as string[]) : [],
    genres: Array.isArray(d.genres)
      ? (d.genres as { description: string }[]).map((g) => g.description)
      : [],
    shortDescription:
      typeof d.short_description === 'string'
        ? d.short_description
        : typeof d.about_the_game === 'string'
          ? d.about_the_game
          : '',
    metacritic:
      typeof d.metacritic === 'object' && d.metacritic !== null
        ? Number((d.metacritic as { score?: number }).score) || null
        : null,
    price: formatPrice(d.price_overview as Record<string, unknown> | undefined),
    platforms,
  };
  return remember(key, game);
}

interface FeaturedItem {
  id?: number;
  name?: string;
  header_image?: string;
  large_capsule_image?: string;
}

/**
 * Store highlights. Runs in the serverless proxy when there is one, and straight in the
 * browser on static hosts - Steam allows cross-origin reads, so both paths work.
 */
export async function getFeatured(): Promise<FeaturedList> {
  const key = 'featured';
  const cached = recall<FeaturedList>(key);
  if (cached) return cached;

  const json = (await fetchJson(`${FEATURED_URL}?cc=us&l=english`)) as Record<string, unknown>;

  const extract = (group: string): { appid: number; name: string; header: string }[] => {
    const bucket = json[group] as { items?: FeaturedItem[] } | undefined;
    if (!bucket?.items) return [];
    const seen = new Set<number>();
    const list: { appid: number; name: string; header: string }[] = [];
    for (const item of bucket.items) {
      const appid = Number(item.id);
      if (!Number.isFinite(appid) || appid <= 0 || seen.has(appid) || !item.name) continue;

      // Steam hosts brand-new assets under hashed paths, so prefer the URLs it gives us
      // and only fall back to the predictable CDN path for older titles.
      const header =
        item.header_image ?? item.large_capsule_image ?? headerImage(appid);
      seen.add(appid);
      list.push({ appid, name: item.name, header });
      if (list.length >= 18) break;
    }
    return list;
  };

  return remember(key, {
    topSellers: extract('top_sellers'),
    specials: extract('specials'),
    newReleases: extract('new_releases'),
  });
}
