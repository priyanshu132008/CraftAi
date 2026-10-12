import React, { useEffect, useRef, useState } from 'react';
import { useApp, ChatMessage } from '../context/AppContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsLeft,
  ChevronsRight,
  Code2,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  FolderGit2,
  GitBranch,
  Globe,
  Loader2,
  Monitor,
  Paperclip,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Tablet,
  Wand2,
  Zap
} from 'lucide-react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { FileTree } from './FileTree';
import CodeViewer from './CodeViewer';
import ThemeToggle from './ThemeToggle';
import TerminalDrawer from './TerminalDrawer';
import StageWireframe from './StageWireframe';
import PublishModal from './PublishModal';
import { PromptConsole } from './PromptConsole';
import { TraceStep, API_URL } from '../services/api';
import '../styles/studio.css';

const PREVIEW_URL = 'http://localhost:3000/preview';
const DEPLOY_API_URL = API_URL + '/api/deploy';

const VIEWPORT_SIZES = {
  desktop: { width: '100%', height: '100%', radius: 0 },
  tablet: { width: 768, height: 1024, radius: 16 },
  mobile: { width: 375, height: 667, radius: 24 }
} as const;
type ViewportMode = keyof typeof VIEWPORT_SIZES;

// ---------------------------------------------------------------------------
// 3-agent pipeline steps for the synthesis-modal timeline (mirrors the SSE
// step prefixes used by AgentPipeline: architect:* / developer:* / debugger:*).
// ---------------------------------------------------------------------------
type SynthPhase = 'pending' | 'active' | 'done';
const AGENT_STEPS = [
  { prefix: 'architect', name: 'Architect', Icon: Compass },
  { prefix: 'developer', name: 'Developer', Icon: Code2 },
  { prefix: 'debugger', name: 'Debugger', Icon: ShieldCheck }
] as const;

const derivePhases = (trace: TraceStep[]): SynthPhase[] => {
  const phases = AGENT_STEPS.map(a => {
    const steps = trace.filter(t => t.step.startsWith(a.prefix));
    if (steps.some(t => t.step.endsWith(':completed'))) return 'done' as SynthPhase;
    if (steps.length > 0) return 'active' as SynthPhase;
    return 'pending' as SynthPhase;
  });
  // Everything before the first seen agent belongs to earlier agents.
  const firstActive = phases.findIndex(p => p !== 'pending');
  if (firstActive > 0) {
    for (let i = 0; i < firstActive; i++) phases[i] = 'done';
  }
  // Final write phase — all agents have finished their pass.
  if (trace.some(t => t.step === 'writing:files' || t.step === 'done')) {
    for (let i = 0; i < phases.length; i++) {
      if (phases[i] === 'active') phases[i] = 'done';
    }
  }
  return phases;
};

// ---------------------------------------------------------------------------
// Markdown-lite renderer for chat/plan replies (headings, bullets, bold,
// fenced code blocks) — no external markdown dependency.
// ---------------------------------------------------------------------------
const renderInline = (text: string, keyPrefix: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyPrefix}-${i}`} style={{ color: 'var(--text-heading)' }}>
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
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '8px 10px',
            margin: '6px 0',
            overflowX: 'auto',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-indigo-bright)',
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
              fontWeight: level <= 2 ? 700 : 600,
              fontSize: level <= 2 ? '0.95rem' : '0.85rem',
              color: 'var(--text-heading)',
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
              color: 'var(--text-muted)',
              margin: '2px 0'
            }}
          >
            <span style={{ color: 'var(--accent-indigo-bright)' }}>•</span>
            <span>{renderInline(bulletMatch[1], key)}</span>
          </div>
        );
      }
      return (
        <p key={key} style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: '3px 0' }}>
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
  if (step.startsWith('architect')) return 'var(--agent-architect)';
  if (step.startsWith('developer')) return 'var(--agent-developer)';
  if (step.startsWith('debugger')) return 'var(--agent-debugger)';
  return 'var(--text-muted)';
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

    if (steps.length === 0) {
    // Generation just started — show the first phase immediately instead of
    // a silent empty panel until the first SSE event lands.
    if (!isGenerating) return null;
    return (
      <div
        style={{
          border: '1px solid color-mix(in srgb, var(--accent-indigo-bright) 25%, transparent)',
          background: 'var(--accent-indigo-soft)',
          borderRadius: 10,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--accent-indigo-bright)',
          fontSize: '0.78rem',
          fontWeight: 700,
          flexShrink: 0
        }}
      >
        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        Analyzing prompt intent — dispatching to the Architect…
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid color-mix(in srgb, var(--accent-indigo-bright) 25%, transparent)',
        background: 'var(--accent-indigo-soft)',
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
          color: 'var(--accent-indigo-bright)',
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontWeight: 700,
          textAlign: 'left'
        }}
      >
        {isGenerating ? (
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <CheckCircle2 size={13} color="var(--agent-debugger)" />
        )}
        Agent Execution Trace
        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
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
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: stepColor(step.step),
                      letterSpacing: '0.04em'
                    }}
                  >
                    {step.step}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                    {step.message}
                  </div>
                  {step.detail && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
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
// Chat bubble: user pill / assistant card with metric pill, created-file
// cards, suggestions and design-direction decision cards — all rendered from
// the real AppContext chat message payloads.
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
}) => {
  if (msg.sender === 'user') {
    return (
      <div className="studio-msg-user">
        <div className="studio-bubble-user">
          {msg.markdown ? (
            <div>{renderRichText(msg.text)}</div>
          ) : (
            renderInline(msg.text, 'p')
          )}
        </div>
        <span className="studio-msg-time">{msg.timestamp}</span>
      </div>
    );
  }

  return (
    <div className="studio-msg-ai">
      <div className="studio-ai-head">
        <span className="studio-ai-avatar">
          <Bot size={12} />
        </span>
        CraftAI Assistant
      </div>
      <div className="studio-bubble-ai">
        {msg.markdown ? (
          <div style={{ textAlign: 'left' }}>{renderRichText(msg.text)}</div>
        ) : (
          <div>{renderInline(msg.text, 'p')}</div>
        )}

        {msg.changes && msg.changes.length > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: '16px', color: 'var(--text-muted)' }}>
            {msg.changes.slice(0, 6).map((c, i) => (
              <li key={i} style={{ fontSize: '0.76rem' }}>
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Created files — real count from the edit/build response, clickable
          cards that open the file in Monaco */}
      {msg.files && msg.files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <span className="studio-metric-pill" style={{ alignSelf: 'flex-start' }}>
            <Zap size={11} color="var(--accent-indigo-bright)" />
            {msg.files.length} {msg.files.length === 1 ? 'file' : 'files'} synthesized
          </span>
          {msg.files.slice(0, 10).map(f => (
            <button
              key={f.path}
              type="button"
              className="studio-file-card"
              onClick={() => onOpenFile(f.path)}
              title={`Open ${f.path} in the editor`}
            >
              <FileText size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-main)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {f.path}
              </span>
              <span className="studio-caps" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                View
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Design-direction decision cards (Plan mode handoff) */}
      {msg.decisions && msg.decisions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {msg.decisions.map(dir => (
            <button
              key={dir.id}
              type="button"
              className="studio-chip"
              onClick={() => onSelectDirection(dir.id, dir.title)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--accent-indigo-soft)',
                borderColor: 'color-mix(in srgb, var(--accent-indigo-bright) 45%, transparent)',
                color: 'var(--accent-indigo-bright)',
                fontWeight: 600
              }}
            >
              <Sparkles size={11} />
              {dir.title}
            </button>
          ))}
        </div>
      )}

      {/* Follow-up suggestion chips */}
      {msg.suggestions && msg.suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {msg.suggestions.map(s => (
            <button
              key={s}
              type="button"
              className="studio-chip"
              onClick={() => onSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <span className="studio-msg-time">{msg.timestamp}</span>
    </div>
  );
};

/**
 * The transitioning generation page.
 *
 * isGenerated === false  →  clean, centered multi-mode prompt console.
 * isGenerated === true   →  split workspace (Stitch "Main workspace" port):
 *                           file explorer (real generatedFiles) / "Edit with
 *                           AI" agent drawer (real chat + trace) / live
 *                           preview + Monaco code stage with the synthesis
 *                           modal bound to the real pipeline state.
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
    cancelGeneration,
    setCurrentScreen,
    user,
    currentProject,
    agentTrace,
    selectDesignDirection,
    openFileRequest,
    requestOpenFile,
    attachedContext,
    setAttachedContext
  } = useApp();

  const [chatInput, setChatInput] = useState('');
  const [rightTab, setRightTab] = useState<'preview' | 'code'>('preview');
  const [reloadKey, setReloadKey] = useState(0);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [deployState, setDeployState] = useState<'idle' | 'deploying' | 'live'>('idle');
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deploySlug, setDeploySlug] = useState<string>('');
  const [deployError, setDeployError] = useState<string | null>(null);
  // GitHub publish flow: the modal captures slug + PAT; on success the repo
  // URL swaps the header badge into the green "Published" state.
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  // Phase 6: resizable panes + preview recompile overlay
  const chatPanelRef = usePanelRef();
  const filePanelRef = usePanelRef();
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [fileCollapsed, setFileCollapsed] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Explorer "collapse all folders" → bump drives FileTree's internal set.
  const [collapseAllNonce, setCollapseAllNonce] = useState(0);
  // "View Verbose Logs" → bump opens the bottom terminal drawer.
  const [terminalExpandNonce, setTerminalExpandNonce] = useState(0);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const triggerRecompile = () => {
    setReloadKey(k => k + 1);
    setPreviewLoading(true);
  };
  // A new generation landing also recompiles the preview iframe.
  useEffect(() => {
    if (previewVersion > 0) setPreviewLoading(true);
  }, [previewVersion]);
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

  // Follow the project: whenever a new file set arrives, select an entry
  // page — root or monorepo layout — falling back to the first *code* file
  // so dotfiles like .env never claim the editor by accident.
  useEffect(() => {
    if (generatedFiles.length === 0) {
      setSelectedFile(null);
      return;
    }
    const isCode = (p: string) => /\.(tsx?|jsx?|css|py)$/.test(p);
    setSelectedFile(
      (generatedFiles.find(f =>
        ['src/App.tsx', 'frontend/src/App.tsx'].includes(f.path)
      ) ?? generatedFiles.find(f => isCode(f.path))) ??
        generatedFiles[0]
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
    setDeployError(null);
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
      if (!res.ok) {
        throw new Error(`Publish failed (HTTP ${res.status})`);
      }
      const url =
        res.headers.get('X-Deploy-Url') ||
        `${window.location.origin}/published/${slug}`;
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
    } catch (err) {
      // Backend unreachable: say so. Never mint a URL the user can't open.
      setDeployState('idle');
      setDeployError(
        err instanceof Error ? err.message : 'Publish failed — backend unreachable.'
      );
    }
  };

  const onChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  /** Publish modal success: swap the header into the green Published state
   *  linking to the live Vercel site (or the GitHub repo when no deploy).
   *  Modal result keeps showing "Vercel is building…" + View Live Site. */
  const onGithubPublished = (result: { repoUrl: string; liveUrl?: string | null }) => {
    setRepoUrl(result.repoUrl);
    setLiveUrl(result.liveUrl ?? null);
    setDeployState('live');
    setDeployError(null);
  };

  // Attach a context file to the app-wide attachedContext state (consumed by
  // the next fresh build; incremental edits ignore it — that's the API shape).
  const onAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file
      .text()
      .then(content => setAttachedContext({ name: file.name, content }))
      .catch(() => undefined);
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
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                fontWeight: 700,
                color: 'var(--text-heading)',
                lineHeight: 1.1,
                marginBottom: '0.75rem'
              }}
            >
              What should <span style={{ color: 'var(--accent-indigo-bright)' }}>CraftAi</span> build for you today?
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
                  color: isGenerating ? 'var(--accent-indigo-bright)' : 'var(--neutral-slate, #94A3B8)',
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {isGenerating
                  ? 'Architect → Developer → Debugger running… (this takes 1–2 minutes)'
                  : statusMessage}
              </p>
            )}

            {/* Live trace on the hero while the pipeline runs (TraceCard
                renders its own "Analyzing prompt intent…" starter step) */}
            {isGenerating && (
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

  // Real pipeline state for the synthesis modal.
  const phases = derivePhases(agentTrace);
  const recentTrace = agentTrace.slice(-5);
  const lastTrace = agentTrace[agentTrace.length - 1];
  const projectTitle =
    currentProject?.title ?? user?.email?.split('@')[0] ?? 'your workspace';

  // ---------------- Post-generation split workspace ----------------
  return (
    <div className="studio-shell">
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-nav)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="craftai-logo-icon" style={{ width: 22, height: 22 }} />
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
            Craft<span style={{ color: 'var(--accent-indigo-bright)' }}>Ai</span>
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0
            }}
          >
            <span>Personal Workspace</span>
            <ChevronRight size={11} style={{ flexShrink: 0 }} />
            <span
              title={currentProject?.title}
              style={{ color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {projectTitle}
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isGenerating && (
            <>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-indigo-bright)', fontFamily: 'var(--font-mono)' }}>
                3-agent pipeline running…
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={cancelGeneration}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                <Square size={12} />
                Cancel
              </button>
            </>
          )}
          {/* Green Published badge — live Vercel site (or GitHub repo) */}
          {deployState === 'live' && (liveUrl || repoUrl || deployUrl) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 999,
                background: 'color-mix(in srgb, var(--agent-debugger) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--agent-debugger) 40%, transparent)',
                color: 'var(--agent-debugger)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                maxWidth: 320
              }}
              title={liveUrl ?? repoUrl ?? deployUrl ?? ''}
            >
              {liveUrl ? <Globe size={12} /> : <GitBranch size={12} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Published
              </span>
              <a
                href={liveUrl ?? repoUrl ?? deployHref ?? '#'}
                target="_blank"
                rel="noreferrer"
                title={liveUrl ?? repoUrl ?? deployUrl ?? ''}
                style={{ background: 'transparent', color: 'var(--agent-debugger)', display: 'flex' }}
              >
                <ExternalLink size={11} />
              </a>
            </div>
          )}
          {/* Publish failure — surfaced honestly, never disguised as live */}
          {deployError && (
            <span
              role="alert"
              title={deployError}
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                maxWidth: 260,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {deployError}
            </span>
          )}
          <ThemeToggle />
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

      {/* Split body: resizable panes — file explorer / chat / preview+code */}
      <Group orientation="horizontal" style={{ flex: 1, minHeight: 0 }}>
        {/* Panel 1: file explorer over the generated project */}
        <Panel
          panelRef={filePanelRef}
          defaultSize="20%"
          minSize="14%"
          collapsible
          collapsedSize="0%"
          onResize={size => setFileCollapsed(size.asPercentage < 0.5)}
        >
        <aside className="studio-panel">
          <div className="studio-panel-header">
            {chatCollapsed && (
              <button
                type="button"
                title="Expand chat panel"
                className="studio-icon-btn"
                onClick={() => chatPanelRef.current?.expand()}
              >
                <ChevronsRight size={13} />
              </button>
            )}
            <span className="studio-caps">Explorer</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-muted)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 999,
                padding: '1px 8px'
              }}
            >
              {generatedFiles.length}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              <button
                type="button"
                title="Collapse all folders"
                className="studio-icon-btn"
                onClick={() => setCollapseAllNonce(n => n + 1)}
              >
                <ChevronsDownUp size={14} />
              </button>
              <button
                type="button"
                title="Collapse file panel"
                className="studio-icon-btn"
                onClick={() => filePanelRef.current?.collapse()}
              >
                <ChevronsLeft size={13} />
              </button>
            </div>
          </div>
          {/* Repo context row — real project title + real file count */}
          <div className="studio-repo-row">
            <FolderGit2 size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span className="studio-repo-name" title={projectTitle}>
              {projectTitle}
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-subtle)', flexShrink: 0 }}>
              {generatedFiles.length} {generatedFiles.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <FileTree
              files={generatedFiles}
              selectedPath={selectedFile?.path ?? null}
              onSelect={file => {
                setSelectedFile(file);
                setRightTab('code');
              }}
              collapseAllSignal={collapseAllNonce}
            />
          </div>
        </aside>
        </Panel>

        {/* Drag handle 1 — glow on hover, |> re-expands the file panel */}
        <Separator className="resize-handle">
          {fileCollapsed && (
            <button
              type="button"
              title="Expand file panel"
              onClick={() => filePanelRef.current?.expand()}
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 26,
                borderRadius: 6,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-indigo-bright)',
                cursor: 'pointer'
              }}
            >
              <ChevronsRight size={12} />
            </button>
          )}
        </Separator>

        {/* Panel 2: Edit with AI chat panel + execution trace */}
        <Panel
          panelRef={chatPanelRef}
          defaultSize="30%"
          minSize="18%"
          collapsible
          collapsedSize="0%"
          onResize={size => setChatCollapsed(size.asPercentage < 0.5)}
        >
        <aside className="studio-panel">
          <div className="studio-panel-header">
            <Wand2 size={14} color="var(--accent-indigo-bright)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-heading)' }}>
              Edit with AI
            </span>
            <button
              type="button"
              title="Collapse chat panel"
              className="studio-icon-btn"
              style={{ marginLeft: 'auto' }}
              onClick={() => chatPanelRef.current?.collapse()}
            >
              <ChevronsLeft size={14} />
            </button>
          </div>

          <div className="studio-thread">
            {/* Live agent execution trace */}
            <TraceCard steps={agentTrace} isGenerating={isGenerating} />

            {chatMessages.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
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

          {/* Command dock */}
          <form className="studio-dock" onSubmit={onChatSubmit}>
            <div className="studio-dock-box">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onChatSubmit(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Ask CraftAI to edit code, add features, or explain…"
                rows={2}
              />
              <div className="studio-dock-bar">
                <div className="studio-dock-tools">
                  <button
                    type="button"
                    className="studio-icon-btn"
                    title="Attach context file"
                    onClick={() => attachInputRef.current?.click()}
                  >
                    <Paperclip size={14} />
                  </button>
                  <input
                    ref={attachInputRef}
                    type="file"
                    hidden
                    accept=".txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.css,.html"
                    onChange={onAttachFile}
                  />
                  {attachedContext && (
                    <span
                      className="studio-ctx-chip"
                      title={attachedContext.content.slice(0, 200)}
                    >
                      <span className="studio-ctx-name">@Context: {attachedContext.name}</span>
                      <button
                        type="button"
                        title="Remove attached context"
                        onClick={() => setAttachedContext(null)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          flexShrink: 0
                        }}
                      >
                        <Square size={9} />
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="studio-send"
                  disabled={isGenerating || !chatInput.trim()}
                  title="Send (⌘/Ctrl + Enter)"
                >
                  <ArrowUp size={14} />
                </button>
              </div>
            </div>
          </form>
        </aside>
        </Panel>

        {/* Drag handle 2 — glow on hover, |> re-expands the chat panel */}
        <Separator className="resize-handle">
          {chatCollapsed && (
            <button
              type="button"
              title="Expand chat panel"
              onClick={() => chatPanelRef.current?.expand()}
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 26,
                borderRadius: 6,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-indigo-bright)',
                cursor: 'pointer'
              }}
            >
              <ChevronsRight size={12} />
            </button>
          )}
        </Separator>

        {/* Panel 3: preview iframe / Monaco toggle + synthesis stage */}
        <Panel defaultSize="50%" minSize="30%">
        <section style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="studio-toolbar">
            {/* View mode tabs */}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '16px', height: '100%' }}>
              {(['preview', 'code'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  className="studio-tab"
                  data-active={rightTab === tab}
                  aria-pressed={rightTab === tab}
                  onClick={() => setRightTab(tab)}
                >
                  {tab === 'preview' ? <Eye size={14} /> : <Code2 size={14} />}
                  {tab === 'preview' ? 'Live Preview' : 'Code'}
                </button>
              ))}
            </div>
            {rightTab === 'code' && selectedFile && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-subtle)',
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
              <div
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                {/* Device viewport switcher — constrains the real iframe */}
                <div className="studio-segmented" role="group" aria-label="Preview viewport">
                  {(['desktop', 'tablet', 'mobile'] as ViewportMode[]).map(mode => {
                    const Icon = mode === 'desktop' ? Monitor : mode === 'tablet' ? Tablet : Smartphone;
                    return (
                      <button
                        key={mode}
                        type="button"
                        data-active={viewport === mode}
                        title={
                          mode === 'desktop'
                            ? 'Desktop view (fluid width)'
                            : mode === 'tablet'
                              ? `Tablet view (${VIEWPORT_SIZES[mode].width}px)`
                              : `Mobile view (${VIEWPORT_SIZES[mode].width}px)`
                        }
                        onClick={() => setViewport(mode)}
                      >
                        <Icon size={13} />
                      </button>
                    );
                  })}
                </div>
                {/* Address bar — real preview URL; the dot tracks the real
                    iframe load state (emerald once onLoad has fired) */}
                <div className="studio-addr" title={PREVIEW_URL}>
                  <span
                    className="studio-hmr-dot"
                    data-live={!previewLoading && !isGenerating}
                    title={
                      !previewLoading && !isGenerating
                        ? 'Preview served'
                        : 'Preview loading…'
                    }
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {PREVIEW_URL.replace(/^https?:\/\//, '')}
                  </span>
                  <button
                    type="button"
                    className="studio-icon-btn"
                    style={{ width: 20, height: 20 }}
                    title="Reload — re-compile the preview"
                    onClick={triggerRecompile}
                  >
                    <RefreshCw size={12} />
                  </button>
                  <a
                    href={PREVIEW_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="studio-icon-btn"
                    style={{ width: 20, height: 20 }}
                    title="Open preview in a new tab"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
            {/* Action controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <button
                type="button"
                className="studio-btn-solid"
                onClick={() => setShowPublishModal(true)}
                disabled={!generatedCode}
                title="Publish — push the monorepo to GitHub"
              >
                {deployState === 'deploying' ? (
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Rocket size={12} />
                )}
                {deployState === 'deploying'
                  ? 'Publishing…'
                  : deployState === 'live'
                    ? 'Re-deploy'
                    : 'Publish'}
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div
            className="studio-stage"
            style={{
              alignItems: rightTab === 'preview' ? 'center' : 'stretch',
              justifyContent: rightTab === 'preview' ? 'center' : 'stretch',
              padding: rightTab === 'preview' && viewport !== 'desktop' ? 24 : 0
            }}
          >
            {/* Synthesis overlay — the REAL pipeline state over the
                wireframe stage: Architect / Developer / Debugger timeline
                + live SSE trace lines; Cancel aborts the real request. */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  key="synth-overlay"
                  className="studio-synth-overlay"
                  initial={reduceMotion ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <StageWireframe />
                  <motion.div
                    className="studio-modal"
                    initial={reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="studio-synth-badge">
                      <span className="studio-synth-dot" />
                      Synthesizing Workspace
                    </div>
                    <h2
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        color: 'var(--text-heading)',
                        marginBottom: 8,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Building {projectTitle}
                    </h2>
                    <p
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        maxWidth: 380,
                        margin: '0 auto 24px',
                        lineHeight: 1.6
                      }}
                    >
                      {lastTrace?.message ??
                        'Architect → Developer → Debugger pipeline running — the preview reloads when the build lands.'}
                    </p>

                    {/* 3-step agent timeline (completed / active / pending) */}
                    <div className="studio-timeline">
                      <span className="studio-timeline-line" />
                      {AGENT_STEPS.map((agent, idx) => {
                        const phase = phases[idx];
                        return (
                          <div key={agent.prefix} className="studio-step" data-phase={phase}>
                            <div className="studio-step-node">
                              {phase === 'done' ? (
                                <Check size={14} strokeWidth={3} />
                              ) : phase === 'active' ? (
                                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              ) : (
                                <agent.Icon size={13} />
                              )}
                            </div>
                            <span className="studio-step-label">{agent.name}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Streaming console — real SSE trace lines, newest highlighted */}
                    <div className="studio-console">
                      {recentTrace.length === 0 && (
                        <span>Booting the agent pipeline…</span>
                      )}
                      {recentTrace.map((t, i) => (
                        <span
                          key={`${t.step}-${i}`}
                          className={i === recentTrace.length - 1 ? 'studio-log-new' : undefined}
                          style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}
                        >
                          <span style={{ opacity: 0.6, flexShrink: 0 }}>[{t.step}]</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.detail ? `${t.message} — ${t.detail}` : t.message}
                          </span>
                        </span>
                      ))}
                    </div>

                    <div className="studio-modal-footer">
                      <button
                        type="button"
                        className="studio-link-btn"
                        onClick={cancelGeneration}
                        title="Abort the in-flight generation request"
                      >
                        <Square size={10} />
                        Cancel Build
                      </button>
                      <button
                        type="button"
                        className="studio-link-btn studio-link-accent"
                        onClick={() => setTerminalExpandNonce(n => n + 1)}
                        title="Open the verbose agent trace in the terminal drawer"
                      >
                        View Verbose Logs
                        <ChevronRight size={11} />
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recompile overlay — covers the iframe until onLoad fires */}
            <AnimatePresence>
              {rightTab === 'preview' && previewLoading && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 9,
                    background: 'color-mix(in srgb, var(--bg-primary) 78%, transparent)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10
                  }}
                >
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-indigo-bright)' }} />
                  <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Recompiling preview…
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {rightTab === 'preview' ? (
                <motion.iframe
                  key={`preview-${previewVersion}-${reloadKey}`}
                  ref={iframeRef}
                  src={`${PREVIEW_URL}?v=${previewVersion}-${reloadKey}`}
                  title="Generated app preview"
                  onLoad={() => setPreviewLoading(false)}
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
                          border: '1px solid var(--border-subtle)',
                          borderRadius: VIEWPORT_SIZES[viewport].radius,
                          background: '#000000',
                          boxShadow: 'var(--shadow-xl)',
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

          {/* Collapsible bottom terminal drawer (Phase 6) */}
          <TerminalDrawer
            steps={agentTrace}
            isGenerating={isGenerating}
            statusMessage={statusMessage}
            expandSignal={terminalExpandNonce}
          />

          {statusMessage && (
            <div
              style={{
                padding: '6px 14px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)'
              }}
            >
              {statusMessage}
            </div>
          )}
        </section>
        </Panel>
      </Group>

      {/* Publish dialog — slug + GitHub PAT -> private repo push */}
      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublished={onGithubPublished}
        files={generatedFiles}
      />
    </div>
  );
};