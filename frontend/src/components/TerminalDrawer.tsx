import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, Terminal } from 'lucide-react';
import { TraceStep } from '../services/api';

const LOG_LIMIT = 40;

interface TerminalDrawerProps {
  steps: TraceStep[];
  isGenerating: boolean;
  statusMessage?: string;
  /** Bump to force the drawer open (synthesis modal "View Verbose Logs"). */
  expandSignal?: number;
}

/**
 * Collapsible bottom terminal drawer (Phase 6): agent debug output stream
 * + dev-server status. ponytail: Vite child-process logs aren't reachable
 * from this shell — lines are derived from the SSE agent trace; wire a
 * postMessage bridge in the preview iframe if real compiler output is
 * needed later.
 */
export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  steps,
  isGenerating,
  statusMessage,
  expandSignal
}) => {
  const [open, setOpen] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const recent = steps.slice(-LOG_LIMIT);

  useEffect(() => {
    if (expandSignal) setOpen(true);
  }, [expandSignal]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [steps.length, open]);

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Drawer header / toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '6px 12px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-main)',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)'
        }}
      >
        <Terminal size={12} color="var(--accent-indigo-bright)" />
        <span>Terminal</span>

        {/* Server status pill */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '1px 8px',
            borderRadius: 999,
            background: `color-mix(in srgb, ${isGenerating ? 'var(--accent-indigo-bright)' : 'var(--agent-debugger)'} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${isGenerating ? 'var(--accent-indigo-bright)' : 'var(--agent-debugger)'} 40%, transparent)`,
            color: isGenerating ? 'var(--accent-indigo-bright)' : 'var(--agent-debugger)'
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: isGenerating ? 'var(--accent-indigo-bright)' : 'var(--agent-debugger)',
              boxShadow: `0 0 6px ${isGenerating ? 'var(--accent-indigo-bright)' : 'var(--agent-debugger)'}`
            }}
          />
          {isGenerating ? 'compiling' : 'preview · :3000'}
        </span>

        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          style={{ marginLeft: 'auto', display: 'flex', color: 'var(--text-muted)' }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>

      {/* Drawer body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="terminal-body"
            initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            animate={{ height: 128, opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              ref={logRef}
              style={{
                height: 128,
                overflowY: 'auto',
                padding: '6px 12px 10px',
                background: 'var(--bg-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                lineHeight: 1.7
              }}
            >
              <div style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--agent-debugger)' }}>➜</span> craftai agent trace —
                events stream live while the pipeline runs
              </div>
              {statusMessage && !isGenerating && (
                <div style={{ color: 'var(--text-muted)' }}>[status] {statusMessage}</div>
              )}
              {recent.map((t, i) => {
                const newest = i === recent.length - 1 && isGenerating;
                return (
                  <motion.div
                    key={`${t.step}-${i}`}
                    initial={reduceMotion ? undefined : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      display: 'flex',
                      gap: 8,
                      whiteSpace: 'nowrap',
                      color: newest ? 'var(--accent-indigo-bright)' : 'var(--text-muted)'
                    }}
                  >
                    <span style={{ opacity: 0.6, flexShrink: 0 }}>[{t.step}]</span>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: newest ? 600 : 400
                      }}
                    >
                      {t.detail ? `${t.message} — ${t.detail}` : t.message}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TerminalDrawer;