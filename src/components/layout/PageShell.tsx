import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 pt-8 pb-24 sm:px-6 ${className ?? ''}`}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-violet-300/80 uppercase">
            <span className="h-px w-6 bg-linear-to-r from-violet-400 to-transparent" />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-display text-3xl leading-tight font-bold text-white sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-[15px]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </motion.header>
  );
}
