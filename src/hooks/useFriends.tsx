import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as api from '../lib/api';
import type { AddFriendResult, Friendship, Profile } from '../lib/types';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

interface FriendsContextValue {
  loading: boolean;
  ready: boolean;
  /** Accepted friends, newest first. */
  friends: Friendship[];
  /** Requests waiting for me to accept them. */
  incoming: Friendship[];
  /** Requests I sent that are still pending. */
  outgoing: Friendship[];
  refresh: () => Promise<void>;
  addByNickname: (nickname: string) => Promise<AddFriendResult>;
  respond: (id: number, accept: boolean) => Promise<void>;
  /** Friendship state between me and another profile, if any. */
  relationWith: (profileId: string) => Friendship | undefined;
  findProfiles: (term: string) => Promise<Profile[]>;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const userId = user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setReady(true);
      return;
    }
    setLoading(true);
    try {
      const edges = await api.fetchFriendships(userId);
      // Pull the profiles in one go; RLS already filters out people we cannot see.
      const ids = [...new Set(edges.map((edge) => (edge.user_id === userId ? edge.friend_id : edge.user_id)))];
      const profiles = await Promise.all(ids.map((id) => api.fetchPublicProfileById(id)));
      const byId = new Map(
        profiles.filter((value): value is Profile => value !== null).map((value) => [value.id, value]),
      );

      setRows(
        edges.map((edge) => ({
          ...edge,
          profile: byId.get(edge.user_id === userId ? edge.friend_id : edge.user_id),
          direction:
            edge.status === 'accepted'
              ? 'friend'
              : edge.user_id === userId
                ? 'outgoing'
                : 'incoming',
        })),
      );
    } catch (error) {
      push(error instanceof Error ? error.message : 'Не удалось загрузить друзей', 'error');
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [userId, push]);

  useEffect(() => {
    if (!profile) return;
    void refresh();
  }, [profile, refresh]);

  const addByNickname = useCallback<FriendsContextValue['addByNickname']>(
    async (nickname) => {
      const result = await api.addFriend(nickname.trim());
      if (result === 'not_found') push(`Ник @${nickname.trim()} не найден`, 'error');
      else if (result === 'self') push('Нельзя добавить самого себя', 'error');
      else if (result === 'pending') push(`Заявка @${nickname.trim()} отправлена`, 'success');
      else if (result === 'friends') push(`Вы теперь друзья с @${nickname.trim()}`, 'success');
      await refresh();
      return result;
    },
    [push, refresh],
  );

  const respond = useCallback<FriendsContextValue['respond']>(
    async (id, accept) => {
      await api.respondFriend(id, accept);
      push(accept ? 'Друг добавлен' : 'Заявка отклонена', accept ? 'success' : 'info');
      await refresh();
    },
    [push, refresh],
  );

  const relationWith = useCallback(
    (profileId: string) =>
      userId ? rows.find((row) => row.user_id === profileId || row.friend_id === profileId) : undefined,
    [rows, userId],
  );

  const findProfiles = useCallback(
    (term: string) => api.searchProfiles(term.trim()),
    [],
  );

  const value = useMemo<FriendsContextValue>(() => {
    const friends = rows
      .filter((row) => row.status === 'accepted')
      .sort((a, b) => (a.accepted_at ?? a.created_at).localeCompare(b.accepted_at ?? b.created_at))
      .reverse();
    return {
      loading,
      ready,
      friends,
      incoming: rows.filter((row) => row.status === 'pending' && row.direction === 'incoming'),
      outgoing: rows.filter((row) => row.status === 'pending' && row.direction === 'outgoing'),
      refresh,
      addByNickname,
      respond,
      relationWith,
      findProfiles,
    };
  }, [rows, loading, ready, refresh, addByNickname, respond, relationWith, findProfiles]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used inside FriendsProvider');
  return ctx;
}
