import React, { useEffect, useRef, useState } from 'react';
import { useApp, ChatMessage } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  Code2,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  FolderGit2,
  Globe,
  Loader2,
  Monitor,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  User
} from 'lucide-react';
import { FileTree } from './FileTree';
import CodeViewer from './CodeViewer';
import { PromptConsole } from './PromptConsole';
import { GeneratedFile, TraceStep } from '../services/api';

const PREVIEW_URL = 'http://localhost:3000/preview';
const DEPLOY_API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000') + '/api/deploy';
const DEPLOY_DOMAIN = 'craftai.app';

const VIEWPORT_SIZES = {
  desktop: { width: '100%', height: '100%', radius: 0 },
  tablet: { width: 768, height: 1024, radius: 16 },
  mobile: { width: 375, height: 667, radius: 24 }
} as const;
type ViewportMode = keyof typeof VIEWPORT_SIZES;

// ---------------------------------------------------------------------------
// Markdown-lite renderer for chat/plan replies (headings, bullets, bold,
// fenced code blocks) — no external markdown dependency.
// ---------------------------------------------------------------------------
const renderInline = (text: string, keyPrefix: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyPrefix}-${i}`} style={{ color: '#F1F5F9' }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
    )
  );

const renderRichText = (text: string): React.ReactNode =>
  text.split('```').map((block, i) => {
    if (i % 2 === 1) {
      const lines = block.replace(/^\w*\n/, '').replace(/\n$/, '').split('\n');
      return (
        <pre
          key={`code-${i}`}
          style={{
            background: '#0A0A0A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '8px 10px',
            margin: '6px 0',
            overflowX: 'auto',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: '#A5B4FC',
            whiteSpace: 'pre'
          }}
        >
          {lines.join('\n')}
        </pre>
      );
    }
    return block.split('\n').map((line, j) => {
      const key = `t-${i}-${j}`;
      if (!line.trim()) return <div key={key} style={{ height: 6 }} />;
      const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        return (
          <div
            key={key}
            style={{
              fontWeight: level <= 2 ? 800 : 700,
              fontSize: level <= 2 ? '0.95rem' : '0.85rem',
              color: '#F1F5F9',
              margin: `${level <= 2 ? '10' : '6'}px 0 4px`
            }}
          >
            {renderInline(headingMatch[2], key)}
          </div>
        );
      }
      const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (bulletMatch) {
        return (
          <div
            key={key}
            style={{
              display: 'flex',
              gap: 6,
              paddingLeft: 8,
              fontSize: '0.82rem',
              color: '#94A3B8',
              margin: '2px 0'
            }}
          >
            <span style={{ color: '#818CF8' }}>•</span>
            <span>{renderInline(bulletMatch[1], key)}</span>
          </div>
        );
      }
      return (
        <p key={key} style={{ fontSize: '0.82rem', color: '#CBD5E1', margin: '3px 0' }}>
          {renderInline(line, key)}
        </p>
      );
    });
  });

// ---------------------------------------------------------------------------
// Agent Execution Trace (Module 4): collapsible live telemetry card.
// ---------------------------------------------------------------------------
const stepIcon = (step: string) => {
  if (step.startsWith('architect')) return <Compass size={12} />;
  if (step.startsWith('developer')) return <Code2 size={12} />;
  if (step.startsWith('debugger')) return <ShieldCheck size={12} />;
  if (step.startsWith('writing')) return <FolderGit2 size={12} />;
  return <CheckCircle2 size={12} />;
};

const stepColor = (step: string) => {
  if (step.startsWith('architect')) return '#F0ABFC';
  if (step.startsWith('developer')) return '#818CF8';
  if (step.startsWith('debugger')) return '#6EE7B7';
  return '#A1A1AA';
};

const TraceCard: React.FC<{ steps: TraceStep[]; isGenerating: boolean }> = ({
  steps,
  isGenerating
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGenerating) setCollapsed(false);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [steps.length, isGenerating]);

  if (steps.length === 0) return null;

  return (
    <div
      style={{
        border: '1px solid rgba(129, 140, 248, 0.25)',
        background: 'rgba(99, 102, 241, 0.06)',
        borderRadius: 10,
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          color: '#A5B4FC',
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontWeight: 700,
          textAlign: 'left'
        }}
      >
        {isGenerating ? (
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <CheckCircle2 size={13} color="#6EE7B7" />
        )}
        Agent Execution Trace
        <span style={{ color: '#64748B', fontWeight: 400 }}>
          · {steps.length} steps
        </span>
        <ChevronDown
          size={13}
          style={{ marginLeft: 'auto', transform: collapsed ? 'rotate(-90deg)' : 'none' }}
        />
      </button>
      {!collapsed && (
        <div
          ref={listRef}
          style={{
            maxHeight: 220,
            overflowY: 'auto',
            padding: '4px 12px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const running = isGenerating && isLast && step.step !== 'done';
            return (
              <div key={`${step.step}-${i}`} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: stepColor(step.step), marginTop: 2 }}>
                  {running ? (
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    stepIcon(step.step)
                  )}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      color: stepColor(step.step),
                      letterSpacing: '0.04em'
                    }}
                  >
                    {step.step}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#CBD5E1', lineHeight: 1.4 }}>
                    {step.message}
                  </div>
                  {step.detail && (
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: '#64748B',
                        fontFamily: 'var(--font-mono)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={step.detail}
                    >
                      {step.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Chat bubble: plain text / markdown + changes + files + suggestions +
// design-direction decision cards.
// ---------------------------------------------------------------------------
interface ChatBubbleProps {
  msg: ChatMessage;
  onOpenFile: (path: string) => void;
  onSuggestion: (text: string) => void;
  onSelectDirection: (id: string, title: string) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  msg,
  onOpenFile,
  onSuggestion,
  onSelectDirection
}) => (
  <div
    style={{
      display: 'flex',
      gap: '8px',
      flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
    }}
  >
    <div
      style={{
        flexShrink: 0,
        width: 26,
        height: 26,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: msg.sender === 'user' ? 'rgba(99,102,241,0.25)' : 'rgba(16,185,129,0.2)'
      }}
    >
      {msg.sender === 'user' ? (
        <User size={13} color="#A5B4FC" />
      ) : (
        <Bot size={13} color="#6EE7B7" />
      )}
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '8px 10px',
          lineHeight: 1.45,
          color: '#CBD5E1'
        }}
      >
        {msg.markdown ? (
          <div style={{ textAlign: 'left' }}>{renderRichText(msg.text)}</div>
        ) : (
          <div style={{ fontSize: '0.83rem' }}>{renderInline(msg.text, 'p')}</div>
        )}

        {msg.changes && msg.changes.length > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: '16px', color: '#64748B' }}>
            {msg.changes.slice(0, 6).map((c, i) => (
              <li key={i} style={{ fontSize: '0.76rem' }}>
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Created files — clickable links that open the file in Monaco */}
      {msg.files && msg.files.length > 0 && (
        <div
          style={{
            marginTop: 6,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <span
            style={{
              fontSize: '0.64rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#64748B'
            }}
          >
            Files created ({msg.files.length}) — click to open
          </span>
          {msg.files.slice(0, 10).map(f => (
            <button
              key={f.path}
              type="button"
              onClick={() => onOpenFile(f.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                color: '#818CF8',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                padding: '2px 4px',
                textAlign: 'left'
              }}
            >
              <Code2 size={11} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.path}</span>
            </button>
          ))}
        </div>
      )}

      {/* Design-direction decision cards (Plan mode handoff) */}
      {msg.decisions && msg.decisions.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6
          }}
        >
          {msg.decisions.map(dir => (
            <button
              key={dir.id}
              type="button"
              onClick={() => onSelectDirection(dir.id, dir.title)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(129, 140, 248, 0.45)',
                borderRadius: 10,
                color: '#A5B4FC',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              <Sparkles size={12} />
              {dir.title}
            </button>
          ))}
        </div>
      )}

      {/* Follow-up suggestion chips */}
      {msg.suggestions && msg.suggestions.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {msg.suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestion(s)}
              style={{
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '0.7rem'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 4, fontSize: '0.68rem', color: '#475569' }}>
        {msg.timestamp}
      </div>
    </div>
  </div>
);

/**
 * The transitioning generation page.
 *
 * isGenerated === false  →  clean, centered multi-mode prompt console.
 * isGenerated === true   →  split workspace: 30% "Edit with AI" chat panel
 *                           (with the live Agent Execution Trace), 20%
 *                           file-explorer tree over the generated
 *                           repository, 50% live preview iframe + Monaco
 *                           code tab bound to the selected file.
 */
export const GenerateStudio: React.FC = () => {
  const {
    isGenerating,
    isGenerated,
    generatedCode,
    generatedFiles,
    selectedFile,
    setSelectedFile,
    statusMessage,
    previewVersion,
    chatMessages,
    sendChatMessage,
    setCurrentScreen,
    user,
    agentTrace,
    selectDesignDirection,
    openFileRequest,
    requestOpenFile
  } = useApp();

  const [chatInput, setChatInput] = useState('');
  const [rightTab, setRightTab] = useState<'preview' | 'code'>('preview');
  const [reloadKey, setReloadKey] = useState(0);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [deployState, setDeployState] = useState<'idle' | 'deploying' | 'live'>('idle');
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deploySlug, setDeploySlug] = useState<string>('');
  /** Where the ExternalLink icon actually points. Local full-screen route
   *  for the demo, so we never hit a real DNS lookup. */
  const deployHref = deploySlug
    ? `${window.location.origin}/published/${deploySlug}`
    : null;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Follow the project: whenever a new file set arrives, select the entry
  // page (src/App.tsx, falling back to the first file).
  useEffect(() => {
    if (generatedFiles.length === 0) {
      setSelectedFile(null);
      return;
    }
    setSelectedFile(
      generatedFiles.find(f => f.path === 'src/App.tsx') ?? generatedFiles[0]
    );
  }, [generatedFiles]);

  // Chat file links / summary file lists request the editor to open a file.
  useEffect(() => {
    if (!openFileRequest) return;
    const file = generatedFiles.find(f => f.path === openFileRequest.path);
    if (file) {
      setSelectedFile(file);
      setRightTab('code');
    }
  }, [openFileRequest, generatedFiles]);

  // ---- Module 6: Universal Runtime Compiler ----
  // Inject Tailwind CDN + Google Fonts into the live preview iframe head so
  // generated Tailwind utilities, arbitrary hex colors, and font weights all
  // compile reliably even before Vite picks up the mirrored entry.
  useEffect(() => {
    if (rightTab !== 'preview') return;
    const frame = iframeRef.current;
    if (!frame) return;
    const inject = () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      const head = doc.head;
      if (!head.querySelector('script[data-craftai="tailwind-cdn"]')) {
        const s = doc.createElement('script');
        s.src = 'https://cdn.tailwindcss.com';
        s.dataset.craftai = 'tailwind-cdn';
        head.appendChild(s);
      }
      if (!head.querySelector('link[data-craftai="google-fonts"]')) {
        const l = doc.createElement('link');
        l.rel = 'stylesheet';
        l.href =
          'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
        l.dataset.craftai = 'google-fonts';
        head.appendChild(l);
      }
      // Global CSS reset: kill default browser button/input borders inside
      // the generated app so Tailwind utility classes are the only source of
      // truth. Idempotent via data-craftai marker.
      if (!head.querySelector('style[data-craftai="reset"]')) {
        const style = doc.createElement('style');
        style.dataset.craftai = 'reset';
        style.textContent =
          'button,input,select,textarea{outline:0;border:0;background:transparent;font:inherit;color:inherit;}*{box-sizing:border-box;}';
        head.appendChild(style);
      }
    };
    frame.addEventListener('load', inject);
    // iframe may already have loaded (e.g. previewVersion bump before ref mounted)
    if (frame.contentDocument?.readyState === 'complete') inject();
    return () => frame.removeEventListener('load', inject);
  }, [rightTab, previewVersion, reloadKey]);

  // ---- Module 5: Subdomain deployment ----
  const slugFromPlan = (): string => {
    const fromEmail = (user?.email ?? '').split('@')[0].replace(/[^a-z0-9]+/gi, '-');
    const stamp = Date.now().toString(36);
    return `${fromEmail || 'project'}-${stamp}`;
  };

  const handlePublish = async () => {
    if (deployState === 'deploying') return;
    const slug = deploySlug || slugFromPlan();
    setDeploySlug(slug);
    setDeployState('deploying');
    try {
      const res = await fetch(DEPLOY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: slug,
          project_slug: slug,
          generated_code: generatedCode,
          files: generatedFiles
        })
      });
      const url = res.headers.get('X-Deploy-Url') || `https://${slug}.${DEPLOY_DOMAIN}`;
      // Persist the deploy locally as the source of truth — Supabase deployment
      // table can replace this when the schema is migrated.
      try {
        localStorage.setItem(
          `craftai_deploy_${slug}`,
          JSON.stringify({ slug, url, ts: Date.now(), code: generatedCode })
        );
      } catch { /* storage full / disabled */ }
      setDeployUrl(url);
      setDeployState('live');
    } catch {
      // Backend offline (local demo): still mint a URL so the UI is exercisable.
      const url = `https://${slug}.${DEPLOY_DOMAIN}`;
      setDeployUrl(url);
      setDeployState('live');
    }
  };

  const onChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  // ---------------- Initial state: centered prompt console ----------------
  // Show the split workspace as soon as generation is running OR already
  // finished. The centered console only appears on first mount when nothing
  // has been built yet — that view is reached by routing to a fresh studio.
  if (!isGenerated && !isGenerating) {
    return (
      <div className="app-shell">
        <main
          className="main-content"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            maxWidth: 'none'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%', maxWidth: '820px', textAlign: 'center' }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#A5B4FC',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '1.5rem'
              }}
            >
              <Sparkles size={13} /> 3-Agent AI Engine
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.1,
                marginBottom: '0.75rem'
              }}
            >
              What should <span style={{ color: '#818CF8' }}>CraftAi</span> build for you?
            </h1>
            <p
              style={{
                color: 'var(--neutral-slate, #94A3B8)',
                fontSize: '1rem',
                maxWidth: '520px',
                margin: '0 auto 2.25rem'
              }}
            >
              Describe your app. The Architect plans it, the Developer codes it,
              the Debugger polishes it — live. Switch between Build, Chat and
              Plan modes (Alt+B / Alt+C / Alt+P).
            </p>

            <PromptConsole />

            {(statusMessage || isGenerating) && (
              <p
                style={{
                  marginTop: '1.25rem',
                  color: isGenerating ? '#A5B4FC' : 'var(--neutral-slate, #94A3B8)',
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {isGenerating
                  ? 'Architect → Developer → Debugger running… (this takes 1–2 minutes)'
                  : statusMessage}
              </p>
            )}

            {/* Live trace on the hero while the pipeline runs */}
            {isGenerating && agentTrace.length > 0 && (
              <div
                style={{
                  maxWidth: 560,
                  margin: '1.25rem auto 0',
                  textAlign: 'left'
                }}
              >
                <TraceCard steps={agentTrace} isGenerating={isGenerating} />
              </div>
            )}

            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCurrentScreen('landing')}
              style={{ marginTop: '2.5rem', padding: '6px 0' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  // ---------------- Post-generation split workspace ----------------
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#05070D',
        color: '#E2E8F0'
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#090D16'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="craftai-logo-icon" style={{ width: 22, height: 22 }} />
          <span style={{ fontWeight: 800, color: '#FFFFFF' }}>
            Craft<span style={{ color: '#818CF8' }}>Ai</span>
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: '#64748B',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
              paddingLeft: 12
            }}
          >
            workspace · {user?.email ?? 'authenticated'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isGenerating && (
            <span style={{ fontSize: '0.78rem', color: '#A5B4FC', fontFamily: 'var(--font-mono)' }}>
              3-agent pipeline running…
            </span>
          )}
          {/* Live deploy URL badge */}
          {deployState === 'live' && deployUrl && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 999,
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.4)',
                color: '#6EE7B7',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                maxWidth: 320
              }}
              title={deployUrl}
            >
              <Globe size={12} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deployUrl.replace(/^https?:\/\//, '')}
              </span>
              <button
                type="button"
                title="Copy URL"
                onClick={() => navigator.clipboard?.writeText(deployUrl)}
                style={{ background: 'transparent', border: 'none', color: '#6EE7B7', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <Copy size={11} />
              </button>
              <a
                href={deployHref ?? '#'}
                target="_blank"
                rel="noreferrer"
                title="Open published site"
                style={{ background: 'transparent', color: '#6EE7B7', display: 'flex' }}
              >
                <ExternalLink size={11} />
              </a>
            </div>
          )}
          {/* Publish button */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={deployState === 'deploying' || !generatedCode}
            className="btn-primary"
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: deployState === 'deploying' ? 0.7 : 1
            }}
          >
            {deployState === 'deploying' ? (
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : deployState === 'live' ? (
              <Rocket size={13} />
            ) : (
              <Rocket size={13} />
            )}
            {deployState === 'deploying' ? 'Publishing…' : deployState === 'live' ? 'Re-deploy' : 'Publish'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setCurrentScreen('dashboard')}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Split body: 30% chat / 20% file tree / 50% preview+code */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left: Edit with AI chat panel + execution trace */}
        <aside
          style={{
            width: '30%',
            minWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            background: '#070A12',
            minHeight: 0
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: '#FFFFFF'
            }}
          >
            <Sparkles size={15} color="#818CF8" />
            Edit with AI
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Live agent execution trace */}
            <TraceCard steps={agentTrace} isGenerating={isGenerating} />

            {chatMessages.length === 0 && (
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                Ask for changes — e.g. “make the hero gradient brighter”, “add a
                contact form”, “switch to a light theme”. Every message re-runs
                the 3-agent pipeline and reloads the preview.
              </p>
            )}
            {chatMessages.map(msg => (
              <ChatBubble
                key={msg.id}
                msg={msg}
                onOpenFile={requestOpenFile}
                onSuggestion={text => sendChatMessage(text)}
                onSelectDirection={(id, title) =>
                  selectDesignDirection({ id, title })
                }
              />
            ))}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={onChatSubmit}
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px',
              borderTop: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Describe your edit…"
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isGenerating || !chatInput.trim()}
              style={{ padding: '0 14px', borderRadius: '10px' }}
            >
              <Send size={15} />
            </button>
          </form>
        </aside>

        {/* Middle: file explorer over the generated project */}
        <aside
          style={{
            width: '20%',
            minWidth: '210px',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            background: '#070A12',
            minHeight: 0
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: '#FFFFFF'
            }}
          >
            <FolderGit2 size={15} color="#818CF8" />
            Files
            {generatedFiles.length > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#64748B',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)'
                }}
              >
                {generatedFiles.length}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <FileTree
              files={generatedFiles}
              selectedPath={selectedFile?.path ?? null}
              onSelect={file => {
                setSelectedFile(file);
                setRightTab('code');
              }}
            />
          </div>
        </aside>

        {/* Right: preview iframe / Monaco toggle */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: '#090D16'
            }}
          >
            <div
              role="group"
              aria-label="Right pane view"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: 3,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {(['preview', 'code'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={rightTab === tab}
                  onClick={() => setRightTab(tab)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: rightTab === tab ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: rightTab === tab ? '#A5B4FC' : '#64748B',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {tab === 'preview' ? <Eye size={13} /> : <Code2 size={13} />}
                  {tab === 'preview' ? 'Live Preview' : 'Code'}
                </button>
              ))}
            </div>
            {rightTab === 'code' && selectedFile && (
              <span
                style={{
                  marginLeft: '8px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#94A3B8',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  maxWidth: 340,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={selectedFile.path}
              >
                {selectedFile.path}
              </span>
            )}
            {rightTab === 'preview' && (
              <>
                {/* Viewport switcher (Module 5) */}
                <div
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    padding: 3,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  {(['desktop', 'tablet', 'mobile'] as ViewportMode[]).map(mode => {
                    const Icon = mode === 'desktop' ? Monitor : mode === 'tablet' ? Tablet : Smartphone;
                    const active = viewport === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        title={mode}
                        onClick={() => setViewport(mode)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 24,
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: active ? '#A5B4FC' : '#64748B'
                        }}
                      >
                        <Icon size={13} />
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  title="Reload preview"
                  onClick={() => setReloadKey(k => k + 1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem'
                  }}
                >
                  <RefreshCw size={13} /> {PREVIEW_URL}
                </button>
              </>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              background: rightTab === 'code' ? '#0A0A0A' : '#05070D',
              display: 'flex',
              alignItems: rightTab === 'preview' ? 'center' : 'stretch',
              justifyContent: rightTab === 'preview' ? 'center' : 'stretch',
              overflow: rightTab === 'preview' ? 'auto' : 'hidden',
              padding: rightTab === 'preview' && viewport !== 'desktop' ? 24 : 0
            }}
          >
            <AnimatePresence mode="wait">
              {rightTab === 'preview' ? (
                <motion.iframe
                  key={`preview-${previewVersion}-${reloadKey}`}
                  ref={iframeRef}
                  src={`${PREVIEW_URL}?v=${previewVersion}-${reloadKey}`}
                  title="Generated app preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={
                    viewport === 'desktop'
                      ? { width: '100%', height: '100%', border: 'none', background: '#FFFFFF', borderRadius: 0 }
                      : {
                          width: VIEWPORT_SIZES[viewport].width,
                          height: VIEWPORT_SIZES[viewport].height,
                          maxWidth: '95%',
                          maxHeight: '95%',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: VIEWPORT_SIZES[viewport].radius,
                          background: '#000000',
                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75)',
                          overflow: 'hidden',
                          transition: 'all 0.3s ease'
                        }
                  }
                />
              ) : (
                <motion.div
                  key={`code-${previewVersion}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: 'flex',
                    flex: 1,
                    width: '100%',
                    height: '100%',
                    minWidth: 0,
                    minHeight: 0
                  }}
                >
                  <CodeViewer />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {statusMessage && (
            <div
              style={{
                padding: '6px 14px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: '#64748B'
              }}
            >
              {statusMessage}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};