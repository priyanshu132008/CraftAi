import React from 'react';
import { ArrowRight, Bot, Code2, Eye, Layers3, Rocket, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navbar } from './Navbar';
import { useApp } from '../context/AppContext';

const features = [
  {
    icon: Bot,
    title: 'Describe it naturally',
    text: 'Start with an idea in plain language. CraftAi turns your brief into a clear, actionable build plan.'
  },
  {
    icon: Layers3,
    title: 'Plan every layer',
    text: 'See the pages, components, data models, and technology choices before any code is generated.'
  },
  {
    icon: Code2,
    title: 'Build with context',
    text: 'Generate a coherent project foundation with connected files, reusable components, and sensible defaults.'
  },
  {
    icon: Eye,
    title: 'Preview as you go',
    text: 'Move between source and live preview to make decisions while the product is still taking shape.'
  },
  {
    icon: Rocket,
    title: 'Ship when ready',
    text: 'Take a finished project from workspace to deployment without losing the thread of your original idea.'
  },
  {
    icon: Sparkles,
    title: 'Keep refining',
    text: 'Ask the assistant for focused changes and keep improving the same project instead of starting over.'
  }
];

export const FeaturesPage: React.FC = () => {
  const { setCurrentScreen } = useApp();

  return (
    <div className="app-container" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '7rem 2rem 5rem' }}>
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: '720px', marginBottom: '4rem' }}
        >
          <span className="eyebrow">THE CRAFTAI WORKFLOW</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem, 6vw, 5.2rem)', lineHeight: 1, letterSpacing: '-0.045em', margin: '1rem 0 1.5rem' }}>
            From rough idea to <span className="gradient-text">real software.</span>
          </h1>
          <p style={{ color: '#A1A1AA', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: '620px' }}>
            CraftAi gives your ideas structure, momentum, and a place to grow. Every part of the workflow is connected so you can stay focused on what you are making.
          </p>
        </motion.section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: '#27272A', border: '1px solid #27272A' }}>
          {features.map(({ icon: Icon, title, text }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.45 }}
              style={{ background: '#090909', padding: '2rem', minHeight: '220px' }}
            >
              <Icon size={22} color="#FFFFFF" strokeWidth={1.5} />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', margin: '2.5rem 0 0.75rem' }}>{title}</h2>
              <p style={{ color: '#8A8A91', lineHeight: 1.65, fontSize: '0.92rem' }}>{text}</p>
            </motion.article>
          ))}
        </section>

        <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', borderTop: '1px solid #27272A', marginTop: '5rem', paddingTop: '2rem' }}>
          <p style={{ color: '#A1A1AA', margin: 0 }}>Ready to turn your next idea into a build?</p>
          <button className="btn-primary" onClick={() => setCurrentScreen('signup')}>
            Start building <ArrowRight size={16} />
          </button>
        </section>
      </main>
    </div>
  );
};
