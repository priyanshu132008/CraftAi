import React from 'react';
import { useApp, ScreenType } from '../context/AppContext';
import { FolderGit2, Home, LayoutGrid, MessageSquareCode, LogOut } from 'lucide-react';

interface SidebarProps {
  activeScreen: ScreenType;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeScreen }) => {
  const { setCurrentScreen, user, logout } = useApp();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="craftai-logo" onClick={() => setCurrentScreen('landing')}>
          <div className="craftai-logo-icon" />
          <span>Craft<span className="highlight">Ai</span></span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div
          className={`sidebar-link ${activeScreen === 'landing' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('landing')}
        >
          <Home size={18} />
          <span>Home</span>
        </div>

        <div
          className={`sidebar-link ${activeScreen === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('dashboard')}
        >
          <FolderGit2 size={18} />
          <span>My Projects</span>
        </div>

        <div
          className={`sidebar-link ${activeScreen === 'generate-plan' || activeScreen === 'plan-output' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('generate-plan')}
        >
          <LayoutGrid size={18} />
          <span>Templates / Plan</span>
        </div>

        <div
          className={`sidebar-link ${activeScreen === 'ai-assistant' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('ai-assistant')}
        >
          <MessageSquareCode size={18} />
          <span>AI Assistant</span>
        </div>
      </nav>

      {user && (
        <div className="sidebar-user">
          <div className="user-avatar">{user.avatar}</div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button
            onClick={logout}
            className="btn-ghost"
            style={{ marginLeft: 'auto', padding: '6px', color: 'var(--neutral-gray)' }}
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
};
