import React, { useEffect, useMemo } from 'react';
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
 * Uses ONLY the legacy `react-ts` in-browser bundler. The Nodebox templates
 * (`vite-react-ts` — real npm install + Vite dev server in a browser VM)
 * crash intermittently on Codesandbox's infrastructure ("Failed to get
 * shell by ID", "Cannot find module 'esbuild-wasm'") — unacceptable for a
 * live demo. The legacy bundler has no install step, so `toCraSetup`
 * flattens the generated Vite tree into CRA shape and shims `import.meta`.
 */

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
const TAILWIND_CDN = 'https://cdn.tailwindcss.com';

const isPackageJson = (p: string) => p === 'package.json' || p.endsWith('/package.json');
const dirOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');

/** Server-side files that can never run in the browser sandbox — excluded
 *  even when root detection falls back to '' (flat layouts), so a stray
 *  `backend/` or top-level `server.ts` never reaches Sandpack. */
const isServerFile = (p: string) =>
  p.startsWith('backend/') || /(^|\/)server\.(ts|js|mjs)$/.test(p);

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

// Build-time-only or host-pinned packages: the legacy bundler provides
// React itself and has no Tailwind/PostCSS pipeline (CDN runtime instead).
const CRA_SKIP_DEPS = new Set([
  'react', 'react-dom', 'tailwindcss', 'postcss', 'autoprefixer', 'vite', 'typescript'
]);

interface CraSetup {
  files: Record<string, string>;
  dependencies: Record<string, string>;
}

/** Map the generated Vite tree to the `react-ts` (CRA) sandbox: `src/`
 *  is flattened to the root, `src/main.tsx` becomes the `/index.tsx` entry,
 *  and `package.json`/`index.html`/Vite+TS configs are dropped — the
 *  template supplies its own stable equivalents, so the bundler never tries
 *  to resolve Vite inside the browser. Runtime deps come from the generated
 *  package.json. */
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
    if (p === 'main.tsx' || p === 'main.jsx') p = 'index.tsx';
    else if (p === 'main.ts' || p === 'main.js') p = 'index.js';
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
 *  status ('idle' = compiled, 'timeout' = it gave up but still rendered its
 *  error overlay) into the workspace's overlay state. */
const StatusDriver: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const { sandpack } = useSandpack();
  useEffect(() => {
    if (sandpack.status === 'idle' || sandpack.status === 'timeout') {
      onReady();
    }
  }, [sandpack.status, onReady]);
  return null;
};

export const WorkspacePreview: React.FC<{
  files: GeneratedFile[];
  /** Bump to force a full rebundle (previewVersion + manual reload key). */
  remountKey: string;
  onReady: () => void;
}> = ({ files, remountKey, onReady }) => {
  const setup = useMemo(() => toCraSetup(files), [files]);

  if (Object.keys(setup.files).length === 0) {
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

  return (
    <SandpackProvider
      key={remountKey}
      template="react-ts"
      theme="dark"
      files={setup.files}
      customSetup={{ dependencies: setup.dependencies }}
      options={{
        externalResources: [TAILWIND_CDN, GOOGLE_FONTS],
        ...('/App.tsx' in setup.files
          ? { activeFile: '/App.tsx', visibleFiles: ['/App.tsx'] }
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
      <StatusDriver onReady={onReady} />
    </SandpackProvider>
  );
};

export default WorkspacePreview;
