import { STATUS_META, type ItemStatus } from '../../lib/types';
import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  status: ItemStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold tracking-wide uppercase',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        className,
      )}
      style={{
        color: meta.color,
        borderColor: `${meta.color}45`,
        background: `${meta.color}14`,
        boxShadow: `0 0 18px -8px ${meta.glow}`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
      {size === 'sm' ? meta.short : meta.label}
    </span>
  );
}

const ORDER: ItemStatus[] = ['playing', 'completed', 'backlog', 'dropped'];

export function StatusSelect({
  value,
  onChange,
  className,
}: {
  value: ItemStatus;
  onChange: (next: ItemStatus) => void;
  className?: string;
}) {
  const active = ORDER.indexOf(value);
  return (
    <div
      className={cn(
        'relative flex h-8 items-center rounded-lg border border-white/10 bg-white/4 p-0.5',
        className,
      )}
    >
      <span
        className="absolute top-0.5 bottom-0.5 rounded-[6px] transition-all duration-300"
        style={{
          left: `calc(${(active / 4) * 100}% + 2px)`,
          width: `calc(25% - 4px)`,
          background: `linear-gradient(135deg, ${STATUS_META[value].color}, ${STATUS_META[value].color}88)`,
          boxShadow: `0 0 16px -6px ${STATUS_META[value].glow}`,
        }}
      />
      {ORDER.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          title={STATUS_META[status].label}
          className={cn(
            'relative z-10 h-7 flex-1 rounded-[6px] text-[10px] font-semibold tracking-wide uppercase transition',
            value === status ? 'text-void' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {STATUS_META[status].short.slice(0, 1)}
        </button>
      ))}
    </div>
  );
}
