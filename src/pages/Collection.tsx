import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  FolderPlus,
  LayoutGrid,
  List,
  Palette,
  Pencil,
  Plus,
  Rows3,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { CollectionCard } from '../components/games/CollectionCard';
import { GameSearch } from '../components/games/GameSearch';
import { GameArt } from '../components/games/GameArt';
import { StatusBadge, StatusSelect } from '../components/games/StatusBadge';
import { PageHeader, PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState, Skeleton } from '../components/ui/Primitives';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import { ensureGames } from '../lib/api';
import { fetchGame } from '../lib/steam';
import { STATUS_META, STATUS_ORDER, type CollectionItem, type ItemStatus } from '../lib/types';
import { TIER_PALETTE, cn, formatDate, formatHours, pluralize } from '../lib/utils';

type SortKey = 'updated' | 'name' | 'rating' | 'hours' | 'release';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'updated', label: 'Недавние' },
  { key: 'name', label: 'По алфавиту' },
  { key: 'rating', label: 'По оценке' },
  { key: 'hours', label: 'По часам' },
  { key: 'release', label: 'По дате выхода' },
];

export function Collection() {
  const {
    items,
    categories,
    loading,
    updateItem,
    createCategory,
    updateCategory,
    deleteCategory,
    addGame,
  } = useLibrary();
  const { push } = useToast();

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('updated');
  const [selected, setSelected] = useState<number[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [editing, setEditing] = useState<CollectionItem | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter && !item.category_ids.includes(categoryFilter)) return false;
      if (favoritesOnly && !item.is_favorite) return false;
      if (needle) {
        const haystack = [
          item.game.name,
          item.game.developers.join(' '),
          item.game.genres.join(' '),
          item.notes ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.game.name.localeCompare(b.game.name, 'ru');
        case 'rating':
          return (b.rating ?? -1) - (a.rating ?? -1);
        case 'hours':
          return (b.hours_played ?? 0) - (a.hours_played ?? 0);
        case 'release':
          return (b.game.release_date ?? '').localeCompare(a.game.release_date ?? '');
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    return sorted;
  }, [items, query, statusFilter, categoryFilter, favoritesOnly, sort]);

  const counts = useMemo(() => {
    const map = { all: items.length } as Record<string, number>;
    for (const status of STATUS_ORDER) {
      map[status] = items.filter((item) => item.status === status).length;
    }
    return map;
  }, [items]);

  const toggleSelected = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));

  const bulkStatus = async (status: ItemStatus) => {
    const targets = selected;
    setSelected([]);
    for (const id of targets) {
      try {
        await updateItem(id, { status });
      } catch {
        /* keep going, error already reported by library layer */
      }
    }
    push(`${targets.length} ${pluralize(targets.length, ['игра обновлена', 'игры обновлены', 'игр обновлено'])}`, 'success');
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Библиотека"
        title="Коллекция"
        description={`${items.length} ${pluralize(items.length, ['игра', 'игры', 'игр'])} · ${categories.length} ${pluralize(categories.length, ['категория', 'категории', 'категорий'])}`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<FolderPlus className="size-4" />}
              onClick={() => setCategoriesOpen(true)}
            >
              Категории
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setQuickAdd((prev) => !prev)}>
              Добавить игру
            </Button>
          </>
        }
      />

      {quickAdd ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-6 rounded-2xl p-4"
        >
          <GameSearch
            autoFocus
            inCollection={(appid) => items.some((item) => item.game.steam_appid === appid)}
            onPick={async (hit) => {
              try {
                const details = await fetchGame(hit.appid);
                if (!details) throw new Error('Steam не отдал данные');
                const [synced] = await ensureGames([details]);
                if (!synced) throw new Error('Не удалось сохранить игру');
                await addGame(synced);
                push(`«${synced.name}» добавлена`, 'success');
              } catch (error) {
                push(error instanceof Error ? error.message : 'Ошибка', 'error');
              }
            }}
          />
        </motion.div>
      ) : null}

      <div className="surface mb-6 rounded-2xl p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Фильтр по названию, жанру, заметкам…"
                className="pl-10"
              />
            </div>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-11 rounded-xl border border-white/10 bg-white/4 px-3 text-sm text-slate-200 transition hover:border-white/20"
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key} className="bg-ink">
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex rounded-xl border border-white/10 bg-white/4 p-0.5">
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg transition',
                    view === mode ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300',
                  )}
                  aria-label={mode === 'grid' ? 'Сетка' : 'Список'}
                >
                  {mode === 'grid' ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="scroll-thin -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
              Все <span className="text-slate-500">{counts.all}</span>
            </FilterPill>
            {STATUS_ORDER.map((status) => (
              <FilterPill
                key={status}
                active={statusFilter === status}
                color={STATUS_META[status].color}
                onClick={() => setStatusFilter(status)}
              >
                {STATUS_META[status].label} <span className="opacity-60">{counts[status]}</span>
              </FilterPill>
            ))}
            <span className="mx-1 h-5 w-px shrink-0 bg-white/10" />
            {categories.map((category) => (
              <FilterPill
                key={category.id}
                active={categoryFilter === category.id}
                color={category.color}
                onClick={() =>
                  setCategoryFilter((prev) => (prev === category.id ? null : category.id))
                }
              >
                {category.name} <span className="opacity-60">{category.item_count}</span>
              </FilterPill>
            ))}
            <FilterPill
              active={favoritesOnly}
              color="#fbbf24"
              onClick={() => setFavoritesOnly((prev) => !prev)}
            >
              <Star className={cn('size-3', favoritesOnly && 'fill-current')} /> Избранное
            </FilterPill>
            {statusFilter !== 'all' || categoryFilter || favoritesOnly || query ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter(null);
                  setFavoritesOnly(false);
                  setQuery('');
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-500 transition hover:text-white"
              >
                <X className="size-3" /> Сбросить
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass sticky top-20 z-30 mb-5 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
          >
            <span className="text-sm text-slate-200">
              Выбрано: <span className="font-mono font-bold text-white">{selected.length}</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => void bulkStatus(status)}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
                  style={{
                    borderColor: `${STATUS_META[status].color}50`,
                    color: STATUS_META[status].color,
                    background: `${STATUS_META[status].color}12`,
                  }}
                >
                  → {STATUS_META[status].label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="ml-auto text-xs text-slate-500 transition hover:text-white"
            >
              Снять выделение
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {loading && items.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Rows3 className="size-6" />}
          title="Коллекция пуста"
          description="Добавь игры из каталога Steam — они появятся здесь с обложками, статусами и заметками."
          action={
            <Button onClick={() => setQuickAdd(true)} icon={<Plus className="size-4" />}>
              Добавить первую игру
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="size-6" />}
          title="Ничего не найдено"
          description="Попробуй изменить фильтры или поисковый запрос."
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item, index) => (
            <div key={item.id} className="group relative">
              <button
                type="button"
                onClick={() => toggleSelected(item.id)}
                className={cn(
                  'absolute top-2.5 left-2.5 z-20 flex size-6 items-center justify-center rounded-lg border transition',
                  selected.includes(item.id)
                    ? 'border-cyan-400/60 bg-cyan-400/25 text-cyan-100'
                    : 'border-white/15 bg-black/50 text-transparent opacity-0 group-hover:opacity-100 hover:text-white/60',
                )}
                aria-label="Выбрать"
              >
                <Check className="size-3.5" />
              </button>
              <CollectionCard item={item} index={index} />
              <button
                type="button"
                onClick={() => setEditing(item)}
                className="absolute right-2.5 bottom-2.5 z-20 flex size-7 items-center justify-center rounded-lg border border-white/15 bg-black/60 text-slate-300 opacity-0 transition hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
                aria-label="Подробнее"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface divide-y divide-white/6 overflow-hidden rounded-2xl">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-white/3"
            >
              <button
                type="button"
                onClick={() => toggleSelected(item.id)}
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-md border transition',
                  selected.includes(item.id)
                    ? 'border-cyan-400/60 bg-cyan-400/25 text-cyan-100'
                    : 'border-white/15 text-transparent hover:text-white/40',
                )}
                aria-label="Выбрать"
              >
                <Check className="size-3" />
              </button>
              <GameArt
                appid={item.game.steam_appid}
                src={item.game.header_image}
                alt={item.game.name}
                className="h-12 w-20 shrink-0"
              />
              <div className="min-w-40 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-slate-100">
                    {item.game.name}
                  </span>
                  {item.is_favorite ? <Star className="size-3.5 fill-amber-300 text-amber-300" /> : null}
                </div>
                <div className="truncate text-[11px] text-slate-500">
                  {item.game.genres.slice(0, 3).join(', ') || '—'}
                </div>
              </div>
              <div className="hidden w-28 text-xs text-slate-400 lg:block">
                {formatHours(item.hours_played)}
              </div>
              <div className="hidden w-24 text-xs text-slate-400 md:block">
                {formatDate(item.finished_at)}
              </div>
              <div className="hidden w-16 font-mono text-xs text-amber-300 sm:block">
                {item.rating ?? '—'}
              </div>
              <StatusSelect
                value={item.status}
                onChange={(next) => void updateItem(item.id, { status: next })}
                className="w-32 shrink-0"
              />
              <button
                type="button"
                onClick={() => setEditing(item)}
                className="shrink-0 rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:text-white"
                aria-label="Подробнее"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <CategoriesModal
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        categories={categories}
        onCreate={async (name, color) => {
          await createCategory(name, color);
          push(`Категория «${name}» создана`, 'success');
        }}
        onUpdate={updateCategory}
        onDelete={async (id) => {
          await deleteCategory(id);
          push('Категория удалена', 'info');
        }}
      />

      <ItemModal key={editing?.id ?? 'closed'} item={editing} onClose={() => setEditing(null)} />
    </PageShell>
  );
}

function FilterPill({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition',
        active
          ? 'text-white'
          : 'border-white/10 bg-white/3 text-slate-400 hover:border-white/20 hover:text-slate-200',
      )}
      style={
        active && color
          ? { borderColor: `${color}66`, background: `${color}1f`, color }
          : active
            ? { borderColor: 'rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.16)' }
            : undefined
      }
    >
      {children}
    </button>
  );
}

function CategoriesModal({
  open,
  onClose,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  categories: ReturnType<typeof useLibrary>['categories'];
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (id: number, patch: { name?: string; color?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TIER_PALETTE[0]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate(name.trim(), color);
      setName('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Категории"
      description="Свои папки для коллекции: «Купить», «Инди», «На питче»"
      size="md"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Название" className="flex-1">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit();
              }}
              placeholder="Например, Инди"
              maxLength={40}
            />
          </Field>
          <div className="space-y-2">
            <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">Цвет</span>
            <div className="flex flex-wrap gap-1.5">
              {TIER_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  className={cn(
                    'size-7 rounded-lg border-2 transition',
                    color === swatch ? 'border-white scale-110' : 'border-transparent',
                  )}
                  style={{ background: swatch }}
                  aria-label={`Цвет ${swatch}`}
                />
              ))}
            </div>
          </div>
          <Button onClick={() => void submit()} loading={busy} icon={<FolderPlus className="size-4" />}>
            Создать
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
            Категорий пока нет
          </p>
        ) : (
          <ul className="space-y-1.5">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/2 px-3 py-2.5"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: category.color }}
                />
                {editingId === category.id ? (
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={async (event) => {
                      if (event.key === 'Enter') {
                        await onUpdate(category.id, { name: editingName.trim() || category.name });
                        setEditingId(null);
                      }
                    }}
                    onBlur={async () => {
                      await onUpdate(category.id, { name: editingName.trim() || category.name });
                      setEditingId(null);
                    }}
                    className="h-8"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-sm text-slate-200 transition hover:text-white"
                  >
                    {category.name}
                  </button>
                )}
                <span className="font-mono text-xs text-slate-500">{category.item_count}</span>
                <div className="flex items-center gap-1">
                  {TIER_PALETTE.slice(0, 6).map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => void onUpdate(category.id, { color: swatch })}
                      className={cn(
                        'size-4 rounded-full border transition hover:scale-110',
                        category.color === swatch ? 'border-white' : 'border-transparent',
                      )}
                      style={{ background: swatch }}
                      aria-label={`Цвет ${swatch}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => void onDelete(category.id)}
                    className="ml-1 rounded-lg p-1.5 text-slate-600 transition hover:text-rose-300"
                    aria-label="Удалить"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function ItemModal({ item, onClose }: { item: CollectionItem | null; onClose: () => void }) {
  const { updateItem, removeItem, categories, toggleItemCategory } = useLibrary();
  const { push } = useToast();
  const [rating, setRating] = useState<number | null>(item?.rating ?? null);
  const [hours, setHours] = useState(item?.hours_played ? String(item.hours_played) : '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const current = item;
  if (!current) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={current.game.name}
      description={current.game.short_description ?? undefined}
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row">
          <GameArt
            appid={current.game.steam_appid}
            src={current.game.background_image}
            alt={current.game.name}
            className="h-40 w-full shrink-0 sm:w-56"
          />
          <dl className="min-w-0 flex-1 space-y-2 text-xs">
            <DetailRow label="Статус">
              <StatusBadge status={current.status} size="md" />
            </DetailRow>
            <DetailRow label="Жанры">{current.game.genres.join(', ') || '—'}</DetailRow>
            <DetailRow label="Разработчик">{current.game.developers.join(', ') || '—'}</DetailRow>
            <DetailRow label="Издатель">{current.game.publishers.join(', ') || '—'}</DetailRow>
            <DetailRow label="Платформы">{current.game.platforms.join(', ') || '—'}</DetailRow>
            <DetailRow label="Релиз">{formatDate(current.game.release_date)}</DetailRow>
            <DetailRow label="Часов">{formatHours(current.hours_played)}</DetailRow>
            <DetailRow label="Добавлено">{formatDate(current.created_at)}</DetailRow>
          </dl>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Оценка">
            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: 11 }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setRating(rating === index ? null : index)}
                  className={cn(
                    'size-8 rounded-lg text-xs font-bold transition',
                    rating !== null && index <= rating
                      ? 'bg-amber-400/20 text-amber-300'
                      : 'text-slate-600 hover:bg-white/5 hover:text-slate-400',
                  )}
                >
                  {index}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Часов наиграно">
            <Input
              type="number"
              min={0}
              step="0.5"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              suffix={<span className="text-xs">ч</span>}
            />
          </Field>
        </div>

        <Field label="Заметки">
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Что понравилось, что нет, кого позвать…"
            className="w-full resize-none rounded-xl border border-white/10 bg-white/4 px-3.5 py-3 text-sm text-slate-100 transition placeholder:text-slate-600 focus:border-violet-400/60"
          />
        </Field>

        {categories.length > 0 ? (
          <Field label="Категории">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => {
                const active = current.category_ids.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      void toggleItemCategory(current.id, category.id, !active)
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                      active ? 'text-white' : 'border-white/10 text-slate-500 hover:text-slate-300',
                    )}
                    style={
                      active
                        ? {
                            borderColor: `${category.color}66`,
                            background: `${category.color}1f`,
                            color: category.color,
                          }
                        : undefined
                    }
                  >
                    {active ? <Check className="size-3" /> : <Palette className="size-3" />}
                    {category.name}
                  </button>
                );
              })}
            </div>
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-5">
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await updateItem(current.id, {
                  rating,
                  hours_played: hours ? Number(hours) : null,
                  notes: notes.trim() || null,
                });
                push('Сохранено', 'success');
                onClose();
              } catch (error) {
                push(error instanceof Error ? error.message : 'Ошибка', 'error');
              } finally {
                setBusy(false);
              }
            }}
          >
            Сохранить
          </Button>
          <Button
            variant="secondary"
            icon={<Star className={cn('size-4', current.is_favorite && 'fill-current')} />}
            onClick={() => void updateItem(current.id, { is_favorite: !current.is_favorite })}
          >
            {current.is_favorite ? 'Убрать из избранного' : 'В избранное'}
          </Button>
          <Button
            variant="danger"
            className="ml-auto"
            icon={<Trash2 className="size-4" />}
            onClick={async () => {
              await removeItem(current.id);
              push('Игра удалена из коллекции', 'info');
              onClose();
            }}
          >
            Удалить
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-slate-200">{children}</dd>
    </div>
  );
}
