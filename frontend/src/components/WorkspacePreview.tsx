import React, { useEffect, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackPreview,
  useSandpack
} from '@codesandbox/sandpack-react';
import { GeneratedFile } from '../services/api';

/**
 * Production live preview: runs the generated project IN-BROWSER via
 * Sandpack's Nodebox runtime (`vite-react-ts` template). The generated
 * output IS a real Vite app, so it's handed over intact — package.json,
 * tsconfig, Tailwind/PostCSS configs, .env — and Nodebox npm-installs and
 * vite-dev-serves it. (The old flow pointed an iframe at
 * http://localhost:3000/preview, which only exists on the dev machine
 * where the backend mirrors files into src/generated/.)
 */

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

const isPackageJson = (p: string) => p === 'package.json' || p.endsWith('/package.json');
const dirOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');

/** Locate the directory that holds the runnable Vite frontend: the dir
 *  containing BOTH package.json and index.html (the full-stack scope emits
 *  `frontend/package.json` + `frontend/index.html` next to a `backend/`).
 *  Fallback: the package.json that depends on react. */
function detectFrontendRoot(files: GeneratedFile[]): string {
  const dirs = files.filter(f => isPackageJson(f.path)).map(f => dirOf(f.path));
  const withHtml = dirs.find(d =>
    files.some(f => f.path === `${d}index.html`));
  if (withHtml !== undefined) return withHtml;
  const withReact = dirs.find(d => {
    const pkg = files.find(f => f.path === `${d}package.json`);
    try {
      const parsed = JSON.parse(pkg?.content ?? '{}') as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      return Boolean(
        parsed.dependencies?.react ?? parsed.devDependencies?.react
      );
    } catch {
      return false;
    }
  });
  return withReact ?? '';
}

const WorkspacePreviewInner: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const { sandpack } = useSandpack();
  useEffect(() => {
    // Nodebox lifecycle: 'running' while it installs/compiles, 'idle' when
    // the app is being served — that clears the recompile overlay.
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
  const sandpackFiles = useMemo(() => {
    const root = detectFrontendRoot(files);
    const out: Record<string, string> = {};
    for (const f of files) {
      // Only the frontend subtree is previewable — a sibling backend/
      // (server.ts, python services) can't run in the browser sandbox.
      if (!f.path.startsWith(root)) continue;
      out[`/${f.path.slice(root.length)}`] = f.content;
    }
    return out;
  }, [files]);

  if (Object.keys(sandpackFiles).length === 0) {
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
      template="vite-react-ts"
      theme="dark"
      files={sandpackFiles}
      options={{ externalResources: [GOOGLE_FONTS] }}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showSandpackErrorOverlay
        style={{ width: '100%', height: '100%', flex: 1, minHeight: 0 }}
      />
      <WorkspacePreviewInner onReady={onReady} />
    </SandpackProvider>
  );
};

export default WorkspacePreview;
