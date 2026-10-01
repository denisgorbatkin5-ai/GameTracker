import { readFileSync } from 'node:fs';
import pg from 'pg';

const env = Object.fromEntries(
  readFileSync(process.argv[2], 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const client = new pg.Client({
  host: `aws-0-${env.SUPABASE_DB_REGION ?? 'eu-west-2'}.pooler.supabase.com`,
  port: 5432,
  database: 'postgres',
  user: `postgres.${env.SUPABASE_PROJECT_REF}`,
  password: env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const results = [];
async function check(label, fn) {
  try {
    const out = await fn();
    results.push([true, label, out]);
  } catch (error) {
    results.push([false, label, error.message.split('\n')[0]]);
  }
}

await client.connect();

// Make the script re-runnable: wipe leftovers from a previous run first.
await client.query(`delete from auth.users where email like 'qa%@example.com'`);
await client.query(`delete from public.games where steam_appid in (1245620, 570)`);

// Fresh owner + a second (stranger) user; every row created here is deleted at the end.
const { rows: ownerRows } = await client.query(
  `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
   values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
           'qa1@example.com', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"qaowner"}', now(), now())
   returning id`,
);
const ownerId = ownerRows[0].id;

const { rows: strangerRows } = await client.query(
  `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
   values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
           'qa2@example.com', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"qastranger"}', now(), now())
   returning id`,
);
const strangerId = strangerRows[0].id;

const asRole = async (role, sub, sql, { commit = false } = {}) => {
  await client.query('begin');
  try {
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub, role, aud: 'authenticated' }),
    ]);
    await client.query(`set local role ${role}`);
    const { rows } = await client.query(sql);
    if (commit) await client.query('commit');
    else await client.query('rollback');
    return `rows=${rows.length} ${JSON.stringify(rows).slice(0, 120)}`;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
};

await check('auth.users insert fired handle_new_user trigger', async () => {
  const { rows } = await client.query('select username, display_name, is_public from profiles where id = $1', [ownerId]);
  return JSON.stringify(rows);
});

const gameId = await client.query(`insert into public.games (steam_appid, name, header_image, genres)
  values (1245620, 'ELDEN RING', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg', '{Action,RPG}')
  returning id`);

await check('upsert_games returns rows (must be 1, else the UI cannot add games)', async () => {
  const out = await client.query(
    `select public.upsert_games('[{"steam_appid": 570, "name": "Dota 2", "genres": ["MOBA"]}]'::jsonb)`,
  );
  return `returned=${out.rows.length} ${JSON.stringify(out.rows).slice(0, 100)}`;
});

await check('anon cannot insert into games directly', async () => {
  try {
    await asRole(
      'anon',
      null,
      `insert into public.games (steam_appid, name) values (999999999, 'Hack')`,
    );
    return 'NO ERROR - policy leak!';
  } catch (error) {
    return `blocked: ${error.message.split('\n')[0]}`;
  }
});

await check('upsert_games still works for anon (shared cache)', async () => {
  const out = await asRole(
    'anon',
    null,
    `select public.upsert_games('[{"steam_appid": 570, "name": "Dota 2", "genres": ["MOBA"]}]'::jsonb)`,
  );
  return out;
});

await client.query(
  `insert into public.collection_items (user_id, game_id, status, rating, hours_played, notes)
   values ($1, $2, 'completed', 10, 120, 'СЃРµРєСЂРµС‚РЅР°СЏ Р·Р°РјРµС‚РєР°')`,
  [ownerId, gameId.rows[0].id],
);

await check('owner reads own collection (expect 1)', () =>
  asRole('authenticated', ownerId, 'select id, status, notes from public.collection_items'),
);

await check('anon reads collection_items (expect rows=0)', () =>
  asRole('anon', null, 'select id from public.collection_items'),
);

await check('stranger reads collection_items while profile public (expect rows=0, RLS closed)', () =>
  asRole('authenticated', strangerId, 'select id from public.collection_items'),
);

await check('public_profile_collection sees public profile (expect 1 row, no notes field)', () =>
  asRole('anon', null, `select public.public_profile_collection('qaowner')`),
);

await check('public_profile_collection hides private profile', async () => {
  await client.query('update public.profiles set is_public = false where id = $1', [ownerId]);
  const out = await asRole('anon', null, `select public.public_profile_collection('qaowner')`);
  await client.query('update public.profiles set is_public = true where id = $1', [ownerId]);
  return out;
});

await check('anon reads public profile row', () =>
  asRole('anon', null, `select username from public.profiles where username = 'qaowner'`),
);

await check('anon cannot read private profile row', async () => {
  await client.query('update public.profiles set is_public = false where id = $1', [ownerId]);
  const out = await asRole('anon', null, `select username from public.profiles where username = 'qaowner'`);
  await client.query('update public.profiles set is_public = true where id = $1', [ownerId]);
  return out;
});

await check('stranger cannot write into owner collection', async () => {
  try {
    await asRole(
      'authenticated',
      strangerId,
      `insert into public.collection_items (user_id, game_id) values ('${ownerId}', ${gameId.rows[0].id})`,
    );
    return 'NO ERROR - policy leak!';
  } catch (error) {
    return `blocked: ${error.message.split('\n')[0]}`;
  }
});

const listId = await client.query(
  `insert into public.tier_lists (user_id, name, is_public) values ($1, 'QA Tier', true) returning id`,
  [ownerId],
);

await check('save_tier_list as owner', async () => {
  const out = await asRole(
    'authenticated',
    ownerId,
    `select public.save_tier_list(${listId.rows[0].id},
       '[{"key":"S","label":"S","color":"#ff4757","sort_order":0,"items":[{"game_id":${gameId.rows[0].id},"position":0}]},
         {"key":"A","label":"A","color":"#ffa502","sort_order":1,"items":[]}]'::jsonb)`,
    { commit: true },
  );
  const rows = await client.query('select count(*)::int as n from public.tier_rows where tier_list_id = $1', [
    listId.rows[0].id,
  ]);
  const items = await client.query('select count(*)::int as n from public.tier_items');
  return `${out} | rows_in_db=${rows.rows[0].n} items_in_db=${items.rows[0].n}`;
});

await check('anon reads rows/items of public tier list (expect rows=2 / 1)', async () => {
  const rows = await asRole('anon', null, `select id from public.tier_rows where tier_list_id = ${listId.rows[0].id}`);
  const items = await asRole('anon', null, 'select tier_row_id from public.tier_items');
  return `${rows} | ${items}`;
});

await check('stranger cannot save into owner tier list', async () => {
  try {
    await asRole(
      'authenticated',
      strangerId,
      `select public.save_tier_list(${listId.rows[0].id}, '[{"key":"X","label":"X","color":"#000","sort_order":0,"items":[]}]'::jsonb)`,
    );
    return 'NO ERROR - policy leak!';
  } catch (error) {
    return `blocked: ${error.message.split('\n')[0]}`;
  }
});

await check('categories are owner-only', async () => {
  await client.query(`insert into public.categories (user_id, name) values ($1, 'Favorites')`, [ownerId]);
  const mine = await asRole('authenticated', ownerId, 'select name from public.categories');
  const theirs = await asRole('authenticated', strangerId, 'select name from public.categories');
  const anon = await asRole('anon', null, 'select name from public.categories');
  return `owner ${mine} | stranger ${theirs} | anon ${anon}`;
});

// ------------------------------------------------------------------- friends
await client.query(`update public.profiles set is_public = false where id = $1`, [ownerId]);
await client.query(`update public.tier_lists set is_public = false where id = $1`, [listId.rows[0].id]);

const status = (out) => out.match(/"([a-z_]+)"\}/)?.[1] ?? out;
let thirdId = null;

await check('owner sends friend request -> pending', async () => {
  const out = await asRole('authenticated', ownerId, `select public.add_friend('qastranger')`, { commit: true });
  return out;
});

await check('pending request visible to the addressee (no profiles join: RLS hides them)', async () => {
  const out = await asRole(
    'authenticated',
    strangerId,
    `select status from public.friendships where friend_id = auth.uid()`,
  );
  return out;
});

await check('request invisible to unrelated third parties (own edges only)', async () => {
  const { rows } = await client.query(`insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'qa3@example.com', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"qathird"}', now(), now())
    returning id`);
  thirdId = rows[0].id;
  return asRole('authenticated', thirdId, `select status from public.friendships`);
});

await check('pending: stranger cannot see private profile', async () =>
  asRole('authenticated', strangerId, `select username from public.profiles where username = 'qaowner'`));

await check('pending: stranger cannot read private collection', async () =>
  asRole('authenticated', strangerId, `select public.profile_collection('qaowner')`));

await check('requester cannot accept their own request', async () => {
  const { rows } = await client.query(`select id from public.friendships`);
  const out = await asRole('authenticated', ownerId, `select public.respond_friend(${rows[0].id}, true)`, {
    commit: true,
  });
  const after = await client.query(`select status from public.friendships`);
  return `${out} | status still ${after.rows[0]?.status}`;
});

await check('addressee accepts with respond_friend -> accepted', async () => {
  const { rows } = await client.query(`select id from public.friendships`);
  const out = await asRole('authenticated', strangerId, `select public.respond_friend(${rows[0].id}, true)`, {
    commit: true,
  });
  const after = await client.query(`select status from public.friendships`);
  return `${out} | status ${after.rows[0]?.status}`;
});

await check('friend now sees the private profile', async () =>
  asRole('authenticated', strangerId, `select username from public.profiles where username = 'qaowner'`));

await check('friend reads the collection, and it has no notes field', async () => {
  const out = await asRole('authenticated', strangerId, `select public.profile_collection('qaowner')`);
  const notes = out.includes('СЃРµРєСЂРµС‚РЅР°СЏ Р·Р°РјРµС‚РєР°');
  return `${out.slice(0, 60)}... | leaks notes: ${notes ? 'YES - BUG' : 'no'}`;
});

await check('friends_visible = true -> friend sees the tier list', async () => {
  await client.query(`update public.tier_lists set friends_visible = true where id = $1`, [listId.rows[0].id]);
  return asRole('authenticated', strangerId, `select name from public.tier_lists`);
});

await check('friends_visible = false -> tier list hidden from friend', async () => {
  await client.query(`update public.tier_lists set friends_visible = false where id = $1`, [listId.rows[0].id]);
  return asRole('authenticated', strangerId, `select name from public.tier_lists`);
});

await check('add_friend rejects self / unknown / already-friends', async () => {
  const self = status(await asRole('authenticated', ownerId, `select public.add_friend('qaowner')`));
  const unknown = status(await asRole('authenticated', ownerId, `select public.add_friend('nosuchuser')`));
  const again = status(
    await asRole('authenticated', ownerId, `select public.add_friend('qastranger')`, { commit: true }),
  );
  const count = await client.query('select count(*)::int as n from public.friendships');
  return `self=${self} unknown=${unknown} repeat=${again} rows=${count.rows[0].n}`;
});

await check('anon cannot call add_friend', async () => {
  try {
    const out = await asRole('anon', null, `select public.add_friend('qaowner')`);
    return `NO ERROR - leak! ${out}`;
  } catch (error) {
    return `blocked: ${error.message.split('\n')[0]}`;
  }
});

await check('owner pins games to the showcase', async () => {
  const out = await asRole(
    'authenticated',
    ownerId,
    `insert into public.profile_showcase (user_id, game_id, position) values ('${ownerId}', ${gameId.rows[0].id}, 0)`,
    { commit: true },
  );
  const n = await client.query('select count(*)::int as n from public.profile_showcase');
  return `${out} | rows=${n.rows[0].n}`;
});

await check('stranger cannot write into owner showcase', async () => {
  try {
    await asRole(
      'authenticated',
      thirdId,
      `insert into public.profile_showcase (user_id, game_id, position) values ('${ownerId}', ${gameId.rows[0].id}, 1)`,
    );
    return 'NO ERROR - leak!';
  } catch (error) {
    return `blocked: ${error.message.split('\n')[0]}`;
  }
});

await check('friend reads the showcase', async () =>
  asRole('authenticated', strangerId, `select public.profile_showcase_games('qaowner')`));

await check('non-friend cannot read showcase of a private profile', async () =>
  asRole('authenticated', thirdId, `select public.profile_showcase_games('qaowner')`));

await check('anon cannot read showcase of a private profile', async () =>
  asRole('anon', null, `select public.profile_showcase_games('qaowner')`));

await check('requesting an existing friend does not duplicate the edge', async () => {
  const before = await client.query('select count(*)::int as n from public.friendships');
  await asRole('authenticated', strangerId, `select public.add_friend('qaowner')`, { commit: true });
  const after = await client.query('select count(*)::int as n from public.friendships');
  return `before=${before.rows[0].n} after=${after.rows[0].n}`;
});

await check('a duplicate nickname cannot slip in via a direct profile insert', async () => {
  try {
    await client.query(`insert into public.profiles (id, username) values (gen_random_uuid(), 'qaowner')`);
    return 'NO ERROR - duplicate nickname allowed!';
  } catch (error) {
    return `blocked: ${error.message.split('\n')[0]}`;
  }
});

await check('username_available() reflects the nickname rules', async () => {
  const free = status(
    await asRole('anon', null, `select public.username_available('brandnewname')`),
  );
  const taken = await asRole('anon', null, `select public.username_available('qaowner')`);
  const tooShort = await asRole('anon', null, `select public.username_available('ab')`);
  const badChars = await asRole('anon', null, `select public.username_available('my name!')`);
  const parse = (o) => o.match(/"([a-z]+)"\}/)?.[1];
  return `free=${free} taken=${parse(taken)} short=${parse(tooShort)} badChars=${parse(badChars)}`;
});

await check('trigger suffixes a taken nickname instead of failing signup', async () => {
  const { rows } = await client.query(
    `insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'qa5@example.com', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"qaowner"}', now(), now())
     returning id`,
  );
  const { rows: got } = await client.query('select username from public.profiles where id = $1', [rows[0].id]);
  return `requested qaowner -> got ${got[0]?.username}`;
});

await check('invalid nickname is sanitised by the trigger', async () => {
  const { rows } = await client.query(
    `insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'qa6@example.com', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"ab!"}', now(), now())
     returning id`,
  );
  const { rows: got } = await client.query('select username from public.profiles where id = $1', [rows[0].id]);
  return `requested "ab!" -> got ${got[0]?.username}`;
});

await check('anonymous user search by nickname finds public users only', async () => {
  await client.query(`update public.profiles set is_public = true where id = $1`, [ownerId]);
  const out = await asRole('anon', null, `select username from public.profiles where lower(username) like 'qaown%'`);
  return out;
});

console.log('');

for (const [ok, label, detail] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}\n      ${detail}\n`);
}

await client.query(
  `delete from auth.users where id = any($1::uuid[])`,
  [[ownerId, strangerId, thirdId].filter(Boolean)],
);
await client.query('delete from public.games where steam_appid in (1245620, 570)');
await client.end();
console.log('cleanup done');
