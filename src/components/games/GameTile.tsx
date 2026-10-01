import { motion } from 'framer-motion';
import { Check, Plus, Star } from 'lucide-react';
import type { CuratedGame } from '../../data/curated';
import { cn, yearOf } from '../../lib/utils';
import { GameArt } from './GameArt';

interface GameTileProps {
  appid: number;
  name: string;
  tag?: string;
  header?: string | null;
  inCollection?: boolean;
  onClick: () => void;
  index?: number;
  compact?: boolean;
}

export function GameTile({
  appid,
  name,
  tag,
  header,
  inCollection,
  onClick,
  index = 0,
  compact,
}: GameTileProps) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.3), ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group surface relative w-full overflow-hidden rounded-2xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/40 hover:shadow-[0_18px_50px_-24px_rgba(139,92,246,0.8)]"
    >
      <GameArt
        appid={appid}
        src={header}
        alt={name}
        className={cn('w-full', compact ? 'h-[92px]' : 'h-[110px]')}
        rounded="rounded-none"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/50 to-transparent opacity-0 transition group-hover:opacity-100" />

      <span
        className={cn(
          'absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-xl border backdrop-blur-md transition',
          inCollection
            ? 'border-lime-400/40 bg-lime-400/15 text-lime-300'
            : 'border-white/15 bg-black/50 text-white opacity-0 group-hover:opacity-100',
        )}
      >
        {inCollection ? <Check className="size-4" /> : <Plus className="size-4" />}
      </span>

      <div className="space-y-1 p-3">
        <div className="truncate text-[13px] leading-tight font-semibold text-slate-100 group-hover:text-white">
          {name}
        </div>
        {tag ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="truncate">{tag}</span>
          </div>
        ) : null}
      </div>
    </motion.button>
  );
}

export function CuratedTile({
  game,
  inCollection,
  onClick,
  index,
}: {
  game: CuratedGame;
  inCollection?: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.025, 0.4), ease: [0.16, 1, 0.3, 1] }}
    >
      <GameTile
        appid={game.appid}
        name={game.name}
        tag={game.tag}
        inCollection={inCollection}
        onClick={onClick}
        index={0}
      />
    </motion.div>
  );
}

export function FavoriteRow({
  appid,
  name,
  onClick,
}: {
  appid: number;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-white/6"
    >
      <GameArt appid={appid} alt={name} className="h-12 w-20 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-200 group-hover:text-white">
          {name}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-amber-300/80">
          <Star className="size-3 fill-current" /> в избранном
        </span>
      </span>
    </button>
  );
}

export function ReleaseTag({ date }: { date: string | null }) {
  const year = yearOf(date);
  if (!year) return null;
  return (
    <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
      {year}
    </span>
  );
}
