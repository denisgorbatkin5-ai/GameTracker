import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { createProfile, fetchProfile, updateProfile } from '../lib/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  saveProfile: (
    patch: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url' | 'accent' | 'is_public' | 'username'>>,
  ) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyError(error: AuthError): string {
  const message = error.message.toLowerCase();
  if (message.includes('invalid login credentials')) return 'Неверная почта или пароль';
  if (message.includes('email not confirmed')) return 'Почта не подтверждена';
  if (message.includes('user already registered')) return 'Аккаунт с такой почтой уже существует';
  if (message.includes('password should be at least')) return 'Пароль должен быть не короче 6 символов';
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Слишком много попыток. Подожди минуту и попробуй снова';
  }
  if (message.includes('unable to validate email')) return 'Некорректный адрес почты';
  return error.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = useCallback(async (userId: string, email?: string | null) => {
    const existing = await fetchProfile(userId).catch(() => null);
    if (existing) {
      setProfile(existing);
      return;
    }
    // The auth trigger can be delayed on the very first login, and RLS hides the row
    // until it exists - insert it ourselves instead of trying to UPDATE nothing.
    const created = await createProfile(
      userId,
      email ?? null,
      deriveUsername(userId),
    ).catch(() => null);
    setProfile(created);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let active = true;
    void loadProfile(user.id, user.email).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user, loadProfile]);

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (email, password, username) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username.trim().replace(/[^a-zA-Z0-9_]/g, '') || undefined },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) return { error: friendlyError(error) };

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        return { error: 'Аккаунт создан. Подтверди почту и войди' };
      }
      return { error: null };
    },
    [],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: friendlyError(error) } : { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const resetPassword = useCallback<AuthContextValue['resetPassword']>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return error ? { error: friendlyError(error) } : { error: null };
  }, []);

  const saveProfile = useCallback<AuthContextValue['saveProfile']>(
    async (patch) => {
      if (!user) throw new Error('Нужно войти в аккаунт');
      const updated = await updateProfile(user.id, patch);
      setProfile(updated);
    },
    [user],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [user, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      configured: isSupabaseConfigured,
      signUp,
      signIn,
      signOut,
      resetPassword,
      saveProfile,
      refreshProfile,
    }),
    [user, session, profile, loading, signUp, signIn, signOut, resetPassword, saveProfile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function deriveUsername(userId: string): string {
  return `player_${userId.slice(0, 8)}`;
}
