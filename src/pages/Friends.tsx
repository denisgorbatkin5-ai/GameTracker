import { motion } from 'framer-motion';
import { ArrowRight, Check, Clock, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameArt } from '../components/games/GameArt';
import { PageHeader, PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { Card, EmptyState, Skeleton, Stat } from '../components/ui/Primitives';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import * as api from '../lib/api';
import type { CollectionItem, Friendship, Profile } from '../lib/types';
import { pluralize } from '../lib/utils';

function Nickname({ profile }: { profile?: Profile | null }) {
  if (!profile) {
    return <span className="truncate text-sm font-semibold text-slate-600">недоступен</span>;
  }
  return (
    <span className="truncate text-sm font-semibold text-slate-100">
      {profile.display_name ?? profile.username}
    </span>
  );
}

function ProfileAvatar({
  profile,
  size = 'md',
}: {
  profile?: Profile | null;
  size?: 'md' | 'sm';
}) {
  const cls = size === 'sm' ? 'size-9 rounded-lg text-xs' : 'size-12 rounded-xl text-sm';
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden font-bold text-white ${cls}`}
      style={{
        background: `linear-gradient(135deg, ${profile?.accent ?? '#8b5cf6'}, #22d3ee)`,
      }}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="size-full object-cover" />
      ) : (
        (profile?.display_name ?? profile?.username ?? '?').slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

export function Friends() {
  const { user, profile } = useAuth();
  const { friends, incoming, outgoing, loading, respond, addByNickname } = useFriends();
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<Profile[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (term.trim().length < 2) {
      setMatches([]);
      setSearched(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void api
        .searchProfiles(term.trim())
        .then((rows) => {
          if (active) setMatches(rows);
        })
        .finally(() => {
          if (active) setSearched(true);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [term]);

  const suggestions = useMemo(
    () =>
      matches
        .filter((row) => row.id !== user?.id)
        .filter((row) => !friends.some((edge) => edge.profile?.id === row.id))
        .slice(0, 6),
    [matches, friends, user?.id],
  );

  const send = async (nickname: string) => {
    setBusy(true);
    try {
      const result = await addByNickname(nickname);
      if (result === 'pending' || result === 'friends') {
        setTerm('');
        setMatches([]);
        setSearched(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(
    () => ({ total: friends.length, pending: incoming.length + outgoing.length }),
    [friends.length, incoming.length, outgoing.length],
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Сообщество"
        title="Друзья"
        description="Добавляй по нику, обменивайся заявками и смотри коллекции друг друга"
        actions={
          <Link to={`/u/${profile?.username ?? ''}`}>
            <Button variant="secondary">Мой профиль</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Друзей" value={counts.total} accent="#a3e635" />
        <Stat label="Входящие заявки" value={incoming.length} accent="#fbbf24" />
        <Stat label="Отправлено заявок" value={outgoing.length} accent="#8b5cf6" />
      </div>

      <Card className="mt-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div>
            <Field label="Добавить по нику" hint="от 2 символов">
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void send(term.trim());
                  }
                }}
                placeholder="pixel_slayer"
                icon={<UserPlus className="size-4" />}
                maxLength={20}
              />
            </Field>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                loading={busy}
                disabled={term.trim().length < 2}
                onClick={() => void send(term.trim())}
              >
                Отправить заявку
              </Button>
            </div>

            {searched ? (
              <div className="mt-4 space-y-1.5">
                <div className="text-[11px] tracking-wide text-slate-500 uppercase">
                  Найдено игроков
                </div>
                {suggestions.length === 0 ? (
                  <p className="text-xs text-slate-500">Никого не найдено — проверь ник.</p>
                ) : (
                  suggestions.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 px-2.5 py-2"
                    >
                      <ProfileAvatar profile={row} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Nickname profile={row} />
                        <div className="truncate text-[11px] text-slate-500">@{row.username}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<UserPlus className="size-3.5" />}
                        onClick={() => void send(row.username)}
                      >
                        Добавить
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            {incoming.length > 0 ? (
              <div className="rounded-xl border border-amber-300/25 bg-amber-400/6 p-3.5">
                <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-amber-200">
                  <Clock className="size-4" /> Входящие заявки
                </div>
                <div className="space-y-2">
                  {incoming.map((edge: Friendship) => (
                    <FriendRow
                      key={edge.id}
                      edge={edge}
                      actions={
                        <>
                          <Button
                            size="sm"
                            icon={<Check className="size-3.5" />}
                            onClick={() => void respond(edge.id, true)}
                          >
                            Принять
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<X className="size-3.5" />}
                            onClick={() => void respond(edge.id, false)}
                          >
                            Отклонить
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {outgoing.length > 0 ? (
              <div className="rounded-xl border border-violet-300/20 bg-violet-400/6 p-3.5">
                <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-violet-200">
                  <Search className="size-4" /> Ожидают ответа
                </div>
                <div className="space-y-2">
                  {outgoing.map((edge: Friendship) => (
                    <FriendRow
                      key={edge.id}
                      edge={edge}
                      actions={
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void respond(edge.id, false)}
                        >
                          Отозвать
                        </Button>
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Users className="size-4 text-lime-300" /> Мои друзья
                <span className="text-xs font-normal text-slate-500">
                  {counts.total} {pluralize(counts.total, ['друг', 'друга', 'друзей'])}
                </span>
              </div>

              {loading && friends.length === 0 ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-6" />}
                  title="Пока нет друзей"
                  description="Найди игрока по нику слева и отправь заявку — он увидит её в своём профиле."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {friends.map((edge: Friendship) => (
                    <FriendCard key={edge.id} edge={edge} onRemove={() => void respond(edge.id, false)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}

function FriendRow({
  edge,
  actions,
}: {
  edge: Friendship;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 px-2.5 py-2">
      <ProfileAvatar profile={edge.profile} size="sm" />
      <div className="min-w-0 flex-1">
        <Nickname profile={edge.profile} />
        {edge.profile ? (
          <Link
            to={`/u/${edge.profile.username}`}
            className="truncate text-[11px] text-slate-500 transition hover:text-violet-300"
          >
            @{edge.profile.username}
          </Link>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
    </div>
  );
}

/** Friend card with a peek at the games they actually play. */
function FriendCard({ edge, onRemove }: { edge: Friendship; onRemove: () => void }) {
  const [peek, setPeek] = useState<CollectionItem[]>([]);
  const [loadingPeek, setLoadingPeek] = useState(true);

  useEffect(() => {
    if (!edge.profile) return;
    let active = true;
    void api
      .fetchProfileCollection(edge.profile.username)
      .then((rows) => {
        if (!active) return;
        setPeek(
          rows
            .slice()
            .sort((a, b) => (b.hours_played ?? 0) - (a.hours_played ?? 0))
            .slice(0, 6),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingPeek(false);
      });
    return () => {
      active = false;
    };
  }, [edge.profile]);

  const person = edge.profile;
  if (!person) return null;

  const hours = peek.reduce((sum, item) => sum + (item.hours_played ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="surface relative overflow-hidden rounded-2xl p-4"
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: `radial-gradient(90% 100% at 0% 0%, ${person.accent}55, transparent)` }}
      />
      <div className="relative flex items-center gap-3">
        <ProfileAvatar profile={person} />
        <div className="min-w-0 flex-1">
          <Nickname profile={person} />
          <div className="truncate text-[11px] text-slate-500">@{person.username}</div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          title="Удалить из друзей"
          onClick={onRemove}
          className="shrink-0"
        >
          <UserMinus className="size-4" />
        </Button>
      </div>

      {person.bio ? <p className="relative mt-3 line-clamp-2 text-xs text-slate-400">{person.bio}</p> : null}

      <div className="relative mt-3 grid grid-cols-6 gap-1">
        {loadingPeek
          ? Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-9 rounded-md" />
            ))
          : peek.map((item) => (
              <div
                key={item.id}
                title={item.game.name}
                className="h-9 overflow-hidden rounded-md"
              >
                <GameArt
                  appid={item.game.steam_appid}
                  src={item.game.header_image}
                  alt={item.game.name}
                  className="size-full"
                  rounded="rounded-md"
                />
              </div>
            ))}
        {!loadingPeek && peek.length === 0 ? (
          <p className="col-span-6 text-[11px] text-slate-600">Коллекция пока пуста</p>
        ) : null}
      </div>

      <div className="relative mt-3.5 flex items-center gap-3">
        <Link
          to={`/u/${person.username}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 transition hover:text-violet-200"
        >
          Коллекция и витрина <ArrowRight className="size-3.5" />
        </Link>
        {!loadingPeek && peek.length > 0 ? (
          <span className="ml-auto font-mono text-[11px] text-slate-500">
            {peek.length}+ · {Math.round(hours).toLocaleString('ru-RU')} ч
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
