import React from 'react';
import { useApp } from '../context/AppContext';
import { LogOut } from 'lucide-react';

/** 1:1 port of `code.html` View 5 — Organization & Cluster Settings.
 *  User details come from the real Supabase session; "Log Out Session"
 *  calls the shared AppContext logout handler. */
const SettingsView: React.FC = () => {
  const { user, logout } = useApp();

  const initials = (user?.name ?? '')
    .split(/\s+/)
    .map(p => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full px-8 pb-12">
      <div className="mx-auto max-w-4xl flex flex-col gap-6">
        <div className="pb-4 border-b border-[#d2d2d7] dark:border-[#27272a]">
          <h1 className="text-2xl font-bold font-display text-[#1D1D1F] dark:text-white tracking-tight">
            Account Settings
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your profile and session.
          </p>
        </div>

        {/* Workspace Details */}
        <div className="p-6 rounded-xl bg-white border border-[#d2d2d7] shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:bg-[#09090b] dark:border-[#27272a] dark:shadow-none flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-[#1D1D1F] dark:text-white font-display">Workspace Details</h2>
          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-7 h-7 rounded-full bg-zinc-100 border border-[#d2d2d7] flex items-center justify-center font-mono text-[10px] text-zinc-600 dark:bg-zinc-900 dark:border-[#27272a] dark:text-zinc-300">
              {user?.avatar ?? initials}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#1D1D1F] dark:text-white font-medium leading-none">{user?.name}</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Session Management */}
        <div className="p-6 rounded-xl bg-white border border-[#d2d2d7] shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:bg-[#09090b] dark:border-[#27272a] dark:shadow-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#1D1D1F] dark:text-white font-display">Session Management</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              End active session on this workstation. Token invalidation will cascade across
              active cluster connections.
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-[#1D1D1F] dark:text-white border border-zinc-300 dark:border-[#27272a] text-xs font-medium transition-colors flex items-center gap-2 shrink-0"
          >
            <LogOut size={14} className="text-zinc-500 dark:text-zinc-400" /> Log Out Session
          </button>
        </div>
      </div>
    </div>
  );
};

export { SettingsView };