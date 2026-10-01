import { motion } from 'framer-motion';
import { Gamepad2, Lock, Mail, Trophy, User } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import * as api from '../lib/api';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block"
        >
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl border border-white/12 bg-linear-to-br from-violet-600/80 to-cyan-500/70">
              <Trophy className="size-5 text-white" />
            </span>
            <span className="font-display text-lg font-bold text-white">
              Game<span className="text-cyan-300">Tracker</span>
            </span>
          </Link>
          <h2 className="font-display text-4xl leading-tight font-bold text-balance">
            <span className="text-gradient">Твоя библиотека</span>
            <br />
            в идеальном порядке
          </h2>
          <p className="mt-4 max-w-md text-slate-400">
            Коллекция, статусы, категории и тир-листы — всё синхронизируется между устройствами
            через Supabase.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-400">
            {[
              'Тысячи игр из каталога Steam с обложками и метаданными',
              'Свои категории: «Купить», «Инди», «На питче»',
              'Tier-листы с drag & drop и публичной ссылкой',
              'Статистика: часы, жанры, любимые игры',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Gamepad2 className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                {line}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="glass mx-auto w-full max-w-md rounded-3xl p-7 sm:p-8"
        >
          <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 border-t border-white/8 pt-5 text-center text-sm text-slate-400">
            {footer}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate('/dashboard');
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError('Укажи почту, чтобы сбросить пароль');
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = await resetPassword(email.trim());
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice('Письмо для восстановления отправлено — проверь почту');
  };

  return (
    <AuthShell
      title="С возвращением"
      subtitle="Войди, чтобы продолжить собирать коллекцию"
      footer={
        <>
          Ещё нет аккаунта?{' '}
          <Link to="/register" className="font-medium text-violet-300 transition hover:text-violet-200">
            Зарегистрируйся
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Почта">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            icon={<Mail className="size-4" />}
          />
        </Field>
        <Field
          label="Пароль"
          hint={
            <button type="button" onClick={forgot} className="text-violet-300 transition hover:text-violet-200">
              Забыл?
            </button>
          }
        >
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            icon={<Lock className="size-4" />}
          />
        </Field>

        {error ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-lime-400/30 bg-lime-500/10 px-3.5 py-2.5 text-xs text-lime-200">
            {notice}
          </div>
        ) : null}

        <Button type="submit" size="lg" loading={busy} className="w-full">
          Войти
        </Button>
      </form>
    </AuthShell>
  );
}

type NicknameState = 'idle' | 'checking' | 'free' | 'taken' | 'invalid';

const NICKNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

const NICK_ERRORS: Record<'taken' | 'invalid', string> = {
  taken: 'Ник уже занят — попробуй другой',
  invalid: '3–20 символов: латиница, цифры, подчёркивание',
};

function NicknameHint({ state }: { state: NicknameState }) {
  if (state === 'checking' || state === 'idle') {
    return <span className="text-slate-500">Проверяю…</span>;
  }
  if (state === 'free') return <span className="text-lime-300">Ник свободен</span>;
  return <span>{NICK_ERRORS[state]}</span>;
}

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nick, setNick] = useState<NicknameState>('idle');

  const trimmed = username.trim();

  useEffect(() => {
    if (!trimmed) {
      setNick('idle');
      return;
    }
    if (!NICKNAME_PATTERN.test(trimmed)) {
      setNick('invalid');
      return;
    }
    let active = true;
    setNick('checking');
    const timer = window.setTimeout(() => {
      void api
        .usernameAvailable(trimmed)
        .then((free) => {
          if (active) setNick(free ? 'free' : 'taken');
        })
        .catch(() => {
          if (active) setNick('idle');
        });
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (nick !== 'free') {
      setError('Сначала укажи свободный ник');
      return;
    }
    setError(null);
    setBusy(true);
    const result = await signUp(email.trim(), password, trimmed);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <AuthShell
      title="Создать аккаунт"
      subtitle="Бесплатно и навсегда — данные в твоей базе"
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-violet-300 transition hover:text-violet-200">
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Ник"
          hint={
            trimmed ? (
              <NicknameHint state={nick} />
            ) : (
              'обязательно, для ссылки /u/…'
            )
          }
          error={nick === 'taken' || nick === 'invalid' ? NICK_ERRORS[nick] : null}
        >
          <Input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value.replace(/[^A-Za-z0-9_]/g, ''))}
            placeholder="pixel_slayer"
            icon={<User className="size-4" />}
            maxLength={20}
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Почта">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            icon={<Mail className="size-4" />}
          />
        </Field>
        <Field label="Пароль" hint="минимум 6 символов">
          <Input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            icon={<Lock className="size-4" />}
          />
        </Field>

        {error ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        <Button type="submit" size="lg" loading={busy} disabled={nick !== 'free'} className="w-full">
          Создать аккаунт
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-slate-500">
          Регистрируясь, ты соглашаешься с тем, что твоя коллекция может быть публичной — её можно
          скрыть в настройках профиля.
        </p>
      </form>
    </AuthShell>
  );
}
