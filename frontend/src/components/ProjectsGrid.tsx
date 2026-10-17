import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Copy,
  Layers,
  MoreVertical,
  Plus,
  Sparkles,
  Trash2
} from 'lucide-react';
import { ProjectListItem } from '../services/api';
import { timeAgo } from '../utils/timeAgo';

/** Kebab dropdown + delete confirmation + bento project cards (Phase 5). */

const KEBAB_ITEM: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  background: 'transparent',
  border: 'none',
  fontSize: '0.8rem',
  cursor: 'pointer',
  textAlign: 'left',
  color: 'var(--text-main)'
};

/** Stable hue derived from the project name — thumbnails differ at a glance. */
const thumbHue = (name: string) =>
  [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

export const ProjectsGrid: React.FC = () => {
  const { recents, openProject, deleteProject, duplicateProject, setCurrentScreen } = useApp();
  const [kebabId, setKebabId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProjectListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const kebabRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  // Delete modal: Esc closes it; focus lands on Cancel (the safe choice).
  useEffect(() => {
    if (!confirmDelete) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmDelete(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmDelete]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setKebabId(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const runDuplicate = async (id: string) => {
    setKebabId(null);
    setBusyId(id);
    await duplicateProject(id);
    setBusyId(null);
  };

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: '-0.03em' }}>
            Projects Manager
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '2px' }}>
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

      {recents.length === 0 ? (
        /* ---------------- Empty state ---------------- */
        <div
          style={{
            border: '1px dashed var(--border-subtle)',
            borderRadius: 14,
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)'
          }}
        >
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'inline-block', marginBottom: '1rem' }}
          >
            <Layers size={40} color="var(--text-muted)" />
          </motion.div>
          <h3 style={{ color: 'var(--text-heading)', fontSize: '1.15rem', marginBottom: '0.4rem' }}>
            No repositories yet
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Describe an app in the prompt console — the 3-agent pipeline builds it in ~2 minutes.
          </p>
          <motion.button
            type="button"
            className="btn-primary"
            onClick={() => setCurrentScreen('dashboard')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{ margin: '0 auto' }}
          >
            <Sparkles size={15} />
            <span>Create Your First App</span>
          </motion.button>
        </div>
      ) : (
        /* ---------------- Bento project grid ---------------- */
        <div className="projects-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          <AnimatePresence mode="popLayout">
            {recents.map(rec => (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
                whileHover={reduceMotion ? undefined : { y: -5, borderColor: 'var(--border-active)', boxShadow: 'var(--shadow-lg)' }}
                transition={{ duration: 0.2 }}
                className="project-card"
                style={{ boxShadow: 'none', position: 'relative', cursor: 'pointer' }}
                onClick={() => openProject(rec.id)}
              >
                {/* Aurora thumbnail — layered per-project hue gradients with a
                    blueprint grid overlay (no more flat generic gradient) */}
                <div
                  className="project-preview"
                  style={{
                    background: `radial-gradient(120% 100% at 18% 8%, hsl(${thumbHue(rec.name)} 72% 58% / 0.85) 0%, transparent 55%),` +
                      `radial-gradient(110% 90% at 82% 18%, hsl(${(thumbHue(rec.name) + 48) % 360} 78% 55% / 0.65) 0%, transparent 60%),` +
                      `radial-gradient(150% 110% at 50% 115%, hsl(${(thumbHue(rec.name) + 96) % 360} 65% 46% / 0.8) 0%, transparent 65%),` +
                      `var(--bg-input)`
                  }}
                >
                  {/* Fine blueprint grid overlay */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage:
                        'linear-gradient(var(--bg-dots) 1px, transparent 1px), linear-gradient(90deg, var(--bg-dots) 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                      opacity: 0.45
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.78)',
                      gap: '8px'
                    }}
                  >
                    <Layers size={28} />
                    <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                      {rec.name}
                    </span>
                  </div>
                  {busyId === rec.id && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.45)',
                        color: 'var(--text-heading)',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      Duplicating…
                    </div>
                  )}
                </div>

                <div className="project-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 className="project-title" style={{ fontFamily: 'var(--font-heading)' }}>
                        {rec.name}
                      </h3>
                      {/* Prompt summary snippet (when the stored prompt exists) */}
                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.45,
                          marginTop: 4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {rec.prompt || 'Generated repository — open the IDE to explore the files.'}
                      </p>
                    </div>

                    {/* Kebab menu */}
                    <div ref={kebabId === rec.id ? kebabRef : undefined} style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: 4, color: 'var(--text-muted)' }}
                        title="Project actions"
                        onClick={e => {
                          e.stopPropagation();
                          setKebabId(kebabId === rec.id ? null : rec.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {kebabId === rec.id && (
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: 'calc(100% + 6px)',
                            width: 190,
                            background: 'color-mix(in srgb, var(--bg-secondary) 82%, transparent)',
                            backdropFilter: 'blur(18px)',
                            WebkitBackdropFilter: 'blur(18px)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 10,
                            boxShadow: 'var(--shadow-xl)',
                            padding: 6,
                            zIndex: 70
                          }}
                        >
                          <button
                            type="button"
                            style={KEBAB_ITEM}
                            disabled={busyId === rec.id}
                            onClick={() => runDuplicate(rec.id)}
                          >
                            <Copy size={13} /> Duplicate Blueprint
                          </button>
                          <button
                            type="button"
                            style={{ ...KEBAB_ITEM, color: 'color-mix(in srgb, #EF4444 72%, var(--text-heading))' }}
                            onClick={() => {
                              setKebabId(null);
                              setConfirmDelete(rec);
                            }}
                          >
                            <Trash2 size={13} /> Delete Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Real recents only — no fabricated branch/commit/progress data */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      margin: '0.75rem 0 1.25rem',
                      flexWrap: 'wrap',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <span>{timeAgo(rec.created_at)}</span>
                  </div>

                  <div className="project-footer">
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {rec.id.split('-', 1)[0]}
                    </span>
                    <motion.button
                      className="btn-outline"
                      onClick={e => {
                        e.stopPropagation();
                        openProject(rec.id);
                      }}
                      style={{ padding: '6px 12px', borderRadius: 6, fontSize: '0.82rem', gap: 6 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span>Open IDE</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ---------------- Delete confirmation modal ---------------- */}
      <AnimatePresence>
        {confirmDelete && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 420,
                borderRadius: 16,
                background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--border-subtle)',
                padding: '1.5rem',
                textAlign: 'center',
                color: 'var(--text-heading)'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  margin: '0 auto 0.9rem',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(248, 113, 113, 0.12)',
                  border: '1px solid rgba(248, 113, 113, 0.35)',
                  color: 'color-mix(in srgb, #EF4444 70%, var(--text-heading))'
                }}
              >
                <Trash2 size={20} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>
                Delete “{confirmDelete.name}”?
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.4rem', lineHeight: 1.5 }}>
                This removes the workspace from disk and the project row from
                your account. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  ref={cancelRef}
                  className="btn-ghost"
                  style={{ flex: 1, border: '1px solid var(--border-subtle)' }}
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px',
                    borderRadius: 10,
                    border: '1px solid rgba(248, 113, 113, 0.5)',
                    background: 'rgba(248, 113, 113, 0.15)',
                    color: 'color-mix(in srgb, #EF4444 72%, var(--text-heading))',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                  onClick={async () => {
                    const id = confirmDelete.id;
                    setConfirmDelete(null);
                    await deleteProject(id); // removes card + recents entry
                  }}
                >
                  <Trash2 size={14} /> Delete Project
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectsGrid;