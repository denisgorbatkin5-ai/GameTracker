import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function loadEnvFile(file) {
  try {
    const content = readFileSync(file, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      let value = rawValue.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* .env not found - rely on real environment variables */
  }
}

loadEnvFile(path.join(root, '.env'));

const ref = process.env.SUPABASE_PROJECT_REF ?? 'xcvtfbarwwjcqatprqav';
const password = process.env.SUPABASE_DB_PASSWORD;
const region = process.env.SUPABASE_DB_REGION ?? 'eu-west-2';

if (!password) {
  console.error('Missing SUPABASE_DB_PASSWORD (add it to .env).');
  process.exit(1);
}

const sql = readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');

const targets = process.env.SUPABASE_DB_HOST
  ? [{ host: process.env.SUPABASE_DB_HOST, user: 'postgres' }]
  : [
      { host: `db.${ref}.supabase.co`, user: 'postgres' },
      { host: `aws-0-${region}.pooler.supabase.com`, user: `postgres.${ref}` },
    ];

async function apply(target) {
  const client = new pg.Client({
    host: target.host,
    port: 5432,
    database: 'postgres',
    user: target.user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    console.log(`connected to ${target.host}`);
    await client.query(sql);
    console.log('schema applied');
    return true;
  } finally {
    await client.end().catch(() => {});
  }
}

for (const target of targets) {
  try {
    if (await apply(target)) process.exit(0);
  } catch (error) {
    console.error(`via ${target.host}: ${error.message.split('\n')[0]}`);
  }
}

console.error('migration failed: no reachable database connection');
process.exit(1);
