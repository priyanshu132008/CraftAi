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
          background: 'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.08), transparent 70%)',
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
          background: 'rgba(8, 8, 8, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 255, 255, 0.04) inset',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1
        }}
        whileHover={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}
        transition={{ duration: 0.2 }}
      >
        {/* Window Top Title Bar */}
        <div
          style={{
            height: '42px',
            background: 'rgba(15, 15, 15, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', opacity: 0.85 }} />
            <span style={{ marginLeft: '8px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: '#71717A' }}>
              craftai • live-workspace
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981' }} />
              Live HMR
            </span>
          </div>
        </div>

        {/* Split Window Body: Left Code + Right Live Preview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', minHeight: '340px' }}>
          {/* Left Pane: Code Editor */}
          <div
            style={{
              background: '#040404',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              lineHeight: 1.6
            }}
          >
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', borderBottom: '1px solid #1A1A1A', paddingBottom: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveCodeTab('App.tsx')}
                style={{
                  background: activeCodeTab === 'App.tsx' ? '#141414' : 'transparent',
                  color: activeCodeTab === 'App.tsx' ? '#FFFFFF' : '#71717A',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
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
                  background: activeCodeTab === 'style.css' ? '#141414' : 'transparent',
                  color: activeCodeTab === 'style.css' ? '#FFFFFF' : '#71717A',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer'
                }}
              >
                globals.css
              </button>
            </div>

            {/* Code Body */}
            {activeCodeTab === 'App.tsx' ? (
              <div style={{ color: '#E4E4E7' }}>
                <div style={{ color: '#71717A' }}>// 1. Autonomous AI Generation</div>
                <div>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>import</span>{' '}
                  <span style={{ color: '#A1A1AA' }}>&#123; Hero, Showcase &#125;</span>{' '}
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>from</span>{' '}
                  <span style={{ color: '#D4D4D8' }}>'@craftai/core'</span>
                </div>
                <br />
                <div>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>export default function</span>{' '}
                  <span style={{ color: '#FFFFFF' }}>Page()</span> &#123;
                </div>
                <div style={{ paddingLeft: '14px' }}>
                  <span style={{ color: '#71717A' }}>// Formulated by AI Plan</span>
                  <br />
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>const</span> dev = &#123;
                  <br />
                  &nbsp;&nbsp;name:{' '}
                  <span style={{ color: '#D4D4D8' }}>"Shreya Raut"</span>,
                  <br />
                  &nbsp;&nbsp;role:{' '}
                  <span style={{ color: '#D4D4D8' }}>"Frontend Architect"</span>,
                  <br />
                  &nbsp;&nbsp;theme:{' '}
                  <span style={{ color: '#D4D4D8' }}>"Vercel Monochrome"</span>
                  <br />
                  &#125;;
                  <br />
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>return</span> &lt;
                  <span style={{ color: '#FFFFFF' }}>Hero</span> profile=&#123;dev&#125; /&gt;;
                </div>
                <div>&#125;</div>
              </div>
            ) : (
              <div style={{ color: '#A1A1AA' }}>
                <div>:root &#123;</div>
                <div style={{ paddingLeft: '14px' }}>
                  --bg: <span style={{ color: '#FFFFFF' }}>#000000</span>;
                  <br />
                  --text: <span style={{ color: '#FFFFFF' }}>#FFFFFF</span>;
                  <br />
                  --font: <span style={{ color: '#FFFFFF' }}>'Syne'</span>;
                </div>
                <div>&#125;</div>
              </div>
            )}

            {/* Simulated Terminal Status bar at bottom of editor */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '0.75rem',
                borderTop: '1px solid #171717',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#71717A',
                fontSize: '0.7rem'
              }}
            >
              <Terminal size={12} color="#FFFFFF" />
              <span>Compiled in 18ms • 0 warnings</span>
            </div>
          </div>

          {/* Right Pane: Live Interactive Render Preview */}
          <div
            style={{
              background: '#090909',
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
                background: '#141414',
                border: '1px solid #222222',
                marginBottom: '1rem',
                fontSize: '0.7rem',
                color: '#71717A',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <span>localhost:3000</span>
              <RefreshCw size={10} color="#71717A" />
            </div>

            {/* Running Miniature Web Page */}
            <div
              style={{
                background: '#000000',
                border: '1px solid #222222',
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
                  background: 'rgba(255, 255, 255, 0.08)',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#FFFFFF',
                  marginBottom: '0.75rem'
                }}
              >
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#FFFFFF' }} />
                <span>Active Builder</span>
              </div>

              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: '#FFFFFF', marginBottom: '4px' }}>
                Hi, I'm Shreya
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#A1A1AA', marginBottom: '1rem', lineHeight: 1.4 }}>
                Frontend Architect building high-performance modern web apps.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setInteractiveCount(c => c + 1)}
                  style={{
                    background: '#FFFFFF',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '6px 12px',
                    fontSize: '0.72rem',
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
                    color: '#FFFFFF',
                    border: '1px solid #333333',
                    borderRadius: '5px',
                    padding: '6px 10px',
                    fontSize: '0.72rem',
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
                background: '#121212',
                border: '1px solid #1E1E1E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                color: '#71717A'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FFFFFF' }}>
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
