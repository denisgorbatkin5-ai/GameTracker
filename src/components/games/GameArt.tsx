import { useEffect, useState } from 'react';
import { cn, steamHeader } from '../../lib/utils';

interface GameArtProps {
  appid: number;
  src?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}

function Placeholder({ alt, className, rounded }: { alt: string; className?: string; rounded: string }) {
  return (
    <div
      className={cn(
        'grid size-full place-items-center bg-gradient-to-br from-violet-600/25 via-slate-900 to-cyan-500/20',
        rounded,
        className,
      )}
    >
      <span className="font-display text-2xl font-bold text-white/30 select-none">
        {alt.trim().charAt(0).toUpperCase() || '?'}
      </span>
    </div>
  );
}

export function GameArt({ appid, src, alt, className, rounded = 'rounded-lg' }: GameArtProps) {
  const candidates = [src, steamHeader(appid)].filter(
    (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index,
  );
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [candidates.join('|')]);

  const source = candidates[index];
  const exhausted = index >= candidates.length;

  if (exhausted) {
    return <Placeholder alt={alt} className={className} rounded={rounded} />;
  }

  return (
    <div className={cn('relative overflow-hidden bg-void', rounded, className)}>
      {!loaded ? <div className="absolute inset-0 skeleton" /> : null}
      <img
        src={source}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setIndex((current) => current + 1);
        }}
        className={cn(
          'size-full object-cover transition-all duration-500',
          loaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0',
        )}
      />
    </div>
  );
}
