import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FieldProps {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      {label ? (
        <span className="flex items-center justify-between text-xs font-medium tracking-wide text-slate-400 uppercase">
          {label}
          {hint ? <span className="text-[11px] text-slate-500 normal-case">{hint}</span> : null}
        </span>
      ) : null}
      {children}
      {error ? <span className="block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  icon?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, icon, suffix, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500">
          {icon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border bg-white/4 px-3.5 text-sm text-slate-100 transition',
          'placeholder:text-slate-600 hover:border-white/15',
          icon ? 'pl-10' : '',
          suffix ? 'pr-11' : '',
          invalid
            ? 'border-rose-400/50 focus:border-rose-400'
            : 'border-white/10 focus:border-violet-400/60',
          className,
        )}
        {...rest}
      />
      {suffix ? (
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500">{suffix}</span>
      ) : null}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-xl border bg-white/4 px-3.5 py-3 text-sm text-slate-100 transition',
        'placeholder:text-slate-600 hover:border-white/15',
        invalid ? 'border-rose-400/50' : 'border-white/10 focus:border-violet-400/60',
        className,
      )}
      {...rest}
    />
  );
}
