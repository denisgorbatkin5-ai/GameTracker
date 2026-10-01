import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn, steamHeader } from '../../lib/utils';
import type { TierRow } from '../../lib/types';
import { GameArt } from '../games/GameArt';

interface TierListViewProps {
  rows: TierRow[];
}

export function TierListView({ rows }: TierListViewProps) {
  return (
    <div className="space-y-3">
      {rows.map((row, rowIndex) => (
        <motion.div
          key={row.id ?? row.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: rowIndex * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-3"
        >
          <div className="flex w-20 shrink-0 items-center justify-center sm:w-24">
            <div
              className="flex w-full flex-col items-center justify-center rounded-xl border py-4"
              style={{
                borderColor: `${row.color}55`,
                background: `linear-gradient(140deg, ${row.color}30, ${row.color}08)`,
              }}
            >
              <span className="font-display text-2xl font-bold sm:text-3xl" style={{ color: row.color }}>
                {row.label}
              </span>
              <span className="mt-0.5 font-mono text-[10px] text-slate-400">{row.items.length}</span>
            </div>
          </div>

          <div
            className={cn(
              'flex min-h-24 flex-1 flex-wrap content-start items-start gap-2 rounded-xl border border-white/8 p-2.5',
              row.items.length === 0 && 'border-dashed',
            )}
          >
            {row.items.map((item, index) => (
              <motion.div
                key={item.id ?? item.game_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: rowIndex * 0.05 + index * 0.02 }}
                className="group w-28 sm:w-32"
              >
                <div className="overflow-hidden rounded-lg border border-white/10 transition group-hover:border-violet-400/50">
                  <GameArt
                    appid={item.game.steam_appid}
                    src={item.game.header_image}
                    alt={item.game.name}
                    className="h-16 w-full"
                    rounded="rounded-none"
                  />
                  <div className="truncate bg-void/60 px-1.5 py-1 text-[10px] font-semibold text-slate-300 group-hover:text-white">
                    {item.game.name}
                  </div>
                </div>
              </motion.div>
            ))}
            {row.items.length === 0 ? (
              <div className="flex h-20 w-full items-center justify-center text-xs text-slate-600">
                Пусто
              </div>
            ) : null}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function TierListPreview({ rows }: { rows: TierRow[] }) {
  const images = rows
    .flatMap((row) => row.items.slice(0, 6))
    .slice(0, 12)
    .map((item) => item.game.steam_appid);

  if (images.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-600">
        Пока пусто
      </div>
    );
  }

  return (
    <div className="grid grid-cols-6 gap-1">
      {images.map((appid) => (
        <GameArt
          key={appid}
          appid={appid}
          src={steamHeader(appid)}
          alt=""
          className="aspect-[616/353] w-full"
          rounded="rounded-md"
        />
      ))}
    </div>
  );
}

export function OwnerBadge({ username }: { username: string }) {
  return (
    <Link
      to={`/u/${username}`}
      className="text-xs text-slate-500 transition hover:text-violet-300"
    >
      @{username}
    </Link>
  );
}
