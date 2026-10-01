import { readFileSync } from 'node:fs';

const source = readFileSync(process.argv[2], 'utf8');
const ids = [
  ...new Set((source.match(/app_?id:\s*(\d+)/gi) ?? []).map((m) => Number(m.replace(/\D/g, ''))).filter(Boolean)),
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'user-agent': UA } });
    return res.status;
  } catch {
    return 0;
  }
}

async function details(appid) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=english`;
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
    const json = await res.json();
    const entry = json[String(appid)];
    return entry?.success ? { ok: true, name: entry.data?.name, type: entry.data?.type } : { ok: false };
  } catch {
    return { ok: false };
  }
}

const bad = [];
let index = 0;

async function worker() {
  while (index < ids.length) {
    const appid = ids[index++];
    const [headerStatus, meta] = await Promise.all([
      head(`https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`),
      details(appid),
    ]);
    const problems = [];
    if (headerStatus !== 200) problems.push(`header=${headerStatus}`);
    if (!meta.ok) problems.push('appdetails=FAIL');
    if (meta.type && meta.type !== 'game') problems.push(`type=${meta.type}`);
    if (problems.length > 0) {
      bad.push({ appid, name: meta.name ?? '?', problems: problems.join(' ') });
      console.log(`BAD  ${appid} ${meta.name ?? '?'} -> ${problems.join(' ')}`);
    }
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
console.log(`\nchecked ${ids.length}, bad ${bad.length}`);
