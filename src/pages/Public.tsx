import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Eye,
  Globe,
  Layers,
  Lock,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GameArt } from '../components/games/GameArt';
import { StatusBadge } from '../components/games/StatusBadge';
import { PageShell } from '../components/layout/PageShell';
import { TierListView } from '../components/tierlist/TierListView';
import { Button } from '../components/ui/Button';
import { EmptyState, Skeleton, Stat } from '../components/ui/Primitives';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { useToast } from '../hooks/useToast';
import * as api from '../lib/api';
import type { CollectionItem, Profile, ShowcaseEntry, TierList } from '../lib/types';
import {
  STATUS_META,
  STATUS_ORDER,
} from '../lib/types';
import { formatDate, formatMonthYear, initials, percent, pluralize } from '../lib/utils';

export function PublicProfile() {
  const { username } = useParams();
  const { push } = useToast();
  const { user } = useAuth();
  const { addByNickname, respond, relationWith } = useFriends();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [lists, setLists] = useState<TierList[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseEntry[]>([]);
  const [friendList, setFriendList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    try {
      // RLS decides visibility: public for anyone, plus private profiles of accepted
      // friends. A profile we may not see simply comes back as null.
      const found = await api.fetchPublicProfile(username);
      if (!found) {
        setNotFound(true);
        return;
      }
      setProfile(found);
      const [collection, tierLists, shelf, friends] = await Promise.all([
        api.fetchProfileCollection(found.username),
        api.fetchPublicTierLists(found.id),
        api.fetchShowcase(found.username),
        api.fetchFriendships(found.id).catch(() => []),
      ]);
      setItems(collection);
      setLists(tierLists);
      setShowcase(shelf);
      const accepted = friends.filter((edge) => edge.status === 'accepted');
      const people = await Promise.all(
        accepted.map(async (edge) =>
          api.fetchPublicProfileById(edge.user_id === found.id ? edge.friend_id : edge.user_id),
        ),
      );
      setFriendList(people.filter((row): row is Profile => row !== null));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Не удалось загрузить профиль', 'error');
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [username, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const isMe = profile?.id === user?.id;
  const relation = profile ? relationWith(profile.id) : undefined;

  const act = async () => {
    if (!profile) return;
    setFriendBusy(true);
    try {
      if (relation?.status === 'accepted' || relation?.direction === 'outgoing') {
        await respond(relation.id, false);
      } else if (relation?.direction === 'incoming') {
        await respond(relation.id, true);
      } else {
        await addByNickname(profile.username);
      }
      await load();
    } finally {
      setFriendBusy(false);
    }
  };

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(
      STATUS_ORDER.map((status) => [status, items.filter((item) => item.status === status).length]),
    ) as Record<(typeof STATUS_ORDER)[number], number>;
    const hours = items.reduce((sum, item) => sum + (item.hours_played ?? 0), 0);
    const completed = items
      .filter((item) => item.status === 'completed')
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return {
      byStatus,
      hours,
      top: completed.slice(0, 8),
      completion: percent(byStatus.completed, items.length),
    };
  }, [items]);

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-40 rounded-3xl" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (notFound || !profile) {
    return (
      <PageShell>
        <EmptyState
          icon={<Lock className="size-6" />}
          title="Профиль не найден"
          description="Возможно, его не существует или он скрыт настройками приватности."
          action={
            <Link to="/">
              <Button variant="secondary">На главную</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="surface relative mb-6 overflow-hidden rounded-3xl p-6 sm:p-8">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(90% 120% at 15% 0%, ${profile.accent}55, transparent)`,
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${profile.accent}, #22d3ee)` }}
          >
            {initials(profile.display_name ?? profile.username)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {profile.display_name ?? profile.username}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Globe className="size-3" /> @{profile.username}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" /> с {formatMonthYear(profile.created_at)}
              </span>
              {!profile.is_public ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-200">
                  <Lock className="size-3" /> приватный, виден только друзьям
                </span>
              ) : null}
            </div>
            {profile.bio ? <p className="mt-3 max-w-xl text-sm text-slate-300">{profile.bio}</p> : null}
            {friendList.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Users className="size-3" /> друзья:
                </span>
                {friendList.slice(0, 8).map((person) => (
                  <Link
                    key={person.id}
                    to={`/u/${person.username}`}
                    title={person.display_name ?? person.username}
                    className="flex size-6 items-center justify-center overflow-hidden rounded-md border border-white/10 text-[9px] font-bold text-white transition hover:border-white/30"
                    style={{ background: `linear-gradient(135deg, ${person.accent}, #22d3ee)` }}
                  >
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      initials(person.display_name ?? person.username)
                    )}
                  </Link>
                ))}
                {friendList.length > 8 ? (
                  <span className="text-[11px] text-slate-500">+{friendList.length - 8}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {user && !isMe ? (
              <Button
                variant={relation?.status === 'accepted' ? 'secondary' : 'primary'}
                loading={friendBusy}
                icon={
                  relation?.status === 'accepted' ? (
                    <UserCheck className="size-4" />
                  ) : (
                    <UserPlus className="size-4" />
                  )
                }
                onClick={() => void act()}
              >
                {relation?.status === 'accepted'
                  ? 'Ты в друзьях'
                  : relation?.direction === 'outgoing'
                    ? 'Отозвать заявку'
                    : relation?.direction === 'incoming'
                      ? 'Принять заявку'
                      : 'Добавить в друзья'}
              </Button>
            ) : null}
            {isMe ? (
              <Link to="/settings">
                <Button variant="secondary" icon={<Sparkles className="size-4" />}>
                  Настроить витрину
                </Button>
              </Link>
            ) : null}
            <Link to="/discover">
              <Button variant="secondary">Собрать свою</Button>
            </Link>
          </div>
        </div>
      </div>

      {showcase.length > 0 ? (
        <section className="surface relative mt-6 overflow-hidden rounded-3xl p-6">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              background: `radial-gradient(90% 120% at 85% 0%, ${profile.accent}55, transparent)`,
            }}
          />
          <div className="relative">
            <h2 className="font-display mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <Sparkles className="size-4.5 text-amber-300" /> Витрина
              <span className="text-sm font-normal text-slate-500">
                {showcase.length} {pluralize(showcase.length, ['игра', 'игры', 'игр'])}
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((entry, index) => (
                <motion.div
                  key={entry.game_id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/10"
                >
                  <GameArt
                    appid={entry.game.steam_appid}
                    src={entry.game.background_image ?? entry.game.header_image}
                    alt={entry.game.name}
                    className="aspect-video w-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/95 via-black/70 to-transparent px-4 pt-8 pb-3">
                    <div className="truncate text-sm font-semibold text-white">
                      {entry.game.name}
                    </div>
                    <div className="truncate text-[11px] text-slate-400">
                      {entry.game.developers.slice(0, 2).join(', ') || entry.game.genres.slice(0, 2).join(', ')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Игр в коллекции" value={items.length} accent={profile.accent} />
        <Stat
          label="Пройдено"
          value={stats.byStatus.completed}
          accent="#a3e635"
          sub={`${stats.completion}% библиотеки`}
        />
        <Stat
          label="Часов наиграно"
          value={Math.round(stats.hours).toLocaleString('ru-RU')}
          accent="#22d3ee"
        />
      </div>

      {lists.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <Trophy className="size-4.5 text-amber-300" /> Тир-листы
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list, index) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="surface rounded-2xl p-5 transition hover:border-violet-400/35"
              >
                <Link to={`/t/${list.id}`} className="group block">
                  <div className="font-display truncate text-base font-semibold text-white group-hover:text-violet-200">
                    {list.name}
                  </div>
                  {list.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{list.description}</p>
                  ) : null}
                </Link>
                {!list.is_public ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-200">
                    <Eye className="size-3" /> виден только друзьям
                  </span>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(list.rows ?? []).map((row) => (
                    <span
                      key={row.key}
                      className="rounded-md px-1.5 py-0.5 font-mono text-[10px]"
                      style={{
                        background: `${row.color}1f`,
                        color: row.color,
                      }}
                    >
                      {row.label}: {row.items.length}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display mb-4 flex items-center gap-2 text-xl font-semibold text-white">
          <Layers className="size-4.5 text-violet-300" /> Коллекция
          <span className="text-sm font-normal text-slate-500">
            {items.length} {pluralize(items.length, ['игра', 'игры', 'игр'])}
          </span>
        </h2>

        {items.length === 0 ? (
          <EmptyState
            icon={<Layers className="size-6" />}
            title="Коллекция пуста"
            description="Этот игрок пока ничего не добавил."
          />
        ) : (
          <>
            <div className="mb-5 flex h-2.5 overflow-hidden rounded-full bg-white/5">
              {STATUS_ORDER.map((status) => {
                const share = percent(stats.byStatus[status], items.length);
                if (share === 0) return null;
                return (
                  <div
                    key={status}
                    style={{
                      width: `${share}%`,
                      background: `linear-gradient(90deg, ${STATUS_META[status].color}, ${STATUS_META[status].color}aa)`,
                    }}
                    title={`${STATUS_META[status].label}: ${stats.byStatus[status]}`}
                  />
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
                  className="surface flex gap-3 overflow-hidden rounded-2xl p-2.5"
                >
                  <GameArt
                    appid={item.game.steam_appid}
                    src={item.game.header_image}
                    alt={item.game.name}
                    className="h-16 w-28 shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="truncate text-[13px] font-semibold text-slate-100">
                      {item.game.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {item.game.genres.slice(0, 2).join(', ') || '—'}
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <StatusBadge status={item.status} />
                      {item.rating !== null ? (
                        <span className="font-mono text-[11px] font-bold text-amber-300">
                          {item.rating}/10
                        </span>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>
    </PageShell>
  );
}

export function PublicTierList() {
  const { id } = useParams();
  const { push } = useToast();
  const navigate = useNavigate();
  const [list, setList] = useState<TierList | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const listId = Number(id);
    if (!Number.isFinite(listId)) {
      navigate('/tier-lists');
      return;
    }
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const result = await api.fetchTierList(listId);
        if (!active) return;
        // RLS already filters out lists we may not read (private and not shared with friends).
        if (!result) {
          setMissing(true);
          return;
        }
        setList(result);
      } catch (error) {
        push(error instanceof Error ? error.message : 'Ошибка загрузки', 'error');
        setMissing(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, navigate, push]);

  const total = useMemo(
    () => (list?.rows ?? []).reduce((sum, row) => sum + row.items.length, 0),
    [list],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      push('Ссылка скопирована', 'success');
    } catch {
      push(window.location.href, 'info');
    }
  };

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-24 rounded-3xl" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (missing || !list) {
    return (
      <PageShell>
        <EmptyState
          icon={<Lock className="size-6" />}
          title="Тир-лист недоступен"
          description="Он не найден или автор сделал его приватным."
          action={
            <Link to="/tier-lists">
              <Button variant="secondary">Мои тир-листы</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-[1400px]">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to={list.owner ? `/u/${list.owner.username}` : '/'}
          className="flex size-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-2xl font-bold text-white">{list.name}</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {list.owner ? (
              <Link
                to={`/u/${list.owner.username}`}
                className="text-violet-300 transition hover:text-violet-200"
              >
                @{list.owner.username}
              </Link>
            ) : null}
            {!list.is_public ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-200">
                <Lock className="size-3" /> только для друзей
              </span>
            ) : null}
            <span>·</span>
            <span>
              {total} {pluralize(total, ['игра', 'игры', 'игр'])}
            </span>
            <span>·</span>
            <span>обновлён {formatDate(list.updated_at)}</span>
          </div>
        </div>
        <Button variant="secondary" icon={<Copy className="size-4" />} onClick={() => void copy()}>
          Поделиться
        </Button>
      </div>

      {list.description ? (
        <p className="mb-6 max-w-2xl text-sm text-slate-400">{list.description}</p>
      ) : null}

      <div className="surface rounded-2xl p-4 sm:p-5">
        <TierListView rows={list.rows ?? []} />
      </div>
    </PageShell>
  );
}
