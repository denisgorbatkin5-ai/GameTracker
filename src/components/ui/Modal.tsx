import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideClose?: boolean;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  hideClose,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-void/80 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'glass relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl',
              SIZES[size],
            )}
          >
            {title || description ? (
              <div className="flex items-start gap-4 border-b border-white/8 px-6 py-5">
                <div className="min-w-0 flex-1">
                  {title ? (
                    <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
                  ) : null}
                  {description ? (
                    <p className="mt-1 text-sm text-slate-400">{description}</p>
                  ) : null}
                </div>
                {!hideClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="-mt-1 -mr-1 rounded-lg p-2 text-slate-400 transition hover:bg-white/8 hover:text-white"
                    aria-label="Закрыть"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
