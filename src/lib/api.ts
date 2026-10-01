import { supabase } from './supabase';
import type {
  AddFriendResult,
  Category,
  CollectionItem,
  Friendship,
  Game,
  ItemStatus,
  Profile,
  ShowcaseEntry,
  TierList,
  TierRow,
} from './types';
import type { SteamGameLite } from './types';
import { TIER_PRESETS } from './utils';

function fail(context: string, error: { message: string } | null): never {
  throw new Error(error?.message ? `${context}: ${error.message}` : context);
}

// ------------------------------------------------------------------ profiles

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) fail('Не удалось загрузить профиль', error);
  return (data as Profile | null) ?? null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      'display_name' | 'bio' | 'avatar_url' | 'banner_url' | 'accent' | 'is_public' | 'username'
    >
  >,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) fail('Не удалось сохранить профиль', error);
  return data as Profile;
}

export async function createProfile(
  userId: string,
  email: string | null,
  username: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      username,
      display_name: username,
    })
    .select('*')
    .single();
  if (error) fail('Не удалось создать профиль', error);
  return data as Profile;
}

// --------------------------------------------------------------------- games

function toGameRow(game: SteamGameLite) {
  return {
    steam_appid: game.steamAppid,
    name: game.name,
    header_image: game.headerImage,
    background_image: game.backgroundImage,
    capsule_image: game.capsuleImage,
    library_image: game.libraryImage,
    release_date: game.releaseDate,
    developers: game.developers,
    publishers: game.publishers,
    genres: game.genres,
    platforms: game.platforms,
    short_description: game.shortDescription,
    metacritic: game.metacritic,
    price: game.price,
  };
}

export async function ensureGames(games: SteamGameLite[]): Promise<Game[]> {
  if (games.length === 0) return [];
  const { data, error } = await supabase.rpc('upsert_games', {
    rows: games.map(toGameRow),
  });
  if (error) fail('Не удалось синхронизировать игры', error);
  return (data ?? []) as Game[];
}

export async function findGameByAppid(steamAppid: number): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('steam_appid', steamAppid)
    .maybeSingle();
  if (error) fail('Не удалось найти игру', error);
  return (data as Game | null) ?? null;
}

export async function searchCatalog(term: string, limit = 20): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .ilike('name', `%${term}%`)
    .order('name')
    .limit(limit);
  if (error) fail('Поиск не удался', error);
  return (data ?? []) as Game[];
}

// ---------------------------------------------------------------- collection

const COLLECTION_SELECT = '*, game:games(*)';

export async function fetchCollection(userId: string): Promise<CollectionItem[]> {
  const [{ data: items, error }, { data: links }] = await Promise.all([
    supabase
      .from('collection_items')
      .select(COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    supabase.from('category_items').select('category_id, item_id'),
  ]);
  if (error) fail('Не удалось загрузить коллекцию', error);

  const map = new Map<number, number[]>();
  for (const link of (links ?? []) as { category_id: number; item_id: number }[]) {
    const list = map.get(link.item_id) ?? [];
    list.push(link.category_id);
    map.set(link.item_id, list);
  }

  return ((items ?? []) as CollectionItem[]).map((item) => ({
    ...item,
    category_ids: map.get(item.id) ?? [],
  }));
}

export async function fetchPublicProfile(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .maybeSingle();
  if (error) fail('Не удалось загрузить профиль', error);
  return (data as Profile | null) ?? null;
}

/**
 * Public collection read. Goes through a security-definer RPC that hides private
 * fields (notes), because RLS keeps collection_items owner-only. Friends are allowed
 * too - the RPC checks profiles_select visibility server-side.
 */
export async function fetchProfileCollection(username: string): Promise<CollectionItem[]> {
  const { data, error } = await supabase.rpc('profile_collection', {
    p_username: username,
  });
  if (error) fail('Не удалось загрузить коллекцию', error);
  return ((data ?? []) as CollectionItem[]).map((item) => ({
    ...item,
    category_ids: [],
  }));
}

// ----------------------------------------------------------------- showcase

export async function fetchShowcase(username: string): Promise<ShowcaseEntry[]> {
  const { data, error } = await supabase.rpc('profile_showcase_games', {
    p_username: username,
  });
  if (error) fail('Не удалось загрузить витрину', error);
  return ((data ?? []) as ShowcaseEntry[]).sort((a, b) => a.position - b.position);
}

/** Replaces the whole showcase shelf with the given game ids, in order. */
export async function setShowcase(userId: string, gameIds: number[]): Promise<void> {
  const { error: clearError } = await supabase
    .from('profile_showcase')
    .delete()
    .eq('user_id', userId);
  if (clearError) fail('Не удалось обновить витрину', clearError);

  if (gameIds.length === 0) return;
  const { error } = await supabase
    .from('profile_showcase')
    .insert(gameIds.map((game_id, position) => ({ user_id: userId, game_id, position })));
  if (error) fail('Не удалось обновить витрину', error);
}

// ------------------------------------------------------------------ friends

export async function usernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { p_username: username });
  if (error) return false;
  return data === true;
}

export async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) fail('Не удалось загрузить друзей', error);
  return ((data ?? []) as Friendship[]).map((row) => ({
    ...row,
    direction: row.user_id === userId ? 'outgoing' : 'incoming',
  }));
}

/** Nickname lookup for the "add friend" box; RLS hides profiles you cannot see. */
export async function searchProfiles(term: string, limit = 10): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${term}%`)
    .limit(limit);
  if (error) fail('Поиск не удался', error);
  return (data ?? []) as Profile[];
}

export async function addFriend(username: string): Promise<AddFriendResult> {
  const { data, error } = await supabase.rpc('add_friend', { p_username: username });
  if (error) fail('Не удалось отправить заявку', error);
  return (data as AddFriendResult) ?? 'not_found';
}

export async function respondFriend(id: number, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_friend', { p_friendship_id: id, p_accept: accept });
  if (error) fail('Не удалось обновить заявку', error);
}

export async function fetchPublicProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) fail('Не удалось загрузить профиль', error);
  return (data as Profile | null) ?? null;
}

export async function addToCollection(
  userId: string,
  game: Game,
  patch: Partial<Pick<CollectionItem, 'status' | 'rating' | 'hours_played' | 'notes' | 'finished_at' | 'is_favorite'>> = {},
): Promise<CollectionItem> {
  const { data, error } = await supabase
    .from('collection_items')
    .upsert(
      {
        user_id: userId,
        game_id: game.id,
        status: patch.status ?? 'backlog',
        rating: patch.rating ?? null,
        hours_played: patch.hours_played ?? null,
        notes: patch.notes ?? null,
        finished_at: patch.finished_at ?? null,
        is_favorite: patch.is_favorite ?? false,
      },
      { onConflict: 'user_id,game_id' },
    )
    .select(COLLECTION_SELECT)
    .single();
  if (error) fail('Не удалось добавить игру', error);
  return { ...(data as CollectionItem), category_ids: [] };
}

export async function updateCollectionItem(
  itemId: number,
  patch: Partial<
    Pick<
      CollectionItem,
      'status' | 'rating' | 'hours_played' | 'notes' | 'finished_at' | 'is_favorite'
    >
  >,
): Promise<CollectionItem> {
  const { data, error } = await supabase
    .from('collection_items')
    .update(patch)
    .eq('id', itemId)
    .select(COLLECTION_SELECT)
    .single();
  if (error) fail('Не удалось обновить запись', error);
  return data as CollectionItem;
}

export async function removeCollectionItem(itemId: number): Promise<void> {
  const { error } = await supabase.from('collection_items').delete().eq('id', itemId);
  if (error) fail('Не удалось удалить запись', error);
}

export async function bulkSetStatus(
  itemIds: number[],
  status: ItemStatus,
  finishedAt: string | null,
): Promise<void> {
  if (itemIds.length === 0) return;
  const { error } = await supabase
    .from('collection_items')
    .update({ status, finished_at: finishedAt })
    .in('id', itemIds);
  if (error) fail('Не удалось обновить статусы', error);
}

// ---------------------------------------------------------------- categories

export async function fetchCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*, category_items(count)')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) fail('Не удалось загрузить категории', error);

  return ((data ?? []) as (Category & { category_items: { count: number }[] })[]).map(
    (row): Category => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      sort_order: row.sort_order,
      created_at: row.created_at,
      item_count: row.category_items?.[0]?.count ?? 0,
    }),
  );
}

export async function createCategory(
  userId: string,
  name: string,
  color: string,
  icon = 'folder',
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name, color, icon })
    .select('*')
    .single();
  if (error) fail('Не удалось создать категорию', error);
  return data as Category;
}

export async function updateCategory(
  categoryId: number,
  patch: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'sort_order'>>,
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', categoryId)
    .select('*')
    .single();
  if (error) fail('Не удалось обновить категорию', error);
  return data as Category;
}

export async function deleteCategory(categoryId: number): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) fail('Не удалось удалить категорию', error);
}

export async function setItemCategories(
  itemId: number,
  categoryIds: number[],
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('category_items')
    .select('category_id')
    .eq('item_id', itemId);
  if (readError) fail('Не удалось обновить категории', readError);

  const current = new Set((existing ?? []).map((row) => row.category_id as number));
  const next = new Set(categoryIds);

  const toAdd = categoryIds.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !next.has(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('category_items')
      .insert(toAdd.map((category_id) => ({ category_id, item_id: itemId })));
    if (error) fail('Не удалось обновить категории', error);
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('category_items')
      .delete()
      .eq('item_id', itemId)
      .in('category_id', toRemove);
    if (error) fail('Не удалось обновить категории', error);
  }
}

// ---------------------------------------------------------------- tier lists

const TIER_LIST_SELECT = '*, owner:profiles(id, username, display_name, accent, avatar_url)';

export async function fetchTierLists(userId: string): Promise<TierList[]> {
  const { data, error } = await supabase
    .from('tier_lists')
    .select(TIER_LIST_SELECT)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) fail('Не удалось загрузить тир-листы', error);
  return (data ?? []) as TierList[];
}

export async function fetchTierList(id: number): Promise<TierList | null> {
  const { data, error } = await supabase
    .from('tier_lists')
    .select(TIER_LIST_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) fail('Не удалось загрузить тир-лист', error);
  if (!data) return null;

  const list = data as TierList;

  const { data: rows, error: rowsError } = await supabase
    .from('tier_rows')
    .select('*')
    .eq('tier_list_id', id)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (rowsError) fail('Не удалось загрузить тиры', rowsError);

  const rowIds = ((rows ?? []) as { id: number }[]).map((row) => row.id);
  const grouped = new Map<number, TierRow['items']>();

  if (rowIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('tier_items')
      .select('*, game:games(*)')
      .in('tier_row_id', rowIds);
    if (itemsError) fail('Не удалось загрузить игры тир-листа', itemsError);

    for (const item of (items ?? []) as TierRow['items']) {
      const bucket = grouped.get(item.tier_row_id) ?? [];
      bucket.push(item);
      grouped.set(item.tier_row_id, bucket);
    }
  }

  list.rows = ((rows ?? []) as Omit<TierRow, 'items'>[]).map((row) => ({
    ...row,
    items: (grouped.get(row.id) ?? []).sort((a, b) => a.position - b.position),
  }));
  return list;
}

/** Public tier lists of a user, each with its rows so the profile page can count items. */
/**
 * Tier lists of another player that RLS lets the viewer see: public ones for
 * everyone, plus friends_visible ones when we are friends. The filter is applied
 * here as well because RLS alone cannot know whether *this* viewer is a friend.
 */
export async function fetchPublicTierLists(userId: string): Promise<TierList[]> {
  const { data, error } = await supabase
    .from('tier_lists')
    .select(TIER_LIST_SELECT)
    .eq('user_id', userId)
    .or('is_public.eq.true,friends_visible.eq.true')
    .order('updated_at', { ascending: false })
    .limit(12);
  if (error) fail('Не удалось загрузить тир-листы', error);

  const loaded = await Promise.all(
    ((data ?? []) as TierList[]).map(async (list) => {
      const full = await fetchTierList(list.id);
      return full ?? list;
    }),
  );
  return loaded;
}


export async function createTierList(
  userId: string,
  name: string,
  description: string,
  isPublic: boolean,
): Promise<number> {
  const { data, error } = await supabase
    .from('tier_lists')
    .insert({ user_id: userId, name, description, is_public: isPublic })
    .select('id')
    .single();
  if (error) fail('Не удалось создать тир-лист', error);

  const listId = data.id as number;
  const { error: rowsError } = await supabase.from('tier_rows').insert(
    TIER_PRESETS.map((preset, index) => ({
      tier_list_id: listId,
      key: preset.key,
      label: preset.label,
      color: preset.color,
      sort_order: index,
    })),
  );
  if (rowsError) fail('Не удалось создать тиры', rowsError);
  return listId;
}

export async function updateTierList(
  id: number,
  patch: Partial<Pick<TierList, 'name' | 'description' | 'is_public' | 'friends_visible' | 'theme'>>,
): Promise<void> {
  const { error } = await supabase.from('tier_lists').update(patch).eq('id', id);
  if (error) fail('Не удалось сохранить тир-лист', error);
}

export async function deleteTierList(id: number): Promise<void> {
  const { error } = await supabase.from('tier_lists').delete().eq('id', id);
  if (error) fail('Не удалось удалить тир-лист', error);
}

export interface TierSaveRow {
  key: string;
  label: string;
  color: string;
  sort_order: number;
  items: { game_id: number; position: number }[];
}

export async function saveTierListContent(id: number, rows: TierSaveRow[]): Promise<void> {
  const { error } = await supabase.rpc('save_tier_list', {
    p_tier_list_id: id,
    p_rows: rows,
  });
  if (error) fail('Не удалось сохранить тир-лист', error);
}
