import React, { useEffect, useRef, useState } from 'react';
import { useApp, ScreenType } from '../context/AppContext';
import {
  ChevronsUpDown,
  Check,
  LayoutDashboard,
  Search,
  Plug,
  FolderGit2,
  Clock,
  LogOut,
  LogIn,
  Plus
} from 'lucide-react';
import { ProjectListItem } from '../services/api';

interface SidebarProps {
  activeScreen: ScreenType;
}

/** Mocked workspaces for the workspace switcher (top of the sidebar). */
const WORKSPACES = [
  { id: 'personal', name: 'Personal Workspace' },
  { id: 'labs', name: 'CraftAI Labs' }
];

/** "x minutes ago" style label from an ISO timestamp. */
const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
};

/** VS Code-style section label. */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      padding: '0 14px',
      marginTop: '1.25rem',
      marginBottom: '6px',
      fontSize: '0.68rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: '#52525B',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }}
  >
    <Clock size={11} /> {children}
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeScreen }) => {
  const { setCurrentScreen, user, logout, recents } = useApp();
  const [workspace, setWorkspace] = useState(WORKSPACES[0]);
  const [wsOpen, setWsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const wsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close any open dropdown when clicking outside of it.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const navItems: { screen: ScreenType; icon: React.ReactNode; label: string }[] = [
    { screen: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { screen: 'search', icon: <Search size={16} />, label: 'Search' },
    { screen: 'connectors', icon: <Plug size={16} />, label: 'Connectors' },
    { screen: 'projects', icon: <FolderGit2 size={16} />, label: 'Projects' }
  ];

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 'calc(100% + 6px)',
    left: 12,
    right: 12,
    background: '#0A0A0A',
    border: '1px solid #27272A',
    borderRadius: 10,
    boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
    padding: 6,
    zIndex: 60
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    fontSize: '0.82rem',
    color: '#EDEDED',
    cursor: 'pointer',
    textAlign: 'left',
    background: 'transparent'
  };

  return (
    <aside className="app-sidebar">
      {/* ---- Workspace switcher (top) ---- */}
      <div
        ref={wsRef}
        style={{ padding: '1rem', borderBottom: '1px solid #222222', position: 'relative' }}
      >
        <button
          type="button"
          onClick={() => setWsOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '10px 12px',
            background: '#0A0A0A',
            border: '1px solid #27272A',
            borderRadius: 10,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.65rem',
              flexShrink: 0
            }}
          >
            C
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
              {workspace.name}
            </div>
            <div style={{ fontSize: '0.66rem', color: '#71717A', fontFamily: 'var(--font-mono)' }}>
              free plan
            </div>
          </div>
          <ChevronsUpDown size={14} color="#71717A" />
        </button>

        {wsOpen && (
          <div style={{ ...dropdownStyle, bottom: 'auto', top: 'calc(100% + 6px)' }}>
            {WORKSPACES.map(ws => (
              <button
                key={ws.id}
                type="button"
                style={dropdownItemStyle}
                onClick={() => {
                  setWorkspace(ws);
                  setWsOpen(false);
                }}
              >
                <span style={{ flex: 1 }}>{ws.name}</span>
                {workspace.id === ws.id && <Check size={13} color="#818CF8" />}
              </button>
            ))}
            <button
              type="button"
              style={{ ...dropdownItemStyle, color: '#A1A1AA', borderTop: '1px solid #222222', marginTop: 4, borderRadius: '0 0 6px 6px' }}
              onClick={() => setWsOpen(false)}
            >
              <Plus size={13} /> New workspace
            </button>
          </div>
        )}
      </div>

      {/* ---- Primary navigation ---- */}
      <nav className="sidebar-nav" style={{ flex: 0, paddingBottom: '0.5rem' }}>
        {navItems.map(item => (
          <div
            key={item.screen}
            className={`sidebar-link ${activeScreen === item.screen ? 'active' : ''}`}
            onClick={() => setCurrentScreen(item.screen)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* ---- Recents (real fetched projects, top 5 newest) ---- */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <SectionLabel>Recents</SectionLabel>
        {recents.slice(0, 5).map((rec: ProjectListItem) => (
          <div
            key={rec.id}
            className="sidebar-link"
            style={{ padding: '7px 14px', fontSize: '0.8rem' }}
            onClick={() => setCurrentScreen('workspace')}
            title={rec.name}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span style={{ color: '#52525B', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', flexShrink: 0 }}>
                {timeAgo(rec.created_at)}
              </span>
              {rec.name}
            </span>
          </div>
        ))}
        {recents.length === 0 && (
          <div style={{ padding: '8px 14px', fontSize: '0.72rem', color: '#52525B' }}>
            No projects yet — generate one from the dashboard.
          </div>
        )}
      </div>

      {/* ---- Account profile dropdown (bottom) ---- */}
      <div
        ref={profileRef}
        style={{ position: 'relative', borderTop: '1px solid #222222', padding: '0.75rem' }}
      >
        {profileOpen && (
          <div style={dropdownStyle}>
            {user ? (
              <>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #222222', marginBottom: 4 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#71717A' }}>{user.email}</div>
                </div>
                <button
                  type="button"
                  style={{ ...dropdownItemStyle, color: '#F87171' }}
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={13} /> Log out
                </button>
              </>
            ) : (
              <button
                type="button"
                style={dropdownItemStyle}
                onClick={() => {
                  setProfileOpen(false);
                  setCurrentScreen('login');
                }}
              >
                <LogIn size={13} /> Log in
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setProfileOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 10px',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: 10,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          {user ? (
            <>
              <div className="user-avatar" style={{ width: 30, height: 30, fontSize: '0.7rem' }}>
                {user.avatar}
              </div>
              <div className="user-info" style={{ flex: 1 }}>
                <span className="user-name" style={{ fontSize: '0.8rem' }}>{user.name}</span>
                <span className="user-email" style={{ fontSize: '0.66rem' }}>{user.email}</span>
              </div>
              <ChevronsUpDown size={13} color="#71717A" />
            </>
          ) : (
            <span style={{ color: '#A1A1AA', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogIn size={14} /> Log in
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};