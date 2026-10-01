import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Background } from './components/layout/Background';
import { Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { FriendsProvider } from './hooks/useFriends';
import { LibraryProvider } from './hooks/useLibrary';
import { ToastProvider } from './hooks/useToast';
import { Landing } from './pages/Landing';
import { LoginPage, RegisterPage } from './pages/Auth';
import { Collection } from './pages/Collection';
import { Dashboard } from './pages/Dashboard';
import { Discover } from './pages/Discover';
import { Friends } from './pages/Friends';
import { NotFound } from './pages/NotFound';
import { PublicProfile, PublicTierList } from './pages/Public';
import { Settings } from './pages/Settings';
import { TierListEditor } from './pages/TierListEditor';
import { TierLists } from './pages/TierLists';

function FullScreenLoader() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-6 animate-spin text-violet-300" />
        <span className="text-xs tracking-wide text-slate-500 uppercase">Загрузка</span>
      </div>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (!configured) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h2 className="font-display text-2xl font-bold text-white">Supabase не настроен</h2>
        <p className="mt-2 text-sm text-slate-400">
          Добавь <code className="text-cyan-300">VITE_SUPABASE_URL</code> и{' '}
          <code className="text-cyan-300">VITE_SUPABASE_ANON_KEY</code> в файл{' '}
          <code className="text-cyan-300">.env</code> и перезапусти dev-сервер.
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <Suspense fallback={<FullScreenLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route
              path="/login"
              element={
                <GuestOnly>
                  <LoginPage />
                </GuestOnly>
              }
            />
            <Route
              path="/register"
              element={
                <GuestOnly>
                  <RegisterPage />
                </GuestOnly>
              }
            />
            <Route path="/discover" element={<Discover />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route path="/t/:id" element={<PublicTierList />} />

            <Route
              path="/dashboard"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path="/collection"
              element={
                <Protected>
                  <Collection />
                </Protected>
              }
            />
            <Route
              path="/friends"
              element={
                <Protected>
                  <Friends />
                </Protected>
              }
            />
            <Route
              path="/tier-lists"
              element={
                <Protected>
                  <TierLists />
                </Protected>
              }
            />
            <Route
              path="/tier-lists/:id/edit"
              element={
                <Protected>
                  <TierListEditor />
                </Protected>
              }
            />
            <Route
              path="/settings"
              element={
                <Protected>
                  <Settings />
                </Protected>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LibraryProvider>
          <FriendsProvider>
            <Background />
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <AppRoutes />
              </main>
              <Footer />
            </div>
          </FriendsProvider>
        </LibraryProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
