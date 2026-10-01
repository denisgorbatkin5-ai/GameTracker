import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('surface rounded-2xl', className)}>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/4 text-violet-300">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="surface relative overflow-hidden rounded-2xl p-5">
      {accent ? (
        <div
          className="absolute -top-10 -right-8 size-24 rounded-full opacity-25 blur-2xl"
          style={{ background: accent }}
        />
      ) : null}
      <div className="relative">
        <div className="text-[11px] font-medium tracking-[0.14em] text-slate-500 uppercase">
          {label}
        </div>
        <div className="mt-2 font-display text-3xl font-bold text-white tabular-nums">{value}</div>
        {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
}
