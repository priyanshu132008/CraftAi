import React, { createContext, useContext, useState } from 'react';
import { INITIAL_PROJECTS, INITIAL_FILES, ProjectItem } from './defaultData';
import { generatePlanApi, PlanResponse } from '../services/api';

export type ScreenType =
  | 'landing'
  | 'features'
  | 'about'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'generate-plan'
  | 'plan-output'
  | 'workspace'
  | 'ai-assistant';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  changes?: string[];
}

interface AppContextType {
  currentScreen: ScreenType;
  setCurrentScreen: (screen: ScreenType) => void;
  isDeployModalOpen: boolean;
  setIsDeployModalOpen: (open: boolean) => void;
  user: { name: string; email: string; avatar: string } | null;
  setUser: (user: { name: string; email: string; avatar: string } | null) => void;
  logout: () => void;

  prompt: string;
  setPrompt: (prompt: string) => void;
  currentPlan: PlanResponse;
  setCurrentPlan: (plan: PlanResponse) => void;
  isGenerating: boolean;

  projects: ProjectItem[];
  currentProject: ProjectItem | null;
  setCurrentProject: (proj: ProjectItem) => void;

  files: Record<string, string>;
  activeFile: string;
  setActiveFile: (filename: string) => void;
  openTabs: string[];
  openTab: (filename: string) => void;
  closeTab: (filename: string) => void;
  updateFileContent: (filename: string, content: string) => void;

  chatMessages: ChatMessage[];
  sendChatMessage: (msg: string) => void;

  handleGeneratePlan: (promptText: string) => Promise<void>;
  applyAiModification: (request: string) => void;
}

const DEFAULT_PLAN: PlanResponse = {
  type: 'Portfolio Website',
  sections: ['Hero Section', 'About Section', 'Projects Section', 'Contact Section'],
  techStack: ['Next.js', 'TailwindCSS', 'React'],
  features: [
    'Responsive Design',
    'Smooth Animations',
    'Contact Form',
    'Dark/Light Mode',
    'Modern UI/UX'
  ]
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('landing');
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; avatar: string } | null>({
    name: 'Shreya Raut',
    email: 'shreya@example.com',
    avatar: 'SR'
  });

  const [prompt, setPrompt] = useState(
    'Build me a modern portfolio website for a frontend developer with smooth animations and a contact form'
  );
  const [currentPlan, setCurrentPlan] = useState<PlanResponse>(DEFAULT_PLAN);
  const [isGenerating, setIsGenerating] = useState(false);

  const [projects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [currentProject, setCurrentProject] = useState<ProjectItem | null>(null);

  const [files, setFiles] = useState<Record<string, string>>(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState<string>('page.tsx');
  const [openTabs, setOpenTabs] = useState<string[]>(['page.tsx', 'Hero.tsx']);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      text: 'Make the hero section more attractive with a gradient background and smooth animations.',
      timestamp: '10:42 AM'
    },
    {
      id: '2',
      sender: 'ai',
      text: "I've updated the hero section with a beautiful gradient background and smooth animations. Here's what I changed:",
      timestamp: '10:43 AM',
      changes: [
        'Added gradient background (Indigo to Purple)',
        'Enhanced text animations with subtle scale',
        'Improved button hover effects & glassmorphism',
        'Added floating cosmic elements'
      ]
    }
  ]);

  const logout = () => {
    setUser(null);
    setCurrentScreen('landing');
  };

  const openTab = (filename: string) => {
    if (!openTabs.includes(filename)) {
      setOpenTabs([...openTabs, filename]);
    }
    setActiveFile(filename);
  };

  const closeTab = (filename: string) => {
    const nextTabs = openTabs.filter(t => t !== filename);
    setOpenTabs(nextTabs);
    if (activeFile === filename && nextTabs.length > 0) {
      setActiveFile(nextTabs[nextTabs.length - 1]);
    }
  };

  const updateFileContent = (filename: string, content: string) => {
    setFiles(prev => ({ ...prev, [filename]: content }));
  };

  const handleGeneratePlan = async (promptText: string) => {
    setIsGenerating(true);
    try {
      const plan = await generatePlanApi(promptText);
      setCurrentPlan(plan);
      setCurrentScreen('plan-output');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyAiModification = (request: string) => {
    // If request mentions hero or gradient
    if (request.toLowerCase().includes('gradient') || request.toLowerCase().includes('hero')) {
      const updatedHero = files['Hero.tsx'].replace(
        'bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-950',
        'bg-gradient-to-r from-purple-900 via-pink-900 to-indigo-950'
      );
      updateFileContent('Hero.tsx', updatedHero);
    }

    const newAiMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      text: `Done! I updated the project code based on your request: "${request}". Live preview is updated!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      changes: [
        'Modified JSX structure in components',
        'Updated gradient color values',
        'Triggered live preview HMR re-render'
      ]
    };

    setChatMessages(prev => [...prev, newAiMsg]);
  };

  const sendChatMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      applyAiModification(text);
    }, 800);
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        isDeployModalOpen,
        setIsDeployModalOpen,
        user,
        setUser,
        logout,
        prompt,
        setPrompt,
        currentPlan,
        setCurrentPlan,
        isGenerating,
        projects,
        currentProject,
        setCurrentProject,
        files,
        activeFile,
        setActiveFile,
        openTabs,
        openTab,
        closeTab,
        updateFileContent,
        chatMessages,
        sendChatMessage,
        handleGeneratePlan,
        applyAiModification
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
