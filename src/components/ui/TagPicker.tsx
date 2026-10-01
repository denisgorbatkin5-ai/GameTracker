import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface TagPickerProps {
  options: { id: number; name: string; color: string }[];
  selected: number[];
  onToggle: (id: number) => void;
  placeholder?: string;
  max?: number;
}

export function TagPicker({
  options,
  selected,
  onToggle,
  placeholder = 'Добавить категорию',
  max,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = options.filter((option) =>
    option.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const full = max !== undefined && selected.length >= max;

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {options
          .filter((option) => selected.includes(option.id))
          .map((option) => (
            <motion.button
              key={option.id}
              layout
              type="button"
              onClick={() => onToggle(option.id)}
              className="group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
              style={{
                borderColor: `${option.color}55`,
                background: `${option.color}18`,
                color: option.color,
              }}
            >
              {option.name}
              <X className="size-3 opacity-50 transition group-hover:opacity-100" />
            </motion.button>
          ))}
        {!full ? (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-violet-400/50 hover:text-violet-200"
          >
            <Plus className="size-3" />
            {selected.length === 0 ? placeholder : ''}
          </button>
        ) : null}
      </div>

      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="glass absolute top-full left-0 z-30 mt-2 w-64 overflow-hidden rounded-xl shadow-2xl"
        >
          {options.length > 5 ? (
            <div className="border-b border-white/8 p-2">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Фильтр..."
                className="h-8 w-full rounded-lg border border-white/10 bg-white/4 px-2.5 text-xs placeholder:text-slate-600 focus:border-violet-400/50"
              />
            </div>
          ) : null}
          <div className="scroll-thin max-h-56 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
                Нет подходящих категорий
              </div>
            ) : (
              filtered.map((option) => {
                const active = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onToggle(option.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition',
                      active ? 'bg-white/8 text-white' : 'text-slate-300 hover:bg-white/5',
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: option.color }}
                    />
                    <span className="flex-1 truncate">{option.name}</span>
                    {active ? <span className="text-[10px] text-slate-500">в коллекции</span> : null}
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
