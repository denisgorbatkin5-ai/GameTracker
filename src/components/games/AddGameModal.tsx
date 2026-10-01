import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Check, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../hooks/useToast';
import { ensureGames, findGameByAppid } from '../../lib/api';
import { fetchGame } from '../../lib/steam';
import { STATUS_META, STATUS_ORDER, type Game, type ItemStatus } from '../../lib/types';
import { cn, formatHours, yearOf } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { GameArt } from './GameArt';

interface AddGameModalProps {
  open: boolean;
  onClose: () => void;
  appid: number | null;
  fallbackName?: string;
  onAdded?: (game: Game) => void;
}

export function AddGameModal({
  open,
  onClose,
  appid,
  fallbackName,
  onAdded,
}: AddGameModalProps) {
  const { addGame, hasGame } = useLibrary();
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<ItemStatus>('backlog');
  const [rating, setRating] = useState<number | null>(null);
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);

  const load = useCallback(async () => {
    if (!appid) {
      setGame(null);
      return;
    }
    setLoading(true);
    try {
      const existing = await findGameByAppid(appid).catch(() => null);
      if (existing) {
        setGame(existing);
        return;
      }
      const details = await fetchGame(appid);
      if (!details) {
        push('Не удалось получить данные об игре', 'error');
        return;
      }
      const [synced] = await ensureGames([details]);
      if (synced) setGame(synced);
      else if (fallbackName) setGame({ ...(synced as Game), name: fallbackName });
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка загрузки', 'error');
    } finally {
      setLoading(false);
    }
  }, [appid, fallbackName, push]);

  useEffect(() => {
    if (!open) return;
    setStatus('backlog');
    setRating(null);
    setHours('');
    setNotes('');
    setFavorite(false);
    void load();
  }, [open, load]);

  const existing = game ? hasGame(game.id) : undefined;

  const save = async () => {
    if (!game) return;
    setSaving(true);
    try {
      await addGame(game, {
        status,
        rating,
        hours_played: hours ? Number(hours) : null,
        notes: notes.trim() || null,
        is_favorite: favorite,
      });
      push(
        existing ? 'Запись обновлена' : `«${game.name}» добавлена в коллекцию`,
        'success',
      );
      onAdded?.(game);
      onClose();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Не удалось сохранить', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={game ? game.name : 'Добавление игры'}
      description={game?.short_description ?? 'Загружаем данные из Steam…'}
      size="md"
    >
      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-32 w-full rounded-xl" />
          <div className="skeleton h-9 w-full rounded-xl" />
        </div>
      ) : !game ? (
        <p className="py-6 text-center text-sm text-slate-500">Игра не найдена в Steam</p>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-4">
            <GameArt appid={game.steam_appid} src={game.header_image} alt={game.name} className="h-24 w-[184px] shrink-0" />
            <dl className="min-w-0 flex-1 space-y-2 text-xs">
              <Row label="Релиз" value={yearOf(game.release_date)?.toString() ?? '—'} icon={<Calendar className="size-3" />} />
              <Row label="Жанры" value={game.genres.slice(0, 3).join(', ') || '—'} />
              <Row label="Разработчик" value={game.developers[0] ?? '—'} />
              <Row label="Metacritic" value={game.metacritic ? String(game.metacritic) : '—'} />
            </dl>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">Статус</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_ORDER.map((value) => {
                const meta = STATUS_META[value];
                const active = status === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition',
                      active ? 'text-white' : 'border-white/10 bg-white/3 text-slate-400 hover:text-slate-200',
                    )}
                    style={
                      active
                        ? {
                            borderColor: `${meta.color}66`,
                            background: `${meta.color}1f`,
                            boxShadow: `0 0 22px -10px ${meta.glow}`,
                          }
                        : undefined
                    }
                  >
                    <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Оценка" hint="0–10">
              <div className="flex items-center gap-1">
                {Array.from({ length: 11 }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setRating(rating === index ? null : index)}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md text-[11px] font-bold transition',
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
            <Field label="Часы" hint={formatHours(hours ? Number(hours) : null)}>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                placeholder="Например, 42.5"
                suffix={<span className="text-xs">ч</span>}
              />
            </Field>
          </div>

          <Field label="Заметки" hint="необязательно">
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Впечатления, что понравилось, что нет…"
            />
          </Field>

          <button
            type="button"
            onClick={() => setFavorite((prev) => !prev)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition',
              favorite
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                : 'border-white/10 bg-white/3 text-slate-400 hover:text-slate-200',
            )}
          >
            <Star className={cn('size-4', favorite && 'fill-current')} />
            Добавить в избранное
            <AnimatePresence>
              {favorite ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="ml-auto"
                >
                  <Check className="size-4" />
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>

          <div className="flex items-center gap-2 border-t border-white/8 pt-5">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button onClick={save} loading={saving} className="flex-1">
              {existing ? 'Обновить запись' : 'Добавить в коллекцию'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-slate-500">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1 truncate text-slate-300">
        {icon}
        {value}
      </dd>
    </div>
  );
}
