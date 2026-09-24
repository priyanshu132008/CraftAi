import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sidebar } from './Sidebar';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  ExternalLink,
  MoreVertical,
  Layers,
  Code2,
  FolderOpen,
  GitBranch,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { ProjectItem } from '../context/defaultData';

export const Dashboard: React.FC = () => {
  const { projects, setCurrentScreen, setCurrentProject } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'recent'>('all');

  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'live') return matchesSearch && p.badge === 'Live';
    return matchesSearch;
  });

  const handleOpenProject = (proj: ProjectItem) => {
    setCurrentProject(proj);
    setCurrentScreen('workspace');
  };

  return (
    <div className="app-shell">
      <Sidebar activeScreen="dashboard" />

      <main className="main-content">
        {/* Top Header */}
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="dashboard-title-group">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', letterSpacing: '-0.03em' }}>
              My Projects
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: '0.95rem', marginTop: '2px' }}>
              Your AI-generated repositories, blueprints, and live deployments.
            </p>
          </div>

          <div className="dashboard-controls">
            <div className="search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search projects by name or tag..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <motion.button
              className="btn-primary"
              onClick={() => setCurrentScreen('generate-plan')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={16} />
              <span>New Project</span>
            </motion.button>
          </div>
        </motion.div>

        {/* High-Tech Metrics Bar (Avoiding Generic Empty Spacing) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem'
          }}
        >
          <div style={{ background: '#0A0A0A', border: '1px solid #222222', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Repositories
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
                {projects.length}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center' }}>
                +2 this week
              </span>
            </div>
          </div>

          <div style={{ background: '#0A0A0A', border: '1px solid #222222', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Production Deployments
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
                14
              </span>
              <span style={{ fontSize: '0.75rem', color: '#FFFFFF' }}>
                All healthy
              </span>
            </div>
          </div>

          <div style={{ background: '#0A0A0A', border: '1px solid #222222', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Global Edge CDN
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
                99.98%
              </span>
              <span style={{ fontSize: '0.75rem', color: '#71717A' }}>
                Latency 18ms
              </span>
            </div>
          </div>
        </motion.div>

        {/* Filter Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #222222', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              background: activeTab === 'all' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'all' ? '#000000' : '#A1A1AA',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            All Repositories ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            style={{
              background: activeTab === 'live' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'live' ? '#000000' : '#A1A1AA',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Live Production (3)
          </button>
        </div>

        {/* Projects Grid with Framer Motion Stagger */}
        <motion.div
          className="projects-grid"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.08 }
            }
          }}
        >
          {filteredProjects.map(proj => (
            <motion.div
              key={proj.id}
              className="project-card"
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
              }}
              whileHover={{ y: -5, borderColor: '#555555' }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="project-preview"
                style={{ background: proj.previewGradient }}
              >
                {proj.previewImage ? (
                  <img
                    src={proj.previewImage}
                    alt={proj.title}
                    className="project-preview-mockup"
                  />
                ) : (
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
                )}

                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                  <span
                    className={`status-pill ${
                      proj.badge === 'Live' ? 'live' : proj.badge === 'Draft' ? 'building' : 'success'
                    }`}
                    style={{ background: '#000000', color: '#FFFFFF', border: '1px solid #333333' }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: proj.badge === 'Live' ? '#FFFFFF' : '#71717A' }} />
                    <span>{proj.badge}</span>
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
                  <button
                    className="btn-ghost"
                    style={{ padding: '4px', color: '#71717A' }}
                  >
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
        </motion.div>
      </main>
    </div>
  );
};
