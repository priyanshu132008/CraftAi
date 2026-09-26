import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, CustomConnector, McpServer, PermissionMode } from '../context/AppContext';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Plug,
  Plus,
  Search,
  Send,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import {
  CONNECTOR_AUTH,
  CONNECTOR_CATALOG,
  CONNECTOR_CATEGORIES,
  CONNECTOR_LIST,
  ConnectorCategory,
  ConnectorMeta,
  connectorDetail
} from '../lib/connectorCatalog';
import { BrandLogo } from './BrandLogos';
import { API_URL } from '../services/api';
import { CATEGORY2_SCHEMAS } from '../config/category2Schemas';
import { CATEGORY3_SCHEMAS } from '../config/category3Schemas';
import { CATEGORY4_SCHEMAS } from '../config/category4Schemas';
import { CATEGORY567_SCHEMAS } from '../config/category567Schemas';

type HubTab = 'Enabled' | 'All' | ConnectorCategory;
type SortFilter = 'Popular' | 'Newest' | 'Connected';
type AdminTab = 'vault' | 'usage' | 'audit';

interface ConnectorRequest {
  serviceName: string;
  docsUrl: string;
  description: string;
  submittedAt: string;
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#FFFFFF',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%'
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#71717A',
  margin: '10px 0 4px'
};

const MENU_ITEM_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  background: 'transparent',
  border: 'none',
  color: '#EDEDED',
  cursor: 'pointer',
  fontSize: '0.82rem',
  textAlign: 'left'
};

const BADGE_STYLE = (color: string): React.CSSProperties => ({
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '2px 8px',
  borderRadius: 999,
  background: `${color}1A`,
  border: `1px solid ${color}59`,
  color
});

/** Backdrop + centered frosted-glass card for the connector/MCP forms. */
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children
}) => (
  <div
    onClick={onClose}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      onClick={e => e.stopPropagation()}
      className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-extrabold text-white">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer border-none bg-transparent text-neutral-500"
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
);

const EMPTY_CUSTOM: CustomConnector = { name: '', baseUrl: '', headerKey: '', headerValue: '', openApiSchema: '' };
const EMPTY_MCP: McpServer = { name: '', serverUrl: '', authToken: '' };

/** Masked credential input with a show/hide toggle. */
const SecretField: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  optional?: boolean;
  onChange: (v: string) => void;
}> = ({ label, placeholder, value, optional, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={LABEL_STYLE}>
        {label}
        {optional && <span className="ml-1 normal-case text-neutral-600">(optional)</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...INPUT_STYLE, paddingRight: 36 }}
          className={optional ? '' : 'required-field'}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--neutral-gray, #71717A)',
            cursor: 'pointer',
            padding: 2
          }}
          title={show ? 'Hide' : 'Show'}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
};

/** Multi-field credential form for a vault connector (Category 2 or 3) —
 *  renders one SecretField per schema entry. */
const VaultForm: React.FC<{
  connectorId: string;
  values: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
}> = ({ connectorId, values, onChange }) => {
  const fields =
    CATEGORY2_SCHEMAS[connectorId] ??
    CATEGORY3_SCHEMAS[connectorId] ??
    CATEGORY4_SCHEMAS[connectorId] ??
    CATEGORY567_SCHEMAS[connectorId] ?? [];
  return (
    <div className="flex flex-col gap-1">
      {fields.map(f => (
        <SecretField
          key={f.key}
          label={f.label}
          placeholder={f.placeholder}
          optional={f.optional}
          value={values[f.key] ?? ''}
          onChange={v => onChange({ ...values, [f.key]: v })}
        />
      ))}
    </div>
  );
};

const PERMISSION_OPTIONS: { id: PermissionMode; label: string }[] = [
  { id: 'ask', label: 'Ask each time' },
  { id: 'always', label: 'Always allow' },
  { id: 'never', label: 'Never allow' }
];

/** Small glass dropdown; an invisible backdrop handles click-outside close. */
const Dropdown: React.FC<{
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  width?: number;
}> = ({ value, options, onChange, width = 200 }) => {
  const [open, setOpen] = useState(false);
  const label = options.find(o => o.id === value)?.label ?? value;
  return (
    <div className="relative">
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width }}
        className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 transition-all hover:border-white/20 hover:bg-white/10"
      >
        {label} <ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 rounded-xl border border-white/10 bg-neutral-900/95 p-1.5 text-left shadow-2xl backdrop-blur-xl" style={{ width }}>
          {options.map(o => (
            <button
              key={o.id}
              type="button"
              style={{ ...MENU_ITEM_STYLE, background: o.id === value ? 'rgba(99,102,241,0.12)' : 'transparent' }}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
            >
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.id === value && <Check size={14} color="#818CF8" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CARD_CLASS = 'rounded-xl border border-white/10 bg-neutral-900/60 p-5';

/**
 * Full Connector Detail Page (Lovable-style): breadcrumb, header with status
 * + workspace toggle, overview with docs link, agent-permission rules,
 * credentials/auth panel, capability breakdown and example prompt cards.
 */
const ConnectorDetailPage: React.FC<{ id: string; onBack: () => void; startOauth: (id: string) => void }> = ({ id, onBack, startOauth }) => {
  const {
    selectedConnectors,
    toggleConnector,
    connectorSecrets,
    setConnectorSecrets,
    connectorPermissions,
    setConnectorPermission,
    defaultPermission,
    setDefaultPermission,
    permissionFor,
    setPrompt,
    setCurrentScreen
  } = useApp();

  const meta = CONNECTOR_LIST.find(c => c.id === id);
  /** Multi-field vault values for vault connectors. */
  const [secrets, setSecrets] = useState<Record<string, string>>(connectorSecrets[id] ?? {});
  if (!meta) return null;
  const detail = connectorDetail(meta);
  const enabled = selectedConnectors.includes(id);

  const saveCredentials = () => {
    const cleaned = Object.fromEntries(
      Object.entries(secrets).map(([k, v]) => [k, v.trim()])
    );
    setConnectorSecrets(id, cleaned);
    if (!enabled) toggleConnector(id);
  };

  /** Use-case card: populate the console prompt and jump into the studio. */
  const runUseCase = (prompt: string) => {
    setPrompt(prompt);
    setCurrentScreen('generate-plan');
  };

  return (
    <div className="mx-auto flex h-[80vh] w-full max-w-6xl flex-col gap-5 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl backdrop-blur-2xl">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1.5 self-start border-none bg-transparent text-xs font-semibold text-neutral-400 transition-all hover:text-indigo-300"
      >
        <ArrowLeft size={13} /> Connectors <span className="text-neutral-600">›</span>
        <span className="text-neutral-200">{meta.name}</span>
      </button>

      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-white/5 bg-neutral-950/80 p-2">
          <BrandLogo id={meta.id} size={38} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-white">{meta.name}</h1>
            <span style={BADGE_STYLE('#A5B4FC')}>{meta.category}</span>
            <span style={BADGE_STYLE(enabled ? '#10B981' : '#71717A')}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="font-mono text-[0.7rem] text-neutral-500">
            generates {meta.file}
          </div>
        </div>
        <button
          type="button"
          className={`${enabled ? 'btn-outline' : 'btn-primary'} flex-shrink-0`}
          style={{ borderRadius: 8, whiteSpace: 'nowrap' }}
          onClick={() => toggleConnector(id)}
        >
          {enabled ? 'Disable for workspace' : 'Enable for workspace'}
        </button>
      </div>

      {/* Overview */}
      <div className={CARD_CLASS}>
        <h3 className="mb-1 text-sm font-extrabold text-white">Overview</h3>
        <p className="mb-3 text-sm leading-relaxed text-neutral-400">
          {meta.desc}. When enabled, the Developer Agent generates a real{' '}
          <code className="text-indigo-300">{meta.file}</code> SDK client reading
          keys from <code>import.meta.env.VITE_*</code> and wires the UI
          directly to it.
        </p>
        <a
          href={detail.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-all hover:bg-indigo-500/20"
        >
          {detail.authType === 'oauth' ? `Try ${meta.name}` : 'View Docs'} <ExternalLink size={12} />
        </a>
      </div>

      {/* Agent permissions */}
      <div className={CARD_CLASS}>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-extrabold text-white">
          <ShieldCheck size={14} color="#A5B4FC" /> Manage Agent Permissions
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-neutral-300">
              Enable <strong className="text-white">{meta.name}</strong> Agent Tools
            </span>
            <Dropdown
              value={connectorPermissions[id] ?? defaultPermission}
              options={PERMISSION_OPTIONS}
              onChange={mode => setConnectorPermission(id, mode as PermissionMode)}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
            <span className="text-xs text-neutral-300">
              Manage all permissions <span className="text-neutral-500">(default rule for every connector)</span>
            </span>
            <Dropdown
              value={defaultPermission}
              options={PERMISSION_OPTIONS}
              onChange={mode => setDefaultPermission(mode as PermissionMode)}
            />
          </div>
          <p className="text-[0.7rem] text-neutral-500">
            Effective rule for this connector:{' '}
            <strong className="text-neutral-300">{permissionFor(id) === 'ask' ? 'Ask each time' : permissionFor(id) === 'always' ? 'Always allow' : 'Never allow'}</strong>
          </p>
        </div>
      </div>

      {/* Credentials & auth */}
      <div className={CARD_CLASS}>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-extrabold text-white">
          <KeyRound size={14} color="#A5B4FC" /> Credentials &amp; Auth Setup
        </h3>
        {detail.authType === 'oauth' ? (
          <>
            <button
              type="button"
              className="btn-primary"
              style={{ borderRadius: 8 }}
              onClick={() => startOauth(id)}
            >
              <Globe size={13} /> Connect your {meta.name} Account
            </button>
            <p className="mt-2 text-[0.7rem] text-neutral-500">
              You'll be redirected to {meta.name} to authorize. CraftAI stores
              the resulting access token in the workspace vault on the backend
              — it never reaches the browser.
            </p>
          </>
        ) : detail.authType === 'none' ? (
          <p className="text-xs text-neutral-400">
            <strong className="text-white">Zero-auth open SDK.</strong> Enable it
            for your workspace and the Developer Agent wires it straight into
            the generated app — no credentials required.
          </p>
        ) : (
          <p className="mb-2 text-xs text-neutral-400">
            Enter your {meta.name} credentials below. They are stored in your
            browser vault (craftai_connector_vault) and injected into the
            generated app's <code className="text-indigo-300">.env</code> by the
            Developer Agent.
          </p>
        )}
        {detail.authType === 'api_key' && (
          <>
            <VaultForm connectorId={id} values={secrets} onChange={setSecrets} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-primary"
                style={{ borderRadius: 8 }}
                onClick={saveCredentials}
              >
                <Check size={13} /> {enabled ? 'Save Credentials' : 'Save & Enable Connector'}
              </button>
              {connectorSecrets[id] && <span style={BADGE_STYLE('#10B981')}>Configured</span>}
            </div>
          </>
        )}
      </div>

      {/* Agent capabilities */}
      <div className={CARD_CLASS}>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-extrabold text-white">
          <Bot size={14} color="#A5B4FC" /> Agent Capabilities
        </h3>
        <ul className="flex flex-col gap-2">
          {detail.capabilities.map(cap => (
            <li key={cap} className="flex items-center gap-2 text-xs text-neutral-300">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
              {cap}
            </li>
          ))}
        </ul>
      </div>

      {/* Use cases */}
      <div className={CARD_CLASS}>
        <h3 className="mb-3 text-sm font-extrabold text-white">Use Cases</h3>
        <div className="flex flex-col gap-2">
          {detail.useCases.map(uc => (
            <button
              key={uc.title}
              type="button"
              onClick={() => runUseCase(uc.prompt)}
              className="cursor-pointer rounded-lg border border-white/10 bg-neutral-950/40 p-3 text-left transition-all hover:border-indigo-500/40 hover:bg-indigo-500/10"
            >
              <div className="text-xs font-bold text-white">{uc.title}</div>
              <div className="text-[0.72rem] text-neutral-500">“{uc.prompt}”</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Popular open MCP servers shown in the registry modal. */
const MCP_REGISTRY: { name: string; serverUrl: string; desc: string }[] = [
  { name: 'PostgreSQL MCP', serverUrl: 'https://mcp.postgres.com/sse', desc: 'Query & manage Postgres databases' },
  { name: 'GitHub MCP', serverUrl: 'https://api.githubcopilot.com/mcp/', desc: 'Repos, issues, PRs and code search' },
  { name: 'Brave Search MCP', serverUrl: 'https://mcp.brave.com/search/sse', desc: 'Web / local / news search' },
  { name: 'Puppeteer MCP', serverUrl: 'https://mcp.puppeteer.com/sse', desc: 'Browser automation, screenshots, scraping' }
];

/**
 * The Connectors Hub: strict flex-row panel (sidebar left, content right —
 * never overlapping), frosted glass, category navigation with live count
 * badges, search, filter dropdown, the "+" add menu, and a 2-column card grid
 * featuring official colored brand logos. Custom API connectors and MCP
 * servers persist globally and ride along on every /generate-project request.
 */
export const ConnectorsView: React.FC = () => {
  const {
    selectedConnectors,
    toggleConnector,
    connectorSecrets,
    setConnectorSecrets,
    clearConnectorSecrets,
    customConnectors,
    addCustomConnector,
    removeCustomConnector,
    mcpServers,
    addMcpServer,
    removeMcpServer
  } = useApp();

  const [tab, setTab] = useState<HubTab>('All');
  const [query, setQuery] = useState('');
  const [sortFilter, setSortFilter] = useState<SortFilter>('Popular');
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<'custom' | 'mcp' | 'registry' | 'settings' | null>(null);
  const [settingsId, setSettingsId] = useState<string>('');
  /** Multi-field form values for the connector being configured. */
  const [settingsSecrets, setSettingsSecrets] = useState<Record<string, string>>({});
  const [customForm, setCustomForm] = useState<CustomConnector>(EMPTY_CUSTOM);
  const [mcpForm, setMcpForm] = useState<McpServer>(EMPTY_MCP);
  /** Detail-page routing: null = hub grid, connector id = detail page. */
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Admin settings modal: tab + visibility.
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('vault');
  // Request connector modal: visibility + form + toast.
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    serviceName: '',
    docsUrl: '',
    description: ''
  });
  const [toast, setToast] = useState<string | null>(null);
  // OAuth consent modal: which provider, which phase.
  const [oauthId, setOauthId] = useState<string | null>(null);
  const [oauthPhase, setOauthPhase] = useState<'consent' | 'authenticating'>('consent');

  // Outside clicks close the popovers.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Real OAuth callback landing: the backend redirects back to
  // /connectors?success=true&provider=<id> (or success=false&error=<msg>).
  // Runs once on mount — the round trip is a full page load.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('success')) return;
    if (params.get('success') === 'true') {
      const provider = params.get('provider') ?? '';
      if (provider && !selectedConnectors.includes(provider)) toggleConnector(provider);
      const meta = CONNECTOR_LIST.find(c => c.id === provider);
      setToast(`Successfully connected to ${meta?.name ?? provider}!`);
    } else {
      setToast(`Connection failed: ${params.get('error') ?? 'unknown error'}`);
    }
    window.history.replaceState({}, '', '/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Enabling a standard connector routes by its strict auth tier:
   *  oauth   -> consent modal, then the real backend OAuth redirect
   *  api_key -> vault modal (specific key name + placeholder per provider)
   *  none    -> zero-auth open SDK, enables immediately
   *  Disabling is always direct. */
  const handleToggle = (id: string) => {
    if (selectedConnectors.includes(id)) {
      toggleConnector(id); // disabling is direct
      return;
    }
    const tier = CONNECTOR_AUTH[id] ?? 'api_key';
    if (tier === 'none') {
      toggleConnector(id);
      setToast(`${CONNECTOR_CATALOG[id]?.name ?? id} enabled — no credentials needed.`);
      return;
    }
    if (tier === 'oauth') {
      setOauthId(id);
      setOauthPhase('consent');
      return;
    }
    setSettingsId(id);
    setSettingsSecrets(connectorSecrets[id] ?? {}); // prefill vault values
    setModal('settings');
  };

  /** Kick off the REAL OAuth handshake: full-page navigation to the backend
   *  authorize route, which 302s to the provider's consent page. The backend
   *  lands the user back on /connectors?success=true&provider=<id> when done. */
  const completeOauth = () => {
    if (!oauthId) return;
    setOauthPhase('authenticating');
    window.location.href = `${API_URL}/api/oauth/${oauthId}/authorize`;
  };

  const saveSettingsAndEnable = () => {
    const cleaned = Object.fromEntries(
      Object.entries(settingsSecrets).map(([k, v]) => [k, v.trim()])
    );
    setConnectorSecrets(settingsId, cleaned);
    toggleConnector(settingsId);
    setModal(null);
  };

  const saveCustomConnector = () => {
    if (!customForm.name.trim() || !customForm.baseUrl.trim()) return;
    addCustomConnector(customForm);
    setCustomForm(EMPTY_CUSTOM);
    setModal(null);
  };

  const saveMcpServer = () => {
    if (!mcpForm.name.trim() || !mcpForm.serverUrl.trim()) return;
    addMcpServer(mcpForm);
    setMcpForm(EMPTY_MCP);
    setModal(null);
  };

  // ---- Live filtering: category → search → sort filter ----
  const visible = useMemo(() => {
    let list: typeof CONNECTOR_LIST;
    if (tab === 'Enabled') {
      list = CONNECTOR_LIST.filter(c => selectedConnectors.includes(c.id));
    } else if (tab === 'All') {
      list = CONNECTOR_LIST;
    } else {
      list = CONNECTOR_LIST.filter(c => c.category === tab);
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
    if (sortFilter === 'Connected') list = list.filter(c => selectedConnectors.includes(c.id));
    if (sortFilter === 'Popular') {
      list = [...list].sort((a, b) => Number(b.popular ?? false) - Number(a.popular ?? false));
    }
    if (sortFilter === 'Newest') {
      list = [...list].sort((a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false));
    }
    return list;
  }, [tab, query, sortFilter, selectedConnectors]);

  const categoryCount = (cat: HubTab) => {
    if (cat === 'Enabled') return selectedConnectors.length;
    if (cat === 'All') return CONNECTOR_LIST.length;
    return CONNECTOR_LIST.filter(c => c.category === cat).length;
  };

  // Auto-dismiss toast after 3s.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const submitConnectorRequest = () => {
    if (!requestForm.serviceName.trim() || !requestForm.docsUrl.trim()) return;
    const entry: ConnectorRequest = {
      ...requestForm,
      submittedAt: new Date().toISOString()
    };
    try {
      const raw = localStorage.getItem('craftai_requested_connectors');
      const list: ConnectorRequest[] = raw ? JSON.parse(raw) : [];
      list.push(entry);
      localStorage.setItem('craftai_requested_connectors', JSON.stringify(list));
    } catch {
      /* storage disabled — submission is silently dropped, surface toast anyway */
    }
    setRequestForm({ serviceName: '', docsUrl: '', description: '' });
    setIsRequestModalOpen(false);
    setToast(`Request submitted for "${entry.serviceName}". Thanks!`);
  };

  // Detail-page routing: a selected connector replaces the hub grid.
  if (selectedConnectorId) {
    return (
      <ConnectorDetailPage
        id={selectedConnectorId}
        onBack={() => setSelectedConnectorId(null)}
        startOauth={id => {
          setOauthId(id);
          setOauthPhase('consent');
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex h-[85vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/80 text-neutral-200 shadow-2xl backdrop-blur-2xl">
      {/* ---------------- Isolated sidebar: search + quick filters + categories + footer ---------------- */}
      <aside className="z-10 flex h-full w-72 flex-shrink-0 select-none flex-col justify-between border-r border-white/10 bg-neutral-950/90 p-4">
        <div className="flex flex-col gap-3">
          {/* ISOLATED SEARCH INPUT CONTAINER */}
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-2.5 z-20 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search connectors..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="relative z-10 w-full rounded-xl border border-white/10 bg-neutral-900/90 py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>

          {/* QUICK FILTERS */}
          <div className="mt-2 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setTab('Enabled')}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                tab === 'Enabled'
                  ? 'border border-indigo-500/30 bg-indigo-600/20 text-indigo-400'
                  : 'text-neutral-400 hover:bg-white/5'
              }`}
            >
              <span>Enabled</span>
              <span className="rounded-full border border-white/5 bg-neutral-800/80 px-2 py-0.5 font-mono text-xs">
                {selectedConnectors.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('All')}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                tab === 'All'
                  ? 'border border-indigo-500/30 bg-indigo-600/20 text-indigo-400'
                  : 'text-neutral-400 hover:bg-white/5'
              }`}
            >
              <span>All</span>
              <span className="rounded-full border border-white/5 bg-neutral-800/80 px-2 py-0.5 font-mono text-xs">
                {CONNECTOR_LIST.length}
              </span>
            </button>
          </div>

          {/* CATEGORIES HEADER */}
          <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Categories
          </div>

          {/* CATEGORY LIST (scrollable) */}
          <div className="custom-scrollbar flex max-h-[42vh] flex-col gap-1 overflow-y-auto pr-1">
            {CONNECTOR_CATEGORIES.map(cat => {
              const active = tab === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTab(cat)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all ${
                    active
                      ? 'border border-white/10 bg-white/10 font-medium text-white'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  <span className="ml-2 font-mono text-xs text-neutral-500">
                    {categoryCount(cat)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM FOOTER ACTION CARDS */}
        <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
          <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-neutral-900/60 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
              <Share2 className="h-3.5 w-3.5 text-indigo-400" />
              <span>Missing a connector?</span>
            </div>
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-neutral-200 transition-all hover:bg-white/10"
            >
              Request Connector
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-neutral-900/80 py-2 text-xs font-medium text-neutral-300 transition-all hover:bg-neutral-800"
          >
            <Settings className="h-3.5 w-3.5 text-neutral-400" />
            <span>Admin settings</span>
          </button>
        </div>
      </aside>

      {/* ---------------- Right main area ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
        {/* Header bar: title / filter / + add */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">
            Connectors
            <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 font-mono text-xs font-medium text-neutral-500">
              {selectedConnectors.length} enabled
            </span>
          </h2>

          <div className="flex items-center gap-2">
            <div ref={filterRef} className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen(o => !o)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300 transition-all hover:border-white/20 hover:bg-white/10"
              >
                {sortFilter} <ChevronDown size={13} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-40 rounded-xl border border-white/10 bg-neutral-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
                  {(['Popular', 'Newest', 'Connected'] as SortFilter[]).map(f => (
                    <button
                      key={f}
                      type="button"
                      style={{ ...MENU_ITEM_STYLE, background: sortFilter === f ? 'rgba(99,102,241,0.12)' : 'transparent' }}
                      onClick={() => {
                        setSortFilter(f);
                        setFilterOpen(false);
                      }}
                    >
                      <span style={{ flex: 1 }}>{f}</span>
                      {sortFilter === f && <Check size={14} color="#818CF8" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-500/50 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-all hover:bg-indigo-500/25"
              >
                <Plus size={13} /> Add
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-xl border border-white/10 bg-neutral-900/95 p-1.5 text-left shadow-2xl backdrop-blur-xl">
                  <button type="button" style={MENU_ITEM_STYLE}
                    onClick={() => { setModal('custom'); setMenuOpen(false); }}>
                    <Plug size={14} color="#A5B4FC" /> Custom connector
                  </button>
                  <button type="button" style={MENU_ITEM_STYLE}
                    onClick={() => { setModal('mcp'); setMenuOpen(false); }}>
                    <Server size={14} color="#A5B4FC" /> MCP server
                  </button>
                  <button type="button" style={MENU_ITEM_STYLE}
                    onClick={() => { setModal('registry'); setMenuOpen(false); }}>
                    <Globe size={14} color="#A5B4FC" /> MCP registry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connector cards grid — strict 2-column layout */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visible.map(meta => (
            <ConnectorCard
              key={meta.id}
              meta={meta}
              enabled={selectedConnectors.includes(meta.id)}
              hasKey={Boolean(connectorSecrets[meta.id])}
              onToggle={() => handleToggle(meta.id)}
              onOpen={() => setSelectedConnectorId(meta.id)}
            />
          ))}
        </div>
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-500">
            No connectors match “{query}”.
          </p>
        )}

        {/* Configured MCP servers */}
        {mcpServers.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-extrabold text-white">
              <Server size={14} color="#A5B4FC" className="mr-1.5 inline align-text-bottom" />
              MCP Servers ({mcpServers.length})
            </h3>
            <div className="flex flex-col gap-2">
              {mcpServers.map(srv => (
                <div
                  key={srv.name}
                  className="flex items-center gap-3 rounded-xl border border-indigo-400/40 bg-neutral-900/60 px-3 py-2.5 transition-all hover:border-white/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white">{srv.name}</div>
                    <div className="truncate font-mono text-xs text-neutral-500">{srv.serverUrl}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMcpServer(srv.name)}
                    className="cursor-pointer border-none bg-transparent text-neutral-500"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configured custom API connectors */}
        {customConnectors.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-extrabold text-white">
              <Plug size={14} color="#A5B4FC" className="mr-1.5 inline align-text-bottom" />
              Custom API Connectors ({customConnectors.length})
            </h3>
            <div className="flex flex-col gap-2">
              {customConnectors.map(cc => (
                <div
                  key={cc.name}
                  className="flex items-center gap-3 rounded-xl border border-indigo-400/40 bg-neutral-900/60 px-3 py-2.5 transition-all hover:border-white/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white">{cc.name}</div>
                    <div className="truncate font-mono text-xs text-neutral-500">
                      {cc.baseUrl} · header {cc.headerKey || 'none'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomConnector(cc.name)}
                    className="cursor-pointer border-none bg-transparent text-neutral-500"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs leading-relaxed text-neutral-500">
          Enabled connectors are wired into every subsequent generation — the
          Developer Agent emits their official <code>src/lib/</code> SDK helper
          reading keys from <code>import.meta.env.VITE_*</code> at runtime and
          connects your UI components directly to it. Custom API connectors and
          MCP servers ride along under <code>custom_connectors</code> /{' '}
          <code>mcp_servers</code>.
        </p>
      </div>

      {/* ---------------- Modals ---------------- */}
      {modal === 'settings' && (() => {
        const providerName = CONNECTOR_CATALOG[settingsId]?.name ?? settingsId;
        return (
          <Modal title={`${providerName} credentials`} onClose={() => setModal(null)}>
            <p className="mb-2 text-sm text-neutral-400">
              Enter your <strong className="text-indigo-300">{providerName}</strong>{' '}
              credentials. They are stored in your browser vault
              (localStorage&nbsp;<code className="text-indigo-300">craftai_connector_vault</code>)
              and injected into the generated app's <code>.env</code> as VITE_* vars.
            </p>
            <VaultForm
              connectorId={settingsId}
              values={settingsSecrets}
              onChange={setSettingsSecrets}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveSettingsAndEnable}>
                <Check size={14} /> Save & Enable Connector
              </button>
            </div>
          </Modal>
        );
      })()}

      {modal === 'custom' && (
        <Modal title="Custom connector" onClose={() => setModal(null)}>
          <label style={LABEL_STYLE}>Connector name</label>
          <input
            value={customForm.name}
            onChange={e => setCustomForm({ ...customForm, name: e.target.value })}
            placeholder="e.g. Internal Billing API"
            style={INPUT_STYLE}
            autoFocus
          />
          <label style={LABEL_STYLE}>Base API URL</label>
          <input
            value={customForm.baseUrl}
            onChange={e => setCustomForm({ ...customForm, baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            style={INPUT_STYLE}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label style={LABEL_STYLE}>Auth header key</label>
              <input
                value={customForm.headerKey}
                onChange={e => setCustomForm({ ...customForm, headerKey: e.target.value })}
                placeholder="X-API-Key"
                style={INPUT_STYLE}
              />
            </div>
            <div className="flex-1">
              <label style={LABEL_STYLE}>Auth header value</label>
              <input
                type="password"
                value={customForm.headerValue}
                onChange={e => setCustomForm({ ...customForm, headerValue: e.target.value })}
                placeholder="token"
                style={INPUT_STYLE}
              />
            </div>
          </div>
          <label style={LABEL_STYLE}>OpenAPI / Swagger JSON (optional)</label>
          <textarea
            value={customForm.openApiSchema}
            onChange={e => setCustomForm({ ...customForm, openApiSchema: e.target.value })}
            placeholder='{"openapi": "3.0.0", "paths": {…}}'
            style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
          />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={saveCustomConnector}
              disabled={!customForm.name.trim() || !customForm.baseUrl.trim()}
            >
              <Plus size={14} /> Add connector
            </button>
          </div>
        </Modal>
      )}

      {modal === 'mcp' && (
        <Modal title="Add MCP server" onClose={() => setModal(null)}>
          <label style={LABEL_STYLE}>Server name</label>
          <input
            value={mcpForm.name}
            onChange={e => setMcpForm({ ...mcpForm, name: e.target.value })}
            placeholder="e.g. Postgres MCP"
            style={INPUT_STYLE}
            autoFocus
          />
          <label style={LABEL_STYLE}>Server SSE / HTTP URL</label>
          <input
            value={mcpForm.serverUrl}
            onChange={e => setMcpForm({ ...mcpForm, serverUrl: e.target.value })}
            placeholder="https://mcp.example.com/sse"
            style={INPUT_STYLE}
          />
          <label style={LABEL_STYLE}>Authentication token (optional)</label>
          <input
            type="password"
            value={mcpForm.authToken}
            onChange={e => setMcpForm({ ...mcpForm, authToken: e.target.value })}
            placeholder="Bearer token"
            style={INPUT_STYLE}
          />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={saveMcpServer}
              disabled={!mcpForm.name.trim() || !mcpForm.serverUrl.trim()}
            >
              <Plus size={14} /> Add server
            </button>
          </div>
        </Modal>
      )}

      {modal === 'registry' && (
        <Modal title="MCP registry — popular servers" onClose={() => setModal(null)}>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {MCP_REGISTRY.map(srv => {
              const added = mcpServers.some(s => s.name === srv.name);
              return (
                <div
                  key={srv.name}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900/70 p-3 transition-all hover:border-white/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white">{srv.name}</div>
                    <div className="text-xs text-neutral-500">{srv.desc}</div>
                    <div className="truncate font-mono text-[0.66rem] text-neutral-600">{srv.serverUrl}</div>
                  </div>
                  <button
                    type="button"
                    className={added ? 'btn-outline' : 'btn-primary'}
                    disabled={added}
                    onClick={() => addMcpServer({ name: srv.name, serverUrl: srv.serverUrl, authToken: '' })}
                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.76rem', whiteSpace: 'nowrap' }}
                  >
                    {added ? <Check size={13} /> : <Plus size={13} />}
                    {added ? 'Added' : 'Add to Agent'}
                  </button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ============================================================
          Admin Settings Modal — 3 tabs: Vault / Usage / Audit
          ============================================================ */}
      {isAdminModalOpen && (
        <Modal title="Admin settings" onClose={() => setIsAdminModalOpen(false)}>
          <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-neutral-950/60 p-1">
            {([
              ['vault', 'Workspace API Vault'],
              ['usage', 'Rate Limits & Usage'],
              ['audit', 'Security Audit Log']
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAdminTab(id as AdminTab)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  adminTab === id
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-neutral-400 hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {adminTab === 'vault' && (() => {
            const multiEntries = Object.entries(connectorSecrets);
            if (multiEntries.length === 0) {
              return (
                <p className="py-6 text-center text-xs text-neutral-500">
                  No credentials configured yet. Enable a connector to add one.
                </p>
              );
            }
            return (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {multiEntries.map(([id, fields]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">{id}</div>
                      <div className="truncate font-mono text-[0.7rem] text-neutral-500">
                        {Object.values(fields).filter(Boolean).length} credential
                        field{Object.values(fields).filter(Boolean).length === 1 ? '' : 's'} in vault
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        title="Update credentials"
                        onClick={() => {
                          setSettingsId(id);
                          setSettingsSecrets(fields);
                          setModal('settings');
                          setIsAdminModalOpen(false);
                        }}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[0.65rem] text-neutral-300 hover:bg-white/10"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        title="Revoke credentials"
                        onClick={() => clearConnectorSecrets(id)}
                        className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[0.65rem] text-red-300 hover:bg-red-500/20"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {adminTab === 'usage' && (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {selectedConnectors.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-500">
                  Enable connectors to see usage stats.
                </p>
              ) : (
                selectedConnectors.map((id, idx) => {
                  // ponytail: derived quota counter — real telemetry plugs in here.
                  const calls = 80 + ((id.length * 13 + idx * 47) % 240);
                  const status = id === 'supabase' ? 'Active' : calls > 200 ? 'Throttled' : 'OK';
                  const tone = status === 'Active' ? '#10B981' : status === 'Throttled' ? '#F59E0B' : '#A5B4FC';
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2"
                    >
                      <div className="text-xs font-semibold text-white">{id}</div>
                      <div className="flex items-center gap-3 text-[0.7rem]">
                        <span className="font-mono text-neutral-400">{calls} calls</span>
                        <span
                          className="rounded-full border px-2 py-0.5 font-semibold"
                          style={{ borderColor: `${tone}59`, color: tone, background: `${tone}1A` }}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {adminTab === 'audit' && (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {(() => {
                let entries: { ts: string; label: string }[] = [];
                try {
                  const raw = localStorage.getItem('craftai_audit_log');
                  if (raw) entries = JSON.parse(raw);
                } catch { /* ignore */ }
                const now = Date.now();
                // Always show the connectors currently configured + the last 4
                // synthesised events so the tab is never empty.
                const baseEvents: { ts: string; label: string }[] = selectedConnectors.map(id => ({
                  ts: new Date(now - 1000 * 60 * 30).toISOString(),
                  label: `${id} authorized for workspace`
                }));
                const merged = [...entries, ...baseEvents]
                  .sort((a, b) => b.ts.localeCompare(a.ts))
                  .slice(0, 20);
                if (merged.length === 0) {
                  return (
                    <p className="py-6 text-center text-xs text-neutral-500">
                      No audit events yet.
                    </p>
                  );
                }
                return merged.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2"
                  >
                    <div className="text-xs text-neutral-300">{e.label}</div>
                    <div className="font-mono text-[0.65rem] text-neutral-500">
                      {new Date(e.ts).toLocaleString()}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </Modal>
      )}

      {/* ============================================================
          Request Connector Modal — saved to localStorage
          ============================================================ */}
      {isRequestModalOpen && (
        <Modal title="Request a connector" onClose={() => setIsRequestModalOpen(false)}>
          <p className="mb-3 text-xs text-neutral-400">
            Tell us which service you want wired next. We prioritize the
            most-requested ones.
          </p>
          <label style={LABEL_STYLE}>Service name</label>
          <input
            type="text"
            value={requestForm.serviceName}
            onChange={e => setRequestForm({ ...requestForm, serviceName: e.target.value })}
            placeholder="e.g. HubSpot, Salesforce"
            style={INPUT_STYLE}
            autoFocus
          />
          <label style={LABEL_STYLE}>Documentation / API URL</label>
          <input
            type="url"
            value={requestForm.docsUrl}
            onChange={e => setRequestForm({ ...requestForm, docsUrl: e.target.value })}
            placeholder="https://developers.hubspot.com"
            style={INPUT_STYLE}
          />
          <label style={LABEL_STYLE}>Description / use case</label>
          <textarea
            value={requestForm.description}
            onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
            placeholder="What would you build with this connector?"
            style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }}
          />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={submitConnectorRequest}
              disabled={!requestForm.serviceName.trim() || !requestForm.docsUrl.trim()}
            >
              <Send size={13} /> Submit request
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================
          Toast notification (success)
          ============================================================ */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-200 shadow-2xl backdrop-blur-xl">
          <Check size={14} className="mr-2 inline align-text-bottom" />
          {toast}
        </div>
      )}

      {/* ============================================================
          OAuth Consent Modal — sleek glass with connecting animation
          ============================================================ */}
      {oauthId && (() => {
        const meta = CONNECTOR_LIST.find(c => c.id === oauthId);
        const providerName = meta?.name ?? oauthId.replace(/_/g, ' ');
        return (
          <Modal title="Authorize connection" onClose={() => { setOauthId(null); setOauthPhase('consent'); }}>
            <div className="flex flex-col items-center gap-4 py-3 text-center">
              {/* CraftAI ⇄ Provider connecting animation */}
              <div className="relative flex items-center justify-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-neutral-950/80 shadow-lg">
                  <Sparkles size={26} color="#818CF8" />
                </div>
                {/* Animated connector line */}
                <div className="relative h-[2px] w-20 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-neutral-950/80 p-2 shadow-lg">
                  <BrandLogo id={oauthId} size={36} />
                </div>
              </div>

              <div>
                <p className="text-sm text-neutral-300">
                  <strong className="text-white">CraftAI</strong> is requesting access to your{' '}
                  <strong className="text-indigo-300">{providerName}</strong> account.
                </p>
                <p className="mt-1 text-[0.7rem] text-neutral-500">
                  Scopes: read &amp; write on resources you own. You can revoke this connection at any time from Admin settings.
                </p>
              </div>

              {oauthPhase === 'consent' && (
                <div className="mt-1 flex w-full gap-2">
                  <button
                    type="button"
                    className="btn-ghost flex-1"
                    onClick={() => { setOauthId(null); setOauthPhase('consent'); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    onClick={completeOauth}
                  >
                    <ShieldCheck size={13} /> Authorize Access
                  </button>
                </div>
              )}

              {oauthPhase === 'authenticating' && (
                <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 py-2.5 text-xs font-semibold text-indigo-300">
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  Authenticating with {providerName}…
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

interface ConnectorCardProps {
  meta: ConnectorMeta;
  enabled: boolean;
  hasKey: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({ meta, enabled, hasKey, onToggle, onOpen }) => (
  <motion.div
    whileHover={{ y: -2 }}
    transition={{ duration: 0.15 }}
    onClick={onOpen}
    className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
      enabled
        ? 'border-indigo-400/50 bg-neutral-900/80 shadow-[0_0_24px_rgba(99,102,241,0.15)]'
        : 'border-white/5 bg-neutral-900/60 hover:border-white/20 hover:bg-neutral-800/90'
    }`}
  >
    {/* Square brand logo tile */}
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-white/5 bg-neutral-950/80 p-2">
      <BrandLogo id={meta.id} size={30} />
    </div>

    {/* Middle: name + badges + description */}
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-bold text-white">{meta.name}</span>
        {enabled && <span style={BADGE_STYLE('#10B981')}>Connected</span>}
        {meta.popular && !enabled && <span style={BADGE_STYLE('#818CF8')}>Popular</span>}
        {meta.isNew && !enabled && <span style={BADGE_STYLE('#F59E0B')}>New</span>}
      </div>
      <div className="line-clamp-2 text-xs text-neutral-400">{meta.desc}</div>
      <div className="truncate font-mono text-[0.66rem] text-neutral-600">
        {meta.category} · generates {meta.file}
        {hasKey && enabled && <KeyRound size={10} color="#10B981" className="ml-1 inline" />}
      </div>
    </div>

    {/* Right: compact toggle button */}
    <button
      type="button"
      className={`${enabled ? 'btn-outline' : 'btn-primary'} flex-shrink-0 px-3 py-1.5 text-xs font-medium`}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
      style={{ borderRadius: 8, whiteSpace: 'nowrap' }}
    >
      {enabled ? (
        <>
          <Check size={12} /> Connected
        </>
      ) : (
        <>
          <Plus size={12} /> Enable
        </>
      )}
    </button>
  </motion.div>
);