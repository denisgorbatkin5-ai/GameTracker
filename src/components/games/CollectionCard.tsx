import { motion } from 'framer-motion';
import { Clock, MoreHorizontal, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../hooks/useToast';
import type { CollectionItem } from '../../lib/types';
import { cn, formatHours, yearOf } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TagPicker } from '../ui/TagPicker';
import { GameArt } from './GameArt';
import { StatusBadge, StatusSelect } from './StatusBadge';

interface CollectionCardProps {
  item: CollectionItem;
  index?: number;
}

export function CollectionCard({ item, index = 0 }: CollectionCardProps) {
  const { updateItem, removeItem, categories, toggleItemCategory } = useLibrary();
  const { push } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const game = item.game;
  const itemCategories = categories.filter((category) => item.category_ids.includes(category.id));

  const changeStatus = async (status: CollectionItem['status']) => {
    try {
      await updateItem(item.id, {
        status,
        finished_at: status === 'completed' ? new Date().toISOString().slice(0, 10) : null,
      });
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка', 'error');
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeItem(item.id);
      push(`«${game.name}» удалена из коллекции`, 'info');
      setConfirmOpen(false);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.article
        layout
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.32, delay: Math.min(index * 0.015, 0.25), ease: [0.16, 1, 0.3, 1] }}
        className="surface group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:border-violet-400/35 hover:shadow-[0_20px_60px_-30px_rgba(139,92,246,0.85)]"
      >
        <div className="relative">
          <GameArt
            appid={game.steam_appid}
            src={game.header_image}
            alt={game.name}
            className="h-32 w-full"
            rounded="rounded-none"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#0c0c18] via-[#0c0c18]/30 to-transparent" />

          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {item.is_favorite ? <Star className="size-4 fill-amber-300 text-amber-300" /> : null}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex size-7 items-center justify-center rounded-lg border border-white/15 bg-black/55 text-slate-300 opacity-0 backdrop-blur-md transition group-hover:opacity-100 hover:text-white"
                aria-label="Меню"
              >
                <MoreHorizontal className="size-4" />
              </button>
              {menuOpen ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="glass absolute right-0 z-20 w-44 overflow-hidden rounded-xl py-1 shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void updateItem(item.id, { is_favorite: !item.is_favorite });
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/8"
                  >
                    <Star className="size-3.5" />
                    {item.is_favorite ? 'Убрать из избранного' : 'В избранное'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-rose-200 transition hover:bg-rose-500/15"
                  >
                    <Trash2 className="size-3.5" />
                    Удалить
                  </button>
                </motion.div>
              ) : null}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="truncate text-sm leading-tight font-semibold text-white">{game.name}</h3>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
              {yearOf(game.release_date) ? <span>{yearOf(game.release_date)}</span> : null}
              {item.hours_played ? (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatHours(item.hours_played)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 border-t border-white/6 p-3">
          <div className="flex items-center gap-2">
            <StatusSelect value={item.status} onChange={(next) => void changeStatus(next)} className="flex-1" />
            {item.rating !== null ? (
              <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 font-mono text-xs font-bold text-amber-300">
                {item.rating}
              </span>
            ) : null}
          </div>

          {itemCategories.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {itemCategories.slice(0, 3).map((category) => (
                <span
                  key={category.id}
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: `${category.color}1f`, color: category.color }}
                >
                  {category.name}
                </span>
              ))}
              {itemCategories.length > 3 ? (
                <span className="text-[10px] text-slate-500">+{itemCategories.length - 3}</span>
              ) : null}
            </div>
          ) : null}

          {item.notes ? (
            <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">{item.notes}</p>
          ) : null}

          <div className="mt-auto flex items-center gap-2 pt-1">
            <TagPicker
              options={categories.map((category) => ({
                id: category.id,
                name: category.name,
                color: category.color,
              }))}
              selected={item.category_ids}
              onToggle={(categoryId) =>
                void toggleItemCategory(
                  item.id,
                  categoryId,
                  !item.category_ids.includes(categoryId),
                )
              }
            />
            <span className="ml-auto">
              <StatusBadge status={item.status} />
            </span>
          </div>
        </div>
      </motion.article>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Удалить из коллекции?"
        size="sm"
      >
        <p className="text-sm text-slate-400">
          «{game.name}» будет удалена из твоей коллекции вместе с заметками и категориями. Действие
          нельзя отменить.
        </p>
        <div className="mt-6 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmOpen(false)}>
            Отмена
          </Button>
          <Button
            variant="danger"
            className={cn('flex-1')}
            loading={busy}
            onClick={() => void remove()}
          >
            Удалить
          </Button>
        </div>
      </Modal>
    </>
  );
}
