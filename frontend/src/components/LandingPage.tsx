import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeProvider';
import { useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  DraftingCompass,
  FileText,
  Moon,
  Network,
  Paperclip,
  ShieldCheck,
  Square,
  Sun,
  X,
  Zap
} from 'lucide-react';
import { GenerationMode } from '../services/api';
import { DESIGN_STYLES } from '../lib/connectorCatalog';
import '../styles/landing.css';

/* Strict 1:1 React port of `new ui components/Hero and main.txt`.
   Notes on the translation:
   - `font-display` in the source config is Space Grotesk; in this app that
     family is the `font-heading` token, so source `font-display` → `font-heading`.
   - The source redefines zinc-900 to #0d0d0d; those spots use the literal hex.
   - Material Symbols icons are replaced 1:1 with lucide-react equivalents.
   - The vanilla <script> behaviors (typewriter, tab switching, dropdowns,
     upload, scroll-reveal, wave canvas) are useState/useEffect conversions. */

const MODES: { id: GenerationMode; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'plan', label: 'Plan' },
  { id: 'chat', label: 'Chat' }
];

const TYPEWRITER_PHRASES = [
  'Build a sleek SaaS landing page...',
  'Design a real-time crypto dashboard...',
  'Create a Stripe e-commerce store...'
];

/** Typewriter placeholder loop — source script #2. Pauses while the
 *  visitor is typing or has typed; static for reduced-motion users. */
const useTypewriter = (paused: boolean) => {
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState(TYPEWRITER_PHRASES[0]);

  useEffect(() => {
    if (reduceMotion) {
      setText(TYPEWRITER_PHRASES[0]);
      return;
    }
    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer = 0;
    const tick = () => {
      if (paused) {
        timer = window.setTimeout(tick, 1000);
        return;
      }
      const current = TYPEWRITER_PHRASES[phrase];
      if (!deleting) {
        char++;
        setText(current.slice(0, char));
        if (char === current.length) {
          deleting = true;
          timer = window.setTimeout(tick, 2200);
        } else {
          timer = window.setTimeout(tick, 65);
        }
      } else {
        char--;
        setText(current.slice(0, char));
        if (char === 0) {
          deleting = false;
          phrase = (phrase + 1) % TYPEWRITER_PHRASES.length;
          timer = window.setTimeout(tick, 400);
        } else {
          timer = window.setTimeout(tick, 30);
        }
      }
    };
    timer = window.setTimeout(tick, 500);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, paused]);

  return text;
};

/** Ambient wave canvas — source script #8 (three sine lines, white 6%). */
const AmbientWave: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        const offset = j * 45;
        for (let x = 0; x < canvas.width; x += 30) {
          const y =
            canvas.height * 0.35 +
            Math.sin(x * 0.003 + t + j) * 40 +
            Math.cos(x * 0.001 - t) * 25 +
            offset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    if (reduceMotion) {
      draw();
    } else {
      const loop = () => {
        draw();
        raf = requestAnimationFrame(loop);
      };
      loop();
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduceMotion]);

  return <canvas ref={ref} aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 opacity-20" />;
};

/** Scroll-reveal wrapper — source script #7 (IntersectionObserver + data-delay). */
const RevealCard: React.FC<{
  delay: number;
  className?: string;
  children: React.ReactNode;
}> = ({ delay, className = '', children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('revealed');
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            window.setTimeout(() => el.classList.add('revealed'), delay);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`arch-reveal-card ${className}`}>
      {children}
    </div>
  );
};

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

/* Feature showcase data (left tabs / right stage) */
type FeatureId = 'pipeline' | 'monaco' | 'vault' | 'healing';

const FEATURES: {
  id: FeatureId;
  phase: string;
  tag: string;
  title: string;
  desc: string;
}[] = [
  {
    id: 'pipeline',
    phase: 'Phase 01',
    tag: 'Deterministic',
    title: '3-Agent Pipeline',
    desc: 'Deterministic orchestration across Architect, Developer, and Debugger agents.'
  },
  {
    id: 'monaco',
    phase: 'Phase 02',
    tag: '0.4s Sync',
    title: 'Monaco IDE & Instant HMR',
    desc: 'Real-time in-browser code editor with instant AST compilation and visual hot reloads.'
  },
  {
    id: 'vault',
    phase: 'Phase 03',
    tag: 'Zero-Key',
    title: '40+ Vault Connectors',
    desc: 'Direct secure bindings into external backends, databases, and microservices.'
  },
  {
    id: 'healing',
    phase: 'Phase 04',
    tag: 'Daemon Active',
    title: 'Autonomous Self-Healing',
    desc: 'Automatic runtime error capture, AST syntax tree reconstruction, and patch verification.'
  }
];

const CONNECTOR_CELLS = [
  ['Supabase', 'Postgres'],
  ['Stripe', 'Billing'],
  ['GitHub', 'v3 API'],
  ['AWS SDK', 'S3 / IAM'],
  ['OpenAI', 'Embeddings'],
  ['Anthropic', 'Claude-3.5']
];

const CodeLine: React.FC<{
  n: number;
  children: React.ReactNode;
}> = ({ n, children }) => (
  <div>
    <span className="text-zinc-500">{n}</span> {children}
  </div>
);

const StageFooter: React.FC<{ left: string; right: string }> = ({ left, right }) => (
  <div className="pt-6 mt-6 border-t border-[#d2d2d7] dark:border-[#27272a] flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
    <span>{left}</span>
    <span className="text-[#1D1D1F] dark:text-white">{right}</span>
  </div>
);

export const LandingPage: React.FC = () => {
  const {
    setCurrentScreen,
    setPrompt,
    setPromptMode,
    promptMode,
    designStyle,
    setDesignStyle,
    attachedContext,
    setAttachedContext,
    handleGeneratePlan,
    cancelGeneration,
    isGenerating,
    statusMessage
  } = useApp();

  const { theme, toggleTheme } = useTheme();

  const [heroPrompt, setHeroPrompt] = useState('');
  const [textareaFocused, setTextareaFocused] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<FeatureId>('pipeline');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholder = useTypewriter(textareaFocused || heroPrompt.length > 0);

  // Outside clicks close the console popovers — source script #3/#4.
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setModeOpen(false);
        setStyleOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Context file attach — real path shared with the PromptConsole
  // (FileReader → setAttachedContext, shipped to the backend as `context`).
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

  // Real generation — setPrompt then handleGeneratePlan (AppContext → api → workspace).
  const onSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroPrompt.trim() || isGenerating) return;
    setPrompt(heroPrompt);
    await handleGeneratePlan(heroPrompt);
  };

  const activeMode = MODES.find(m => m.id === promptMode) ?? MODES[0];
  const ctaLabel =
    promptMode === 'chat' ? 'Ask →' : promptMode === 'plan' ? 'Draft Plan →' : 'Generate Plan →';

  const dropdownBtn =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#0d0d0d] hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-[#d2d2d7] dark:border-[#27272a] text-zinc-600 dark:text-zinc-300 font-mono text-xs transition-colors';
  const menuBase =
    'absolute left-0 bottom-full mb-2 rounded-xl bg-zinc-100 dark:bg-[#0d0d0d] border border-[#d2d2d7] dark:border-[#27272a] shadow-xl p-1 z-30 font-mono text-xs';

  return (
    <div className="landing-root min-h-screen w-full bg-[#F5F5F7] text-[#1D1D1F] dark:bg-black dark:text-white antialiased relative overflow-x-hidden">
      {/* Ambient Background & Monochrome Dot Grid */}
      <div className="fixed inset-0 dot-grid pointer-events-none z-0 opacity-40 dark:opacity-40" />
      <AmbientWave />

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#F5F5F7]/90 dark:bg-black/85 backdrop-blur-md border-b border-[#d2d2d7] dark:border-[#27272a]">
        <div className="h-16 max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <button
            type="button"
            onClick={() => scrollToId('home')}
            className="flex items-center gap-2.5 group"
            aria-label="CraftAI home"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-[#0d0d0d] border border-[#d2d2d7] dark:border-[#27272a] flex items-center justify-center group-hover:border-zinc-400 transition-colors">
              <svg className="w-4 h-4 text-[#1D1D1F] dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <span className="font-heading font-semibold text-lg tracking-tight text-[#1D1D1F] dark:text-white">CraftAI</span>
          </button>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-zinc-100 dark:bg-[#0d0d0d] border border-[#d2d2d7] dark:border-[#27272a]">
            <button
              type="button"
              onClick={() => scrollToId('home')}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-[#1D1D1F] dark:text-white bg-zinc-200 dark:bg-zinc-800 transition-colors"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToId('features')}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToId('architecture')}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
            >
              Architecture
            </button>
            <button
              type="button"
              onClick={() => scrollToId('about')}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
            >
              About
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              aria-label="Toggle Theme"
              className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-[#0d0d0d] border border-[#d2d2d7] dark:border-[#27272a] flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white hover:border-zinc-500 transition-all"
              onClick={toggleTheme}
              type="button"
            >
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen('login')} // through auth UI; Supabase is bypassed inside AuthSplit
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-medium !bg-zinc-900 hover:!bg-zinc-700 !text-white dark:!bg-white dark:!text-black dark:hover:!bg-zinc-200 transition-all active:scale-[0.98] shadow-sm font-sans"
            >
              Launch Workspace
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full relative z-10 flex flex-col items-center">
        {/* ==================== 1. HERO SECTION & PROMPT CONSOLE ==================== */}
        <section
          id="home"
          className="w-full pt-32 pb-24 flex flex-col items-center justify-center text-center px-4"
        >
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
            {/* Main Heading */}
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#1D1D1F] dark:text-white leading-[1.1] max-w-3xl mb-4">
              Turn Your Ideas Into Real Projects with AI
            </h1>
            {/* Minimal Subtitle */}
            <p className="font-sans text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Describe what you want to build — the Architect plans, the Developer codes, and the
              Debugger polishes.
            </p>

            {/* Upgraded Prompt Console Card with Crisp Monochrome Contrast */}
            <form
              onSubmit={onSubmitPrompt}
              className="w-full max-w-3xl mono-card backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none flex flex-col text-left transition-all"
            >
              {/* Input Textarea with Active Typewriter Simulation */}
              <textarea
                value={heroPrompt}
                onChange={e => setHeroPrompt(e.target.value)}
                onFocus={() => setTextareaFocused(true)}
                onBlur={() => setTextareaFocused(false)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                  }
                }}
                aria-label="Describe what you want to build"
                maxLength={4000}
                placeholder={placeholder}
                className="w-full bg-transparent text-[#1D1D1F] dark:text-white placeholder:text-zinc-500 font-sans text-base resize-none focus:outline-none p-2 leading-relaxed h-28"
              />
              {/* Bottom Controls Inside Console */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-[#d2d2d7] dark:border-[#27272a]">
                <div className="flex items-center gap-2 relative" ref={menuRef}>
                  {/* File Attachment Button with Tooltip */}
                  <div className="relative group">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.json,.md"
                      className="hidden"
                      onChange={onContextFile}
                    />
                    <button
                      aria-label="Attach spec or mockup"
                      className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-[#0d0d0d] hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-[#d2d2d7] dark:border-[#27272a] hover:border-zinc-500 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <Paperclip size={16} />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-0 hidden group-hover:flex items-center whitespace-nowrap px-2.5 py-1 rounded bg-zinc-100 dark:bg-[#0d0d0d] border border-[#d2d2d7] dark:border-[#27272a] text-[11px] font-mono text-zinc-600 dark:text-zinc-300 shadow-xl pointer-events-none z-40">
                      Attach spec, PDF, or mockup
                    </div>
                  </div>

                  {/* Upload indicator badge (real attachedContext state) */}
                  {attachedContext && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-[#0d0d0d] border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-100 font-mono text-[11px]">
                      <FileText size={13} />
                      <span className="max-w-[100px] truncate">{attachedContext.name}</span>
                      <button
                        className="hover:text-[#1D1D1F] dark:hover:text-white ml-0.5"
                        onClick={() => setAttachedContext(null)}
                        type="button"
                        aria-label="Remove attached file"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}

                  {/* Mode Dropdown Pill: Build / Plan / Chat (real promptMode) */}
                  <div className="relative">
                    <button
                      className={dropdownBtn}
                      onClick={e => {
                        e.stopPropagation();
                        setModeOpen(o => !o);
                        setStyleOpen(false);
                      }}
                      type="button"
                    >
                      <span>{activeMode.label}</span>
                      <ChevronDown size={14} className="text-zinc-500" />
                    </button>
                    {modeOpen && (
                      <div className={`${menuBase} w-32`}>
                        {MODES.map(m => (
                          <button
                            key={m.id}
                            className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${
                              promptMode === m.id
                                ? 'text-[#1D1D1F] dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
                            }`}
                            onClick={() => {
                              setPromptMode(m.id);
                              setModeOpen(false);
                            }}
                            type="button"
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Spec Dropdown Pill (real designStyle, styled per source) */}
                  <div className="relative">
                    <button
                      className={dropdownBtn}
                      onClick={e => {
                        e.stopPropagation();
                        setStyleOpen(o => !o);
                        setModeOpen(false);
                      }}
                      type="button"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white"></span>
                      <span>{designStyle ?? 'Design Style'}</span>
                      <ChevronDown size={14} className="text-zinc-500" />
                    </button>
                    {styleOpen && (
                      <div className={`${menuBase} w-44`}>
                        {designStyle && (
                          <button
                            className="w-full text-left px-3 py-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                            onClick={() => {
                              setDesignStyle(null);
                              setStyleOpen(false);
                            }}
                            type="button"
                          >
                            None
                          </button>
                        )}
                        {DESIGN_STYLES.map(s => (
                          <button
                            key={s.id}
                            className="w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors text-zinc-500 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            onClick={() => {
                              setDesignStyle(s.title);
                              setStyleOpen(false);
                            }}
                            type="button"
                          >
                            {s.title}
                            {designStyle === s.title && <Check size={12} className="text-[#1D1D1F] dark:text-white" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary CTA Button (High-contrast pure white) — real generation/cancel.
                   Always full-opacity; gating is the disabled attr only (cursor changes,
                   nothing else — the user can still see & click to start typing). */}
                <button
                  type={isGenerating ? 'button' : 'submit'}
                  disabled={!isGenerating && !heroPrompt.trim()}
                  onClick={isGenerating ? cancelGeneration : undefined}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm !text-white !bg-zinc-900 hover:!bg-zinc-700 dark:!text-black dark:!bg-white dark:hover:!bg-zinc-200 active:scale-95 shadow-md transition-all disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Square size={13} />
                      <span>Stop</span>
                    </>
                  ) : (
                    <span>{ctaLabel}</span>
                  )}
                </button>
              </div>
            </form>

            {/* Real status / error surfacing */}
            {statusMessage && (
              <p className="font-mono text-xs mt-4 max-w-2xl text-zinc-500 dark:text-zinc-400" role="status">
                {statusMessage}
              </p>
            )}
          </div>
        </section>

        {/* ==================== 2. FEATURES SECTION: TWO-COLUMN SHOWCASE (TABS / STAGE) ==================== */}
        <section id="features" className="w-full py-24 px-6 border-t border-[#d2d2d7] dark:border-[#27272a] relative">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="flex flex-col items-center text-center mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#0d0d0d] border border-[#d2d2d7] dark:border-[#27272a] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white"></span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Capabilities
                </span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1D1D1F] dark:text-white mb-4">
                Engineered for Production
              </h2>
              <p className="font-sans text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                A deterministic multi-agent pipeline designed to deliver verified, production-ready
                full-stack software.
              </p>
            </div>

            {/* Interactive Two-Column Showcase (Left Selector Tabs / Right Stage) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
              {/* Left Column: Feature Selector Navigation (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-3 justify-center">
                {FEATURES.map(f => {
                  const active = activeFeature === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveFeature(f.id)}
                      className={`group w-full text-left p-5 rounded-2xl border transition-all duration-300 ease-out relative overflow-hidden ${
                        active ? 'bg-zinc-100 dark:bg-[#0d0d0d] border-zinc-900 dark:border-white/80' : 'bg-white dark:bg-[#09090b] border-[#d2d2d7] dark:border-[#27272a] hover:border-zinc-600'
                      }`}
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 bg-zinc-900 dark:bg-white transition-all duration-300 ease-out ${
                          active ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50'
                        }`}
                      ></div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 group-hover:text-[#1D1D1F] dark:group-hover:text-zinc-200 transition-colors">
                          {f.phase}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500 border border-zinc-300 dark:border-zinc-800 px-2 py-0.5 rounded">
                          {f.tag}
                        </span>
                      </div>
                      <h3
                        className={`font-heading text-lg font-semibold mb-1 transition-colors ${
                          active ? 'text-[#1D1D1F] dark:text-white' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-[#1D1D1F] dark:hover:text-white'
                        }`}
                      >
                        {f.title}
                      </h3>
                      <p
                        className={`text-xs leading-relaxed transition-colors ${
                          active ? 'text-[#1D1D1F] dark:text-white' : 'text-zinc-500 group-hover:text-[#1D1D1F] dark:group-hover:text-white'
                        }`}
                      >
                        {f.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: The Stage (7 cols) */}
              <div className="lg:col-span-7 rounded-2xl border border-[#d2d2d7] dark:border-[#27272a] bg-white dark:bg-[#09090b] p-6 sm:p-8 flex flex-col justify-between min-h-[460px] relative overflow-hidden">
                {/* Corner Hairline accents */}
                <div className="absolute top-3 right-3 text-[10px] font-mono text-zinc-500">
                  STAGE // LIVE
                </div>

                {/* Panel 1: 3-Agent Pipeline (key remount re-triggers stage-animate) */}
                {activeFeature === 'pipeline' && (
                  <div key="pipeline" className="stage-animate flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#d2d2d7] dark:border-[#27272a]">
                        <div>
                          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Architecture Pipeline
                          </span>
                          <h4 className="font-heading text-xl font-semibold text-[#1D1D1F] dark:text-white mt-1">
                            Multi-Agent State Orchestrator
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#000000] border border-[#d2d2d7] dark:border-[#27272a] font-mono text-xs text-zinc-600 dark:text-zinc-600 dark:text-zinc-300">
                          <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white dot-pulse-glow"></span>
                          <span>Synchronized</span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                        Continuous verification handoffs. Each node is isolated, executing type
                        checks and assertions before transitioning state.
                      </p>
                      {/* Minimalist Monochrome Node Flow */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 relative">
                        {/* Node 1: Architect */}
                        <div className="float-node-1 p-4 rounded-xl bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] flex flex-col justify-between h-36 transition-colors hover:border-zinc-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[#1D1D1F] dark:text-white">
                              <DraftingCompass size={17} />
                              <span className="font-heading font-semibold text-xs tracking-wide">
                                Architect
                              </span>
                            </div>
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white dot-pulse-glow"></span>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                              Planning Architecture
                            </div>
                            <div className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-[#0d0d0d]/90 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-800">
                              AST Spec · Valid
                            </div>
                          </div>
                        </div>
                        {/* Node 2: Developer */}
                        <div className="float-node-2 p-4 rounded-xl bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] flex flex-col justify-between h-36 transition-colors hover:border-zinc-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[#1D1D1F] dark:text-white">
                              <Code2 size={17} />
                              <span className="font-heading font-semibold text-xs tracking-wide">
                                Developer
                              </span>
                            </div>
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white dot-pulse-glow"></span>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                              Generating Source
                            </div>
                            <div className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-[#0d0d0d]/90 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-800">
                              TypeScript · Strict
                            </div>
                          </div>
                        </div>
                        {/* Node 3: Debugger */}
                        <div className="float-node-3 p-4 rounded-xl bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] flex flex-col justify-between h-36 transition-colors hover:border-zinc-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[#1D1D1F] dark:text-white">
                              <BadgeCheck size={17} />
                              <span className="font-heading font-semibold text-xs tracking-wide">
                                Debugger
                              </span>
                            </div>
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white dot-pulse-glow"></span>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                              Test Assertions
                            </div>
                            <div className="text-[10px] font-mono text-[#1D1D1F] dark:text-white bg-zinc-100 dark:bg-[#0d0d0d]/90 px-2 py-1 rounded border border-zinc-700 font-semibold">
                              48/48 Passing
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <StageFooter left="Deterministic state loop" right="Zero prompt leakage · < 850ms latency" />
                  </div>
                )}

                {/* Panel 2: Monaco IDE & Instant HMR */}
                {activeFeature === 'monaco' && (
                  <div key="monaco" className="stage-animate flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#d2d2d7] dark:border-[#27272a]">
                        <div>
                          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Dev Environment
                          </span>
                          <h4 className="font-heading text-xl font-semibold text-[#1D1D1F] dark:text-white mt-1">
                            Monaco Browser IDE
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#000000] border border-[#d2d2d7] dark:border-[#27272a] font-mono text-xs text-zinc-600 dark:text-zinc-600 dark:text-zinc-300">
                          <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white dot-pulse-glow"></span>
                          <span>HMR Synchronized</span>
                        </div>
                      </div>
                      {/* Grayscale Code Window Mockup */}
                      <div className="rounded-xl bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] overflow-hidden font-mono text-xs">
                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-100 dark:bg-[#0d0d0d] border-b border-[#d2d2d7] dark:border-[#27272a]">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
                            <span className="text-zinc-500 dark:text-zinc-400 ml-2 text-[11px]">App.tsx</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                            TSX · Vite 5.2
                          </span>
                        </div>
                        <div className="p-4 text-zinc-600 dark:text-zinc-300 space-y-1.5 overflow-x-auto text-[12px] leading-relaxed">
                          <CodeLine n={1}>
                            <span className="text-[#1D1D1F] dark:text-white font-semibold">import</span> {'{ useState }'}{' '}
                            <span className="text-[#1D1D1F] dark:text-white font-semibold">from</span>{' '}
                            <span className="text-zinc-500 dark:text-zinc-400">"react"</span>;
                          </CodeLine>
                          <CodeLine n={2}>
                            <span className="text-[#1D1D1F] dark:text-white font-semibold">import</span>{' '}
                            {'{ usePipeline }'} <span className="text-[#1D1D1F] dark:text-white font-semibold">from</span>{' '}
                            <span className="text-zinc-500 dark:text-zinc-400">"@craftai/runtime"</span>;
                          </CodeLine>
                          <CodeLine n={3}>{' '}</CodeLine>
                          <CodeLine n={4}>
                            <span className="text-[#1D1D1F] dark:text-white font-semibold">export default function</span>{' '}
                            <span className="text-[#1D1D1F] dark:text-white underline decoration-zinc-600">Workspace</span>
                            () {'{'}
                          </CodeLine>
                          <CodeLine n={5}>
                            <span className="text-[#1D1D1F] dark:text-white font-semibold">const</span> {'{ state, dispatch }'} =
                            usePipeline();
                          </CodeLine>
                          <CodeLine n={6}>
                            <span className="text-[#1D1D1F] dark:text-white font-semibold">return</span> (
                          </CodeLine>
                          <CodeLine n={7}>
                            {'    <'}
                            <span className="text-[#1D1D1F] dark:text-white font-medium">LiveProvider</span> engine=
                            <span className="text-zinc-600 dark:text-zinc-300">"craft-v2"</span> deterministic&gt;
                          </CodeLine>
                          <CodeLine n={8}>
                            {'      <'}
                            <span className="text-[#1D1D1F] dark:text-white font-medium">StreamViewport</span> tree=
                            {'{state.ast}'} /&gt;
                          </CodeLine>
                          <CodeLine n={9}>
                            {'    </'}
                            <span className="text-[#1D1D1F] dark:text-white font-medium">LiveProvider</span>&gt;
                          </CodeLine>
                          <CodeLine n={10}>{'  );'}</CodeLine>
                          <CodeLine n={11}>{'}'}</CodeLine>
                        </div>
                      </div>
                    </div>
                    <StageFooter left="Sub-millisecond AST parser" right="WebAssembly Runtime Ready" />
                  </div>
                )}

                {/* Panel 3: 40+ Vault Connectors */}
                {activeFeature === 'vault' && (
                  <div key="vault" className="stage-animate flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#d2d2d7] dark:border-[#27272a]">
                        <div>
                          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Ecosystem
                          </span>
                          <h4 className="font-heading text-xl font-semibold text-[#1D1D1F] dark:text-white mt-1">
                            Encrypted Vault Integrations
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#000000] border border-[#d2d2d7] dark:border-[#27272a] font-mono text-xs text-zinc-600 dark:text-zinc-600 dark:text-zinc-300">
                          <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white dot-pulse-glow"></span>
                          <span>Zero-Key Isolation</span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                        Direct cryptographic bindings into external services. Credentials never
                        touch prompt contexts or leave your secure enclave.
                      </p>
                      {/* Minimalist Grayscale Connectors Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CONNECTOR_CELLS.map(([name, kind]) => (
                          <div
                            key={name}
                            className="p-3.5 rounded-xl bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] hover:border-zinc-400 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white"></span>
                              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-100">{name}</span>
                            </div>
                            <span className="font-mono text-[10px] text-zinc-500">{kind}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <StageFooter left="AES-256 Enclave Encryption" right="SOC2 Compliant Sandboxing" />
                  </div>
                )}

                {/* Panel 4: Autonomous Self-Healing */}
                {activeFeature === 'healing' && (
                  <div key="healing" className="stage-animate flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#d2d2d7] dark:border-[#27272a]">
                        <div>
                          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Autonomous Runtime
                          </span>
                          <h4 className="font-heading text-xl font-semibold text-[#1D1D1F] dark:text-white mt-1">
                            Abstract AST Patch Inspection
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#000000] border border-[#d2d2d7] dark:border-[#27272a] font-mono text-xs text-zinc-600 dark:text-zinc-600 dark:text-zinc-300">
                          <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white dot-pulse-glow"></span>
                          <span>Daemon Listening</span>
                        </div>
                      </div>
                      {/* Clean Grayscale Diff / Patch View */}
                      <div className="rounded-xl bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] p-4 font-mono text-xs space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-300 dark:border-zinc-800 text-zinc-500 text-[11px]">
                          <span>DIFF // AST_REPAIR_CONTEXT.PATCH</span>
                          <span>STATUS: VERIFIED</span>
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 leading-relaxed space-y-1 text-[11px]">
                          <div className="text-zinc-500">
                            @@ -14,5 +14,8 @@ src/lib/auth-guard.ts
                          </div>
                          <div className="text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-[#0d0d0d]/60 px-2 py-0.5 rounded line-through opacity-60">
                            - interface SessionPayload {'{'} userId: string {'}'}
                          </div>
                          <div className="text-[#1D1D1F] dark:text-white bg-zinc-200 dark:bg-zinc-800/80 px-2 py-0.5 rounded font-medium">
                            + interface SessionPayload {'{'} userId: string; organizationId: string {'}'}
                          </div>
                          <div className="text-[#1D1D1F] dark:text-white bg-zinc-200 dark:bg-zinc-800/80 px-2 py-0.5 rounded font-medium">
                            + export function assertSession(val: unknown): asserts val is
                            SessionPayload
                          </div>
                          <div className="text-zinc-500 pt-1">
                            --- Validation run: 12 unit assertions passed. 0 regression flags.
                          </div>
                        </div>
                      </div>
                    </div>
                    <StageFooter left="Automatic syntax reconciliation" right="Auto-Healed in 180ms" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== 3. ABOUT & ARCHITECTURE ("Architectural Integrity") ==================== */}
        <section id="architecture" className="w-full py-24 px-6 border-t border-[#d2d2d7] dark:border-[#27272a] relative">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="flex flex-col items-center text-center mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#0d0d0d] border border-[#d2d2d7] dark:border-[#27272a] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white"></span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Specification
                </span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1D1D1F] dark:text-white mb-4">
                Architectural Integrity
              </h2>
              <p className="font-sans text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                Zero black-box abstractions. What you inspect is what you ship.
              </p>
            </div>

            {/* 3-Column Executive Architectural Cards (Monochrome Refined) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Network size={20} className="text-zinc-600 dark:text-zinc-300 group-hover:text-[#1D1D1F] dark:hover:text-white transition-colors duration-300" />,
                  title: '100% Deterministic Codebase',
                  desc: 'Clean standard Vite and Next.js structure. Zero proprietary lock-in or obscure runtime wrappers.',
                  points: [
                    'Strict TypeScript interfaces',
                    'Vanilla Tailwind CSS styling',
                    'Portable Git repo export'
                  ],
                  delay: 100
                },
                {
                  icon: <Zap size={20} className="text-zinc-600 dark:text-zinc-300 group-hover:text-[#1D1D1F] dark:hover:text-white transition-colors duration-300" />,
                  title: '0.4s Instant Hot Reload',
                  desc: 'Local WebContainers run directly in the browser with sub-second feedback loops and no cloud round-trips.',
                  points: [
                    'Browser WebAssembly node',
                    'Zero server latency on UI edits',
                    'Stateful hot-module replacement'
                  ],
                  delay: 200
                },
                {
                  icon: <ShieldCheck size={20} className="text-zinc-600 dark:text-zinc-300 group-hover:text-[#1D1D1F] dark:hover:text-white transition-colors duration-300" />,
                  title: 'Isolated Multi-Tenant Security',
                  desc: 'Enterprise sandboxing, SOC2 Type II readiness, and row-level security guardrails baked in by default.',
                  points: [
                    'SOC2 Type II compliant readiness',
                    'Row Level Security (RLS) enforcement',
                    'Sandboxed micro-worker execution'
                  ],
                  delay: 300
                }
              ].map(card => (
                <RevealCard
                  key={card.title}
                  delay={card.delay}
                  className="mono-card group rounded-2xl p-6 sm:p-7 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#09090b] border border-[#d2d2d7] dark:border-[#27272a] flex items-center justify-center text-[#1D1D1F] dark:text-white mb-5 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-[#27272a] group-hover:border-zinc-500">
                      {card.icon}
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-[#1D1D1F] dark:text-white mb-2 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">{card.desc}</p>
                  </div>
                  <div className="space-y-2.5 pt-4 border-t border-[#d2d2d7] dark:border-[#27272a] text-xs font-mono text-zinc-600 dark:text-zinc-300">
                    {card.points.map(p => (
                      <div key={p} className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-[#1D1D1F] dark:text-white" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </RevealCard>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== 4. PRE-FOOTER CTA (TRUE MONOCHROME) ==================== */}
        <section className="w-full py-28 px-6 border-t border-[#d2d2d7] dark:border-[#27272a] relative overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            <h2 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F] dark:text-white mb-4">
              Stop planning. Start building.
            </h2>
            <p className="font-sans text-base text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mb-9 leading-relaxed">
              Generate, deploy, and scale autonomous full-stack software directly from natural
              language.
            </p>
            {/* Centered stark high-contrast pure white CTA */}
            <button
              type="button"
              onClick={() => setCurrentScreen('signup')} // through auth UI; Supabase is bypassed inside AuthSplit
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-medium text-sm !text-white !bg-zinc-900 hover:!bg-zinc-700 dark:!text-black dark:!bg-white dark:hover:!bg-zinc-200 active:scale-95 transition-all shadow-lg"
            >
              <span>Launch Your First AI Project</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      {/* ==================== 5. ENTERPRISE FOOTER & GLOBAL STATUS ==================== */}
      <footer className="w-full relative z-10 border-t border-[#d2d2d7] dark:border-[#27272a] bg-[#F5F5F7] dark:bg-black">
        {/* Global Status Bar */}
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-500 dark:text-zinc-400 border-b border-[#d2d2d7] dark:border-[#27272a]/60">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white dot-pulse-glow"></span>
            <span className="text-[#1D1D1F] dark:text-zinc-100 font-medium">All systems nominal</span>
            <span className="text-[#1D1D1F] hidden sm:inline">|</span>
            <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">
              SOC2 Type II Ready · Instant Deployment · Git Synchronized
            </span>
          </div>
          <div className="text-zinc-500 text-[11px]">Engine v2.0.4</div>
        </div>

        {/* Enterprise Directory Grid */}
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8 border-b border-[#d2d2d7] dark:border-[#27272a]/60">
          {/* Brand Column */}
          <div id="about" className="col-span-2 md:col-span-1 space-y-3 scroll-mt-24">
            <button
              type="button"
              onClick={() => scrollToId('home')}
              className="flex items-center gap-2"
              aria-label="CraftAI home"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-[#0d0d0d] border border-[#d2d2d7] dark:border-[#27272a] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#1D1D1F] dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <span className="font-heading font-semibold text-base text-[#1D1D1F] dark:text-white">CraftAI</span>
            </button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs">
              Autonomous multi-agent project engine engineering verified production applications
              from prompt to ship.
            </p>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#1D1D1F] dark:text-zinc-100 mb-3 font-semibold">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              {['3-Agent Pipeline', 'Monaco Web IDE', 'Self-Healing Runtime', 'Vault Connectors'].map(
                item => (
                  <li key={item}>
                    <button
                      type="button"
                      className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                      onClick={() => scrollToId('features')}
                    >
                      {item}
                    </button>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Column 2: Resources */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#1D1D1F] dark:text-zinc-100 mb-3 font-semibold">
              Resources
            </h4>
            <ul className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <li>
                <button
                  type="button"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                  onClick={() => setCurrentScreen('features')}
                >
                  Documentation
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                  onClick={() => setCurrentScreen('generate-plan')}
                >
                  API Reference
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                  onClick={() => setCurrentScreen('projects')}
                >
                  Starter Templates
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                  onClick={() => setCurrentScreen('connectors')}
                >
                  Integrations
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#1D1D1F] dark:text-zinc-100 mb-3 font-semibold">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <li>
                <button
                  type="button"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                  onClick={() => scrollToId('about')}
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                  onClick={() => scrollToId('about')}
                >
                  Changelog
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                  onClick={() => setCurrentScreen('signup')}
                >
                  Careers
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                  onClick={() => scrollToId('architecture')}
                >
                  Security
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#1D1D1F] dark:text-zinc-100 mb-3 font-semibold">
              Legal
            </h4>
            <ul className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              {['Privacy Policy', 'Terms of Service', 'SOC2 Compliance', 'Subprocessors'].map(item => (
                <li key={item}>
                  <button
                    type="button"
                    className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                    onClick={() => scrollToId('home')}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Minimalist Copyright & Social Icons */}
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>© 2026 CraftAI Inc. All rights reserved. Built for autonomous software engineering.</div>
          <div className="flex items-center gap-5 text-zinc-500 dark:text-zinc-400">
            <a
              aria-label="X Twitter"
              className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
              </svg>
            </a>
            <a
              aria-label="GitHub"
              className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"></path>
              </svg>
            </a>
            <a
              aria-label="Discord"
              className="text-zinc-600 dark:text-zinc-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"></path>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;