import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FileCode,
  FileText,
  ChevronRight,
  ChevronDown,
  Save,
  Rocket,
  ArrowLeft,
  Search,
  GitBranch,
  Settings,
  RefreshCw,
  ExternalLink,
  Laptop,
  Smartphone,
  Send,
  Sparkles,
  Check,
  X
} from 'lucide-react';

export const WorkspaceIDE: React.FC = () => {
  const {
    currentProject,
    setCurrentScreen,
    setIsDeployModalOpen,
    files,
    activeFile,
    setActiveFile,
    openTabs,
    openTab,
    closeTab,
    updateFileContent,
    applyAiModification
  } = useApp();

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    components: true,
    styles: false,
    pages: true
  });

  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [inlinePrompt, setInlinePrompt] = useState('');
  const [isAiModifying, setIsAiModifying] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleInlineAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlinePrompt.trim()) return;
    setIsAiModifying(true);
    setTimeout(() => {
      applyAiModification(inlinePrompt);
      setIsAiModifying(false);
      setInlinePrompt('');
      setPreviewKey(k => k + 1);
    }, 900);
  };

  const currentContent = files[activeFile] || '// Select a file from the explorer';
  const lineNumbers = currentContent.split('\n').map((_, i) => i + 1);

  return (
    <div className="ide-workspace">
      {/* Top IDE Header */}
      <header className="ide-header">
        <div className="ide-header-left">
          <div
            className="craftai-logo"
            style={{ fontSize: '1.15rem', color: '#FFFFFF' }}
            onClick={() => setCurrentScreen('dashboard')}
            title="Return to Dashboard"
          >
            <div className="craftai-logo-icon" />
            <span style={{ color: '#FFFFFF' }}>Craft<span className="highlight">Ai</span></span>
          </div>

          <div className="ide-project-selector">
            <div className="status-dot-live" />
            <span>{currentProject?.id || 'portfolio-website'}</span>
          </div>
        </div>

        <div className="ide-header-actions">
          {saveToast && (
            <span style={{ fontSize: '0.8rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={14} /> Saved
            </span>
          )}

          <button className="btn-ide-save" onClick={handleSave}>
            <Save size={14} />
            <span>Save</span>
          </button>

          <button
            className="btn-ide-deploy"
            onClick={() => setIsDeployModalOpen(true)}
          >
            <Rocket size={14} />
            <span>Deploy</span>
          </button>

          <button
            className="btn-ghost"
            style={{ color: '#94A3B8', padding: '6px' }}
            onClick={() => setCurrentScreen('dashboard')}
            title="Exit to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      </header>

      {/* Main IDE Body */}
      <div className="ide-body">
        {/* Activity Bar */}
        <aside className="ide-activity-bar">
          <button className="activity-icon-btn active" title="Explorer">
            <FileCode size={20} />
          </button>
          <button className="activity-icon-btn" title="Search">
            <Search size={20} />
          </button>
          <button className="activity-icon-btn" title="Source Control">
            <GitBranch size={20} />
          </button>
          <button
            className="activity-icon-btn"
            style={{ marginTop: 'auto' }}
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </aside>

        {/* File Explorer */}
        <div className="ide-explorer">
          <div className="explorer-header">
            <span>Explorer : {currentProject?.id || 'portfolio-website'}</span>
          </div>

          <div className="explorer-tree">
            {/* Root Project Item */}
            <div className="tree-node" onClick={() => toggleFolder('src')}>
              {expandedFolders.src ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={15} color="#818CF8" />
              <span>src</span>
            </div>

            {expandedFolders.src && (
              <>
                {/* components folder */}
                <div className="tree-node tree-indent-1" onClick={() => toggleFolder('components')}>
                  {expandedFolders.components ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={15} color="#F59E0B" />
                  <span>components</span>
                </div>

                {expandedFolders.components && (
                  <>
                    <div
                      className={`tree-node tree-indent-2 ${activeFile === 'Hero.tsx' ? 'active' : ''}`}
                      onClick={() => openTab('Hero.tsx')}
                    >
                      <FileCode size={14} color="#60A5FA" />
                      <span>Hero.tsx</span>
                    </div>
                    <div
                      className={`tree-node tree-indent-2 ${activeFile === 'About.tsx' ? 'active' : ''}`}
                      onClick={() => openTab('About.tsx')}
                    >
                      <FileCode size={14} color="#60A5FA" />
                      <span>About.tsx</span>
                    </div>
                    <div
                      className={`tree-node tree-indent-2 ${activeFile === 'Projects.tsx' ? 'active' : ''}`}
                      onClick={() => openTab('Projects.tsx')}
                    >
                      <FileCode size={14} color="#60A5FA" />
                      <span>Projects.tsx</span>
                    </div>
                    <div
                      className={`tree-node tree-indent-2 ${activeFile === 'Contact.tsx' ? 'active' : ''}`}
                      onClick={() => openTab('Contact.tsx')}
                    >
                      <FileCode size={14} color="#60A5FA" />
                      <span>Contact.tsx</span>
                    </div>
                  </>
                )}

                {/* pages folder */}
                <div className="tree-node tree-indent-1" onClick={() => toggleFolder('pages')}>
                  {expandedFolders.pages ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={15} color="#EC4899" />
                  <span>pages</span>
                </div>

                {expandedFolders.pages && (
                  <div
                    className={`tree-node tree-indent-2 ${activeFile === 'page.tsx' ? 'active' : ''}`}
                    onClick={() => openTab('page.tsx')}
                  >
                    <FileCode size={14} color="#34D399" />
                    <span>page.tsx</span>
                  </div>
                )}

                {/* styles folder */}
                <div className="tree-node tree-indent-1" onClick={() => toggleFolder('styles')}>
                  {expandedFolders.styles ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={15} color="#A855F7" />
                  <span>styles</span>
                </div>

                {expandedFolders.styles && (
                  <div
                    className={`tree-node tree-indent-2 ${activeFile === 'globals.css' ? 'active' : ''}`}
                    onClick={() => openTab('globals.css')}
                  >
                    <FileText size={14} color="#EC4899" />
                    <span>globals.css</span>
                  </div>
                )}
              </>
            )}

            {/* package.json */}
            <div
              className={`tree-node ${activeFile === 'package.json' ? 'active' : ''}`}
              onClick={() => openTab('package.json')}
            >
              <FileText size={14} color="#F59E0B" />
              <span>package.json</span>
            </div>
          </div>
        </div>

        {/* Center Code Editor Container */}
        <div className="ide-editor-container">
          {/* Tabs Bar */}
          <div className="editor-tabs">
            {openTabs.map(filename => (
              <div
                key={filename}
                className={`editor-tab ${activeFile === filename ? 'active' : ''}`}
                onClick={() => setActiveFile(filename)}
              >
                <span>{filename}</span>
                <span
                  className="tab-close"
                  onClick={e => {
                    e.stopPropagation();
                    closeTab(filename);
                  }}
                >
                  <X size={12} />
                </span>
              </div>
            ))}
          </div>

          {/* Code Text Area with Line Numbers */}
          <div className="editor-content-area">
            <div className="editor-line-numbers">
              {lineNumbers.map(n => (
                <div key={n}>{n}</div>
              ))}
            </div>

            <textarea
              className="editor-code"
              value={currentContent}
              onChange={e => updateFileContent(activeFile, e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Live Preview Pane */}
        <div className="ide-preview-container">
          <div className="preview-header">
            <div className="preview-mac-dots">
              <span className="mac-dot red" />
              <span className="mac-dot yellow" />
              <span className="mac-dot green" />
            </div>

            <div className="preview-url-bar">
              <span>http://localhost:3000</span>
            </div>

            <div className="preview-actions">
              <button
                className="preview-btn"
                onClick={() => setViewportMode('desktop')}
                style={{ color: viewportMode === 'desktop' ? '#FFFFFF' : '#64748B' }}
                title="Desktop View"
              >
                <Laptop size={15} />
              </button>
              <button
                className="preview-btn"
                onClick={() => setViewportMode('mobile')}
                style={{ color: viewportMode === 'mobile' ? '#FFFFFF' : '#64748B' }}
                title="Mobile View"
              >
                <Smartphone size={15} />
              </button>
              <button
                className="preview-btn"
                onClick={() => setPreviewKey(k => k + 1)}
                title="Refresh Preview"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Render Frame of the generated website */}
          <div
            className="preview-render-frame"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: viewportMode === 'mobile' ? 'center' : 'stretch',
              padding: viewportMode === 'mobile' ? '20px' : '0'
            }}
          >
            <div
              key={previewKey}
              style={{
                width: viewportMode === 'mobile' ? '375px' : '100%',
                height: viewportMode === 'mobile' ? '667px' : '100%',
                borderRadius: viewportMode === 'mobile' ? '24px' : '0',
                border: viewportMode === 'mobile' ? '8px solid #1E293B' : 'none',
                overflowY: 'auto',
                background: '#090D16',
                color: '#FFFFFF',
                boxShadow: viewportMode === 'mobile' ? '0 20px 40px rgba(0,0,0,0.5)' : 'none'
              }}
            >
              {/* Mini Running Portfolio Web Page from Screen 7 */}
              <nav
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>Shreya Raut</span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                  <span>About</span>
                  <span>Projects</span>
                  <span>Contact</span>
                </div>
              </nav>

              {/* Hero Banner with Landscape Artwork */}
              <div
                style={{
                  position: 'relative',
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, #111111 0%, #000000 100%)',
                  overflow: 'hidden',
                  borderBottom: '1px solid #222222'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'url(/assets/hero-laptop.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.12
                  }}
                />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      marginBottom: '1rem',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    Frontend Developer
                  </span>

                  <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                    Hi, I'm Shreya
                  </h1>
                  <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: '340px', margin: '0 auto 1.5rem' }}>
                    Crafting fluid, high-performance web applications and design systems.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button
                      className="btn-primary"
                      style={{ padding: '8px 18px', fontSize: '0.8rem' }}
                    >
                      View My Work
                    </button>
                    <button
                      className="btn-secondary"
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.8rem',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#FFFFFF',
                        borderColor: 'rgba(255,255,255,0.15)'
                      }}
                    >
                      Contact
                    </button>
                  </div>
                </div>
              </div>

              {/* Sample Projects showcase inside Live Preview */}
              <div style={{ padding: '2rem 1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '1rem' }}>
                  Featured Works
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}
                  >
                    <h5 style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>AI Dashboard Experience</h5>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>
                      Interactive metrics analytics interface with responsive canvas charts.
                    </p>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}
                  >
                    <h5 style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>Cloud Deployment Engine</h5>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>
                      Automated CI/CD dashboard built with React and Tailwind CSS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Dock: Terminal & Inline AI Prompt */}
      <footer className="ide-bottom-dock">
        <div className="dock-header">
          <span className="dock-tab active">TERMINAL</span>
          <span className="dock-tab">PROBLEMS</span>
          <span className="dock-tab">OUTPUT</span>
        </div>

        <div className="dock-terminal-body">
          <span>✓ Development server running at http://localhost:3000 (Compiled in 48ms)</span>
        </div>

        {/* AI Prompt Input Bar */}
        <form onSubmit={handleInlineAiSubmit} className="dock-ai-bar">
          <Sparkles size={16} color="#FFFFFF" />
          <input
            type="text"
            className="dock-ai-input"
            value={inlinePrompt}
            onChange={e => setInlinePrompt(e.target.value)}
            placeholder="Ask CraftAi to modify your project (e.g. 'Make the hero gradient brighter', 'Add contact form')..."
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={isAiModifying}
            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem' }}
          >
            <span>{isAiModifying ? 'Updating...' : 'Generate'}</span>
            <Send size={13} />
          </button>
        </form>
      </footer>
    </div>
  );
};
