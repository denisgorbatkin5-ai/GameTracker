import { motion } from 'framer-motion';
import { Flame, Plus, Search, Sparkles, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AddGameModal } from '../components/games/AddGameModal';
import { GameSearch } from '../components/games/GameSearch';
import { GameTile } from '../components/games/GameTile';
import { PageHeader, PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Primitives';
import { CURATED_SECTIONS } from '../data/curated';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import { ensureGames } from '../lib/api';
import { fetchFeatured, fetchGame } from '../lib/steam';
import type { FeaturedLists } from '../lib/types';

export function Discover() {
  const { user } = useAuth();
  const { items, addGame } = useLibrary();
  const { push } = useToast();
  const navigate = useNavigate();

  const [addAppid, setAddAppid] = useState<number | null>(null);
  const [fallbackName, setFallbackName] = useState<string | undefined>();
  const [featured, setFeatured] = useState<FeaturedLists | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [section, setSection] = useState(0);

  useEffect(() => {
    void fetchFeatured()
      .then(setFeatured)
      .finally(() => setLoadingFeatured(false));
  }, []);

  const collected = useMemo(
    () => new Set(items.map((item) => item.game.steam_appid)),
    [items],
  );

  const quickAdd = async (appid: number) => {
    if (!user) {
      navigate('/register');
      return;
    }
    try {
      const details = await fetchGame(appid);
      if (!details) throw new Error('Steam не отдал данные по игре');
      const [synced] = await ensureGames([details]);
      if (!synced) throw new Error('Не удалось сохранить игру');
      await addGame(synced);
      push(`«${synced.name}» добавлена в коллекцию`, 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка добавления', 'error');
    }
  };

  const openAdd = (appid: number, name?: string) => {
    if (!user) {
      navigate('/register');
      return;
    }
    setFallbackName(name);
    setAddAppid(appid);
  };

  const current = CURATED_SECTIONS[section];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Каталог Steam"
        title="Найди свою следующую игру"
        description="Поиск по более чем 100 000 игр в Steam. Добавь игру в коллекцию в один клик."
      />

      <div className="glass rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-violet-300/80 uppercase">
          <Search className="size-3.5" /> Поиск по названию
        </div>
        <GameSearch
          autoFocus
          inCollection={(appid) => collected.has(appid)}
          onPick={(hit) => {
            if (collected.has(hit.appid)) {
              push('Эта игра уже в коллекции', 'info');
              return;
            }
            setFallbackName(hit.name);
            setAddAppid(hit.appid);
          }}
        />
        <p className="mt-3 text-xs text-slate-500">
          Начни вводить название — подсказки появятся через пару символов. Обложки и метаданные
          загружаются из Steam.
        </p>
      </div>

      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-cyan-300/80 uppercase">
              <Flame className="size-3.5" /> В трендах Steam
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Популярное сейчас</h2>
          </div>
          {featured?.topSellers.length ? (
            <span className="text-xs text-slate-500">обновлено только что</span>
          ) : null}
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(featured?.topSellers ?? []).map((item, index) => (
              <GameTile
                key={item.appid}
                appid={item.appid}
                name={item.name}
                header={item.header}
                inCollection={collected.has(item.appid)}
                index={index}
                onClick={() => (collected.has(item.appid) ? void quickAdd(item.appid) : openAdd(item.appid, item.name))}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-violet-300/80 uppercase">
            <Tag className="size-3.5" /> Подборки
          </div>
          {CURATED_SECTIONS.map((entry, index) => (
            <button
              key={entry.title}
              type="button"
              onClick={() => setSection(index)}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition ${
                section === index
                  ? 'border-violet-400/50 bg-violet-500/15 text-white'
                  : 'border-white/10 bg-white/3 text-slate-400 hover:text-slate-200'
              }`}
            >
              {entry.title}
            </button>
          ))}
        </div>
        <p className="mb-5 text-sm text-slate-500">{current.subtitle}</p>
        <motion.div
          key={current.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
        >
          {current.games.map((game, index) => (
            <GameTile
              key={game.appid}
              appid={game.appid}
              name={game.name}
              tag={game.tag}
              inCollection={collected.has(game.appid)}
              index={index}
              onClick={() => openAdd(game.appid, game.name)}
            />
          ))}
        </motion.div>
      </section>

      {featured?.newReleases.length ? (
        <section className="mt-12">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-lime-300/80 uppercase">
            <Sparkles className="size-3.5" /> Новинки
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {featured.newReleases.map((item, index) => (
              <GameTile
                key={item.appid}
                appid={item.appid}
                name={item.name}
                header={item.header}
                inCollection={collected.has(item.appid)}
                index={index}
                onClick={() => openAdd(item.appid, item.name)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-4">
          <span className="text-sm text-slate-300">
            В коллекции уже{' '}
            <span className="font-mono font-bold text-white">{items.length}</span>{' '}
            игр
          </span>
          <div className="flex gap-2">
            <Link to="/collection">
              <Button size="sm" variant="secondary">
                Открыть коллекцию
              </Button>
            </Link>
            <Link to="/tier-lists">
              <Button size="sm" icon={<Plus className="size-3.5" />}>
                В тир-лист
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      <AddGameModal
        open={addAppid !== null}
        appid={addAppid}
        fallbackName={fallbackName}
        onClose={() => setAddAppid(null)}
      />
    </PageShell>
  );
}
