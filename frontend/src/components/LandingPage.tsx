import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from './Navbar';
import { ThreeCanvas } from './ThreeCanvas';
import { HeroShowcase } from './HeroShowcase';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Layers,
  Code2,
  Rocket,
  CheckCircle2,
  Terminal,
  Cpu,
  Zap,
  Globe,
  GitBranch,
  ShieldCheck
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentScreen, setPrompt, handleGeneratePlan, isGenerating } = useApp();
  const [heroPrompt, setHeroPrompt] = useState('Build me a portfolio website for a developer...');

  const suggestions = [
    'Portfolio Website',
    'E-commerce Store',
    'Blog Website',
    'SaaS Landing Page'
  ];

  const handleSuggestionClick = (title: string) => {
    const full = `Build me a modern ${title.toLowerCase()} with smooth animations and interactive features`;
    setHeroPrompt(full);
    setPrompt(full);
  };

  const onSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroPrompt.trim()) return;
    setPrompt(heroPrompt);
    await handleGeneratePlan(heroPrompt);
  };

  return (
    <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <Navbar />

      <main style={{ position: 'relative', zIndex: 1 }}>
        {/* Screen 1: Hero Section with Interactive Three.js 3D Background */}
        <section className="hero-section" style={{ position: 'relative' }}>
          <ThreeCanvas />

          <motion.div
            className="hero-left"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* High-tech Micro Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 14px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                marginBottom: '1.5rem',
                backdropFilter: 'blur(8px)'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 0 8px #FFFFFF' }} />
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: '#E4E4E7', textTransform: 'uppercase' }}>
                CraftAi v2.0 • Autonomous Builder
              </span>
            </motion.div>

            <h1
              className="hero-headline"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.8rem, 5vw, 4.4rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.04em'
              }}
            >
              Turn Your Ideas <span className="gradient-text">Into Real Projects</span> with AI
            </h1>

            <p className="hero-subtext" style={{ fontSize: '1.1rem', color: '#A1A1AA', maxWidth: '520px', lineHeight: 1.65 }}>
              CraftAi is your AI-powered development environment. Describe what you want to build, and watch it come to life — with a complete plan, code, and live preview.
            </p>

            {/* Prompt input box with Framer Motion spring interaction */}
            <motion.form
              onSubmit={onSubmitPrompt}
              className="hero-prompt-box"
              whileHover={{ scale: 1.005 }}
              transition={{ duration: 0.2 }}
            >
              <input
                type="text"
                className="hero-prompt-input"
                value={heroPrompt}
                onChange={e => setHeroPrompt(e.target.value)}
                placeholder="Build me a portfolio website for a developer..."
              />
              <motion.button
                type="submit"
                disabled={isGenerating}
                className="btn-primary"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ padding: '10px 22px' }}
              >
                <span>{isGenerating ? 'Thinking...' : 'Generate Plan'}</span>
                <ArrowRight size={16} />
              </motion.button>
            </motion.form>

            <div className="hero-suggestions">
              <span className="hero-suggestions-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#71717A', letterSpacing: '0.05em' }}>
                SUGGESTIONS:
              </span>
              {suggestions.map((item, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  whileHover={{ scale: 1.05, borderColor: '#FFFFFF', color: '#FFFFFF' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSuggestionClick(item)}
                  className="suggestion-chip"
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Interactive code and live preview showcase */}
          <motion.div
            className="hero-right"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroShowcase />
          </motion.div>
        </section>

        {/* Asymmetrical Bento Grid Section (Avoiding Generic Layouts) */}
        <section className="features-section">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                letterSpacing: '0.18em',
                color: '#71717A',
                textTransform: 'uppercase',
                display: 'inline-block',
                marginBottom: '0.5rem'
              }}
            >
              System Architecture
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
                letterSpacing: '-0.03em',
                color: '#FFFFFF'
              }}
            >
              Ideas ➔ Plans ➔ Production Ready Code
            </h2>
            <p style={{ color: '#A1A1AA', maxWidth: '580px', margin: '0.75rem auto 0', fontSize: '1rem', lineHeight: 1.6 }}>
              Built from first principles for developers. No black boxes, clean modular codebases, and continuous live feedback.
            </p>
          </div>

          {/* Bento Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '1.5rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}
          >
            {/* Bento Card 1: Large Span 7 */}
            <motion.div
              style={{
                gridColumn: 'span 7',
                background: '#0A0A0A',
                border: '1px solid #222222',
                borderRadius: '16px',
                padding: '2.5rem',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden'
              }}
              whileHover={{ y: -4, borderColor: '#444444' }}
              transition={{ duration: 0.25 }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '200px',
                  height: '200px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)',
                  pointerEvents: 'none'
                }}
              />

              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#141414', border: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Layers size={22} color="#FFFFFF" />
              </div>

              <h3 style={{ fontSize: '1.45rem', fontFamily: 'var(--font-heading)', color: '#FFFFFF', marginBottom: '0.6rem' }}>
                1. Autonomous Architectural Blueprint
              </h3>
              <p style={{ color: '#A1A1AA', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '480px', marginBottom: '1.5rem' }}>
                Describe your project naturally. CraftAi generates a full structural plan including UI component hierarchies, database models, and production tech stack selection.
              </p>

              <div
                style={{
                  background: '#050505',
                  border: '1px solid #222222',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: '#A1A1AA'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', marginBottom: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFFFFF' }} />
                  <span>Synthesizing plan from natural language prompt...</span>
                </div>
                <div style={{ color: '#71717A' }}>➔ [Hero, FeatureMatrix, CheckoutPipeline, ContactForm] parsed (4 modules)</div>
              </div>
            </motion.div>

            {/* Bento Card 2: Span 5 */}
            <motion.div
              style={{
                gridColumn: 'span 5',
                background: '#0A0A0A',
                border: '1px solid #222222',
                borderRadius: '16px',
                padding: '2.5rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              whileHover={{ y: -4, borderColor: '#444444' }}
              transition={{ duration: 0.25 }}
            >
              <div>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#141414', border: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Code2 size={22} color="#FFFFFF" />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-heading)', color: '#FFFFFF', marginBottom: '0.6rem' }}>
                  2. Native React &amp; TypeScript Engine
                </h3>
                <p style={{ color: '#A1A1AA', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  Exportable, standard Next.js code with zero vendor lock-in. Real React components you can copy, paste, or tweak directly in the Mini IDE.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', background: '#141414', border: '1px solid #27272A', padding: '4px 10px', borderRadius: '6px', color: '#FFFFFF' }}>Next.js 14</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', background: '#141414', border: '1px solid #27272A', padding: '4px 10px', borderRadius: '6px', color: '#FFFFFF' }}>React 19</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', background: '#141414', border: '1px solid #27272A', padding: '4px 10px', borderRadius: '6px', color: '#FFFFFF' }}>TypeScript</span>
              </div>
            </motion.div>

            {/* Bento Card 3: Span 5 */}
            <motion.div
              style={{
                gridColumn: 'span 5',
                background: '#0A0A0A',
                border: '1px solid #222222',
                borderRadius: '16px',
                padding: '2.5rem',
                textAlign: 'left'
              }}
              whileHover={{ y: -4, borderColor: '#444444' }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#141414', border: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Globe size={22} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-heading)', color: '#FFFFFF', marginBottom: '0.6rem' }}>
                3. One-Click Global Edge Deployment
              </h3>
              <p style={{ color: '#A1A1AA', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Seamless integration with Vercel and Netlify. Automatic SSL certificate generation, custom domains, and instant global CDN distribution.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', fontSize: '0.85rem' }}>
                <ShieldCheck size={16} />
                <span>Zero configuration required</span>
              </div>
            </motion.div>

            {/* Bento Card 4: Span 7 */}
            <motion.div
              style={{
                gridColumn: 'span 7',
                background: '#0A0A0A',
                border: '1px solid #222222',
                borderRadius: '16px',
                padding: '2.5rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              whileHover={{ y: -4, borderColor: '#444444' }}
              transition={{ duration: 0.25 }}
            >
              <div>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#141414', border: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Terminal size={22} color="#FFFFFF" />
                </div>
                <h3 style={{ fontSize: '1.45rem', fontFamily: 'var(--font-heading)', color: '#FFFFFF', marginBottom: '0.6rem' }}>
                  4. Real-time Mini IDE with Live Preview
                </h3>
                <p style={{ color: '#A1A1AA', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '520px' }}>
                  Edit components on the fly with real-time hot module replacement. Instruct the AI assistant to refactor components, change styling, or add features with instant preview feedback.
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  className="btn-primary"
                  onClick={() => setCurrentScreen('workspace')}
                  style={{ fontSize: '0.85rem', padding: '8px 18px' }}
                >
                  <Terminal size={14} />
                  <span>Launch IDE Demo</span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Quick Launch Bottom Bar */}
        <section style={{ maxWidth: '1200px', margin: '0 auto 6rem', padding: '0 2rem' }}>
          <motion.div
            style={{
              background: '#0A0A0A',
              border: '1px solid #27272A',
              borderRadius: '16px',
              padding: '3.5rem',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
              flexWrap: 'wrap',
              gap: '2rem'
            }}
            whileHover={{ borderColor: '#444444' }}
          >
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#A1A1AA',
                  display: 'inline-block',
                  marginBottom: '0.75rem'
                }}
              >
                Instant Access
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: '#FFFFFF', letterSpacing: '-0.03em' }}>
                Ready to explore the workspace?
              </h2>
              <p style={{ color: '#A1A1AA', marginTop: '0.5rem', maxWidth: '520px', fontSize: '1rem', lineHeight: 1.6 }}>
                Experience the file explorer, Monaco-style editor, live preview pane, and AI assistant prompt bar.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn-secondary"
                onClick={() => setCurrentScreen('dashboard')}
              >
                View Dashboard
              </button>
              <button
                className="btn-primary"
                onClick={() => setCurrentScreen('workspace')}
              >
                <span>Open Mini IDE</span>
                <Terminal size={16} />
              </button>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
};
