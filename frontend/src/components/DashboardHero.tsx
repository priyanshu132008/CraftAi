import React, { useEffect, useRef, useState } from 'react';
import { HeroParticleField } from './HeroParticleField';
import { useApp } from '../context/AppContext';
import type { GenerationMode } from '../services/api';
import { Paperclip, ChevronDown, ArrowRight, Square, Layers } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import '../styles/dashboard-stitch.css';

const MODE_OPTIONS: { id: GenerationMode; label: string; badge: string }[] = [
  { id: 'build', label: 'BUILD', badge: 'Auto' },
  { id: 'plan', label: 'ARCHITECT', badge: 'Spec' },
  { id: 'chat', label: 'AUDIT', badge: 'Sec' }
];

const SCOPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'full-stack', label: 'Full-Stack Spec' },
  { id: 'microservice', label: 'Microservice API' },
  { id: 'frontend', label: 'Frontend UI' },
  { id: 'db-rag', label: 'Database & RAG' }
];

const TYPEWRITER_PROMPT = 'Describe what you want to build…';

export const DashboardHero: React.FC = () => {
  const {
    user,
    statusMessage,
    isGenerating,
    cancelGeneration,
    handleGeneratePlan,
    setPrompt,
    promptMode,
    setPromptMode
  } = useApp();

  const rawName = user?.name?.split(/\s+/)[0] ?? '';
  const name = rawName.length > 20 ? rawName.slice(0, 20) + '…' : rawName;

  const [promptText, setPromptText] = useState('');
  const [modeOpen, setModeOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scope, setScope] = useState<string>('Full-Stack Spec');
  const [typewriterPlaceholder, setTypewriterPlaceholder] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[data-prompt-dropdown]')) {
        setModeOpen(false);
        setScopeOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (promptText) {
      setTypewriterPlaceholder('');
      return;
    }
    let i = 0;
    setTypewriterPlaceholder('');
    const id = window.setInterval(() => {
      i += 1;
      setTypewriterPlaceholder(TYPEWRITER_PROMPT.slice(0, i));
      if (i >= TYPEWRITER_PROMPT.length) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [promptText]);

  const onGenerate = async () => {
    if (isGenerating) {
      cancelGeneration();
      return;
    }
    if (!promptText.trim()) return;
    setPrompt(promptText);
    await handleGeneratePlan(promptText, { scope });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate();
  };

  const onContextFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) {
      setPromptText(t => (t ? `${t}\n\n[Attached: ${f.name}]` : `[Attached: ${f.name}]`));
    }
  };

  const activeMode = MODE_OPTIONS.find(m => m.id === promptMode) ?? MODE_OPTIONS[0];

  return (
    <div className="view-panel w-full flex-1 flex flex-col justify-between dot-grid relative overflow-hidden py-14 px-8 stitch-dashboard" id="view-dashboard">
      <HeroParticleField />
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center pt-8 z-10">
        
        {/* Engine status pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#09090b] border border-[#d2d2d7] dark:border-[#27272a] mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-300 uppercase tracking-widest font-medium">
            AI Engine Mesh Active
          </span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[#1D1D1F] dark:text-white font-bold tracking-tight text-center leading-[1.1] mb-5">
          Turn Your Ideas Into Real Projects with AI
        </h1>

        <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl text-center leading-relaxed font-sans mb-10">
          {name
            ? <>
                Welcome back, <span className="text-[#1D1D1F] dark:text-white font-medium">{name}</span>. The{' '}
              </>
            : 'Describe what you want to build — the '}
          <span className="text-[#1D1D1F] dark:text-white font-medium">Architect</span> plans,
          the <span className="text-[#1D1D1F] dark:text-white font-medium">Developer</span> codes,
          and the <span className="text-[#1D1D1F] dark:text-white font-medium">Debugger</span> polishes.
        </p>

        {/* Pristine prompt console card wrapped perfectly from code.html */}
        <form onSubmit={onSubmit} className="w-full relative group">
          <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-[#d2d2d7] dark:border-[#27272a] shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_12px_48px_rgba(0,0,0,0.85)] hover:border-zinc-600 transition-all duration-300 backdrop-blur-xl overflow-visible relative">
            <div className="p-6 flex flex-col gap-4">
              
              {/* Inner Textarea with Live Typewriter */}
              <div className="relative min-h-[120px] w-full flex items-start">
                <textarea
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      onGenerate();
                    }
                  }}
                  rows={4}
                  spellCheck={false}
                  placeholder=""
                  className="w-full h-full bg-transparent resize-none outline-none font-mono text-sm sm:text-base text-[#1D1D1F] dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black z-20"
                />
                
                {promptText.length === 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none flex items-start font-mono text-sm sm:text-base text-zinc-400 z-10 leading-relaxed"
                  >
                    <span className="text-zinc-400 dark:text-zinc-100">{typewriterPlaceholder}</span>
                    <span className="w-2 h-5 ml-0.5 bg-zinc-900 dark:bg-white inline-block animate-pulse align-middle" />
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#d2d2d7] dark:border-[#27272a]">
                
                {/* Left controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] text-zinc-500 hover:text-[#1D1D1F] dark:hover:text-white hover:border-zinc-500 dark:hover:border-zinc-500 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach specifications or repository"
                  >
                    <Paperclip size={16} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.json,.md"
                    className="hidden"
                    onChange={onContextFile}
                  />
                  <div className="h-4 w-px bg-zinc-200 dark:bg-[#27272a] mx-1" />

                  {/* Mode dropdown */}
                  <div className="relative inline-block text-left" data-prompt-dropdown>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] text-zinc-600 dark:text-zinc-100 text-xs font-mono tracking-wider hover:border-zinc-500 transition-colors"
                      onClick={e => {
                        e.stopPropagation();
                        setModeOpen(o => !o);
                        setScopeOpen(false);
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white" />
                      <span>{activeMode.label}</span>
                      <ChevronDown size={14} className="text-zinc-400" />
                    </button>
                    <AnimatePresence>
                      {modeOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 bottom-full mb-2 w-44 rounded-xl bg-white dark:bg-[#09090b] border border-[#d2d2d7] dark:border-[#27272a] shadow-2xl p-1.5 z-30 font-mono text-xs"
                        >
                          {MODE_OPTIONS.map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              className={`w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between transition-colors ${
                                promptMode === opt.id ? 'text-[#1D1D1F] dark:text-white font-semibold' : 'text-zinc-600 dark:text-zinc-300'
                              }`}
                              onClick={() => {
                                setPromptMode(opt.id);
                                setModeOpen(false);
                              }}
                            >
                              <span>• {opt.label}</span>
                              <span className="text-[10px] text-zinc-500">{opt.badge}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Scope dropdown */}
                  <div className="relative inline-block text-left" data-prompt-dropdown>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] text-zinc-600 dark:text-zinc-100 text-xs font-mono tracking-wider hover:border-zinc-500 transition-colors"
                      onClick={e => {
                        e.stopPropagation();
                        setScopeOpen(o => !o);
                        setModeOpen(false);
                      }}
                    >
                      <Layers size={14} className="text-zinc-400" />
                      <span className="uppercase">{scope}</span>
                      <ChevronDown size={14} className="text-zinc-400" />
                    </button>
                    <AnimatePresence>
                      {scopeOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 bottom-full mb-2 w-48 rounded-xl bg-white dark:bg-[#09090b] border border-[#d2d2d7] dark:border-[#27272a] shadow-2xl p-1.5 z-30 font-mono text-xs"
                        >
                          {SCOPE_OPTIONS.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              className={`w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${
                                scope === s.label ? 'text-[#1D1D1F] dark:text-white font-semibold' : 'text-zinc-600 dark:text-zinc-300'
                              }`}
                              onClick={() => {
                                setScope(s.label);
                                setScopeOpen(false);
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 text-zinc-500 font-mono text-xs ml-2">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] text-zinc-400 text-[10px]">
                      ⌘
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] text-zinc-400 text-[10px]">
                      Enter
                    </kbd>
                  </div>
                </div>

                {/* Right primary button */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type={isGenerating ? 'button' : 'submit'}
                  onClick={isGenerating ? cancelGeneration : undefined}
                  className="group/btn relative flex items-center gap-2 px-5 py-2.5 rounded-xl shrink-0 whitespace-nowrap !bg-zinc-900 !text-white dark:!bg-white dark:!text-black font-semibold text-xs tracking-wider uppercase shadow-md hover:!bg-zinc-700 dark:hover:!bg-zinc-200 active:scale-95 transition-all duration-150"
                >
                  {isGenerating ? (
                    <>
                      <Square size={14} className="fill-current" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Plan</span>
                      <ArrowRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </form>

        {statusMessage && !isGenerating && (
          <p className="mt-5 font-mono text-sm text-zinc-500">{statusMessage}</p>
        )}
        {reduceMotion === false && isGenerating && (
          <p className="mt-5 font-mono text-sm text-[#1D1D1F] dark:text-white">
            Architect → Developer → Debugger running…
          </p>
        )}
      </div>

      {/* Blueprint-matrix standby strip */}
      <div className="w-full max-w-4xl mx-auto mt-12 py-10 rounded-xl blueprint-matrix border border-[#d2d2d7] dark:border-[#27272a]/40 opacity-40 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          Mesh Pipeline Standby • Awaiting Execution Prompt
        </div>
      </div>
    </div>
  );
};