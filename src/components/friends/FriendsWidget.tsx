import { motion } from 'framer-motion';
import { ArrowRight, Check, Clock, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFriends } from '../../hooks/useFriends';
import * as api from '../../lib/api';
import type { CollectionItem, Profile } from '../../lib/types';
import { pluralize } from '../../lib/utils';
import { GameArt } from '../games/GameArt';
import { Button } from '../ui/Button';
import { Card, EmptyState, Skeleton } from '../ui/Primitives';

interface FriendSummary {
  count: number;
  playing: number;
  completed: number;
  hours: number;
  covers: { appid: number; url: string }[];
}

/** Collections are immutable snapshots between visits, so one fetch per friend is enough. */
const summaryCache = new Map<string, FriendSummary>();

function summarise(rows: CollectionItem[]): FriendSummary {
  const hours = rows.reduce((sum, row) => sum + (row.hours_played ?? 0), 0);
  return {
    count: rows.length,
    playing: rows.filter((row) => row.status === 'playing').length,
    completed: rows.filter((row) => row.status === 'completed').length,
    hours,
    covers: rows
      .slice(0, 3)
      .filter((row) => row.game.header_image)
      .map((row) => ({ appid: row.game.steam_appid, url: row.game.header_image as string })),
  };
}

export function Avatar({ profile, size = 40 }: { profile: Profile; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${profile.accent}, #22d3ee)`,
      }}
    >
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="size-full object-cover" />
      ) : (
        (profile.display_name ?? profile.username).slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

function useSummary(username: string | undefined): FriendSummary | undefined {
  const [summary, setSummary] = useState<FriendSummary | undefined>(() =>
    username ? summaryCache.get(username) : undefined,
  );

  useEffect(() => {
    if (!username) return;
    const cached = summaryCache.get(username);
    if (cached) {
      setSummary(cached);
      return;
    }
    let active = true;
    void api
      .fetchProfileCollection(username)
      .then((rows) => {
        const next = summarise(rows);
        summaryCache.set(username, next);
        if (active) setSummary(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [username]);

  return summary;
}

/**
 * Steam-style friends block: pending requests on top, then everyone you play with - each row
 * opens the friend's profile with their collection, so nobody has to paste /u/nick links.
 */
export function FriendsWidget() {
  const { friends, incoming, respond, loading, ready } = useFriends();
  const people = friends.slice(0, 6);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-white">
          <Users className="size-4 text-lime-300" /> Друзья
          {friends.length > 0 ? (
            <span className="font-mono text-xs font-normal text-slate-500">{friends.length}</span>
          ) : null}
        </h2>
        <Link
          to="/friends"
          className="inline-flex items-center gap-1 text-xs text-violet-300 transition hover:text-violet-200"
        >
          Все <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {incoming.length > 0 ? (
        <div className="mb-4 space-y-2 rounded-xl border border-amber-300/25 bg-amber-400/6 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
            <Clock className="size-3" /> новые заявки
          </div>
          {incoming.map((edge) => (
            <div key={edge.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1 truncate text-xs text-slate-200">
                {edge.profile ? (
                  <Link to={`/u/${edge.profile.username}`} className="hover:text-violet-300">
                    @{edge.profile.username}
                  </Link>
                ) : (
                  '—'
                )}
              </div>
              <Button
                size="sm"
                icon={<Check className="size-3" />}
                onClick={() => void respond(edge.id, true)}
              >
                Да
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<X className="size-3" />}
                onClick={() => void respond(edge.id, false)}
              />
            </div>
          ))}
        </div>
      ) : null}

      {!ready || (loading && friends.length === 0) ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-11 rounded-xl" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="Друзей пока нет"
          description="Добавь игрока по нику — и его коллекция будет здесь, в один клик."
          action={
            <Link to="/friends">
              <Button size="sm" variant="secondary">
                Найти друзей
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-1.5">
          {people.map((edge, index) => (
            <FriendRow key={edge.id} username={edge.profile?.username} profile={edge.profile} index={index} />
          ))}
        </div>
      )}
    </Card>
  );
}

function FriendRow({
  username,
  profile,
  index,
}: {
  username?: string;
  profile?: Profile;
  index: number;
}) {
  const summary = useSummary(username);

  if (!profile || !username) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 px-2 py-2">
        <Skeleton className="size-8 rounded-lg" />
        <span className="text-xs text-slate-600">профиль недоступен</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Link
        to={`/u/${username}`}
        className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-2 transition hover:border-white/12 hover:bg-white/5"
      >
        <Avatar profile={profile} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-slate-100 group-hover:text-white">
            {profile.display_name ?? profile.username}
          </div>
          <div className="truncate text-[10px] text-slate-500">
            {summary
              ? `${summary.count} ${pluralize(summary.count, ['игра', 'игры', 'игр'])}${
                  summary.playing > 0 ? ` · ${summary.playing} играет` : ''
                }`
              : 'считаем…'}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {(summary?.covers ?? []).map((cover, coverIndex) => (
            <GameArt
              key={coverIndex}
              appid={cover.appid}
              src={cover.url}
              alt=""
              className="size-6"
              rounded="rounded"
            />
          ))}
        </div>
      </Link>
    </motion.div>
  );
}
