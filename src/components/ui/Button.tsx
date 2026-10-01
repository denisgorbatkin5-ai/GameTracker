import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'text-white bg-linear-to-r from-violet-600 via-violet-500 to-cyan-500 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.9)] hover:brightness-110',
  secondary:
    'text-slate-100 bg-white/6 border border-white/10 hover:bg-white/10 hover:border-white/20',
  outline:
    'text-slate-200 border border-edge bg-transparent hover:border-violet-400/60 hover:text-white',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/6',
  danger: 'text-rose-200 bg-rose-500/12 border border-rose-400/30 hover:bg-rose-500/20',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
  icon: 'size-9 rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 480, damping: 28 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex select-none items-center justify-center font-medium transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </motion.button>
  );
}
