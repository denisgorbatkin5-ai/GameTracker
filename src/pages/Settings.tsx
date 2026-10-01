import { motion } from 'framer-motion';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Layers,
  LogOut,
  Palette,
  Save,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GameArt } from '../components/games/GameArt';
import { PageHeader, PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Input';
import { Card, EmptyState, Skeleton } from '../components/ui/Primitives';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import * as api from '../lib/api';
import { cn, formatMonthYear, initials } from '../lib/utils';

const ACCENTS = [
  '#8b5cf6',
  '#22d3ee',
  '#a3e635',
  '#f472b6',
  '#fbbf24',
  '#fb7185',
  '#38bdf8',
  '#f97316',
];

const SHOWCASE_LIMIT = 6;

function ShowcaseEditor() {
  const { profile } = useAuth();
  const { push } = useToast();
  const { items } = useLibrary();
  const [picked, setPicked] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    void api
      .fetchShowcase(profile.username)
      .then((rows) => setPicked(rows.map((row) => row.game_id)))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [profile]);

  const toggle = (gameId: number) => {
    setPicked((prev) => {
      if (prev.includes(gameId)) return prev.filter((id) => id !== gameId);
      if (prev.length >= SHOWCASE_LIMIT) {
        push(`На витрине максимум ${SHOWCASE_LIMIT} игр`, 'info');
        return prev;
      }
      return [...prev, gameId];
    });
  };

  const move = (index: number, delta: number) => {
    setPicked((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await api.setShowcase(profile.id, picked);
      push('Витрина обновлена', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Не удалось сохранить витрину', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selected = picked
    .map((id) => items.find((item) => item.game_id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <Card>
      <h2 className="font-display mb-1 flex items-center gap-2 text-lg font-semibold text-white">
        <Sparkles className="size-4 text-amber-300" /> Витрина
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        До {SHOWCASE_LIMIT} игр из твоей коллекции — они висят на публичном профиле крупными
        карточками, как витрина в Steam.
      </p>

      {loading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Layers className="size-6" />}
          title="Сначала добавь игры"
          description="Витрина собирается только из игр, которые уже есть в коллекции."
          action={
            <Link to="/discover">
              <Button size="sm">Найти игру</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selected.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/6 p-2"
              >
                <GameArt
                  appid={item.game.steam_appid}
                  src={item.game.header_image}
                  alt={item.game.name}
                  className="h-11 w-20 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-100">
                    {item.game.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="rounded border border-white/10 px-1.5 text-[10px] text-slate-400 transition hover:text-white disabled:opacity-30"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === selected.length - 1}
                      className="rounded border border-white/10 px-1.5 text-[10px] text-slate-400 transition hover:text-white disabled:opacity-30"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(item.game_id)}
                      className="ml-auto rounded border border-rose-400/30 px-1.5 text-[10px] text-rose-300 transition hover:bg-rose-400/10"
                    >
                      убрать
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {picked.length < SHOWCASE_LIMIT ? (
            <div className="mt-4">
              <div className="mb-2 text-[11px] tracking-wide text-slate-500 uppercase">
                Добавить на витрину
              </div>
              <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto pr-1">
                {items
                  .filter((item) => !picked.includes(item.game_id))
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item.game_id)}
                      title={item.game.name}
                      className="h-12 w-24 overflow-hidden rounded-lg border border-white/10 transition hover:border-white/35"
                    >
                      <GameArt
                        appid={item.game.steam_appid}
                        src={item.game.header_image}
                        alt={item.game.name}
                        className="size-full"
                      />
                    </button>
                  ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-2 border-t border-white/8 pt-4">
            <Button
              size="sm"
              loading={saving}
              icon={<Save className="size-3.5" />}
              onClick={() => void save()}
            >
              Сохранить витрину
            </Button>
            <span className="text-[11px] text-slate-500">
              {picked.length} / {SHOWCASE_LIMIT}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

export function Settings() {
  const { profile, saveProfile, signOut, user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [accent, setAccent] = useState(profile?.accent ?? '#8b5cf6');
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [busy, setBusy] = useState(false);
  const [nickStatus, setNickStatus] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');

  const nextNick = username.trim();
  const ownNick = profile?.username.toLowerCase() ?? '';

  useEffect(() => {
    if (!nextNick || nextNick.toLowerCase() === ownNick) {
      setNickStatus('idle');
      return;
    }
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nextNick)) {
      setNickStatus('taken');
      return;
    }
    let active = true;
    setNickStatus('checking');
    const timer = window.setTimeout(() => {
      void api
        .usernameAvailable(nextNick)
        .then((free) => {
          if (active) setNickStatus(free ? 'free' : 'taken');
        })
        .catch(() => {
          if (active) setNickStatus('idle');
        });
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [nextNick, ownNick]);

  const save = async () => {
    if (nextNick.toLowerCase() !== ownNick && nickStatus !== 'free') {
      push('Сначала выбери свободный ник', 'error');
      return;
    }
    setBusy(true);
    try {
      await saveProfile({
        username: nextNick.replace(/[^A-Za-z0-9_]/g, '') || profile?.username || 'player',
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        accent,
        is_public: isPublic,
      });
      push('Профиль сохранён', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Не удалось сохранить', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        eyebrow="Аккаунт"
        title="Настройки профиля"
        description="Имя, описание, цвет акцента и видимость коллекции"
      />

      <div className="space-y-4">
        <div className="surface relative overflow-hidden rounded-3xl p-6">
          <div
            className="absolute inset-0 opacity-25"
            style={{ background: `radial-gradient(80% 120% at 10% 0%, ${accent}66, transparent)` }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-bold text-white shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${accent}, #22d3ee)` }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initials(displayName || profile?.username || 'GT')
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl font-semibold text-white">
                {displayName || profile?.username}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                @{profile?.username} · с {formatMonthYear(profile?.created_at ?? null)}
              </div>
              <Link
                to={`/u/${profile?.username}`}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-violet-300 transition hover:text-violet-200"
              >
                <Eye className="size-3.5" /> Открыть публичный профиль
              </Link>
            </div>
          </div>
        </div>

        <Card>
          <h2 className="font-display mb-4 text-lg font-semibold text-white">Основное</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Ник"
                hint={
                  nickStatus === 'checking' ? (
                    'проверяю…'
                  ) : nickStatus === 'free' ? (
                    <span className="text-lime-300">свободен</span>
                  ) : nickStatus === 'taken' ? (
                    <span className="text-rose-300">занят</span>
                  ) : (
                    'для ссылки /u/…'
                  )
                }
                error={nickStatus === 'taken' ? 'Этот ник уже занят' : null}
              >
                <Input
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value.replace(/[^A-Za-z0-9_]/g, ''))
                  }
                  icon={<User className="size-4" />}
                  maxLength={20}
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Отображаемое имя">
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Как тебя показывать"
                  maxLength={40}
                />
              </Field>
            </div>

            <Field label="О себе" hint={`${bio.length}/200`}>
              <Textarea
                rows={3}
                value={bio}
                onChange={(event) => setBio(event.target.value.slice(0, 200))}
                placeholder="Люблю инди, играю в соревновательные шутеры…"
              />
            </Field>

            <Field label="Аватар" hint="ссылка на изображение">
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://…"
              />
            </Field>

            <Field label="Цвет акцента">
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAccent(color)}
                    className={cn(
                      'size-9 rounded-xl border-2 transition hover:scale-110',
                      accent === color ? 'border-white' : 'border-transparent',
                    )}
                    style={{ background: color }}
                    aria-label={`Акцент ${color}`}
                  />
                ))}
              </div>
            </Field>

            <button
              type="button"
              onClick={() => setIsPublic((prev) => !prev)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition',
                isPublic
                  ? 'border-lime-400/35 bg-lime-400/8'
                  : 'border-white/10 bg-white/3 hover:border-white/20',
              )}
            >
              {isPublic ? (
                <Eye className="size-4 text-lime-300" />
              ) : (
                <EyeOff className="size-4 text-slate-400" />
              )}
              <span className="flex-1">
                <span className="block font-medium text-slate-100">
                  {isPublic ? 'Профиль публичный' : 'Профиль приватный'}
                </span>
                <span className="block text-xs text-slate-500">
                  {isPublic
                    ? 'Любой может открыть /u/' + profile?.username
                    : 'Только ты видишь коллекцию и тир-листы'}
                </span>
              </span>
              <span
                className={cn(
                  'flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition',
                  isPublic ? 'bg-lime-400/70' : 'bg-white/12',
                )}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className={cn(
                    'size-5 rounded-full bg-white shadow',
                    isPublic ? 'ml-auto' : 'ml-0.5',
                  )}
                />
              </span>
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/8 pt-5">
            <Button onClick={() => void save()} loading={busy} icon={<Save className="size-4" />}>
              Сохранить
            </Button>
            <Button
              variant="secondary"
              icon={<Copy className="size-4" />}
              onClick={async () => {
                await navigator.clipboard
                  .writeText(`${window.location.origin}/u/${profile?.username}`)
                  .then(() => push('Ссылка скопирована', 'success'))
                  .catch(() => push('Не удалось скопировать', 'error'));
              }}
            >
              Скопировать ссылку
            </Button>
          </div>
        </Card>

        <ShowcaseEditor />

        <Card>
          <h2 className="font-display mb-1 text-lg font-semibold text-white">Сессия</h2>
          <p className="mb-4 text-xs text-slate-500">
            {user?.email} · вход по паролю, восстановление через ссылку на почту
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={<Palette className="size-4" />}
              onClick={() => navigate('/collection')}
            >
              К коллекции
            </Button>
            <Button
              variant="danger"
              icon={<LogOut className="size-4" />}
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
            >
              Выйти
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-display mb-1 flex items-center gap-2 text-lg font-semibold text-white">
            <Trash2 className="size-4 text-rose-300" /> Опасная зона
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Удаление аккаунта стирает профиль, коллекцию, категории и тир-листы. Действие
            необратимо.
          </p>
          <Button
            variant="danger"
            icon={<Check className="size-4" />}
            onClick={() =>
              push(
                'Для удаления аккаунта напиши администратору — в Supabase это удаление записи в auth.users',
                'info',
              )
            }
          >
            Удалить аккаунт
          </Button>
        </Card>
      </div>
    </PageShell>
  );
}
