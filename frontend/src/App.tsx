import React from 'react';
import { Loader2 } from 'lucide-react';
import { useApp } from './context/AppContext';
import { LandingPage } from './components/LandingPage';
import { FeaturesPage } from './components/FeaturesPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { Dashboard } from './components/Dashboard';
import { GenerateStudio } from './components/GenerateStudio';
import { PreviewHost } from './components/PreviewHost';
import { PublishedSite } from './components/PublishedSite';

export const MainApp: React.FC = () => {
  const { currentScreen, setCurrentScreen, authReady } = useApp();

  // Auth screens hold a loader until the Supabase session bootstrap finishes
  // (getSession awaits the client's init, which parses the OAuth URL hash) so
  // an OAuth return never renders these as signed-out mid-initialization.
  if (!authReady && ['dashboard', 'search', 'connectors', 'projects', 'settings'].includes(currentScreen)) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-indigo)' }} />
      </div>
    );
  }

  // OAuth callback landings (both are full page loads — map the path onto
  // the screen state once, on mount):
  //   /connectors?success=…  <- connector OAuth, redirect from the backend
  //   /dashboard             <- Supabase auth (Google/GitHub/email)
  // ConnectorsView consumes its query params itself.
  React.useEffect(() => {
    const p = window.location.pathname.replace(/\/+$/, '');
    if (p.endsWith('/connectors')) {
      setCurrentScreen('connectors');
    } else if (p.endsWith('/dashboard')) {
      setCurrentScreen('dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The backend-written generated app is served by this same Vite server
  // at http://localhost:3000/preview (SPA fallback loads this route).
  const path =
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/+$/, '')
      : '';
  const isPreviewPath = path.endsWith('/preview');
  const isPublishedPath = /^\/published\/[^/]+\/?$/.test(path);

  if (isPreviewPath) {
    return <PreviewHost />;
  }
  if (isPublishedPath) {
    return <PublishedSite />;
  }

  return (
    <>
      {/* Screen Router */}
      {currentScreen === 'landing' && <LandingPage />}
      {currentScreen === 'features' && <FeaturesPage />}
      {currentScreen === 'login' && <LoginPage />}
      {currentScreen === 'signup' && <SignupPage />}
      {currentScreen === 'dashboard' && <Dashboard initialView="home" />}
      {currentScreen === 'search' && <Dashboard initialView="search" />}
      {currentScreen === 'connectors' && <Dashboard initialView="connectors" />}
      {currentScreen === 'projects' && <Dashboard initialView="projects" />}
      {currentScreen === 'settings' && <Dashboard initialView="settings" />}
      {currentScreen === 'generate-plan' && <GenerateStudio />}
      {currentScreen === 'workspace' && <GenerateStudio />}
    </>
  );
};