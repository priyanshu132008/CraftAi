import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Globe, RefreshCw, Terminal } from 'lucide-react';

export const HeroShowcase: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'App.tsx' | 'style.css'>('App.tsx');
  const [interactiveCount, setInteractiveCount] = useState(1);

  // 3D Tilt on Mouse Move
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [4, -4]);
  const rotateY = useTransform(x, [-100, 100], [-6, 6]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        perspective: '1200px'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Soft Ambient Spotlight Glow behind the window */}
      <div
        style={{
          position: 'absolute',
          inset: '-20px',
          background: 'radial-gradient(ellipse at 50% 50%, var(--accent-indigo-soft), transparent 70%)',
          filter: 'blur(30px)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Main Holographic Glass IDE Container */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          background: 'var(--ide-sidebar)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 255, 255, 0.04) inset',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1
        }}
        whileHover={{ borderColor: 'var(--border-active)' }}
        transition={{ duration: 0.2 }}
      >
        {/* Window Top Title Bar */}
        <div
          style={{
            height: '42px',
            background: 'var(--ide-activity)',
            borderBottom: '1px solid var(--ide-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1rem',
            userSelect: 'none'
          }}
        >
          {/* macOS window controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', opacity: 0.85 }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', opacity: 0.85 }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--agent-debugger)', opacity: 0.85 }} />
            <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ide-text-dim)' }}>
              craftai • live-workspace
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--agent-debugger)',
                background: 'color-mix(in srgb, var(--agent-debugger) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--agent-debugger) 30%, transparent)',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--agent-debugger)' }} />
              Live HMR
            </span>
          </div>
        </div>

        {/* Split Window Body: Left Code + Right Live Preview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', minHeight: '340px' }}>
          {/* Left Pane: Code Editor */}
          <div
            style={{
              background: 'var(--ide-bg)',
              borderRight: '1px solid var(--ide-border)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              lineHeight: 1.6
            }}
          >
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', borderBottom: '1px solid var(--ide-border)', paddingBottom: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveCodeTab('App.tsx')}
                style={{
                  background: activeCodeTab === 'App.tsx' ? 'var(--ide-tab-active)' : 'transparent',
                  color: activeCodeTab === 'App.tsx' ? 'var(--ide-text)' : 'var(--ide-text-dim)',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer'
                }}
              >
                App.tsx
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab('style.css')}
                style={{
                  background: activeCodeTab === 'style.css' ? 'var(--ide-tab-active)' : 'transparent',
                  color: activeCodeTab === 'style.css' ? 'var(--ide-text)' : 'var(--ide-text-dim)',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer'
                }}
              >
                globals.css
              </button>
            </div>

            {/* Code Body */}
            {activeCodeTab === 'App.tsx' ? (
              <div style={{ color: 'var(--ide-text)' }}>
                <div style={{ color: 'var(--ide-text-dim)' }}>// 1. Autonomous AI Generation</div>
                <div>
                  <span style={{ color: 'var(--accent-indigo-bright)', fontWeight: 600 }}>import</span>{' '}
                  <span style={{ color: 'var(--ide-text-dim)' }}>&#123; Hero, Showcase &#125;</span>{' '}
                  <span style={{ color: 'var(--accent-indigo-bright)', fontWeight: 600 }}>from</span>{' '}
                  <span style={{ color: 'var(--ide-text)' }}>'@craftai/core'</span>
                </div>
                <br />
                <div>
                  <span style={{ color: 'var(--accent-indigo-bright)', fontWeight: 600 }}>export default function</span>{' '}
                  <span style={{ color: 'var(--ide-text)' }}>Page()</span> &#123;
                </div>
                <div style={{ paddingLeft: '14px' }}>
                  <span style={{ color: 'var(--ide-text-dim)' }}>// Formulated by AI Plan</span>
                  <br />
                  <span style={{ color: 'var(--accent-indigo-bright)', fontWeight: 600 }}>const</span> dev = &#123;
                  <br />
                  &nbsp;&nbsp;name:{' '}
                  <span style={{ color: 'var(--ide-text)' }}>"Shreya Raut"</span>,
                  <br />
                  &nbsp;&nbsp;role:{' '}
                  <span style={{ color: 'var(--ide-text)' }}>"Frontend Architect"</span>,
                  <br />
                  &nbsp;&nbsp;theme:{' '}
                  <span style={{ color: 'var(--ide-text)' }}>"Vercel Monochrome"</span>
                  <br />
                  &#125;;
                  <br />
                  <span style={{ color: 'var(--accent-indigo-bright)', fontWeight: 600 }}>return</span> &lt;
                  <span style={{ color: 'var(--ide-text)' }}>Hero</span> profile=&#123;dev&#125; /&gt;;
                </div>
                <div>&#125;</div>
              </div>
            ) : (
              <div style={{ color: 'var(--ide-text-dim)' }}>
                <div>:root &#123;</div>
                <div style={{ paddingLeft: '14px' }}>
                  --bg: <span style={{ color: 'var(--ide-text)' }}>#000000</span>;
                  <br />
                  --text: <span style={{ color: 'var(--ide-text)' }}>#FFFFFF</span>;
                  <br />
                  --font: <span style={{ color: 'var(--ide-text)' }}>'Syne'</span>;
                </div>
                <div>&#125;</div>
              </div>
            )}

            {/* Simulated Terminal Status bar at bottom of editor */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--ide-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--ide-text-dim)',
                fontSize: '0.75rem'
              }}
            >
              <Terminal size={12} color="var(--ide-text)" />
              <span>Compiled in 18ms • 0 warnings</span>
            </div>
          </div>

          {/* Right Pane: Live Interactive Render Preview */}
          <div
            style={{
              background: 'var(--ide-sidebar)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden'
            }}
          >
            {/* Top mini browser bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'var(--bg-hover)',
                border: '1px solid var(--ide-border)',
                marginBottom: '1rem',
                fontSize: '0.75rem',
                color: 'var(--ide-text-dim)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <span>localhost:3000</span>
              <RefreshCw size={10} color="var(--ide-text-dim)" />
            </div>

            {/* Running Miniature Web Page */}
            <div
              style={{
                background: 'var(--ide-bg)',
                border: '1px solid var(--ide-border)',
                borderRadius: '10px',
                padding: '1.25rem',
                textAlign: 'center',
                boxShadow: '0 10px 20px rgba(0,0,0,0.6)'
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  background: 'var(--ide-activity)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ide-text)',
                  marginBottom: '0.75rem'
                }}
              >
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--ide-text)' }} />
                <span>Active Builder</span>
              </div>

              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: 'var(--ide-text)', marginBottom: '4px' }}>
                Hi, I'm Shreya
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--ide-text-dim)', marginBottom: '1rem', lineHeight: 1.4 }}>
                Frontend Architect building high-performance modern web apps.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setInteractiveCount(c => c + 1)}
                  style={{
                    background: 'var(--ide-text)',
                    color: 'var(--ide-bg)',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Works ({interactiveCount})
                </motion.button>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    color: 'var(--ide-text)',
                    border: '1px solid var(--ide-border)',
                    borderRadius: '5px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Contact
                </button>
              </div>
            </div>

            {/* Edge Deployment Status */}
            <div
              style={{
                marginTop: '1rem',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--ide-activity)',
                border: '1px solid var(--ide-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--ide-text-dim)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ide-text)' }}>
                <Globe size={12} />
                <span>Edge CDN Live</span>
              </div>
              <span>24ms</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
