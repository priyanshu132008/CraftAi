import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sidebar } from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Layers,
  Code2,
  Palette,
  Layout,
  ShoppingCart,
  BookOpen,
  Cloud,
  Sliders,
  Cpu
} from 'lucide-react';

interface PlanWizardProps {
  step: 'generate-plan' | 'plan-output';
}

export const PlanWizard: React.FC<PlanWizardProps> = ({ step }) => {
  const {
    prompt,
    setPrompt,
    currentPlan,
    handleGeneratePlan,
    isGenerating,
    setCurrentScreen
  } = useApp();

  const [selectedTemplate, setSelectedTemplate] = useState('Portfolio');

  const templates = [
    { label: 'Portfolio', icon: <Palette size={16} /> },
    { label: 'E-commerce', icon: <ShoppingCart size={16} /> },
    { label: 'Blog', icon: <BookOpen size={16} /> },
    { label: 'SaaS', icon: <Cloud size={16} /> },
    { label: 'Dashboard', icon: <Layout size={16} /> },
    { label: 'Custom', icon: <Sliders size={16} /> }
  ];

  const handleTemplateSelect = (tmpl: string) => {
    setSelectedTemplate(tmpl);
    const textMap: Record<string, string> = {
      Portfolio: 'Build me a modern portfolio website for a frontend developer with smooth animations and a contact form',
      'E-commerce': 'Create a high-converting digital storefront with product gallery, shopping cart, and Stripe checkout',
      Blog: 'Develop an elegant markdown-powered technical engineering blog with newsletter subscription',
      SaaS: 'Design a sleek dark-mode B2B SaaS landing page with interactive pricing calculator and feature grid',
      Dashboard: 'Create an analytics admin dashboard with sales charts, metrics widgets, and user table',
      Custom: 'Build an interactive web application with real-time UI components and modern styling'
    };
    if (textMap[tmpl]) {
      setPrompt(textMap[tmpl]);
    }
  };

  const onGenerate = async () => {
    if (!prompt.trim()) return;
    await handleGeneratePlan(prompt);
  };

  return (
    <div className="app-shell">
      <Sidebar activeScreen={step} />

      <main className="main-content">
        <div className="wizard-page">
          {/* Stepper Bar with Framer Motion animations */}
          <div className="stepper-nav">
            <div className="stepper-line" />

            {/* Step 1: Prompt */}
            <div
              className={`stepper-step ${
                step === 'plan-output' ? 'completed' : 'active'
              }`}
              onClick={() => setCurrentScreen('generate-plan')}
            >
              <motion.div
                className="stepper-circle"
                whileHover={{ scale: 1.08 }}
              >
                {step === 'plan-output' ? <Check size={16} /> : '1'}
              </motion.div>
              <span className="stepper-label" style={{ fontFamily: 'var(--font-mono)' }}>Prompt</span>
            </div>

            {/* Step 2: Plan */}
            <div
              className={`stepper-step ${step === 'plan-output' ? 'active' : ''}`}
            >
              <motion.div
                className="stepper-circle"
                whileHover={{ scale: 1.08 }}
              >
                2
              </motion.div>
              <span className="stepper-label" style={{ fontFamily: 'var(--font-mono)' }}>Plan</span>
            </div>

            {/* Step 3: Generate */}
            <div className="stepper-step">
              <div className="stepper-circle">3</div>
              <span className="stepper-label" style={{ fontFamily: 'var(--font-mono)' }}>Generate</span>
            </div>

            {/* Step 4: Workspace */}
            <div
              className="stepper-step"
              onClick={() => setCurrentScreen('workspace')}
            >
              <div className="stepper-circle">4</div>
              <span className="stepper-label" style={{ fontFamily: 'var(--font-mono)' }}>Workspace</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Prompt View (Screen 5) */}
            {step === 'generate-plan' && (
              <motion.div
                key="step-prompt"
                className="wizard-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
              >
                <div className="wizard-header">
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Step 01 // Blueprint Synthesis
                  </span>
                  <h1 className="wizard-title" style={{ fontFamily: 'var(--font-display)', marginTop: '4px' }}>
                    Describe your idea
                  </h1>
                  <p className="wizard-subtitle">
                    Tell us what you want to build. CraftAi will formulate your architectural plan and code hierarchy.
                  </p>
                </div>

                <div className="prompt-input-wrapper">
                  <textarea
                    className="prompt-textarea"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    maxLength={1000}
                    placeholder="Tell CraftAi what you want to build..."
                  />
                  <span className="prompt-char-count" style={{ fontFamily: 'var(--font-mono)' }}>
                    {prompt.length}/1000
                  </span>
                </div>

                <div className="templates-section-label" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', letterSpacing: '0.06em' }}>
                  QUICK PRESETS
                </div>

                <div className="templates-grid">
                  {templates.map(tmpl => (
                    <motion.button
                      key={tmpl.label}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleTemplateSelect(tmpl.label)}
                      className={`template-card-chip ${
                        selectedTemplate === tmpl.label ? 'active' : ''
                      }`}
                    >
                      {tmpl.icon}
                      <span>{tmpl.label}</span>
                    </motion.button>
                  ))}
                </div>

                <div className="wizard-footer-actions">
                  <motion.button
                    type="button"
                    className="btn-primary"
                    disabled={isGenerating}
                    onClick={onGenerate}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Sparkles size={16} />
                    <span>{isGenerating ? 'Synthesizing Architecture...' : 'Generate Plan'}</span>
                    <ArrowRight size={16} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Plan Output View (Screen 6) */}
            {step === 'plan-output' && (
              <motion.div
                key="step-plan"
                className="wizard-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
              >
                <div className="wizard-header">
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Step 02 // Generated Blueprint
                  </span>
                  <h1 className="wizard-title" style={{ fontFamily: 'var(--font-display)', marginTop: '4px' }}>
                    Your Project Plan
                  </h1>
                  <p className="wizard-subtitle">
                    Here's the complete architectural plan generated by CraftAi.
                  </p>
                </div>

                <div className="plan-output-grid">
                  {/* Left Card: Type, Tech Stack, Sections */}
                  <div className="plan-detail-card">
                    <div className="plan-card-title">Project Type</div>
                    <div className="plan-type-val" style={{ fontFamily: 'var(--font-heading)' }}>
                      {currentPlan.type}
                    </div>

                    <div className="plan-card-title">Tech Stack</div>
                    <div className="tech-badges-list">
                      {(currentPlan.techStack || ['Next.js', 'TailwindCSS', 'React']).map(
                        (tech, idx) => (
                          <div key={idx} className="tech-badge" style={{ fontFamily: 'var(--font-mono)' }}>
                            <Code2 size={13} color="#FFFFFF" />
                            <span>{tech}</span>
                          </div>
                        )
                      )}
                    </div>

                    <div className="plan-card-title">Component Hierarchy</div>
                    <ul className="sections-tree-list">
                      {currentPlan.sections.map((sec, idx) => (
                        <li key={idx} className="section-tree-item" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                          <div className="section-bullet" />
                          <span>{sec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Card: Features Checklist */}
                  <div className="plan-detail-card">
                    <div className="plan-card-title">Architectural Features</div>
                    <ul className="features-checklist">
                      {(
                        currentPlan.features || [
                          'Responsive Design',
                          'Smooth Animations',
                          'Contact Form',
                          'Dark/Light Mode',
                          'Modern UI/UX'
                        ]
                      ).map((feat, idx) => (
                        <motion.li
                          key={idx}
                          className="feature-check-item"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                        >
                          <div className="check-icon-circle">
                            <CheckCircle2 size={15} />
                          </div>
                          <span>{feat}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="wizard-footer-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCurrentScreen('generate-plan')}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Prompt</span>
                  </button>

                  <motion.button
                    type="button"
                    className="btn-primary"
                    onClick={() => setCurrentScreen('workspace')}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span>Continue to Workspace</span>
                    <ArrowRight size={16} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
