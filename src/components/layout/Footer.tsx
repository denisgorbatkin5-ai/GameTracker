import { Github, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-white/6 bg-void/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-7 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-slate-300">
            Game<span className="text-cyan-400">Tracker</span>
          </span>
          <span className="text-slate-700">·</span>
          <span>Трекер игровой коллекции</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/discover" className="transition hover:text-slate-300">
            Каталог
          </Link>
          <a
            href="https://store.steampowered.com"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-slate-300"
          >
            Steam
          </a>
          <span className="inline-flex items-center gap-1">
            Сделано с <Heart className="size-3 text-rose-400" fill="currentColor" /> и данными Steam
          </span>
          <a
            href="https://github.com/denisgorbatkin5-ai/GameTracker"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition hover:text-slate-300"
          >
            <Github className="size-3.5" /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
