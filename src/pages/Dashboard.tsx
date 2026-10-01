import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Plus,
  Sparkles,
  Star,
  Trophy,
  Wand2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AddGameModal } from '../components/games/AddGameModal';
import { GameSearch } from '../components/games/GameSearch';
import { StatusBadge } from '../components/games/StatusBadge';
import { GameArt } from '../components/games/GameArt';
import { PageHeader, PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Card, EmptyState, Skeleton, Stat } from '../components/ui/Primitives';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import { createTierList, ensureGames } from '../lib/api';
import { fetchGame } from '../lib/steam';
import { STATUS_META, STATUS_ORDER, type ItemStatus } from '../lib/types';
import { cn, formatHours, percent, pluralize, relativeTime } from '../lib/utils';

export function Dashboard() {
  const { profile } = useAuth();
  const { items, categories, loading, addGame } = useLibrary();
  const { push } = useToast();
  const [addAppid, setAddAppid] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const collectedAppids = useMemo(
    () => new Set(items.map((item) => item.game.steam_appid)),
    [items],
  );

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(
      STATUS_ORDER.map((status) => [status, items.filter((item) => item.status === status).length]),
    ) as Record<ItemStatus, number>;

    const totalHours = items.reduce((sum, item) => sum + (item.hours_played ?? 0), 0);
    const rated = items.filter((item) => item.rating !== null);
    const avgRating = rated.length
      ? (rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length).toFixed(1)
      : '—';

    const genreCount = new Map<string, number>();
    for (const item of items) {
      for (const genre of item.game.genres) {
        genreCount.set(genre, (genreCount.get(genre) ?? 0) + 1);
      }
    }
    const topGenres = [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const ratedSorted = [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    const finishedThisYear = items.filter(
      (item) => item.status === 'completed' && item.finished_at?.startsWith(String(new Date().getFullYear())),
    ).length;

    return {
      byStatus,
      totalHours,
      avgRating,
      topGenres,
      best: ratedSorted.slice(0, 5),
      finishedThisYear,
      completion: percent(byStatus.completed, items.length),
    };
  }, [items]);

  const recent = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 6),
    [items],
  );

  const createFirstTierList = async () => {
    setCreating(true);
    try {
      await createTierList(profile?.id ?? '', 'Мой первый тир-лист', 'Всё, что есть в коллекции', true);
      window.location.href = '/tier-lists';
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (loading && items.length === 0) {
    return (
      <PageShell>
        <Skeleton className="h-10 w-64" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Дашборд"
        title={
          <>
            Привет, <span className="text-gradient">{profile?.display_name ?? profile?.username}</span>
          </>
        }
        description="Сводка по твоей библиотеке: статусы, часы, рейтинги и любимые жанры."
        actions={
          <>
            <Link to="/discover">
              <Button variant="secondary" icon={<Plus className="size-4" />}>
                Добавить игру
              </Button>
            </Link>
            <Link to="/tier-lists">
              <Button icon={<Trophy className="size-4" />}>Тир-листы</Button>
            </Link>
          </>
        }
      />

      {items.length === 0 ? (
        <div className="space-y-6">
          <div className="surface rounded-3xl p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold text-white">
              Добавь первые игры
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Начни с поиска по Steam — данные об играх подтянутся автоматически.
            </p>
            <div className="mt-5">
              <GameSearch
                autoFocus
                inCollection={(appid) => collectedAppids.has(appid)}
                onPick={async (hit) => {
                  try {
                    const details = await fetchGame(hit.appid);
                    if (!details) throw new Error('Steam не отдал данные');
                    const [synced] = await ensureGames([details]);
                    if (synced) {
                      await addGame(synced);
                      push(`«${synced.name}» добавлена`, 'success');
                    }
                  } catch (error) {
                    push(error instanceof Error ? error.message : 'Ошибка', 'error');
                  }
                }}
              />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { title: 'Найди игру', text: 'Поиск по каталогу Steam' },
                { title: 'Отметь статус', text: 'Играю / прошёл / в планах' },
                { title: 'Собери тир-лист', text: 'Drag & drop по тирам' },
              ].map((step, index) => (
                <div key={step.title} className="rounded-xl border border-white/8 bg-white/2 p-4">
                  <span className="font-mono text-xs text-cyan-300">0{index + 1}</span>
                  <div className="mt-1 text-sm font-semibold text-slate-100">{step.title}</div>
                  <div className="text-xs text-slate-500">{step.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(70%_100%_at_100%_0%,rgba(34,211,238,0.16),transparent)]" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display flex items-center gap-2 text-lg font-semibold text-white">
                  <Wand2 className="size-4.5 text-cyan-300" />
                  Создай первый тир-лист
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Четыре тира S–C, перетаскивание игр drag &amp; drop и публичная ссылка.
                </p>
              </div>
              <Button onClick={() => void createFirstTierList()} loading={creating}>
                Создать тир-лист
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Всего игр"
              value={items.length}
              accent="#8b5cf6"
              sub={`${stats.completion}% пройдено`}
            />
            <Stat
              label="Пройдено"
              value={stats.byStatus.completed}
              accent="#a3e635"
              sub={`${stats.finishedThisYear} ${pluralize(stats.finishedThisYear, ['в этом году', 'в этом году', 'в этом году'])}`}
            />
            <Stat
              label="Часов наиграно"
              value={Math.round(stats.totalHours).toLocaleString('ru-RU')}
              accent="#22d3ee"
              sub={`${formatHours(stats.totalHours / Math.max(items.length, 1))} в среднем`}
            />
            <Stat label="Средняя оценка" value={stats.avgRating} accent="#fbbf24" sub="по 10-балльной шкале" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">Статусы</h2>
                <Link
                  to="/collection"
                  className="inline-flex items-center gap-1 text-xs text-violet-300 transition hover:text-violet-200"
                >
                  Вся коллекция <ArrowRight className="size-3.5" />
                </Link>
              </div>

              <div className="mb-6 flex h-3 overflow-hidden rounded-full bg-white/5">
                {STATUS_ORDER.map((status) => {
                  const share = percent(stats.byStatus[status], items.length);
                  if (share === 0) return null;
                  return (
                    <motion.div
                      key={status}
                      initial={{ width: 0 }}
                      animate={{ width: `${share}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      style={{ background: `linear-gradient(90deg, ${STATUS_META[status].color}, ${STATUS_META[status].color}aa)` }}
                      title={`${STATUS_META[status].label}: ${stats.byStatus[status]}`}
                    />
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {STATUS_ORDER.map((status) => (
                  <div key={status} className="rounded-xl border border-white/8 bg-white/2 p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: STATUS_META[status].color }}
                      />
                      <span className="text-[11px] tracking-wide text-slate-400 uppercase">
                        {STATUS_META[status].label}
                      </span>
                    </div>
                    <div className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">
                      {stats.byStatus[status]}
                    </div>
                  </div>
                ))}
              </div>

              {stats.topGenres.length > 0 ? (
                <div className="mt-7 border-t border-white/8 pt-5">
                  <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    Любимые жанры
                  </h3>
                  <div className="space-y-2">
                    {stats.topGenres.map(([genre, count]) => (
                      <div key={genre} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-xs text-slate-300">{genre}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent(count, stats.topGenres[0][1])}%` }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full bg-linear-to-r from-violet-500 to-cyan-400"
                          />
                        </div>
                        <span className="w-6 text-right font-mono text-[11px] text-slate-500">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>

            <div className="space-y-4">
              <Card>
                <h2 className="font-display mb-4 text-lg font-semibold text-white">Недавние</h2>
                <div className="space-y-1">
                  {recent.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-white/5">
                      <GameArt
                        appid={item.game.steam_appid}
                        src={item.game.header_image}
                        alt={item.game.name}
                        className="h-11 w-[76px] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-slate-200">
                          {item.game.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          {relativeTime(item.updated_at)}
                        </div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              </Card>

              {stats.best.length > 0 ? (
                <Card>
                  <h2 className="font-display mb-1 text-lg font-semibold text-white">Топ оценок</h2>
                  <p className="mb-4 text-xs text-slate-500">Твои любимцы по 10-балльной шкале</p>
                  <div className="space-y-2">
                    {stats.best.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <span className="w-4 font-mono text-xs text-slate-600">{index + 1}</span>
                        <GameArt
                          appid={item.game.steam_appid}
                          src={item.game.header_image}
                          alt={item.game.name}
                          className="h-9 w-16 shrink-0"
                        />
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
                          {item.game.name}
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-mono text-xs font-bold text-amber-300">
                          <Star className="size-3 fill-current" />
                          {item.rating}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {categories.length > 0 ? (
                <Card>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-white">Категории</h2>
                    <Link
                      to="/collection"
                      className="text-xs text-violet-300 transition hover:text-violet-200"
                    >
                      Управлять
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {categories.slice(0, 6).map((category) => (
                      <div key={category.id} className="flex items-center gap-2.5">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: category.color }}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
                          {category.name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {category.item_count}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>
          </div>

          {stats.byStatus.backlog > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Flame className="size-4 text-orange-300" />
                В планах осталось{' '}
                <span className="font-mono font-bold text-white">{stats.byStatus.backlog}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Clock className="size-4 text-cyan-300" />
                Сейчас в игре:{' '}
                <span className="font-mono font-bold text-white">{stats.byStatus.playing}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="size-4 text-lime-300" />
                Пройдено:{' '}
                <span className="font-mono font-bold text-white">{stats.byStatus.completed}</span>
              </div>
              <Link to="/collection" className="ml-auto">
                <Button size="sm" variant="secondary" icon={<Layers className="size-3.5" />}>
                  Открыть коллекцию
                </Button>
              </Link>
            </div>
          ) : null}
        </>
      )}

      {items.length > 0 ? (
        <div className="mt-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className={cn('size-4 text-violet-300')} />
              <h2 className="font-display text-lg font-semibold text-white">Быстрое добавление</h2>
            </div>
            <GameSearch
              placeholder="Найти игру в Steam…"
              inCollection={(appid) => collectedAppids.has(appid)}
              onPick={(hit) => setAddAppid(hit.appid)}
            />
          </Card>
        </div>
      ) : null}

      {items.length === 0 && categories.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Layers className="size-6" />}
            title="Пока пусто"
            description="Создай категории, чтобы раскладывать игры по смыслу — например, «Купить» или «На питче»."
            action={
              <Link to="/collection">
                <Button variant="secondary">Перейти к категориям</Button>
              </Link>
            }
          />
        </div>
      ) : null}

      <AddGameModal
        open={addAppid !== null}
        appid={addAppid}
        onClose={() => setAddAppid(null)}
      />
    </PageShell>
  );
}
