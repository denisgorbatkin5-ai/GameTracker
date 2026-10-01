import { motion } from 'framer-motion';
import { Library, Menu, Plus, Trophy, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFriends } from '../../hooks/useFriends';
import { useLibrary } from '../../hooks/useLibrary';
import { cn, initials } from '../../lib/utils';
import { Button } from '../ui/Button';

const LINKS = [
  { to: '/dashboard', label: 'Дашборд', icon: Library },
  { to: '/discover', label: 'Поиск', icon: Plus },
  { to: '/collection', label: 'Коллекция', icon: Library },
  { to: '/tier-lists', label: 'Тир-листы', icon: Trophy },
  { to: '/friends', label: 'Друзья', icon: Users },
];

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { items } = useLibrary();
  const { incoming } = useFriends();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled ? 'glass border-b border-white/8 shadow-lg shadow-black/40' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl border border-white/12 bg-linear-to-br from-violet-600/80 to-cyan-500/70">
            <span className="absolute inset-0 opacity-40 transition group-hover:opacity-70" style={{ background: 'radial-gradient(circle at 30% 20%, #fff, transparent 60%)' }} />
            <Trophy className="relative size-4.5 text-white" />
          </span>
          <span className="font-display text-[15px] font-bold tracking-tight text-white">
            Game<span className="text-cyan-300">Tracker</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'relative rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg border border-white/10 bg-white/8"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <span className="relative">{link.label}</span>
                  {link.to === '/friends' && incoming.length > 0 ? (
                    <span className="relative ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                      {incoming.length}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/discover"
                className="hidden lg:inline-flex"
              >
                <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />}>
                  Добавить игру
                </Button>
              </Link>
              <Link
                to="/friends"
                className="relative hidden size-9 items-center justify-center rounded-xl border border-white/10 bg-white/4 text-slate-300 transition hover:border-white/20 hover:text-white xl:inline-flex"
                title="Друзья"
              >
                <Users className="size-4" />
                {incoming.length > 0 ? (
                  <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                    {incoming.length}
                  </span>
                ) : null}
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/4 py-1.5 pr-3 pl-1.5 transition hover:border-white/20 hover:bg-white/8"
              >
                <span
                  className="flex size-7 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${profile?.accent ?? '#8b5cf6'}, #22d3ee)`,
                  }}
                >
                  {initials(profile?.display_name ?? profile?.username ?? 'GT')}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-28 truncate text-xs font-semibold text-slate-100">
                    {profile?.display_name ?? profile?.username}
                  </span>
                  <span className="block text-[10px] text-slate-500 tabular-nums">
                    {items.length} игр
                  </span>
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                title="Выйти"
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
              >
                <X className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Войти
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Регистрация
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Меню"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <motion.nav
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden border-t border-white/8 bg-void/95 backdrop-blur-xl md:hidden"
        >
          <div className="space-y-1 px-4 py-3">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                    isActive ? 'bg-white/8 text-white' : 'text-slate-400 hover:bg-white/5',
                  )
                }
              >
                <link.icon className="size-4" />
                {link.label}
                {link.to === '/friends' && incoming.length > 0 ? (
                  <span className="ml-auto rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                    {incoming.length}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </motion.nav>
      ) : null}
    </header>
  );
}
