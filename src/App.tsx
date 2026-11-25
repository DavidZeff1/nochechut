import { lazy, Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AdminOnly } from './auth/AccessRequest';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { NoAccess, SignIn } from './auth/SignIn';
import type { Backend } from './data/backend';
import { DataProvider, useData } from './data/DataContext';
import { createFirebaseBackend } from './data/firebaseBackend';
import { createMemoryBackend } from './data/memoryBackend';
import { legacyHashToPath } from './lib/legacy';
import { Header } from './ui/Header';
import { ToastProvider } from './ui/Toast';
import { Home } from './views/Home';
import { SessionView } from './views/Session';

// Admin screens are split out so instructors' phones load less.
const Overview = lazy(() => import('./views/admin/Overview'));
const CourseRegister = lazy(() => import('./views/admin/CourseRegister'));
const Students = lazy(() => import('./views/admin/Students'));
const StudentPage = lazy(() => import('./views/admin/StudentPage'));
const Settings = lazy(() => import('./views/admin/Settings'));
const Guide = lazy(() => import('./views/Guide'));

function makeBackend(): Backend {
  return import.meta.env.VITE_BACKEND === 'memory' ? createMemoryBackend() : createFirebaseBackend();
}

function LegacyRedirect() {
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    const to = loc.hash ? legacyHashToPath(loc.hash) : null;
    if (to) nav(to, { replace: true });
  }, [loc.hash, nav]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return null;
}

function Main() {
  const { loaded, error, backend } = useData();
  const auth = useAuth();
  const isAdmin = auth.status === 'ready' && auth.profile.role === 'admin';
  return (
    <main>
      {error && <div className="banner err">{error}</div>}
      {!loaded && !error ? (
        <div className="empty">טוען נתונים…</div>
      ) : (
        <Suspense fallback={<div className="empty">טוען…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/course/:cid/:ymd?" element={<SessionView />} />
            {isAdmin && (
              <>
                <Route path="/admin" element={<Overview />} />
                <Route path="/admin/course/:cid" element={<CourseRegister />} />
                <Route path="/admin/session/:cid/:ymd" element={<SessionView admin />} />
                <Route path="/admin/students" element={<Students />} />
                <Route path="/admin/student/:sid" element={<StudentPage />} />
                <Route path="/admin/settings" element={<Settings />} />
              </>
            )}
            {!isAdmin && auth.status === 'ready' && (
              <Route path="/admin/*" element={<AdminOnly backend={backend} user={auth.user} />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      )}
    </main>
  );
}

function Gate({ backend }: { backend: Backend }) {
  const auth = useAuth();
  const loc = useLocation();
  // The guide is open to everyone, signed in or not.
  if (loc.pathname === '/guide')
    return (
      <Suspense fallback={<div className="empty">טוען…</div>}>
        <Guide />
      </Suspense>
    );
  if (auth.status === 'loading') return <div className="empty">טוען…</div>;
  if (auth.status === 'signedOut') return <SignIn backend={backend} />;
  if (auth.status === 'noAccess') return <NoAccess backend={backend} user={auth.user} />;
  return (
    <DataProvider backend={backend}>
      <Header />
      <Main />
    </DataProvider>
  );
}

export default function App() {
  const backend = useMemo(makeBackend, []);
  return (
    <BrowserRouter>
      <LegacyRedirect />
      <ToastProvider>
        <AuthProvider backend={backend}>
          <Gate backend={backend} />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
