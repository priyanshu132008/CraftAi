import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SandpackProvider,
  SandpackPreview,
  useSandpack
} from '@codesandbox/sandpack-react';
import { GeneratedFile } from '../services/api';

/**
 * Production live preview: bundles the generated project IN-BROWSER via
 * Sandpack — no server route involved. (The pre-Sandpack flow iframed
 * http://localhost:3000/preview, which only exists on the dev machine where
 * the backend mirrors files into src/generated/.)
 *
 * Two modes with an automatic fallback:
 *   1. `vite-react-ts` (Nodebox) — runs the REAL Vite app: npm install,
 *      vite dev server, import.meta.env, .env files, Tailwind/PostCSS.
 *      Powerful but cold-starts slowly and can hang on pathological
 *      package.json contents.
 *   2. `react-ts` (legacy in-browser bundler, no install step) — flattened
 *      file map + dependencies extracted from the generated package.json.
 *      Used when mode 1 hasn't reported `idle` within HANG_THRESHOLD_MS.
 */

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
const TAILWIND_CDN = 'https://cdn.tailwindcss.com';

/** Nodebox cold start (npm install + vite boot) legitimately takes tens of
 *  seconds on a first run; beyond this we assume the bundler hung. */
const HANG_THRESHOLD_MS = 75_000;

const isPackageJson = (p: string) => p === 'package.json' || p.endsWith('/package.json');
const dirOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');

/** Server-side files that can never run in the browser sandbox — excluded
 *  even when root detection falls back to '' (flat layouts), so a stray
 *  `backend/` or top-level `server.ts` never reaches Sandpack. */
const isServerFile = (p: string) =>
  p.startsWith('backend/') || /(^|\/)server\.(ts|js|mjs)$/.test(p);

const ENTRIES = ['/src/main.tsx', '/src/main.jsx', '/src/main.ts', '/src/main.js'];

/** Guarantee `/index.html` and that its module script points at an entry
 *  file that actually exists in the sandbox tree (generated apps sometimes
 *  emit index.html referencing src/index.tsx, or omit it entirely — the
 *  template default targets /index.tsx, which we don't have). */
function ensureEntryHtml(out: Record<string, string>): void {
  const entry = ENTRIES.find(e => e in out) ?? ('/src/App.tsx' in out ? '/src/main.tsx' : null);
  if (entry === '/src/main.tsx' && !('/src/main.tsx' in out) && '/src/App.tsx' in out) {
    out['/src/main.tsx'] =
      "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './index.css';\ncreateRoot(document.getElementById('root')!).render(<App />);\n";
  }
  const target = entry ?? '/src/main.tsx';
  if ('/index.html' in out) {
    // Repoint any stale entry reference at the resolved entry file.
    out['/index.html'] = out['/index.html'].replace(
      /(<script[^>]*type="module"[^>]*src=")\/src\/[^"]*(")/,
      `$1${target}$2`
    );
    // The generated index.html sometimes emits a bare <script src=…> — the
    // bundler evaluates it as a classic script and import.meta explodes.
    out['/index.html'] = out['/index.html'].replace(
      /<script\s+(?![^>]*\btype=)([^>]*src="\/src\/)/,
      '<script type="module" $1'
    );
  } else {
    out['/index.html'] =
      `<!doctype html><html><head><meta charset="UTF-8" /></head>` +
      `<body><div id="root"></div><script type="module" src="${target}"></script></body></html>`;
  }
}

/** Locate the directory holding the runnable Vite frontend: the one
 *  containing BOTH package.json and index.html (full-stack scopes emit
 *  `frontend/package.json` + `frontend/index.html` beside a `backend/`).
 *  Fallback: the package.json that depends on react. */
function detectFrontendRoot(files: GeneratedFile[]): string {
  const dirs = files.filter(f => isPackageJson(f.path)).map(f => dirOf(f.path));
  const withHtml = dirs.find(d => files.some(f => f.path === `${d}index.html`));
  if (withHtml !== undefined) return withHtml;
  const withReact = dirs.find(d => {
    const pkg = files.find(f => f.path === `${d}package.json`);
    try {
      const parsed = JSON.parse(pkg?.content ?? '{}') as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      return Boolean(parsed.dependencies?.react ?? parsed.devDependencies?.react);
    } catch {
      return false;
    }
  });
  return withReact ?? '';
}

/** Mode 1: hand Nodebox the Vite tree intact — `/package.json`,
 *  `/index.html`, `/src/main.tsx`, …, every key with a leading slash and
 *  the frontend-root prefix fully stripped. */
function toViteFiles(files: GeneratedFile[]): Record<string, string> {
  const root = detectFrontendRoot(files);
  const out: Record<string, string> = {};
  for (const f of files) {
    // Only the frontend subtree runs in the browser sandbox — sibling
    // backend/ services (express, fastapi) can't, and confuse the entry.
    if (!f.path.startsWith(root) || isServerFile(f.path)) continue;
    out[`/${f.path.slice(root.length)}`] = f.content;
  }
  if (Object.keys(out).length > 0) ensureEntryHtml(out);
  return out;
}

// Build-time-only or host-pinned packages: the legacy bundler provides
// React itself and has no Tailwind/PostCSS pipeline (CDN runtime instead).
const CRA_SKIP_DEPS = new Set([
  'react', 'react-dom', 'tailwindcss', 'postcss', 'autoprefixer', 'vite', 'typescript'
]);

interface CraSetup {
  files: Record<string, string>;
  dependencies: Record<string, string>;
}

/** Mode 2: legacy `react-ts` bundler — flatten `src/` to the sandbox root,
 *  main.tsx becomes the /index.tsx entry, configs/html are dropped, and
 *  runtime deps come from the generated package.json. */
function toCraSetup(files: GeneratedFile[]): CraSetup {
  const root = detectFrontendRoot(files);
  const out: Record<string, string> = {};
  let dependencies: Record<string, string> = {};

  for (const f of files) {
    let p = f.path;
    if (!p.startsWith(root) || isServerFile(p)) continue;
    p = p.slice(root.length);
    if (p === 'package.json') {
      try {
        const parsed = JSON.parse(f.content) as { dependencies?: Record<string, string> };
        dependencies = parsed.dependencies ?? {};
      } catch {
        /* malformed package.json — the template still provides react */
      }
      continue;
    }
    if (
      p === 'index.html' ||
      /(^|\/)(vite\.config|tsconfig|postcss\.config|tailwind\.config|vite-env\.d)/.test(p)
    ) {
      continue;
    }
    if (p.startsWith('public/')) {
      out[`/${p}`] = f.content;
      continue;
    }
    if (p.startsWith('src/')) p = p.slice(4);
    if (p === 'main.tsx') p = 'index.tsx';
    else if (p === 'main.jsx' || p === 'main.ts' || p === 'main.js') p = 'index.js';
    out[`/${p}`] = f.content;
  }

  for (const name of Object.keys(dependencies)) {
    if (CRA_SKIP_DEPS.has(name)) delete dependencies[name];
  }

  // import.meta exists only in ESM; the legacy bundler evaluates CJS-style,
  // so generated files (e.g. src/lib/api.ts) crash with "Cannot use
  // 'import.meta' outside a module". Rewrite EVERY import.meta reference:
  // import.meta.env becomes a plain object literal pre-filled from any .env
  // the project shipped (VITE_* connector secrets make it into the preview
  // this way too), and any leftover import.meta (hot/url/glob — Vite-only)
  // becomes a benign object whose property reads return undefined.
  const envVars: Record<string, string> = {};
  for (const key of Object.keys(out)) {
    if (!/(^|\/)\.env(\.|$)/.test(key)) continue;
    for (const line of out[key].split('\n')) {
      const m = line.match(/^\s*(VITE_[A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) envVars[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    delete out[key];
  }
  const envJson = JSON.stringify(envVars);
  const envShim = `(${envJson})`;
  const metaShim = `({env:${envJson}})`;
  for (const key of Object.keys(out)) {
    if (/\.(tsx?|jsx?)$/.test(key) && out[key].includes('import.meta')) {
      out[key] = out[key]
        .replace(/\bimport\.meta\.env\b/g, envShim)
        .replace(/\bimport\.meta\b/g, metaShim);
    }
  }

  if (!out['/index.tsx'] && !out['/index.js'] && out['/App.tsx']) {
    out['/index.tsx'] =
      "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './index.css';\ncreateRoot(document.getElementById('root')!).render(<App />);\n";
  }
  return { files: out, dependencies };
}

/** Sandpack never fires a DOM load on the outer page — translate bundler
 *  status into the workspace's overlay state and detect Nodebox hangs. */
const StatusDriver: React.FC<{
  onReady: () => void;
  onHang: () => void;
  canHang: boolean;
}> = ({ onReady, onHang, canHang }) => {
  const { sandpack } = useSandpack();
  const hangTimer = useRef<number | null>(null);

  useEffect(() => {
    if (sandpack.status === 'idle') {
      onReady();
      if (hangTimer.current) window.clearTimeout(hangTimer.current);
      hangTimer.current = null;
      return;
    }
    // Sandpack's own timeout: surface whatever the bundler rendered (its
    // error overlay) instead of sitting behind "Recompiling preview…"
    // forever — and fall back to the no-install bundler if we still can.
    if (sandpack.status === 'timeout') {
      onReady();
      if (canHang) onHang();
      return;
    }
    if (canHang && hangTimer.current === null) {
      hangTimer.current = window.setTimeout(onHang, HANG_THRESHOLD_MS);
    }
    return () => {
      if (hangTimer.current) window.clearTimeout(hangTimer.current);
      hangTimer.current = null;
    };
  }, [sandpack.status, onReady, onHang, canHang]);

  return null;
};

export const WorkspacePreview: React.FC<{
  files: GeneratedFile[];
  /** Bump to force a full rebundle (previewVersion + manual reload key). */
  remountKey: string;
  onReady: () => void;
}> = ({ files, remountKey, onReady }) => {
  const [fellBack, setFellBack] = useState(false);
  const viteFiles = useMemo(() => toViteFiles(files), [files]);
  const craSetup = useMemo(
    () => (fellBack ? toCraSetup(files) : null),
    [fellBack, files]
  );

  if (Object.keys(viteFiles).length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem'
        }}
      >
        No previewable files yet — run a build first.
      </div>
    );
  }

  const onHang = () => {
    // One-way switch — the fallback bundler has no install step to hang on.
    // ponytail: no retry/backoff — repeated remounts just re-hang.
    // eslint-disable-next-line no-console
    console.warn('[preview] Nodebox bundler did not start — falling back to react-ts');
    setFellBack(true);
  };

  const appEntry = fellBack || craSetup ? '/App.tsx' : '/src/App.tsx';
  const activeFiles = fellBack ? (craSetup?.files ?? {}) : viteFiles;

  return (
    <SandpackProvider
      key={`${remountKey}-${fellBack ? 'cra' : 'vite'}`}
      template={fellBack ? 'react-ts' : 'vite-react-ts'}
      theme="dark"
      files={activeFiles}
      customSetup={craSetup ? { dependencies: craSetup.dependencies } : undefined}
      options={{
        externalResources: fellBack ? [TAILWIND_CDN, GOOGLE_FONTS] : [GOOGLE_FONTS],
        ...(appEntry in activeFiles
          ? { activeFile: appEntry, visibleFiles: [appEntry] }
          : {})
      }}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showSandpackErrorOverlay
        style={{ width: '100%', height: '100%', flex: 1, minHeight: 0 }}
      />
      <StatusDriver onReady={onReady} onHang={onHang} canHang={!fellBack} />
      {fellBack && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            zIndex: 5,
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            background: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            padding: '2px 8px',
            borderRadius: 999
          }}
        >
          compatibility preview
        </div>
      )}
    </SandpackProvider>
  );
};

export default WorkspacePreview;
