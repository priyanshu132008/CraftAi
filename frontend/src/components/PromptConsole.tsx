import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Compass,
  Paperclip,
  Palette,
  Plug,
  Plus,
  Sparkles,
  Square,
  X
} from 'lucide-react';
import { GenerationMode } from '../services/api';
import { BrandLogo } from './BrandLogos';
import ConsoleCanvas from './ConsoleCanvas';
import AgentPipeline from './AgentPipeline';
import {
  CONNECTOR_CATALOG,
  CONNECTOR_LIST,
  DESIGN_STYLES
} from '../lib/connectorCatalog';

const MODES: { id: GenerationMode; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'build', label: 'Build', hint: 'Full multi-agent generation (Alt+B)', icon: <Sparkles size={13} /> },
  { id: 'chat', label: 'Chat', hint: 'Ask anything, no code writes (Alt+C)', icon: <Bot size={13} /> },
  { id: 'plan', label: 'Plan', hint: 'Technical spec & architecture (Alt+P)', icon: <Compass size={13} /> }
];

/** Quick-action prompts — staggered chips under the console (Phase 4). */
const QUICK_PROMPTS = [
  'Sleek dark SaaS landing page with animated hero & pricing',
  'Artisanal coffee roastery e-commerce store',
  'Fintech analytics dashboard with live charts'
];

const MENU_PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  left: 0,
  width: 300,
  background: 'color-mix(in srgb, var(--bg-secondary) 78%, transparent)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-xl)',
  padding: 6,
  zIndex: 80,
  textAlign: 'left'
};

const MENU_ITEM_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  background: 'transparent',
  border: 'none',
  color: 'var(--text-main)',
  cursor: 'pointer',
  fontSize: '0.82rem',
  textAlign: 'left'
};

/**
 * The multi-mode prompt console (Module 2): mode dropdown (Build / Chat /
 * Plan with Alt+B/C/P shortcuts), "+" attachment menu (Connectors, Context
 * File, Design Style) and the primary submit button. Shared by the Dashboard
 * home hero and the GenerateStudio pre-generation state.
 */
export const PromptConsole: React.FC = () => {
  const {
    prompt,
    setPrompt,
    promptMode,
    setPromptMode,
    handleGeneratePlan,
    cancelGeneration,
    isGenerating,
    selectedConnectors,
    toggleConnector,
    designStyle,
    setDesignStyle,
    attachedContext,
    setAttachedContext
  } = useApp();

  const [menu, setMenu] = useState<'root' | 'connectors' | 'style' | null>(null);
  const [modeOpen, setModeOpen] = useState(false);
  /** Typing-energy cell shared with the ConsoleCanvas render loop. */
  const energyRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Outside clicks close the popovers.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) {
        setModeOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Alt+B / Alt+C / Alt+P switch the console mode from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'b') setPromptMode('build');
      else if (key === 'c') setPromptMode('chat');
      else if (key === 'p') setPromptMode('plan');
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setPromptMode]);

  const onContextFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '').slice(0, 200000);
      setAttachedContext({ name: file.name, content });
    };
    reader.readAsText(file);
  };

  const onGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    await handleGeneratePlan(prompt);
  };

  const activeMode = MODES.find(m => m.id === promptMode) ?? MODES[0];
  const submitLabel =
    promptMode === 'build' ? 'Generate' : promptMode === 'chat' ? 'Ask' : 'Plan';

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontFamily: 'var(--font-mono)',
    background: 'var(--accent-indigo-soft)',
    border: '1px solid color-mix(in srgb, var(--accent-indigo-bright) 40%, transparent)',
    color: 'var(--accent-indigo-bright)'
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* ---------------- Console bar (glow border + keystroke canvas) ---------------- */}
      <div className="console-glow">
        <div className="console-inner">
          <ConsoleCanvas energyRef={energyRef} />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              padding: '10px'
            }}
          >
        {/* "+" attachment menu */}
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            title="Attach connectors, context or a design style"
            onClick={() => setMenu(m => (m ? null : 'root'))}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background:
                menu || selectedConnectors.length || attachedContext || designStyle
                  ? 'var(--accent-indigo-soft)'
                  : 'var(--bg-hover)',
              border: '1px solid',
              borderColor:
                menu || selectedConnectors.length || attachedContext || designStyle
                  ? 'color-mix(in srgb, var(--accent-indigo-bright) 50%, transparent)'
                  : 'var(--border-subtle)',
              color: menu || selectedConnectors.length || attachedContext || designStyle
                ? 'var(--accent-indigo-bright)'
                : 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Plus size={17} />
          </button>

          {menu && (
            <div style={MENU_PANEL_STYLE}>
              {menu === 'root' && (
                <>
                  <button
                    type="button"
                    style={MENU_ITEM_STYLE}
                    onClick={() => setMenu('connectors')}
                  >
                    <Plug size={14} color="#A5B4FC" />
                    <span style={{ flex: 1 }}>
                      Attach Connectors
                      {selectedConnectors.length > 0 && (
                        <span style={{ color: 'var(--text-muted)' }}>
                          {' '}· {selectedConnectors.length} selected
                        </span>
                      )}
                    </span>
                    <ChevronDown size={13} color="#71717A" />
                  </button>
                  <button
                    type="button"
                    style={MENU_ITEM_STYLE}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip size={14} color="#A5B4FC" />
                    <span style={{ flex: 1 }}>
                      Attach Context File
                      {attachedContext && (
                        <span style={{ color: 'var(--text-muted)' }}> · {attachedContext.name}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    style={MENU_ITEM_STYLE}
                    onClick={() => setMenu('style')}
                  >
                    <Palette size={14} color="#A5B4FC" />
                    <span style={{ flex: 1 }}>
                      Select Design Style
                      {designStyle && (
                        <span style={{ color: 'var(--text-muted)' }}> · {designStyle}</span>
                      )}
                    </span>
                    <ChevronDown size={13} color="#71717A" />
                  </button>
                </>
              )}

              {menu === 'connectors' && (
                <>
                  <div
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setMenu('root')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <ChevronDown size={11} style={{ transform: 'rotate(90deg)' }} />
                    </button>
                    Wire in connectors
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {CONNECTOR_LIST.map(meta => {
                    const active = selectedConnectors.includes(meta.id);
                    return (
                      <button
                        key={meta.id}
                        type="button"
                        onClick={() => toggleConnector(meta.id)}
                        style={{
                          ...MENU_ITEM_STYLE,
                          background: active ? 'var(--accent-indigo-soft)' : 'transparent'
                        }}
                      >
                        <span style={{ color: active ? 'var(--accent-indigo-bright)' : 'var(--text-muted)' }}>
                          <BrandLogo id={meta.id} size={16} />
                        </span>
                        <span style={{ flex: 1 }}>
                          <span style={{ display: 'block', fontWeight: 600 }}>
                            {meta.name}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)'
                            }}
                          >
                            {meta.file}
                          </span>
                        </span>
                        {active && <Check size={14} color="var(--accent-indigo-bright)" />}
                      </button>
                    );
                  })}
                  <div style={{ padding: '8px 10px 4px', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    Selected connectors are wired into all generations.
                  </div>
                  </div>
                </>
              )}

              {menu === 'style' && (
                <>
                  <div
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setMenu('root')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <ChevronDown size={11} style={{ transform: 'rotate(90deg)' }} />
                    </button>
                    Select design style
                  </div>
                  {DESIGN_STYLES.map(style => {
                    const active = designStyle === style.title;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          setDesignStyle(active ? null : style.title);
                          setMenu(null);
                        }}
                        style={{
                          ...MENU_ITEM_STYLE,
                          background: active ? 'var(--accent-indigo-soft)' : 'transparent'
                        }}
                      >
                        <Palette
                          size={13}
                          color={active ? 'var(--accent-indigo-bright)' : 'var(--text-muted)'}
                        />
                        <span style={{ flex: 1, fontWeight: 600 }}>{style.title}</span>
                        {active && <Check size={14} color="var(--accent-indigo-bright)" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Prompt input */}
        <textarea
          value={prompt}
          onChange={e => {
            setPrompt(e.target.value);
            // Keystroke feedback: bump the canvas energy cell.
            energyRef.current = Math.min(1, energyRef.current + 0.22);
          }}
          maxLength={4000}
          placeholder={
            promptMode === 'build'
              ? 'Describe the app you want to build…'
              : promptMode === 'chat'
                ? 'Ask a technical question, explore a feature, review code…'
                : 'Describe the product to architect — you’ll get a full technical spec…'
          }
          style={{
            flex: 1,
            resize: 'none',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-heading)',
            fontSize: '0.95rem',
            padding: '10px 2px',
            minHeight: 44,
            fontFamily: 'inherit'
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onGenerate();
            }
          }}
        />

        {/* Mode dropdown */}
        <div ref={modeRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            title="Console mode"
            onClick={() => setModeOpen(o => !o)}
            style={{
              height: 40,
              padding: '0 12px',
              borderRadius: 12,
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            {activeMode.icon} {activeMode.label} <ChevronDown size={13} />
          </button>

          {modeOpen && (
            <div style={{ ...MENU_PANEL_STYLE, left: 'auto', right: 0, width: 240 }}>
              {MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPromptMode(m.id);
                    setModeOpen(false);
                  }}
                  style={{
                    ...MENU_ITEM_STYLE,
                    background: promptMode === m.id ? 'var(--accent-indigo-soft)' : 'transparent'
                  }}
                >
                  <span style={{ color: promptMode === m.id ? 'var(--accent-indigo-bright)' : 'var(--text-muted)' }}>
                    {m.icon}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 600 }}>{m.label}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {m.hint}
                    </span>
                  </span>
                  {promptMode === m.id && <Check size={14} color="var(--accent-indigo-bright)" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit — morphs into a Stop control while the pipeline runs */}
        <motion.button
          type="button"
          className="btn-primary"
          disabled={!isGenerating && !prompt.trim()}
          onClick={isGenerating ? cancelGeneration : onGenerate}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          style={{ padding: '0 20px', borderRadius: 12, height: 40, whiteSpace: 'nowrap' }}
        >
          {isGenerating ? <Square size={14} /> : <Sparkles size={16} />}
          <span>{isGenerating ? 'Stop' : submitLabel}</span>
          {!isGenerating && <ArrowRight size={15} />}
        </motion.button>
          </div>
        </div>
      </div>

      {/* ---------------- Quick-action prompt chips ---------------- */}
      {!isGenerating && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: '0.9rem',
            justifyContent: 'center'
          }}
        >
          {QUICK_PROMPTS.map((q, i) => (
            <motion.button
              key={q}
              type="button"
              // Empty input → fill; typed text → append, never overwrite.
              onClick={() =>
                setPrompt(prev => (prev.trim() ? `${prev.trim()} ${q}` : q))
              }
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '7px 14px',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 999,
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {q}
            </motion.button>
          ))}
        </div>
      )}

      {/* ---------------- Live generation monitor ---------------- */}
      <AnimatePresence>{isGenerating && <AgentPipeline key="pipeline" />}</AnimatePresence>

      {/* ---------------- Active attachment pills ---------------- */}
      {(selectedConnectors.length > 0 || attachedContext || designStyle) && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: '0.9rem',
            justifyContent: 'center'
          }}
        >
          {selectedConnectors.map(id => (
            <span key={id} style={pillStyle}>
              {CONNECTOR_CATALOG[id]?.name ?? id}
              <button
                type="button"
                onClick={() => toggleConnector(id)}
                style={{ display: 'flex', background: 'transparent', border: 'none', color: 'var(--accent-indigo-bright)', cursor: 'pointer', padding: 0 }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {designStyle && (
            <span style={pillStyle}>
              {designStyle}
              <button
                type="button"
                onClick={() => setDesignStyle(null)}
                style={{ display: 'flex', background: 'transparent', border: 'none', color: 'var(--accent-indigo-bright)', cursor: 'pointer', padding: 0 }}
              >
                <X size={11} />
              </button>
            </span>
          )}
          {attachedContext && (
            <span style={pillStyle}>
              📄 {attachedContext.name}
              <button
                type="button"
                onClick={() => setAttachedContext(null)}
                style={{ display: 'flex', background: 'transparent', border: 'none', color: 'var(--accent-indigo-bright)', cursor: 'pointer', padding: 0 }}
              >
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.py,.html,.css,.yml,.yaml,.xml"
        style={{ display: 'none' }}
        onChange={onContextFile}
      />
    </div>
  );
};