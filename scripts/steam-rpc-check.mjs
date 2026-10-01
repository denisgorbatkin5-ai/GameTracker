import { readFileSync } from 'node:fs';

function loadEnvFile(file) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnvFile('.env');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function rpc(params) {
  const res = await fetch(`${url}/rest/v1/rpc/steam_fetch`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  return { data: parsed, ms: 0 };
}

async function call(label, params) {
  const started = Date.now();
  const res = await fetch(`${url}/rest/v1/rpc/steam_fetch`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  console.log(`\n--- ${label} (${Date.now() - started}ms, HTTP ${res.status})`);
  console.log(JSON.stringify(parsed).slice(0, 700));
}

await call('search "Ведьмак 3"', { p_path: 'search', p_q: 'Ведьмак 3' });
await call('search "witcher"', { p_path: 'search', p_q: 'witcher' });
await call('app 292030', { p_path: 'app', p_id: 292030 });
const featured = await call('featured', { p_path: 'featured' });
if (featured) {
  const counts = {
    topSellers: featured.topSellers?.length,
    specials: featured.specials?.length,
    newReleases: featured.newReleases?.length,
  };
  console.log('\ncounts', JSON.stringify(counts));
}

// The ranking the client does: base games first, then the most reviewed ones.
const search = await rpc({ p_path: 'search', p_q: 'witcher' });
const candidates = search.data.results.slice(0, 8);
const details = await Promise.all(
  candidates.map((hit) => rpc({ p_path: 'app', p_id: hit.appid }).then((row) => row.data.game)),
);
const ranked = candidates
  .map((hit, index) => ({ hit, game: details[index], order: index }))
  .sort((a, b) => {
    const aGame = (a.game?.type ?? 'game') === 'game';
    const bGame = (b.game?.type ?? 'game') === 'game';
    if (aGame !== bGame) return aGame ? -1 : 1;
    return (b.game?.reviews ?? 0) - (a.game?.reviews ?? 0);
  });
console.log('\n--- ranked order the user sees');
for (const row of ranked) {
  console.log(
    `  [${(row.game?.type ?? '?').padEnd(8)}] ${String(row.game?.reviews ?? 0).padStart(7)} reviews  ${row.hit.name}`,
  );
}

await call('bad path (must be rejected)', { p_path: 'admin' });
