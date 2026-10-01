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
await call('bad path (must be rejected)', { p_path: 'admin' });
