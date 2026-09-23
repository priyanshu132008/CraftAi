import React from 'react';
import { ArrowRight, Compass, Heart, WandSparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navbar } from './Navbar';
import { useApp } from '../context/AppContext';

export const AboutPage: React.FC = () => {
  const { setCurrentScreen } = useApp();

  return (
    <div className="app-container" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '7rem 2rem 5rem' }}>
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
            className="about-intro"
        >
          <div>
            <span className="eyebrow">WHY CRAFTAI EXISTS</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem, 6vw, 5.2rem)', lineHeight: 1, letterSpacing: '-0.045em', margin: '1rem 0 1.5rem' }}>
              Make the first step feel <span className="gradient-text">possible.</span>
            </h1>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '1.05rem', lineHeight: 1.75, margin: 0 }}>
            Good ideas often stall between a blank page and the first working version. CraftAi was created to close that gap: a calm, intelligent workspace for turning a thought into something you can see, shape, and ship.
          </p>
        </motion.section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '6rem' }}>
          {[
            { icon: Compass, title: 'Clarity first', text: 'A useful plan gives every idea a direction before the details get noisy.' },
            { icon: WandSparkles, title: 'Useful intelligence', text: 'AI should remove friction while keeping creative decisions in your hands.' },
            { icon: Heart, title: 'Built with care', text: 'The best tools make ambitious work feel more approachable, not more complicated.' }
          ].map(({ icon: Icon, title, text }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.45 }}
              style={{ borderTop: '1px solid #3F3F46', paddingTop: '1.5rem' }}
            >
              <Icon size={22} color="#FFFFFF" strokeWidth={1.5} />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', margin: '1.5rem 0 0.75rem' }}>{title}</h2>
              <p style={{ color: '#8A8A91', fontSize: '0.92rem', lineHeight: 1.65, margin: 0 }}>{text}</p>
            </motion.article>
          ))}
        </section>

        <section style={{ marginTop: '6rem', padding: '2.5rem', background: '#111111', border: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <span className="eyebrow">YOUR NEXT BUILD</span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', margin: '0.75rem 0 0' }}>Bring the idea. We will help with the beginning.</h2>
          </div>
          <button className="btn-primary" onClick={() => setCurrentScreen('signup')}>
            Get started <ArrowRight size={16} />
          </button>
        </section>
      </main>
    </div>
  );
};
