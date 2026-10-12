import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, Check, ChevronDown, ExternalLink, Eye, EyeOff, Globe, KeyRound,
  Search, ShieldCheck, SlidersHorizontal, X
} from 'lucide-react';
import {
  CONNECTOR_AUTH, CONNECTOR_CATALOG, CONNECTOR_CATEGORIES, CONNECTOR_LIST,
  ConnectorCategory, ConnectorMeta, brandColor, connectorDetail
} from '../lib/connectorCatalog';
import { BrandLogo } from './BrandLogos';
import { API_URL } from '../services/api';
import { CATEGORY2_SCHEMAS } from '../config/category2Schemas';
import { CATEGORY3_SCHEMAS } from '../config/category3Schemas';
import { CATEGORY4_SCHEMAS } from '../config/category4Schemas';
import { CATEGORY567_SCHEMAS } from '../config/category567Schemas';

type HubTab = 'Enabled' | 'All' | ConnectorCategory;
type SortFilter = 'Popular' | 'Newest' | 'Connected';

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8,
  padding: '8px 12px', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '100%'
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '10px 0 4px'
};

const MENU_ITEM_STYLE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px',
  borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--text-main)',
  cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left'
};

const BADGE_STYLE = (color: string): React.CSSProperties => {
  const tint = (hexAlpha: string) => color.startsWith('#')
    ? `${color}${hexAlpha}`
    : `color-mix(in srgb, ${color} ${Math.round((parseInt(hexAlpha, 16) / 255) * 100)}%, transparent)`;
  return {
    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    padding: '2px 8px', borderRadius: 999, background: tint('1A'), border: `1px solid ${tint('59')}`, color
  };
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children
}) => (
  <div onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.18 }} onClick={e => e.stopPropagation()}
      className="w-full max-w-md rounded-2xl border border-[#d2d2d7] dark:border-[#27272a] bg-white dark:bg-[#09090b] p-6 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-bold text-[#1D1D1F] dark:text-white">{title}</h3>
        <button type="button" onClick={onClose} className="cursor-pointer border-none bg-transparent text-zinc-400">
          <X size={16} />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
);

const SecretField: React.FC<{
  label: string; placeholder: string; value: string; optional?: boolean; onChange: (v: string) => void;
}> = ({ label, placeholder, value, optional, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={LABEL_STYLE}>
        {label}{optional && <span className="ml-1 normal-case text-zinc-500">(optional)</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} style={{ ...INPUT_STYLE, paddingRight: 36 }}
          className={optional ? '' : 'required-field'}
        />
        <button
          type="button" onClick={() => setShow(s => !s)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
};

const VaultForm: React.FC<{ connectorId: string; values: Record<string, string>; onChange: (fields: Record<string, string>) => void; }> = ({ connectorId, values, onChange }) => {
  const fields = CATEGORY2_SCHEMAS[connectorId] ?? CATEGORY3_SCHEMAS[connectorId] ?? CATEGORY4_SCHEMAS[connectorId] ?? CATEGORY567_SCHEMAS[connectorId] ?? [];
  return (
    <div className="flex flex-col gap-1">
      {fields.map(f => (
        <SecretField key={f.key} label={f.label} placeholder={f.placeholder} optional={f.optional} value={values[f.key] ?? ''} onChange={v => onChange({ ...values, [f.key]: v })} />
      ))}
    </div>
  );
};

const Dropdown: React.FC<{ value: string; options: { id: string; label: string }[]; onChange: (id: string) => void; width?: number; }> = ({ value, options, onChange, width = 200 }) => {
  const [open, setOpen] = useState(false);
  const label = options.find(o => o.id === value)?.label ?? value;
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width }} className="flex cursor-pointer items-center justify-between rounded-lg border border-[#d2d2d7] dark:border-[#27272a] bg-zinc-100 dark:bg-[#121215] px-3 py-2 text-xs text-[#1D1D1F] dark:text-white transition-all hover:border-zinc-500">
        {label} <ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 rounded-xl border border-[#d2d2d7] dark:border-[#27272a] bg-white dark:bg-[#09090b] p-1.5 text-left shadow-2xl backdrop-blur-xl" style={{ width }}>
          {options.map(o => (
            <button key={o.id} type="button" style={{ ...MENU_ITEM_STYLE, background: o.id === value ? 'var(--bg-hover)' : 'transparent' }} onClick={() => { onChange(o.id); setOpen(false); }}>
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.id === value && <Check size={14} color="currentColor" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ConnectorDetailPage: React.FC<{ id: string; onBack: () => void; startOauth: (id: string) => void }> = ({ id, onBack, startOauth }) => {
  const { selectedConnectors, toggleConnector, connectorSecrets, setConnectorSecrets, setPrompt, setCurrentScreen } = useApp();
  const meta = CONNECTOR_LIST.find(c => c.id === id);
  const [secrets, setSecrets] = useState<Record<string, string>>(connectorSecrets[id] ?? {});
  if (!meta) return null;
  const detail = connectorDetail(meta);
  const enabled = selectedConnectors.includes(id);

  const saveCredentials = () => {
    const cleaned = Object.fromEntries(Object.entries(secrets).map(([k, v]) => [k, v.trim()]));
    setConnectorSecrets(id, cleaned);
    if (!enabled) toggleConnector(id);
  };

  const runUseCase = (prompt: string) => {
    setPrompt(prompt);
    setCurrentScreen('generate-plan');
  };

  return (
    <div className="mx-auto flex h-[80vh] w-full max-w-6xl flex-col gap-5 overflow-y-auto rounded-2xl border border-[#d2d2d7] dark:border-[#27272a] bg-white dark:bg-[#09090b] p-6 shadow-2xl backdrop-blur-2xl">
      <button type="button" onClick={onBack} className="flex cursor-pointer items-center gap-1.5 self-start border-none bg-transparent text-xs font-semibold text-zinc-500 dark:text-zinc-400 transition-all hover:text-[#1D1D1F] dark:hover:text-white">
        <ArrowLeft size={13} /> Connectors <span className="text-zinc-600">›</span>
        <span className="text-[#1D1D1F] dark:text-white">{meta.name}</span>
      </button>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-[#d2d2d7] dark:border-[#27272a] bg-zinc-100 dark:bg-black p-2">
          <BrandLogo id={meta.id} size={38} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[#1D1D1F] dark:text-white">{meta.name}</h1>
            <span style={BADGE_STYLE('#ffffff')}>{meta.category}</span>
            <span style={BADGE_STYLE(enabled ? '#10b981' : '#a1a1aa')}>{enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="font-mono text-[0.75rem] text-zinc-500">generates {meta.file}</div>
        </div>
        <button type="button" className={`${enabled ? 'btn-outline' : 'btn-primary'} flex-shrink-0`} style={{ borderRadius: 8, whiteSpace: 'nowrap' }} onClick={() => toggleConnector(id)}>
          {enabled ? 'Disable for workspace' : 'Enable for workspace'}
        </button>
      </div>

      <div className="rounded-xl border border-[#d2d2d7] dark:border-[#27272a] bg-white dark:bg-[#09090b] p-5">
        <h3 className="mb-1 text-sm font-bold text-[#1D1D1F] dark:text-white">Overview</h3>
        <p className="mb-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {meta.desc}. When enabled, the Developer Agent generates a real{' '}
          <code className="text-[#1D1D1F] dark:text-white">{meta.file}</code> SDK client reading keys from <code>import.meta.env.VITE_*</code> and wires the UI directly to it.
        </p>
        <a href={detail.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-zinc-800">
          {detail.authType === 'oauth' ? `Try ${meta.name}` : 'View Docs'} <ExternalLink size={12} />
        </a>
      </div>

      <div className="rounded-xl border border-[#d2d2d7] dark:border-[#27272a] bg-white dark:bg-[#09090b] p-5">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#1D1D1F] dark:text-white"><KeyRound size={14} color="currentColor" /> Credentials &amp; Auth Setup</h3>
        {detail.authType === 'oauth' ? (
          <>
            <button type="button" className="btn-primary" style={{ borderRadius: 8 }} onClick={() => startOauth(id)}>
              <Globe size={13} /> Connect your {meta.name} Account
            </button>
            <p className="mt-2 text-[0.75rem] text-zinc-500">Stored securely via Vault HSM.</p>
          </>
        ) : detail.authType === 'none' ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400"><strong className="text-[#1D1D1F] dark:text-white">Zero-auth open SDK.</strong> Enable directly.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-zinc-400">Injected into <code>.env</code> by the Agent.</p>
            <VaultForm connectorId={id} values={secrets} onChange={setSecrets} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-primary" style={{ borderRadius: 8 }} onClick={saveCredentials}>
                <Check size={13} /> {enabled ? 'Save Credentials' : 'Save & Enable Connector'}
              </button>
              {connectorSecrets[id] && <span style={BADGE_STYLE('#10b981')}>Configured</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const ConnectorsView: React.FC = () => {
  const { selectedConnectors, toggleConnector, connectorSecrets, setConnectorSecrets } = useApp();

  const [tab, setTab] = useState<HubTab>('All');
  const [query, setQuery] = useState('');
  const [sortFilter, setSortFilter] = useState<SortFilter>('Popular');
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<'settings' | null>(null);
  const [settingsId, setSettingsId] = useState<string>('');
  const [settingsSecrets, setSettingsSecrets] = useState<Record<string, string>>({});
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const [oauthId, setOauthId] = useState<string | null>(null);
  const [oauthPhase, setOauthPhase] = useState<'consent' | 'authenticating'>('consent');

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleToggle = (id: string) => {
    if (selectedConnectors.includes(id)) { toggleConnector(id); return; }
    const tier = CONNECTOR_AUTH[id] ?? 'api_key';
    if (tier === 'none') { toggleConnector(id); return; }
    if (tier === 'oauth') { setOauthId(id); setOauthPhase('consent'); return; }
    setSettingsId(id); setSettingsSecrets(connectorSecrets[id] ?? {}); setModal('settings');
  };

  const completeOauth = () => { if (oauthId) window.location.href = `${API_URL}/api/oauth/${oauthId}/authorize`; };

  const saveSettingsAndEnable = () => {
    const cleaned = Object.fromEntries(Object.entries(settingsSecrets).map(([k, v]) => [k, v.trim()]));
    setConnectorSecrets(settingsId, cleaned); toggleConnector(settingsId); setModal(null);
  };

  const visible = useMemo(() => {
    let list = tab === 'Enabled' ? CONNECTOR_LIST.filter(c => selectedConnectors.includes(c.id)) : tab === 'All' ? CONNECTOR_LIST : CONNECTOR_LIST.filter(c => c.category === tab);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
    if (sortFilter === 'Connected') list = list.filter(c => selectedConnectors.includes(c.id));
    if (sortFilter === 'Popular') list = [...list].sort((a, b) => Number(b.popular ?? false) - Number(a.popular ?? false));
    if (sortFilter === 'Newest') list = [...list].sort((a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false));
    return list;
  }, [tab, query, sortFilter, selectedConnectors]);

  if (selectedConnectorId) return <ConnectorDetailPage id={selectedConnectorId} onBack={() => setSelectedConnectorId(null)} startOauth={id => { setOauthId(id); setOauthPhase('consent'); }} />;

  return (
    <div className="w-full p-8 flex flex-col gap-6">

      {/* Hub header — full width above the 12-col grid (code.html) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d2d2d7] dark:border-[#27272a]">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold font-display text-[#1D1D1F] dark:text-white tracking-tight">Connectors Hub</h1>
            <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 border border-[#d2d2d7] px-2 py-0.5 rounded uppercase dark:bg-zinc-900 dark:text-zinc-300">
              {CONNECTOR_LIST.length} Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage API keys, vector indices, model mesh endpoints, and webhook bridges.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 z-20 h-4 w-4 text-zinc-500 pointer-events-none" />
            <input
              type="text" placeholder="Search connectors (ESC to clear)..." value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
              className="bg-white dark:bg-[#09090b] border border-[#d2d2d7] dark:border-[#27272a] rounded-lg py-2 pl-9 pr-3 text-xs text-[#1D1D1F] dark:text-white placeholder:text-zinc-500 w-64 focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Floating glass brand marquee with mask-image fade edges (code.html) */}
      <div className="stitch-marquee relative w-full rounded-2xl px-4 py-6 min-h-[100px] backdrop-blur-xl bg-zinc-100/70 border border-[#d2d2d7] shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden my-2 flex items-center dark:bg-black/40 dark:border-white/10 dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)]" aria-hidden="true">
        <div className="stitch-marquee-track">
          {[...CONNECTOR_LIST, ...CONNECTOR_LIST].map((meta, i) => (
            <span key={`${meta.id}-${i}`} className="flex items-center justify-center shrink-0">
              <BrandLogo id={meta.id} size={32} />
            </span>
          ))}
        </div>
      </div>

      {/* Main hub layout: 12-col — categories + connectors bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Category Sidebar */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-3 bg-white dark:bg-[#09090b] border border-[#d2d2d7] dark:border-[#27272a] rounded-xl flex flex-col gap-1">
            {(['Enabled', 'All', ...CONNECTOR_CATEGORIES] as HubTab[]).map(cat => {
              const active = tab === cat;
              const count = cat === 'Enabled' ? selectedConnectors.length : cat === 'All' ? CONNECTOR_LIST.length : CONNECTOR_LIST.filter(c => c.category === cat).length;
              return (
                <button
                  key={cat} type="button" onClick={() => setTab(cat)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                    active ? 'bg-zinc-900 !text-white dark:bg-white dark:!text-black' : 'text-zinc-600 hover:text-[#1D1D1F] hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900'
                  }`}
                >
                  <span className="truncate pr-2">{cat}</span>
                  <span className={`font-mono text-[10px] ${active ? '' : 'text-zinc-500'}`}>{count}</span>
                </button>
              );
            })}
            {/* Sort filter rail inside the category card */}
            <div ref={filterRef} className="relative mt-1">
              <button
                type="button" onClick={() => setFilterOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-[#1D1D1F] hover:bg-zinc-100 transition-colors dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900"
              >
                <span className="flex items-center gap-1.5"><SlidersHorizontal size={13} /> Sort: {sortFilter}</span>
                <ChevronDown size={13} />
              </button>
              {filterOpen && (
                <div className="absolute left-0 bottom-full mb-2 z-50 w-full rounded-xl border border-[#d2d2d7] dark:border-[#27272a] bg-white dark:bg-[#09090b] p-1.5 shadow-2xl">
                  {(['Popular', 'Newest', 'Connected'] as SortFilter[]).map(f => (
                    <button
                      key={f} type="button" onClick={() => { setSortFilter(f); setFilterOpen(false); }}
                      style={{ ...MENU_ITEM_STYLE, background: sortFilter === f ? 'var(--bg-hover)' : 'transparent' }}
                    >
                      <span style={{ flex: 1 }}>{f}</span>
                      {sortFilter === f && <Check size={14} color="currentColor" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Secret Vault status card (code.html) */}
          <div className="p-4 bg-white dark:bg-[#09090b] border border-[#d2d2d7] dark:border-[#27272a] rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#1D1D1F] dark:text-white font-medium text-xs">
              <ShieldCheck size={14} className="text-[#1D1D1F] dark:text-white" /> Secret Vault Active
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              All credentials encrypted via AES-256-GCM hardware security modules (HSM).
            </p>
            <div className="text-[10px] font-mono text-zinc-500 pt-1 border-t border-[#d2d2d7] dark:border-[#27272a]">
              KMS: us-east-1-key-08f
            </div>
          </div>
        </aside>

        {/* Connectors Bento Grid */}
        <div className="lg:col-span-9">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {visible.map(meta => (
                <ConnectorCard
                  key={meta.id} meta={meta} hero={Boolean(meta.popular)}
                  enabled={selectedConnectors.includes(meta.id)} hasKey={Boolean(connectorSecrets[meta.id])}
                  onToggle={() => handleToggle(meta.id)} onOpen={() => setSelectedConnectorId(meta.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {modal === 'settings' && (
        <Modal title="Credentials" onClose={() => setModal(null)}>
          <VaultForm connectorId={settingsId} values={settingsSecrets} onChange={setSettingsSecrets} />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-primary" onClick={saveSettingsAndEnable}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const useTilt = (maxDeg = 5) => {
  const rx = useMotionValue(0); const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 260, damping: 22 });
  const sry = useSpring(ry, { stiffness: 260, damping: 22 });
  const onMouseMove = (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5; const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * maxDeg * 2); rx.set(-py * maxDeg * 2);
    el.style.setProperty('--pointer-x', `${(px + 0.5) * 100}%`);
    el.style.setProperty('--pointer-y', `${(py + 0.5) * 100}%`);
  };
  const onMouseLeave = (e: React.MouseEvent) => {
    rx.set(0); ry.set(0);
    (e.currentTarget as HTMLElement).style.setProperty('--pointer-x', '50%');
    (e.currentTarget as HTMLElement).style.setProperty('--pointer-y', '50%');
  };
  return { srx, sry, onMouseMove, onMouseLeave };
};

interface ConnectorCardProps { meta: ConnectorMeta; hero?: boolean; enabled: boolean; hasKey: boolean; onToggle: () => void; onOpen: () => void; }

const ConnectorCard: React.FC<ConnectorCardProps> = ({ meta, hero = false, enabled, hasKey, onToggle, onOpen }) => {
  const tilt = useTilt();
  const reduceMotion = useReducedMotion();
  const brand = brandColor(meta.id);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseMove={reduceMotion ? undefined : tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      onClick={onOpen}
      style={{
        rotateX: tilt.srx, rotateY: tilt.sry, transformPerspective: 1000,
        position: 'relative', overflow: 'hidden', '--brand': brand
      } as React.CSSProperties}
      className={`p-4 rounded-xl bg-white dark:bg-[#09090b] border border-[#d2d2d7] dark:border-[#27272a] hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors flex flex-col justify-between cursor-pointer group ${enabled ? '!border-zinc-900 dark:!border-white' : ''}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle at var(--pointer-x, 50%) var(--pointer-y, 50%), color-mix(in srgb, var(--brand) 35%, transparent) 0%, transparent 80%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[21] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle 90px at var(--pointer-x, 50%) var(--pointer-y, 50%), color-mix(in srgb, var(--brand) 6%, transparent), transparent 70%)' }}
      />

      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-black border border-[#d2d2d7] dark:border-[#27272a] flex items-center justify-center font-bold relative z-30">
              <BrandLogo id={meta.id} size={20} />
            </div>
            <div>
              <div className="text-xs text-[#1D1D1F] dark:text-white font-semibold relative z-30">{meta.name}</div>
              <div className="text-[10px] font-mono text-zinc-500 relative z-30">{meta.category}</div>
            </div>
          </div>
          {enabled && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-[#27272a] text-white relative z-30">CONNECTED</span>}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 relative z-30 line-clamp-2">{meta.desc}</p>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#d2d2d7] dark:border-[#27272a] relative z-30">
        <span className="font-mono text-[10px] text-zinc-500">{meta.popular ? 'Tier-1 integration' : 'SDK wiring'}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={e => { e.stopPropagation(); onToggle(); }} className={`px-2.5 py-1 rounded border text-xs transition-colors ${enabled ? 'bg-zinc-900 border-[#27272a] text-white hover:border-zinc-500' : 'bg-zinc-100 text-[#1D1D1F] border-transparent hover:bg-zinc-200 dark:bg-white dark:text-black'}`}>
            {enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};