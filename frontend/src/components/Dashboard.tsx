import React, { useEffect, useState } from 'react';
import { useApp, ScreenType } from '../context/AppContext';
import { Sidebar } from './Sidebar';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronRight, Moon, Sun, Terminal } from 'lucide-react';
import { DashboardHero } from './DashboardHero';
import { ConnectorsView } from './ConnectorsView';
import { ProjectsGrid } from './ProjectsGrid';
import { SettingsView } from './SettingsView';
import { useTheme } from '../context/ThemeProvider';

export type DashboardView = 'home' | 'search' | 'connectors' | 'projects' | 'settings';

interface DashboardProps {
  initialView?: DashboardView;
}

/** 1:1 port of `main components/Workspace/code.html` dashboard shell.
 *  - Fixed left sidebar (w-64), fixed top header with breadcrumbs + bell + theme + Admin profile
 *  - Active pill nav inside sidebar; views swap via AnimatePresence
 *  - State preserved: recents, openProject, user (sidebar), setCurrentScreen
 */
export const Dashboard: React.FC<DashboardProps> = ({ initialView = 'home' }) => {
  const { user } = useApp();
  const { theme, toggleTheme } = useTheme();

  const [view, setView] = useState<DashboardView>(initialView);
  const [searchQuery] = useState('');

  useEffect(() => setView(initialView), [initialView]);

  const reduceMotion = useReducedMotion();
  const pageVariants = reduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } },
        exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeOut' as const } }
      };

  const VIEW_LABELS: Record<DashboardView, string> = {
    home: 'Dashboard',
    search: 'Search',
    connectors: 'Connectors Hub',
    projects: 'Projects Manager',
    settings: 'Settings'
  };

  const activeScreen: ScreenType =
    view === 'home' ? 'dashboard'
    : view === 'search' ? 'search'
    : view === 'connectors' ? 'connectors'
    : view === 'projects' ? 'projects'
    : 'settings';

  // The hero is the Stitch design's home view.
  const renderHome = () => <DashboardHero />;

  const renderSearch = () => (
    <div className="main-content">
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.2rem',
          letterSpacing: '-0.03em',
          color: 'var(--text-heading)',
          marginBottom: '0.4rem'
        }}
      >
        Search
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Find your projects and recent generations.
      </p>
      <div className="search-box" style={{ width: '100%', maxWidth: 520 }}>
        <input
          type="text"
          placeholder="Search projects…"
          value={searchQuery}
          readOnly
          style={{ fontSize: '0.95rem' }}
        />
      </div>
    </div>
  );

  const renderProjects = () => <ProjectsGrid />;

  const renderSettings = () => <SettingsView />;

  // Full-width like code.html — `.main-content`'s 1280px cap breaks the
  // 12-col hub layout, so ConnectorsView renders unwrapped.
  const renderConnectors = () => <ConnectorsView />;

  // Top breadcrumb pieces derived from the active user (real Supabase).
  const breadcrumbOrg = user?.name ?? '';
  const breadcrumbEnv = 'PRODUCTION';
  const adminRole = user?.name ?? '';
  const adminInitials = (user?.name ?? '')
    .split(/\s+/)
    .map(p => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const adminRegion = 'US-EAST-1';

  return (
    <div className="flex h-screen bg-[#F5F5F7] overflow-hidden text-[#1D1D1F] dark:bg-black dark:text-white">
      {/* Persistent executive sidebar (fixed) */}
      <Sidebar activeScreen={activeScreen} />

      {/* Main viewport pl-64 to clear the sidebar */}
      <div className="pl-64 flex flex-col min-h-screen w-full bg-[#F5F5F7] relative dark:bg-black">
        {/* Top executive header (fixed, full width minus sidebar) */}
        <header
          className="fixed top-0 right-0 h-16 bg-white/90 backdrop-blur-xl z-40 flex items-center justify-between px-8 border-b border-[#d2d2d7] dark:bg-black/90 dark:border-[#27272a]"
          style={{ left: 256 }}
        >
          {/* Breadcrumb cluster */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-zinc-100 border border-[#d2d2d7] flex items-center justify-center dark:bg-black dark:border-[#27272a]">
                <Terminal size={15} className="text-[#1D1D1F] dark:text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm text-[#1D1D1F] font-bold tracking-tight dark:text-white">
                  CraftAI
                </span>
                <span className="text-zinc-400 font-mono text-xs dark:text-zinc-600">/</span>
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-300">{breadcrumbOrg}</span>
                <span className="text-zinc-400 font-mono text-xs dark:text-zinc-600">/</span>
                <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded border border-[#d2d2d7] uppercase font-medium dark:bg-zinc-900 dark:text-zinc-400 dark:border-[#27272a]">
                  {breadcrumbEnv}
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1 text-zinc-500 font-mono text-[10px]">
              <ChevronRight size={12} />
              <span>{VIEW_LABELS[view]}</span>
            </div>
          </div>

          {/* Right actions: theme toggle + admin profile */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-1.5 rounded-lg border border-[#d2d2d7] text-zinc-500 hover:text-[#1D1D1F] hover:bg-zinc-100 transition-colors dark:border-[#27272a] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900"
              onClick={toggleTheme}
              title="Theme Mode"
              aria-label="Theme Mode"
            >
              {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#d2d2d7] dark:border-[#27272a]">
              <div className="text-right hidden sm:flex flex-col">
                <span className="text-xs text-[#1D1D1F] font-medium dark:text-white">{adminRole}</span>
                <span className="text-[10px] font-mono text-zinc-500">{adminRegion}</span>
              </div>
              <div className="w-8 h-8 rounded-full border border-[#d2d2d7] bg-zinc-100 flex items-center justify-center text-xs font-mono font-medium text-[#1D1D1F] shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
                {adminInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Content wrapper — pt-16 clears the fixed header */}
        <main className="w-full pt-16 flex-1 flex flex-col bg-[#F5F5F7] overflow-y-auto dark:bg-black">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{ flex: 1, minHeight: 0, display: 'flex' }}
            >
              {view === 'home' && renderHome()}
              {view === 'search' && renderSearch()}
              {view === 'connectors' && renderConnectors()}
              {view === 'projects' && renderProjects()}
              {view === 'settings' && renderSettings()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};