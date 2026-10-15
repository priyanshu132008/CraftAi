import React, { useEffect, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackPreview,
  useSandpack
} from '@codesandbox/sandpack-react';
import { GeneratedFile } from '../services/api';

/**
 * Production live preview: bundles the generated project IN-BROWSER via
 * Sandpack's sandbox (the old flow pointed the iframe at
 * http://localhost:3000/preview, which only exists on the dev machine where
 * the backend mirrors files into src/generated/). No server round-trip —
 * the files already arrived in the /generate-project response.
 */

const TAILWIND_CDN = 'https://cdn.tailwindcss.com';
const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

// Build-time-only or host-provided packages — the sandbox pins React itself
// and there is no Tailwind/PostCSS build step in-browser (CDN instead).
const SKIP_DEPS = new Set([
  'react',
  'react-dom',
  'tailwindcss',
  'postcss',
  'autoprefixer',
  'vite',
  'typescript'
]);

interface SandpackSetup {
  files: Record<string, string>;
  dependencies: Record<string, string>;
}

/** Map the generated Vite tree (optionally nested under `frontend/`) onto
 *  Sandpack's react-ts layout: strip `src/`, main.tsx becomes the /index.tsx
 *  entry, configs and index.html are dropped (the sandbox supplies its own
 *  HTML shell with a #root node). */
function toSandpackSetup(files: GeneratedFile[]): SandpackSetup {
  const root = files.some(f => f.path.startsWith('frontend/src/')) ? 'frontend/' : '';
  const out: Record<string, string> = {};
  let dependencies: Record<string, string> = {};

  for (const f of files) {
    let p = f.path;
    if (root) {
      if (!p.startsWith(root)) continue; // backend/ sibling files — not previewable
      p = p.slice(root.length);
    }
    if (p === 'package.json') {
      try {
        const parsed = JSON.parse(f.content) as { dependencies?: Record<string, string> };
        dependencies = parsed.dependencies ?? {};
      } catch {
        /* malformed package.json — template defaults still give react */
      }
      continue;
    }
    // Config/html scaffolding the sandbox doesn't consume.
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

  // Generated index.css holds `@tailwind` directives — unknown at-rules are
  // inert in the browser while the CDN runtime fills utility classes.
  for (const name of Object.keys(dependencies)) {
    if (SKIP_DEPS.has(name)) delete dependencies[name];
  }
  // entry safety: a project without main.tsx still previews if App.tsx exists.
  if (!out['/index.tsx'] && !out['/index.js'] && out['/App.tsx']) {
    out['/index.tsx'] =
      "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './index.css';\ncreateRoot(document.getElementById('root')!).render(<App />);\n";
  }
  return { files: out, dependencies };
}

/** Sandpack never fires DOM load on the outer page — translate its bundler
 *  status into the workspace's "Recompiling preview…" overlay state. */
const ReadySignal: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const { sandpack } = useSandpack();
  useEffect(() => {
    if (sandpack.status === 'idle') onReady();
  }, [sandpack.status, onReady]);
  return null;
};

export const WorkspacePreview: React.FC<{
  files: GeneratedFile[];
  /** Bump to force a full rebundle (previewVersion + manual reload key). */
  remountKey: string;
  onReady: () => void;
}> = ({ files, remountKey, onReady }) => {
  const setup = useMemo(() => toSandpackSetup(files), [files]);

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
        recompileMode: 'immediate',
        autorun: true
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showSandpackErrorOverlay
        style={{ width: '100%', height: '100%' }}
      />
      <ReadySignal onReady={onReady} />
    </SandpackProvider>
  );
};

export default WorkspacePreview;
