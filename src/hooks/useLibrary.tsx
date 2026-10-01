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
import type { CollectionItem, Game, ItemStatus } from '../lib/types';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

interface LibraryContextValue {
  items: CollectionItem[];
  categories: Awaited<ReturnType<typeof api.fetchCategories>>;
  loading: boolean;
  ready: boolean;
  refresh: () => Promise<void>;
  addGame: (game: Game, patch?: Partial<CollectionItem>) => Promise<void>;
  updateItem: (id: number, patch: Partial<CollectionItem>) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  bulkStatus: (ids: number[], status: ItemStatus) => Promise<void>;
  createCategory: (name: string, color: string) => Promise<void>;
  updateCategory: (id: number, patch: { name?: string; color?: string }) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  toggleItemCategory: (itemId: number, categoryId: number, active: boolean) => Promise<void>;
  hasGame: (gameId: number) => CollectionItem | undefined;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Moving an item to/from "completed" keeps finished_at in sync unless set explicitly. */
function withFinishedAt(
  current: CollectionItem | undefined,
  patch: Partial<CollectionItem>,
): Partial<CollectionItem> {
  if (!patch.status || !current) return patch;
  if ('finished_at' in patch) return patch;
  if (patch.status === 'completed') {
    return { ...patch, finished_at: current.finished_at ?? today() };
  }
  return { ...patch, finished_at: null };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { push } = useToast();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof api.fetchCategories>>>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const userId = user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setCategories([]);
      setReady(true);
      return;
    }
    setLoading(true);
    try {
      const [nextItems, nextCategories] = await Promise.all([
        api.fetchCollection(userId),
        api.fetchCategories(userId),
      ]);
      setItems(nextItems);
      setCategories(nextCategories);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Не удалось загрузить данные', 'error');
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [userId, push]);

  useEffect(() => {
    if (!profile) return;
    void refresh();
  }, [profile, refresh]);

  const addGame = useCallback<LibraryContextValue['addGame']>(
    async (game, patch = {}) => {
      if (!userId) throw new Error('Нужно войти в аккаунт');
      const created = await api.addToCollection(userId, game, patch);
      setItems((prev) => {
        const index = prev.findIndex((item) => item.id === created.id);
        if (index === -1) return [created, ...prev];
        const next = [...prev];
        next[index] = { ...next[index], ...created, category_ids: next[index].category_ids };
        return next;
      });
    },
    [userId],
  );

  const updateItem = useCallback<LibraryContextValue['updateItem']>(async (id, patch) => {
    const merged = withFinishedAt(items.find((item) => item.id === id), patch);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...merged } : item)));
    try {
      const updated = await api.updateCollectionItem(id, merged);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated, category_ids: item.category_ids } : item)));
    } catch (error) {
      await refresh();
      throw error;
    }
  }, [items, refresh]);

  const removeItem = useCallback<LibraryContextValue['removeItem']>(async (id) => {
    const previous = items;
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await api.removeCollectionItem(id);
    } catch (error) {
      setItems(previous);
      throw error;
    }
  }, [items]);

  const bulkStatus = useCallback<LibraryContextValue['bulkStatus']>(async (ids, status) => {
    const finishedAt = status === 'completed' ? today() : null;
    setItems((prev) =>
      prev.map((item) =>
        ids.includes(item.id) ? { ...item, status, finished_at: finishedAt } : item,
      ),
    );
    try {
      await api.bulkSetStatus(ids, status, finishedAt);
    } catch (error) {
      await refresh();
      throw error;
    }
  }, [refresh]);

  const createCategory = useCallback<LibraryContextValue['createCategory']>(
    async (name, color) => {
      if (!userId) throw new Error('Нужно войти в аккаунт');
      const created = await api.createCategory(userId, name, color);
      setCategories((prev) => [...prev, { ...created, item_count: 0 }]);
    },
    [userId],
  );

  const updateCategory = useCallback<LibraryContextValue['updateCategory']>(
    async (id, patch) => {
      setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)));
      try {
        const updated = await api.updateCategory(id, patch);
        setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, ...updated } : cat)));
      } catch (error) {
        await refresh();
        throw error;
      }
    },
    [refresh],
  );

  const deleteCategory = useCallback<LibraryContextValue['deleteCategory']>(async (id) => {
    const previous = categories;
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        category_ids: item.category_ids.filter((cid) => cid !== id),
      })),
    );
    try {
      await api.deleteCategory(id);
    } catch (error) {
      setCategories(previous);
      throw error;
    }
  }, [categories]);

  const toggleItemCategory = useCallback<LibraryContextValue['toggleItemCategory']>(
    async (itemId, categoryId, active) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const has = item.category_ids.includes(categoryId);
          if (active === has) return item;
          return {
            ...item,
            category_ids: active
              ? [...item.category_ids, categoryId]
              : item.category_ids.filter((cid) => cid !== categoryId),
          };
        }),
      );
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? { ...cat, item_count: Math.max(0, (cat.item_count ?? 0) + (active ? 1 : -1)) }
            : cat,
        ),
      );
      try {
        const item = items.find((entry) => entry.id === itemId);
        const nextIds = new Set(item?.category_ids ?? []);
        if (active) nextIds.add(categoryId);
        else nextIds.delete(categoryId);
        await api.setItemCategories(itemId, [...nextIds]);
      } catch (error) {
        await refresh();
        throw error;
      }
    },
    [items, refresh],
  );

  const hasGame = useCallback(
    (gameId: number) => items.find((item) => item.game_id === gameId),
    [items],
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      items,
      categories,
      loading,
      ready,
      refresh,
      addGame,
      updateItem,
      removeItem,
      bulkStatus,
      createCategory,
      updateCategory,
      deleteCategory,
      toggleItemCategory,
      hasGame,
    }),
    [
      items,
      categories,
      loading,
      ready,
      refresh,
      addGame,
      updateItem,
      removeItem,
      bulkStatus,
      createCategory,
      updateCategory,
      deleteCategory,
      toggleItemCategory,
      hasGame,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
