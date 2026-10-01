import { motion } from 'framer-motion';
import { Check, Loader2, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { searchSteam, type SteamSearchHit } from '../../lib/steam';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { GameArt } from './GameArt';

interface GameSearchProps {
  onPick: (hit: SteamSearchHit) => void | Promise<void>;
  excludeAppids?: number[];
  autoFocus?: boolean;
  placeholder?: string;
  inCollection?: (appid: number) => boolean;
}

export function GameSearch({
  onPick,
  excludeAppids = [],
  autoFocus,
  placeholder = 'Название игры...',
  inCollection,
}: GameSearchProps) {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<SteamSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyAppid, setBusyAppid] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { push } = useToast();

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      controller.current?.abort();
      const next = new AbortController();
      controller.current = next;
      setLoading(true);
      try {
        const results = await searchSteam(query, next.signal);
        setHits(results);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setHits([]);
          push('Steam не отвечает. Попробуй ещё раз', 'error');
        }
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [term, push]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const excluded = new Set(excludeAppids);
  const visible = hits.filter((hit) => !excluded.has(hit.appid));

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500" />
        <input
          value={term}
          autoFocus={autoFocus}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => visible.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="h-13 w-full rounded-2xl border border-white/10 bg-white/4 pr-12 pl-11 text-[15px] text-slate-100 transition placeholder:text-slate-600 hover:border-white/20 focus:border-violet-400/60"
          style={{ height: '3.25rem' }}
        />
        {loading ? (
          <Loader2 className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-violet-300" />
        ) : null}
      </div>

      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="glass scroll-thin absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl p-2 shadow-2xl"
        >
          {visible.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              {loading ? 'Ищем по Steam...' : 'Ничего не найдено'}
            </div>
          ) : (
            <ul className="space-y-1">
              {visible.map((hit) => {
                const already = inCollection?.(hit.appid) ?? false;
                return (
                  <li key={hit.appid}>
                    <button
                      type="button"
                      disabled={busyAppid !== null}
                      onClick={async () => {
                        setBusyAppid(hit.appid);
                        try {
                          await onPick(hit);
                          setTerm('');
                          setHits([]);
                          setOpen(false);
                        } finally {
                          setBusyAppid(null);
                        }
                      }}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-xl p-2 text-left transition',
                        'hover:bg-white/8 disabled:opacity-60',
                      )}
                    >
                      <GameArt
                        appid={hit.appid}
                        src={hit.logo ?? hit.icon}
                        alt={hit.name}
                        className="h-11 w-[88px] shrink-0"
                        rounded="rounded-lg"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-100">
                          {hit.name}
                        </span>
                        <span className="block font-mono text-[11px] text-slate-600">
                          appid {hit.appid}
                        </span>
                      </span>
                      {busyAppid === hit.appid ? (
                        <Loader2 className="size-4 animate-spin text-violet-300" />
                      ) : already ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
                          <Check className="size-3" /> В коллекции
                        </span>
                      ) : (
                        <span className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition group-hover:border-violet-400/50 group-hover:text-violet-200">
                          <Plus className="size-3.5" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}

export function SearchInlineButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" icon={<Search className="size-4" />} onClick={onClick}>
      Найти игру
    </Button>
  );
}
