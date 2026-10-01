import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  Globe,
  Loader2,
  Lock,
  Plus,
  Save,
  Search,
  Settings2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GameArt } from '../components/games/GameArt';
import { GameSearch } from '../components/games/GameSearch';
import { TierBoard, type DraftItem, type DraftRow } from '../components/tierlist/TierBoard';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Primitives';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import * as api from '../lib/api';
import { fetchGame } from '../lib/steam';
import type { TierList } from '../lib/types';
import { TIER_PALETTE, TIER_PRESETS, cn, pluralize, steamHeader } from '../lib/utils';

export function TierListEditor() {
  const { id } = useParams();
  const listId = Number(id);
  const { profile } = useAuth();
  const { items, ready } = useLibrary();
  const { push } = useToast();
  const navigate = useNavigate();

  const [list, setList] = useState<TierList | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [pool, setPool] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const placedIds = useRef<Set<number>>(new Set());

  useEffect(() => {
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
        if (!result) {
          push('Тир-лист не найден', 'error');
          navigate('/tier-lists');
          return;
        }
        setList(result);
        setRows(
          (result.rows ?? []).map((row) => ({
            key: row.key,
            label: row.label,
            color: row.color,
            sortOrder: row.sort_order,
            items: row.items.map((item) => ({
              gameId: item.game_id,
              name: item.game.name,
              header: item.game.header_image ?? steamHeader(item.game.steam_appid),
              position: item.position,
            })),
          })),
        );
        setPool([]);
      } catch (error) {
        push(error instanceof Error ? error.message : 'Ошибка загрузки', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [listId, navigate, push]);

  // Games already used anywhere in the editor: placed in a tier or waiting in the pool.
  placedIds.current = useMemo(() => {
    const set = new Set<number>();
    for (const row of rows) for (const item of row.items) set.add(item.gameId);
    for (const item of pool) set.add(item.gameId);
    return set;
  }, [rows, pool]);

  const owned = useMemo(
    () => (list && profile ? list.user_id === profile.id : false),
    [list, profile],
  );

  const onChange = useCallback((nextRows: DraftRow[], nextPool: DraftItem[]) => {
    setRows(nextRows);
    setPool(nextPool);
    setDirty(true);
  }, []);

  const addItems = useCallback(
    (incoming: { gameId: number; name: string; header: string | null }[]) => {
      const seen = new Set(placedIds.current);
      const fresh = incoming.filter((game) => {
        if (seen.has(game.gameId)) return false;
        seen.add(game.gameId);
        return true;
      });
      if (fresh.length === 0) return;
      setPool((prev) => [
        ...prev,
        ...fresh.map((game, index) => ({
          gameId: game.gameId,
          name: game.name,
          header: game.header,
          position: prev.length + index,
        })),
      ]);
      setDirty(true);
    },
    [],
  );

  const save = useCallback(async () => {
    if (!list) return;
    setSaving(true);
    try {
      await api.saveTierListContent(
        list.id,
        rows.map((row, index) => ({
          key: row.key,
          label: row.label,
          color: row.color,
          sort_order: index,
          items: row.items.map((item, position) => ({ game_id: item.gameId, position })),
        })),
      );
      setDirty(false);
      setSavedAt(Date.now());
      push('Тир-лист сохранён', 'success');
      if (pool.length > 0) {
        push(
          `${pool.length} ${pluralize(pool.length, ['игра', 'игры', 'игр'])} осталась в списке без тира и не сохранится`,
          'info',
        );
      }
    } catch (error) {
      push(error instanceof Error ? error.message : 'Не удалось сохранить', 'error');
    } finally {
      setSaving(false);
    }
  }, [list, rows, pool, push]);

  const setVisibility = useCallback(
    async (mode: 'public' | 'friends' | 'private') => {
      if (!list) return;
      const patch =
        mode === 'public'
          ? { is_public: true, friends_visible: false }
          : mode === 'friends'
            ? { is_public: false, friends_visible: true }
            : { is_public: false, friends_visible: false };
      setList({ ...list, ...patch });
      try {
        await api.updateTierList(list.id, patch);
        push(
          mode === 'public'
            ? 'Тир-лист виден всем'
            : mode === 'friends'
              ? 'Тир-лист видят только друзья'
              : 'Тир-лист скрыт',
          'success',
        );
      } catch (error) {
        setList(list);
        push(error instanceof Error ? error.message : 'Не удалось сохранить', 'error');
      }
    },
    [list, push],
  );

  const addRow = () => {
    const index = rows.length;
    onChange(
      [
        ...rows,
        {
          key: `custom-${Date.now()}`,
          label: '?',
          color: TIER_PALETTE[index % TIER_PALETTE.length],
          sortOrder: index,
          items: [],
        },
      ],
      pool,
    );
    setSettingsOpen(false);
  };

  const removeRow = (key: string) => {
    const target = rows.find((row) => row.key === key);
    if (!target) return;
    onChange(
      rows.filter((row) => row.key !== key),
      [...pool, ...target.items.map((item, position) => ({ ...item, position: pool.length + position }))],
    );
  };

  const copyLink = async () => {
    if (!list) return;
    const url = `${window.location.origin}/t/${list.id}`;
    try {
      await navigator.clipboard.writeText(url);
      push('Ссылка скопирована', 'success');
    } catch {
      push(url, 'info');
    }
  };

  if (loading || !ready) {
    return (
      <PageShell>
        <Skeleton className="h-9 w-72" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!list) return null;

  const placedCount = rows.reduce((sum, row) => sum + row.items.length, 0);

  return (
    <PageShell className="max-w-[1400px]">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to="/tier-lists"
          className="flex size-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display truncate text-xl font-bold text-white sm:text-2xl">
              {list.name}
            </h1>
            {list.is_public ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 text-[10px] text-lime-300">
                <Globe className="size-3" /> публичный
              </span>
            ) : list.friends_visible ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-300">
                <UserCheck className="size-3" /> для друзей
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/12 px-2 py-0.5 text-[10px] text-slate-400">
                <Lock className="size-3" /> приватный
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              {placedCount} {placedCount === 1 ? 'игра' : 'игр'} размещено
            </span>
            {pool.length > 0 ? <span>· {pool.length} без тира</span> : null}
            {dirty ? (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-300" /> есть несохранённые изменения
              </span>
            ) : savedAt ? (
              <span className="inline-flex items-center gap-1 text-lime-300">
                <Check className="size-3" /> сохранено
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {owned ? (
            <>
              <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/3 p-0.5">
                {(
                  [
                    { mode: 'public' as const, icon: Globe, title: 'Виден всем' },
                    { mode: 'friends' as const, icon: UserCheck, title: 'Только друзьям' },
                    { mode: 'private' as const, icon: Lock, title: 'Приватный' },
                  ] satisfies { mode: 'public' | 'friends' | 'private'; icon: typeof Globe; title: string }[]
                ).map((option) => {
                  const active =
                    option.mode === 'public'
                      ? list.is_public
                      : option.mode === 'friends'
                        ? !list.is_public && list.friends_visible
                        : !list.is_public && !list.friends_visible;
                  return (
                    <button
                      key={option.mode}
                      type="button"
                      title={option.title}
                      onClick={() => void setVisibility(option.mode)}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-lg transition',
                        active
                          ? 'bg-white/12 text-white'
                          : 'text-slate-500 hover:bg-white/6 hover:text-slate-200',
                      )}
                    >
                      <option.icon className="size-3.5" />
                    </button>
                  );
                })}
              </div>
              <Button
                variant="secondary"
                icon={<Users className="size-4" />}
                onClick={() => setAddOpen(true)}
              >
                Добавить игры
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                title="Настройки тиров"
              >
                <Settings2 className="size-4" />
              </Button>
            </>
          ) : null}
          <Button variant="ghost" size="icon" onClick={() => void copyLink()} title="Копировать ссылку">
            <Copy className="size-4" />
          </Button>
          <Link to={`/t/${list.id}`} target="_blank">
            <Button variant="ghost" size="icon" title="Открыть публично">
              <Eye className="size-4" />
            </Button>
          </Link>
          {owned ? (
            <Button onClick={() => void save()} loading={saving} icon={<Save className="size-4" />}>
              Сохранить
            </Button>
          ) : null}
        </div>
      </div>

      {owned ? (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/2 px-4 py-3 text-xs text-slate-400">
          <Users className="size-3.5 text-cyan-300" />
          Перетаскивай карточки между тирами. Кликни «X» на карточке, чтобы убрать её из тир-листа.
          {!dirty && placedCount === 0 ? (
            <span className="text-slate-500">
              Начни с кнопки «Добавить игры» — возьми любые игры из своей коллекции.
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mb-5 rounded-2xl border border-amber-400/25 bg-amber-400/8 px-4 py-3 text-xs text-amber-200">
          Это чужая страница в режиме предпросмотра — изменения не сохраняются.
        </div>
      )}

      <TierBoard
        rows={rows}
        pool={pool}
        onChange={onChange}
        onRemoveRow={removeRow}
        renderRowHeader={(row) => (
          <input
            value={row.label}
            onChange={(event) => {
              const label = event.target.value.slice(0, 4);
              onChange(
                rows.map((entry) => (entry.key === row.key ? { ...entry, label } : entry)),
                pool,
              );
            }}
            disabled={!owned}
            maxLength={4}
            className="h-7 w-16 rounded-lg border border-white/10 bg-white/4 text-center font-display text-xs font-bold text-slate-200 transition focus:border-violet-400/60 disabled:opacity-60"
            aria-label="Название тира"
          />
        )}
      />

      {owned ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={addRow}>
            Добавить тир
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            Добавить игры из коллекции
          </Button>
        </div>
      ) : null}

      <AddGamesModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        collection={items}
        placed={placedIds.current}
        onAdd={addItems}
      />

      <TiersSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        rows={rows}
        pool={pool}
        onChange={onChange}
        onAddRow={addRow}
      />

      <AnimatePresence>
        {saving ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          >
            <Loader2 className="size-4 animate-spin" /> Сохраняем…
          </motion.div>
        ) : null}
      </AnimatePresence>
    </PageShell>
  );
}

function AddGamesModal({
  open,
  onClose,
  collection,
  placed,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  collection: ReturnType<typeof useLibrary>['items'];
  placed: Set<number>;
  onAdd: (items: { gameId: number; name: string; header: string | null }[]) => void;
}) {
  const { push } = useToast();
  const [tab, setTab] = useState<'collection' | 'steam'>('collection');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return collection;
    return collection.filter((item) => item.game.name.toLowerCase().includes(needle));
  }, [collection, query]);

  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));

  const addSelected = () => {
    const chosen = collection.filter((item) => picked.includes(item.id));
    onAdd(
      chosen.map((item) => ({
        gameId: item.game_id,
        name: item.game.name,
        header: item.game.header_image ?? steamHeader(item.game.steam_appid),
      })),
    );
    push(`${chosen.length} ${chosen.length === 1 ? 'игра добавлена' : 'игр добавлено'}`, 'success');
    setPicked([]);
  };

  const addFromSteam = async (appid: number) => {
    setBusy(true);
    try {
      const details = await fetchGame(appid);
      if (!details) throw new Error('Steam не отдал данные');
      const [synced] = await api.ensureGames([details]);
      if (!synced) throw new Error('Не удалось сохранить игру');
      onAdd([
        { gameId: synced.id, name: synced.name, header: synced.header_image ?? steamHeader(appid) },
      ]);
      push(`«${synced.name}» добавлена в тир-лист`, 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить игры"
      description="Из своей коллекции или любой игры из Steam"
      size="lg"
    >
      <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-white/3 p-1">
        {(
          [
            { key: 'collection', label: `Из коллекции (${collection.length})` },
            { key: 'steam', label: 'Поиск Steam' },
          ] as const
        ).map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition',
              tab === entry.key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'collection' ? (
        collection.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Коллекция пуста — сначала добавь игры на странице поиска
          </p>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Фильтр по названию…"
                className="pl-10"
              />
            </div>

            <div className="scroll-thin max-h-96 space-y-1 overflow-y-auto pr-1">
              {filtered.map((item) => {
                const already = placed.has(item.game_id);
                const active = picked.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={already}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-2 text-left transition',
                      already
                        ? 'cursor-not-allowed border-white/6 opacity-45'
                        : active
                          ? 'border-violet-400/50 bg-violet-500/12'
                          : 'border-white/8 hover:border-white/20 hover:bg-white/4',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-md border',
                        active ? 'border-violet-400 bg-violet-400/30 text-white' : 'border-white/20 text-transparent',
                      )}
                    >
                      <Check className="size-3" />
                    </span>
                    <GameArt
                      appid={item.game.steam_appid}
                      src={item.game.header_image}
                      alt={item.game.name}
                      className="h-11 w-[76px] shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-100">{item.game.name}</span>
                      <span className="block text-[11px] text-slate-500">
                        {already ? 'уже в тир-листе' : item.game.genres.slice(0, 2).join(', ') || '—'}
                      </span>
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Ничего не найдено</p>
              ) : null}
            </div>

            <div className="flex items-center gap-3 border-t border-white/8 pt-4">
              <span className="text-sm text-slate-400">
                Выбрано: <span className="font-mono text-white">{picked.length}</span>
              </span>
              <Button className="ml-auto" onClick={addSelected} disabled={picked.length === 0}>
                Добавить в тир-лист
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <GameSearch
            autoFocus
            placeholder="Название игры в Steam…"
            onPick={(hit) => void addFromSteam(hit.appid)}
          />
          {busy ? (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="size-3.5 animate-spin" /> Добавляем…
            </p>
          ) : null}
          <p className="text-xs text-slate-500">
            Игра будет сохранена в общий каталог и доступна во всех тир-листах.
          </p>
        </div>
      )}
    </Modal>
  );
}

function TiersSettingsModal({
  open,
  onClose,
  rows,
  pool,
  onChange,
  onAddRow,
}: {
  open: boolean;
  onClose: () => void;
  rows: DraftRow[];
  pool: DraftItem[];
  onChange: (rows: DraftRow[], pool: DraftItem[]) => void;
  onAddRow: () => void;
}) {
  const update = (key: string, patch: Partial<DraftRow>) =>
    onChange(
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
      pool,
    );

  // Keys are the technical identifiers stored in the DB, so they must stay unique:
  // otherwise React keys collide and one edit silently rewrites two tiers.
  const takenKeys = new Set(rows.map((row) => row.key));

  const renameKey = (key: string, next: string) => {
    const clean = next.replace(/[^a-z0-9_]/gi, '').slice(0, 12);
    if (clean === '' || takenKeys.has(clean)) return;
    update(key, { key: clean });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Настройки тиров"
      description="Переименуй тиры и выбери цвета"
      size="md"
    >
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/2 p-3">
            <input
              value={row.label}
              onChange={(event) => update(row.key, { label: event.target.value.slice(0, 4) })}
              maxLength={4}
              className="h-9 w-16 rounded-lg border border-white/10 bg-white/5 text-center font-display text-sm font-bold text-white"
            />
            <input
              value={row.key}
              onChange={(event) => renameKey(row.key, event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/4 px-2.5 font-mono text-xs text-slate-300"
            />
            <div className="flex flex-wrap justify-end gap-1">
              {TIER_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => update(row.key, { color: swatch })}
                  className={cn(
                    'size-5 rounded-md border transition hover:scale-110',
                    row.color === swatch ? 'border-white' : 'border-transparent',
                  )}
                  style={{ background: swatch }}
                  aria-label={`Цвет ${swatch}`}
                />
              ))}
            </div>
          </div>
        ))}

        <Button variant="secondary" className="w-full" icon={<Plus className="size-4" />} onClick={onAddRow}>
          Добавить тир
        </Button>

        <p className="pt-2 text-xs text-slate-500">
          Стандартные тиры: {TIER_PRESETS.map((preset) => preset.label).join(' · ')}. Ключ строки
          используется как технический идентификатор.
        </p>
      </div>
    </Modal>
  );
}
