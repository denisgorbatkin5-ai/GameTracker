import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { cn, steamHeader } from '../../lib/utils';
import { isRowContainer, rowKeyFromContainer } from './dragTypes';

export interface DraftItem {
  gameId: number;
  name: string;
  header: string | null;
  position: number;
}

export interface DraftRow {
  key: string;
  label: string;
  color: string;
  sortOrder: number;
  items: DraftItem[];
}

interface TierBoardProps {
  rows: DraftRow[];
  pool: DraftItem[];
  onChange: (rows: DraftRow[], pool: DraftItem[]) => void;
  onRemoveRow: (key: string) => void;
  renderRowHeader?: (row: DraftRow, index: number) => ReactNode;
}

const POOL_ID = 'row:pool';

export function TierBoard({
  rows,
  pool,
  onChange,
  onRemoveRow,
  renderRowHeader,
}: TierBoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findContainer = useCallback(
    (id: string): string | null => {
      if (isRowContainer(id)) return id;
      const numeric = Number(id.replace('item:', ''));
      for (const row of rows) {
        if (row.items.some((item) => item.gameId === numeric)) return `row:${row.key}`;
      }
      if (pool.some((item) => item.gameId === numeric)) return POOL_ID;
      return null;
    },
    [rows, pool],
  );

  const locate = useCallback(
    (container: string, gameId: number) => {
      if (container === POOL_ID) return pool.findIndex((item) => item.gameId === gameId);
      const row = rows.find((entry) => entry.key === rowKeyFromContainer(container));
      return row ? row.items.findIndex((item) => item.gameId === gameId) : -1;
    },
    [rows, pool],
  );

  const move = useCallback(
    (from: string, to: string, gameId: number, toIndex: number) => {
      const sourceItem =
        from === POOL_ID
          ? pool.find((item) => item.gameId === gameId)
          : rows
              .find((entry) => entry.key === rowKeyFromContainer(from))
              ?.items.find((item) => item.gameId === gameId);
      if (!sourceItem) return;

      const nextRows = rows.map((row) => ({
        ...row,
        items: row.items.filter((entry) => entry.gameId !== gameId),
      }));
      const nextPool = pool.filter((entry) => entry.gameId !== gameId);

      const insert = (list: DraftItem[]): DraftItem[] => {
        const clamped = Math.max(0, Math.min(toIndex, list.length));
        const copy = [...list];
        copy.splice(clamped, 0, sourceItem);
        return copy.map((entry, index) => ({ ...entry, position: index }));
      };

      if (to === POOL_ID) {
        onChange(nextRows, insert(nextPool));
        return;
      }

      onChange(
        nextRows.map((row) =>
          row.key === rowKeyFromContainer(to) ? { ...row, items: insert(row.items) } : row,
        ),
        nextPool,
      );
    },
    [rows, pool, onChange],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(String(event.active.id).replace('item:', '')));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const gameId = Number(String(active.id).replace('item:', ''));
    const from = findContainer(String(active.id));
    const to = findContainer(String(over.id));
    if (!from || !to || from === to) return;

    const overIndex =
      to === POOL_ID
        ? pool.length
        : (rows.find((row) => row.key === rowKeyFromContainer(to))?.items.length ?? 0);
    move(from, to, gameId, overIndex);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const gameId = Number(String(active.id).replace('item:', ''));
    const container = findContainer(String(over.id));
    if (!container) return;
    const currentIndex = locate(container, gameId);
    if (currentIndex === -1) return;

    const overId = String(over.id);
    if (overId.startsWith('item:')) {
      const overGameId = Number(overId.replace('item:', ''));
      if (overGameId === gameId) return;
      const overIndex = locate(container, overGameId);
      if (overIndex === -1) return;
      if (container === POOL_ID) {
        onChange(rows, arrayMove(pool, currentIndex, overIndex));
      } else {
        onChange(
          rows.map((row) =>
            row.key === rowKeyFromContainer(container)
              ? {
                  ...row,
                  items: arrayMove(row.items, currentIndex, overIndex).map((item, position) => ({
                    ...item,
                    position,
                  })),
                }
              : row,
          ),
          pool,
        );
      }
    }
  };

  const activeItem = useMemo(() => {
    if (activeId === null) return null;
    for (const row of rows) {
      const found = row.items.find((item) => item.gameId === activeId);
      if (found) return found;
    }
    return pool.find((item) => item.gameId === activeId) ?? null;
  }, [activeId, rows, pool]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-3">
        {rows.map((row, index) => (
          <TierRowView
            key={row.key}
            row={row}
            onRemove={() => onRemoveRow(row.key)}
            header={renderRowHeader?.(row, index)}
            onRemoveItem={(gameId) =>
              onChange(
                rows.map((entry) =>
                  entry.key === row.key
                    ? {
                        ...entry,
                        items: entry.items
                          .filter((item) => item.gameId !== gameId)
                          .map((item, position) => ({ ...item, position })),
                      }
                    : entry,
                ),
                pool,
              )
            }
          />
        ))}

        <PoolView pool={pool} onRemoveItem={(gameId) => onChange(rows, pool.filter((item) => item.gameId !== gameId))} />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-32 rotate-2 rounded-xl border border-violet-400/60 bg-void/95 p-1.5 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.9)]">
            <img
              src={activeItem.header ?? steamHeader(activeItem.gameId)}
              alt=""
              className="h-16 w-full rounded-lg object-cover"
            />
            <div className="truncate px-0.5 pt-1 text-[10px] font-semibold text-white">
              {activeItem.name}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function TierRowView({
  row,
  onRemove,
  onRemoveItem,
  header,
}: {
  row: DraftRow;
  onRemove: () => void;
  onRemoveItem: (gameId: number) => void;
  header?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `row:${row.key}` });
  const ids = row.items.map((item) => `item:${item.gameId}`);

  return (
    <div className="flex gap-3">
      <div className="flex w-24 shrink-0 flex-col items-center gap-1.5 sm:w-28">
        <div
          className="flex w-full flex-1 flex-col items-center justify-center rounded-xl border py-3 transition"
          style={{
            borderColor: `${row.color}55`,
            background: `linear-gradient(140deg, ${row.color}2e, ${row.color}08)`,
            boxShadow: isOver ? `0 0 30px -6px ${row.color}` : undefined,
          }}
        >
          <span
            className="font-display text-2xl leading-none font-bold sm:text-3xl"
            style={{ color: row.color }}
          >
            {row.label}
          </span>
        </div>
        {header}
        <button
          type="button"
          onClick={onRemove}
          className="text-[10px] text-slate-600 transition hover:text-rose-300"
        >
          удалить тир
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-24 flex-1 flex-wrap content-start items-start gap-2 rounded-xl border border-dashed p-2.5 transition',
          isOver ? 'border-violet-400/60 bg-violet-500/8' : 'border-white/10 bg-white/2',
        )}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          {row.items.map((item) => (
            <SortableGameCard
              key={item.gameId}
              item={item}
              accent={row.color}
              onRemove={() => onRemoveItem(item.gameId)}
            />
          ))}
        </SortableContext>
        {row.items.length === 0 ? (
          <div className="flex h-20 w-full items-center justify-center text-xs text-slate-600">
            Перетащи игру сюда
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PoolView({ pool, onRemoveItem }: { pool: DraftItem[]; onRemoveItem: (gameId: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });
  const ids = pool.map((item) => `item:${item.gameId}`);

  return (
    <div className="flex gap-3 pt-1">
      <div className="flex w-24 shrink-0 items-center justify-center sm:w-28">
        <span className="rounded-lg border border-white/10 bg-white/4 px-2 py-1.5 text-center text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          Без тира
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-20 flex-1 flex-wrap content-start items-start gap-2 rounded-xl border border-dashed p-2.5 transition',
          isOver ? 'border-cyan-400/60 bg-cyan-500/8' : 'border-white/8 bg-white/2',
        )}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          {pool.map((item) => (
            <SortableGameCard key={item.gameId} item={item} onRemove={() => onRemoveItem(item.gameId)} />
          ))}
        </SortableContext>
        {pool.length === 0 ? (
          <div className="flex h-16 w-full items-center justify-center text-xs text-slate-600">
            Здесь появятся игры из коллекции
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SortableGameCard({
  item,
  accent = '#8b5cf6',
  onRemove,
}: {
  item: DraftItem;
  accent?: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `item:${item.gameId}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderColor: `${accent}44`,
        opacity: isDragging ? 0.3 : 1,
      }}
      className="group relative w-28 cursor-grab overflow-hidden rounded-lg border bg-void/80 active:cursor-grabbing sm:w-32"
    >
      <img
        src={item.header ?? steamHeader(item.gameId)}
        alt={item.name}
        draggable={false}
        className="h-16 w-full object-cover"
      />
      <div className="flex items-center gap-1 px-1.5 py-1">
        <span className="cursor-grab touch-none" {...attributes} {...listeners}>
          <GripVertical className="size-3 shrink-0 text-slate-600" />
        </span>
        <span className="truncate text-[10px] font-semibold text-slate-300" title={item.name}>
          {item.name}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md bg-black/70 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-300"
        aria-label="Убрать"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
