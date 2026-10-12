import React, { useEffect, useRef, useState } from 'react';
import { useApp, ScreenType } from '../context/AppContext';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ChevronsLeft,
  ChevronsUpDown,
  Clock,
  FolderGit2,
  LayoutDashboard,
  Plug,
  Terminal,
  Trash2,
  SlidersHorizontal,
  LogOut
} from 'lucide-react';
import { ProjectListItem } from '../services/api';
import { timeAgo } from '../utils/timeAgo';
import { CONNECTOR_LIST } from '../lib/connectorCatalog';

interface SidebarProps {
  activeScreen: ScreenType;
}

const COLLAPSE_KEY = 'craftai_sidebar_collapsed';

/** 1:1 port of `main components/Workspace/code.html` sidebar.
 *  - Brand + EXEC header
 *  - Workspace switcher card (label + Acme Corp / Production + unfold_more)
 *  - 5 nav items, white-pill on active
 *  - Operational + SOC2 TYPE II status pill
 *  - Pinned profile row (Dev Engine / core@acme.ai) at the bottom
 *
 *  State hooks preserved: setCurrentScreen, recents, openProject,
 *  deleteProject, currentProject, user, logout.
 */
export const Sidebar: React.FC<SidebarProps> = ({ activeScreen }) => {
  const { setCurrentScreen, user, recents, openProject, deleteProject, currentProject, logout } = useApp();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const reduceMotion = useReducedMotion();

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch { /* private mode — session-only collapse */ }
      return next;
    });
  };

  // Workspace switcher derives the active workspace label from the user
  // (real Supabase email → tenant) until a workspaces table is wired.
  const workspaceLabel = user ? `${user.name} / Production` : 'Workspace';

  const navItems: {
    screen: ScreenType;
    icon: React.ReactNode;
    label: string;
    count?: number;
  }[] = [
    { screen: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { screen: 'connectors', icon: <Plug size={16} />, label: 'Connectors Hub', count: CONNECTOR_LIST.length },
    { screen: 'projects', icon: <FolderGit2 size={16} />, label: 'Projects Manager' },
    { screen: 'settings', icon: <SlidersHorizontal size={16} />, label: 'Settings' }
  ];

  const sidebarStyle: React.CSSProperties = {
    width: collapsed ? 68 : 256,
    transition: reduceMotion ? undefined : 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  };

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 bg-white z-50 flex flex-col justify-between border-r border-[#d2d2d7] dark:bg-[#09090b] dark:border-[#27272a]"
      style={sidebarStyle}
    >
      {/* Top: brand + workspace + nav */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div
          className="h-16 px-4 flex items-center justify-between border-b border-[#d2d2d7] dark:border-[#27272a]"
          style={collapsed ? { paddingLeft: 16, paddingRight: 16, justifyContent: 'center' } : undefined}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-zinc-100 border border-[#d2d2d7] flex items-center justify-center dark:bg-black dark:border-[#27272a]">
                <Terminal size={15} className="text-[#1D1D1F] dark:text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base text-[#1D1D1F] dark:text-white font-bold tracking-tight">CraftAI</span>
                <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded border border-[#d2d2d7] tracking-widest uppercase font-medium dark:bg-zinc-900 dark:text-zinc-300 dark:border-[#27272a]">
                  EXEC
                </span>
              </div>
            </div>
          )}
          <button
            type="button"
            className="text-zinc-500 hover:text-[#1D1D1F] p-1 rounded hover:bg-zinc-100 transition-colors dark:hover:text-white dark:hover:bg-zinc-900"
            onClick={toggleCollapsed}
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <motion.span
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex' }}
            >
              <ChevronsLeft size={15} />
            </motion.span>
          </button>
        </div>

        {/* Workspace Selector */}
        {!collapsed && (
          <div className="px-3 py-3">
            <button
              type="button"
              className="w-full bg-zinc-50 dark:bg-[#121215] border border-[#d2d2d7] dark:border-[#27272a] rounded-lg p-2.5 flex items-center justify-between hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors group"
              onClick={() => setWorkspaceOpen(o => !o)}
              aria-expanded={workspaceOpen}
            >
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
                  Workspace
                </span>
                <span className="text-xs text-[#1D1D1F] dark:text-zinc-100 font-medium truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                  {workspaceLabel}
                </span>
              </div>
              <ChevronsUpDown size={14} className="text-zinc-500 group-hover:text-[#1D1D1F] dark:group-hover:text-zinc-300 shrink-0" />
            </button>
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex flex-col gap-1 px-3 pt-1">
          {navItems.map(item => {
            const active = activeScreen === item.screen;
            return (
              <button
                key={`${item.screen}-${item.label}`}
                type="button"
                onClick={() => setCurrentScreen(item.screen)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs w-full text-left transition-colors cursor-pointer ${
                  active
                    ? '!bg-zinc-900 !text-white shadow-sm font-semibold dark:bg-white dark:!text-black'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/50'
                }`}
                style={
                  collapsed
                    ? { justifyContent: 'center', padding: '9px 0' }
                    : undefined
                }
                title={collapsed ? item.label : undefined}
              >
                <span className={`shrink-0 ${active ? '!text-white dark:!text-black' : 'text-zinc-600 dark:text-zinc-400'}`}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.count !== undefined && (
                  <span
                    className={`ml-auto font-mono text-[10px] px-1.5 py-0.2 rounded border text-[10px] shrink-0 ${
                      active
                        ? 'border-black/20 bg-black/10 !text-white dark:bg-black/10 dark:border-white/20 dark:!text-black'
                        : 'border-[#27272a] bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Recents list — real fetched projects, top 5 newest */}
        {!collapsed && (
          <div className="flex flex-col gap-2 pt-5 px-3 pb-3">
            <div className="flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              <Clock size={11} /> Recents
            </div>
            <div className="flex flex-col gap-1">
              {recents.length === 0 && (
                <p className="px-2 py-1 text-[11px] text-zinc-500">
                  No projects yet — generate one from the dashboard.
                </p>
              )}
              {recents.slice(0, 5).map((rec: ProjectListItem) => {
                const active = currentProject?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openProject(rec.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openProject(rec.id);
                      }
                    }}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer ${
                      active
                        ? '!bg-zinc-900 !text-white dark:bg-white dark:!text-black'
                        : 'hover:text-black hover:bg-zinc-100 dark:hover:text-white dark:hover:bg-zinc-800/50'
                    }`}
                    title={rec.name}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[10px] shrink-0 opacity-60">
                        {timeAgo(rec.created_at)}
                      </span>
                      <span className="text-[11px] font-medium truncate">{rec.name}</span>
                    </span>
                    <button
                      type="button"
                      title="Delete project"
                      onClick={e => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${rec.name}"? This cannot be undone.`)) {
                          deleteProject(rec.id);
                        }
                      }}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom block — Operational status + profile row (1:1 from code.html) */}
      <div className="p-3 flex flex-col gap-2 border-t border-[#d2d2d7] bg-white dark:border-[#27272a] dark:bg-[#09090b]">
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-50 border border-[#d2d2d7] rounded-md dark:bg-[#121215] dark:border-[#27272a]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse dark:bg-white" />
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider dark:text-zinc-300">
              Operational
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">SOC2 TYPE II</span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(o => !o)}
            aria-expanded={profileOpen}
            className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer dark:hover:bg-zinc-900"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-zinc-100 border border-[#d2d2d7] flex items-center justify-center shrink-0 dark:bg-zinc-900 dark:border-[#27272a]">
                <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300">{user?.avatar}</span>
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs text-[#1D1D1F] dark:text-white font-medium leading-none truncate">
                  {user?.name}
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 truncate">
                  {user?.email}
                </span>
              </div>
            </div>
            <ChevronsUpDown size={14} className="text-zinc-500 shrink-0" />
          </button>
          {profileOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-white border border-[#d2d2d7] shadow-2xl p-1.5 z-50 dark:bg-[#09090b] dark:border-[#27272a]">
              <div className="px-2.5 py-1.5 border-b border-[#d2d2d7] mb-1 dark:border-[#27272a]">
                <div className="text-xs text-[#1D1D1F] dark:text-white font-medium truncate">{user?.name}</div>
                <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate">{user?.email}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors text-left dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-900"
              >
                <LogOut size={13} /> Log Out Session
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};