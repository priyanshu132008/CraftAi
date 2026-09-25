import React, { useEffect, useState } from 'react';
import { useApp, ScreenType } from '../context/AppContext';
import { Sidebar } from './Sidebar';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  MoreVertical,
  Layers,
  Code2,
  GitBranch,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { ProjectItem } from '../context/defaultData';
import { PromptConsole } from './PromptConsole';
import { ConnectorsView } from './ConnectorsView';

export type DashboardView = 'home' | 'search' | 'connectors' | 'projects';

interface DashboardProps {
  initialView?: DashboardView;
}

const SUGGESTIONS = [
  'A sleek dark SaaS landing page with animated hero, pricing and FAQ',
  'A modern developer portfolio with a bento-grid projects section',
  'An internal analytics dashboard with stat cards and a filterable table'
];

export const Dashboard: React.FC<DashboardProps> = ({ initialView = 'home' }) => {
  const {
    setPrompt,
    isGenerating,
    statusMessage,
    user,
    projects,
    recents,
    setCurrentScreen,
    setCurrentProject,
    isGenerated
  } = useApp();

  const [view, setView] = useState<DashboardView>(initialView);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => setView(initialView), [initialView]);

  // ------------------------------------------------------------------
  // Home view: mesh gradient, greeting, multi-mode prompt console
  // ------------------------------------------------------------------
  const renderHome = () => (
    <div
      className="main-content bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-black to-black"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 'none',
        position: 'relative'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '820px', textAlign: 'center' }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            lineHeight: 1.1,
            marginBottom: '0.75rem'
          }}
        >
          Let&apos;s build something,{' '}
          <span style={{ color: '#818CF8' }}>{user?.name ?? 'friend'}</span>
        </h1>
        <p style={{ color: '#A1A1AA', fontSize: '1rem', marginBottom: '2.25rem' }}>
          Describe your app — the Architect plans it, the Developer codes the full
          repository, the Debugger polishes it.
        </p>

        {/* Multi-mode prompt console: Build / Chat / Plan */}
        <PromptConsole />

        {(statusMessage || isGenerating) && (
          <p
            style={{
              marginTop: '1.1rem',
              color: isGenerating ? '#A5B4FC' : '#A1A1AA',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)'
            }}
          >
            {isGenerating
              ? 'Agents running… (this takes 1–2 minutes)'
              : statusMessage}
          </p>
        )}

        {/* Suggestion chips */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '2.25rem'
          }}
        >
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              style={{
                padding: '7px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 999,
                fontSize: '0.78rem',
                color: '#A1A1AA',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {isGenerated && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setCurrentScreen('workspace')}
            style={{ marginTop: '1.75rem', padding: '6px 0' }}
          >
            Return to workspace
          </button>
        )}
      </motion.div>
    </div>
  );

  // ------------------------------------------------------------------
  // Search view
  // ------------------------------------------------------------------
  const renderSearch = () => {
    const q = searchQuery.toLowerCase();
    const results = [
      ...projects.map(p => ({ id: p.id, title: p.title, category: p.category, timeAgo: p.timeAgo })),
      ...recents.map(r => ({ id: r.id, title: r.name, category: 'recent', timeAgo: r.created_at }))
    ].filter(r => !q || r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));

    return (
      <div className="main-content">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.2rem',
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            marginBottom: '0.4rem'
          }}
        >
          Search
        </h1>
        <p style={{ color: '#A1A1AA', marginBottom: '1.5rem' }}>
          Find your projects and recent generations.
        </p>

        <div className="search-box" style={{ width: '100%', maxWidth: 520, marginBottom: '2rem', padding: '12px 16px' }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search projects by name or tag…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: '0.95rem' }}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720 }}>
          {results.length === 0 && (
            <p style={{ color: '#71717A', fontSize: '0.9rem' }}>
              No results for “{searchQuery}”.
            </p>
          )}
          {results.map(r => (
            <div
              key={r.id}
              className="sidebar-link"
              style={{ padding: '12px 16px', border: '1px solid #222222', borderRadius: 10 }}
              onClick={() => setCurrentScreen('workspace')}
            >
              <Layers size={16} />
              <span style={{ flex: 1, color: '#FFFFFF', fontSize: '0.9rem' }}>{r.title}</span>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#71717A' }}>
                {r.category} · {r.timeAgo}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // Projects view
  // ------------------------------------------------------------------
  const renderProjects = () => {
    const handleOpenProject = (proj: ProjectItem) => {
      setCurrentProject(proj);
      setCurrentScreen('workspace');
    };

    return (
      <div className="main-content">
        <div className="dashboard-header">
          <div className="dashboard-title-group">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: '-0.03em' }}>
              My Projects
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: '0.95rem', marginTop: '2px' }}>
              Your AI-generated repositories, blueprints, and live deployments.
            </p>
          </div>
          <div className="dashboard-controls">
            <motion.button
              className="btn-primary"
              onClick={() => setCurrentScreen('dashboard')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={16} />
              <span>New Project</span>
            </motion.button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div
            style={{
              border: '1px dashed #27272A',
              borderRadius: 14,
              padding: '3.5rem 2rem',
              textAlign: 'center',
              color: '#71717A',
              background: '#0A0A0A'
            }}
          >
            <Code2 size={28} style={{ marginBottom: '0.75rem' }} />
            <p style={{ color: '#A1A1AA', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              No repositories yet. Generate your first app from the Dashboard prompt console.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCurrentScreen('dashboard')}
              style={{ margin: '0 auto' }}
            >
              <Sparkles size={15} />
              <span>Start building</span>
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(proj => (
              <motion.div
                key={proj.id}
                className="project-card"
                whileHover={{ y: -5, borderColor: '#555555' }}
                transition={{ duration: 0.2 }}
              >
                <div className="project-preview" style={{ background: proj.previewGradient }}>
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#71717A',
                      gap: '8px'
                    }}
                  >
                    <Layers size={28} />
                    <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                      {proj.title}
                    </span>
                  </div>
                </div>
                <div className="project-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="project-title" style={{ fontFamily: 'var(--font-heading)' }}>
                        {proj.title}
                      </h3>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#71717A', letterSpacing: '0.04em' }}>
                        {proj.category}
                      </span>
                    </div>
                    <button className="btn-ghost" style={{ padding: '4px', color: '#71717A' }}>
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#71717A', margin: '0.75rem 0 1.25rem' }}>
                    <GitBranch size={13} />
                    <span style={{ fontFamily: 'var(--font-mono)' }}>main</span>
                    <span>•</span>
                    <span>{proj.timeAgo}</span>
                  </div>
                  <div className="project-footer">
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {proj.tech.map((t, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-mono)',
                            background: '#141414',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            color: '#EDEDED',
                            border: '1px solid #27272A'
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <motion.button
                      className="btn-outline"
                      onClick={() => handleOpenProject(proj)}
                      style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.82rem', gap: '6px' }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span>Open IDE</span>
                      <ArrowUpRight size={13} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const activeScreen: ScreenType =
    view === 'home' ? 'dashboard' : view === 'search' ? 'search' : view === 'connectors' ? 'connectors' : 'projects';

  return (
    <div className="app-shell">
      <Sidebar activeScreen={activeScreen} />
      {view === 'home' && renderHome()}
      {view === 'search' && renderSearch()}
      {view === 'connectors' && (
        <div className="main-content">
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.2rem',
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              marginBottom: '0.4rem'
            }}
          >
            Connectors
          </h1>
          <p style={{ color: '#A1A1AA', marginBottom: '2rem' }}>
            Services CraftAI can wire into your generated apps.
          </p>
          <ConnectorsView />
        </div>
      )}
      {view === 'projects' && renderProjects()}
    </div>
  );
};