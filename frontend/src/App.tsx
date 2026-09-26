import React from 'react';
import { useApp } from './context/AppContext';
import { LandingPage } from './components/LandingPage';
import { FeaturesPage } from './components/FeaturesPage';
import { AboutPage } from './components/AboutPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { Dashboard } from './components/Dashboard';
import { GenerateStudio } from './components/GenerateStudio';
import { AiAssistant } from './components/AiAssistant';
import { DeployModal } from './components/DeployModal';
import { PreviewHost } from './components/PreviewHost';
import { PublishedSite } from './components/PublishedSite';

export const MainApp: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useApp();

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
      {currentScreen === 'about' && <AboutPage />}
      {currentScreen === 'login' && <LoginPage />}
      {currentScreen === 'signup' && <SignupPage />}
      {currentScreen === 'dashboard' && <Dashboard initialView="home" />}
      {currentScreen === 'search' && <Dashboard initialView="search" />}
      {currentScreen === 'connectors' && <Dashboard initialView="connectors" />}
      {currentScreen === 'projects' && <Dashboard initialView="projects" />}
      {currentScreen === 'generate-plan' && <GenerateStudio />}
      {currentScreen === 'workspace' && <GenerateStudio />}
      {currentScreen === 'ai-assistant' && <AiAssistant />}

      {/* Screen 9: Deploy Modal */}
      <DeployModal />
    </>
  );
};