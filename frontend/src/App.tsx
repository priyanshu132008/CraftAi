import React from 'react';
import { useApp } from './context/AppContext';
import { LandingPage } from './components/LandingPage';
import { FeaturesPage } from './components/FeaturesPage';
import { AboutPage } from './components/AboutPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { Dashboard } from './components/Dashboard';
import { PlanWizard } from './components/PlanWizard';
import { WorkspaceIDE } from './components/WorkspaceIDE';
import { AiAssistant } from './components/AiAssistant';
import { DeployModal } from './components/DeployModal';

export const MainApp: React.FC = () => {
  const { currentScreen } = useApp();

  return (
    <>
      {/* Screen Router */}
      {currentScreen === 'landing' && <LandingPage />}
      {currentScreen === 'features' && <FeaturesPage />}
      {currentScreen === 'about' && <AboutPage />}
      {currentScreen === 'login' && <LoginPage />}
      {currentScreen === 'signup' && <SignupPage />}
      {currentScreen === 'dashboard' && <Dashboard />}
      {currentScreen === 'generate-plan' && <PlanWizard step="generate-plan" />}
      {currentScreen === 'plan-output' && <PlanWizard step="plan-output" />}
      {currentScreen === 'workspace' && <WorkspaceIDE />}
      {currentScreen === 'ai-assistant' && <AiAssistant />}

      {/* Screen 9: Deploy Modal */}
      <DeployModal />
    </>
  );
};

