import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, Code2, Compass, ShieldCheck, Check, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * Real-time visualizer for the 3-agent engine pipeline (Phase 4).
 * Maps the SSE thought-stream step names (architect:* / developer:* /
 * debugger:* / writing:files / done) onto three glowing status nodes
 * with a streaming terminal activity log underneath.
 * Node morphs + active pulse ring adapted from 21st.dev "Animated
 * Progress Stepper" (shadcnspace stepper-03).
 */

const AGENTS = [
  { prefix: 'architect', name: 'Architect', role: 'Intent analysis & blueprint mapping', icon: <Compass size={14} /> },
  { prefix: 'developer', name: 'Developer', role: 'Repository & component synthesis', icon: <Code2 size={14} /> },
  { prefix: 'debugger', name: 'Debugger', role: 'Self-healing & aesthetic polish', icon: <ShieldCheck size={14} /> }
] as const;

type Phase = 'pending' | 'active' | 'done';

const LOG_LIMIT = 10;

export const AgentPipeline: React.FC = () => {
  const { agentTrace, isGenerating } = useApp();
  const logRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Derive per-agent phase from the live step stream.
  const phases: Phase[] = AGENTS.map(a => {
    const steps = agentTrace.filter(t => t.step.startsWith(a.prefix));
    if (steps.some(t => t.step.endsWith(':completed'))) return 'done';
    if (steps.length > 0) return 'active';
    return 'pending';
  });
  // Everything before the first seen agent belongs to earlier agents.
  const firstActive = phases.findIndex(p => p !== 'pending');
  if (firstActive > 0) {
    for (let i = 0; i < firstActive; i++) phases[i] = 'done';
  }
  const writing = agentTrace.some(t => t.step === 'writing:files');
  const done = !isGenerating || agentTrace.some(t => t.step === 'done');

  // Delight: one small burst in the agent palette when the pipeline finishes
  // (never on cancel — only when the 'done' step actually streamed).
  const celebratedRef = useRef(false);
  const finished = agentTrace.some(t => t.step === 'done');
  useEffect(() => {
    if (finished && !celebratedRef.current) {
      celebratedRef.current = true;
      confetti({
        particleCount: 90,
        spread: 70,
        startVelocity: 32,
        origin: { y: 0.65 },
        colors: ['#4F46E5', '#818CF8', '#F0ABFC', '#6EE7B7'],
        disableForReducedMotion: true
      });
    }
    if (!finished) celebratedRef.current = false;
  }, [finished]);
  if (writing || done) {
    // Final write phase — all agents have finished their pass.
    for (let i = 0; i < phases.length; i++) {
      if (phases[i] === 'active') phases[i] = 'done';
    }
  }

  // Auto-scroll the terminal log to the newest line.
  const recent = agentTrace.slice(-LOG_LIMIT);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [agentTrace.length]);

  const pulse = (color: string) => ({
    boxShadow: `0 0 0 0 ${color}`,
    animation: 'agent-pulse 1.6s ease-out infinite'
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: 'hidden', marginTop: '1rem' }}
    >
      <style>{`@keyframes agent-pulse {
        0% { box-shadow: 0 0 0 0 var(--accent-indigo-soft); }
        70% { box-shadow: 0 0 0 10px transparent; }
        100% { box-shadow: 0 0 0 0 transparent; }
      }`}</style>

      {/* ---- Agent nodes + connecting progress line ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0,
          padding: '1.25rem 1.5rem',
          borderRadius: 14,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {AGENTS.map((agent, idx) => {
          const phase = phases[idx];
          const active = phase === 'active';
          const complete = phase === 'done';
          return (
            <React.Fragment key={agent.prefix}>
              {idx > 0 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    marginTop: 17,
                    marginLeft: 10,
                    marginRight: 10,
                    borderRadius: 2,
                    background: 'var(--border-subtle)',
                    position: 'relative',
                    overflow: 'hidden',
                    minWidth: 24
                  }}
                >
                  <motion.div
                    initial={false}
                    animate={{ scaleX: complete || active ? 1 : 0 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: complete
                        ? 'var(--accent-indigo-bright)'
                        : 'linear-gradient(90deg, var(--accent-indigo-bright), transparent)',
                      transformOrigin: 'left center'
                    }}
                  />
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 92
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    border: '1.5px solid',
                    ...(active
                      ? {
                          ...pulse('var(--accent-indigo-soft)'),
                          borderColor: 'var(--accent-indigo-bright)',
                          background: 'var(--accent-indigo-soft)',
                          color: 'var(--accent-indigo-bright)'
                        }
                      : complete
                        ? {
                            borderColor: 'var(--accent-indigo-bright)',
                            background: 'var(--accent-indigo-soft)',
                            color: 'var(--accent-indigo-bright)'
                          }
                        : {
                            borderColor: 'var(--border-subtle)',
                            background: 'transparent',
                            color: 'var(--text-muted)'
                          })
                  }}
                >
                  {/* Active pulse ring (official stepper-03 badge pulse) */}
                  {active && !reduceMotion && (
                    <motion.span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 999,
                        border: '2px solid var(--accent-indigo-soft)'
                      }}
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: [1, 1.45, 1], opacity: [1, 0.2, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                    />
                  )}
                  {/* Icon → checkmark morph (official stepper-03) */}
                  <AnimatePresence mode="wait" initial={false}>
                    {complete ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, rotate: -90, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: 90, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        style={{ display: 'flex' }}
                      >
                        <Check size={15} strokeWidth={3} />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="icon"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        style={{ display: 'flex' }}
                      >
                        {active ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : agent.icon}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: active || complete ? 'var(--text-heading)' : 'var(--text-muted)'
                  }}
                >
                  {agent.name}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    lineHeight: 1.4,
                    maxWidth: 110
                  }}
                >
                  {agent.role}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ---- Streaming terminal activity log ---- */}
      <div
        ref={logRef}
        style={{
          marginTop: '0.75rem',
          maxHeight: 160,
          overflowY: 'auto',
          padding: '10px 14px',
          borderRadius: 12,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          lineHeight: 1.7
        }}
      >
        {recent.length === 0 && (
          <div style={{ color: 'var(--text-muted)' }}>
            <Bot size={11} style={{ verticalAlign: -1, marginRight: 6 }} />
            Booting the agent pipeline…
          </div>
        )}
        {recent.map((t, i) => {
          const newest = i === recent.length - 1;
          return (
            <motion.div
              key={`${t.step}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                display: 'flex',
                gap: 8,
                color: newest ? 'var(--accent-indigo-bright)' : 'var(--text-muted)',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ opacity: 0.55, flexShrink: 0 }}>{t.step}</span>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: newest ? 600 : 400
              }}>
                {t.detail ? `${t.message} — ${t.detail}` : t.message}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AgentPipeline;