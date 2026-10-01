import { AnimatePresence, motion } from 'framer-motion';
import {
  Copy,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Plus,
  Trophy,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, PageShell } from '../components/layout/PageShell';
import { TierListPreview } from '../components/tierlist/TierListView';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState, Skeleton } from '../components/ui/Primitives';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import * as api from '../lib/api';
import type { TierList } from '../lib/types';
import { formatMonthYear, relativeTime } from '../lib/utils';

export function TierLists() {
  const { profile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [lists, setLists] = useState<TierList[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const result = await api.fetchTierLists(profile.id);
      const withRows = await Promise.all(result.map((list) => api.fetchTierList(list.id)));
      setLists(withRows.filter((list): list is TierList => list !== null));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка загрузки', 'error');
    } finally {
      setLoading(false);
    }
  }, [profile, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!name.trim() || !profile) return;
    setBusy(true);
    try {
      const id = await api.createTierList(
        profile.id,
        name.trim(),
        description.trim(),
        isPublic,
      );
      push('Тир-лист создан', 'success');
      setCreateOpen(false);
      setName('');
      setDescription('');
      navigate(`/tier-lists/${id}/edit`);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number, title: string) => {
    try {
      await api.deleteTierList(id);
      setLists((prev) => prev.filter((list) => list.id !== id));
      push(`«${title}» удалён`, 'info');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка', 'error');
    }
  };

  const toggleVisibility = async (list: TierList) => {
    try {
      await api.updateTierList(list.id, { is_public: !list.is_public });
      setLists((prev) =>
        prev.map((entry) => (entry.id === list.id ? { ...entry, is_public: !entry.is_public } : entry)),
      );
    } catch (error) {
      push(error instanceof Error ? error.message : 'Ошибка', 'error');
    }
  };

  const copyLink = async (id: number) => {
    const url = `${window.location.origin}/t/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      push('Ссылка скопирована', 'success');
    } catch {
      push(url, 'info');
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Tier-листы"
        title="Твои тир-листы"
        description="Расставляй игры по тирам drag & drop и делись результатом по ссылке."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
            Новый тир-лист
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-6" />}
          title="Тир-листов пока нет"
          description="Создай первый тир-лист, добавь игры из коллекции и распредели их по тирам S–C."
          action={
            <Button onClick={() => setCreateOpen(true)} icon={<Plus className="size-4" />}>
              Создать тир-лист
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {lists.map((list, index) => {
              const count = (list.rows ?? []).reduce((sum, row) => sum + row.items.length, 0);
              return (
                <motion.article
                  key={list.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25) }}
                  className="surface group flex flex-col rounded-2xl p-5 transition hover:border-violet-400/35"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/tier-lists/${list.id}/edit`}
                        className="font-display block truncate text-base font-semibold text-white transition hover:text-violet-200"
                      >
                        {list.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        {list.is_public ? (
                          <span className="inline-flex items-center gap-1 text-lime-300/80">
                            <Globe className="size-3" /> публичный
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="size-3" /> приватный
                          </span>
                        )}
                        <span>·</span>
                        <span>{count} {count === 1 ? 'игра' : 'игр'}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => void copyLink(list.id)}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:text-cyan-300"
                        title="Скопировать ссылку"
                      >
                        <Copy className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleVisibility(list)}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:text-amber-300"
                        title={list.is_public ? 'Сделать приватным' : 'Сделать публичным'}
                      >
                        {list.is_public ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(list.id, list.name)}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:text-rose-300"
                        title="Удалить"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {list.description ? (
                    <p className="mb-3 line-clamp-2 text-xs text-slate-500">{list.description}</p>
                  ) : null}

                  <div className="mb-4">
                    <TierListPreview rows={list.rows ?? []} />
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-white/8 pt-3">
                    <span className="text-[11px] text-slate-500">
                      обновлён {relativeTime(list.updated_at)}
                    </span>
                    <Link to={`/tier-lists/${list.id}/edit`}>
                      <Button size="sm" variant="secondary">
                        Редактировать
                      </Button>
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новый тир-лист"
        description="Создадим четыре тира S–C — их можно будет переименовать и добавить свои"
        size="sm"
      >
        <div className="space-y-4">
          <Field label="Название">
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Лучшие игры 2026"
              maxLength={60}
            />
          </Field>
          <Field label="Описание" hint="необязательно">
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Что ранжируем и почему"
              maxLength={280}
            />
          </Field>
          <button
            type="button"
            onClick={() => setIsPublic((prev) => !prev)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition ${
              isPublic
                ? 'border-lime-400/35 bg-lime-400/8 text-lime-100'
                : 'border-white/10 bg-white/3 text-slate-400'
            }`}
          >
            {isPublic ? <Globe className="size-4" /> : <Lock className="size-4" />}
            <span className="flex-1">
              <span className="block font-medium">
                {isPublic ? 'Публичный тир-лист' : 'Приватный тир-лист'}
              </span>
              <span className="block text-xs opacity-70">
                {isPublic ? 'Доступен всем по ссылке' : 'Виден только тебе'}
              </span>
            </span>
          </button>
          <Button
            className="w-full"
            size="lg"
            loading={busy}
            onClick={() => void create()}
            disabled={!name.trim()}
          >
            Создать и открыть редактор
          </Button>
        </div>
      </Modal>

      {lists.length > 0 ? (
        <p className="mt-8 text-center text-xs text-slate-600">
          Первый тир-лист создан {formatMonthYear(lists[lists.length - 1].created_at)}
        </p>
      ) : null}
    </PageShell>
  );
}
