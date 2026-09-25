import React from 'react';
import { PreviewHost } from './PreviewHost';

/**
 * Full-screen published route: `/published/:slug`.
 *
 * Renders the most recent generated page at 100vw × 100vh with no IDE
 * chrome. The slug is preserved in the URL + document.title so demos feel
 * like the project is "live" at {slug}.craftai.app, even though everything
 * is served from the local Vite dev server.
 *
 * The slug is read from the path (last segment) — we don't need backend
 * routing here because the generated entry is already mirrored into
 * frontend/src/generated/project/ by ai_engine/main._refresh_preview and
 * PreviewHost lazy-imports it. Each deploy slug gets a unique workspace
 * folder, but for the demo we reuse the latest generation.
 */
export const PublishedSite: React.FC = () => {
  let slug = 'demo';
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] ?? '';
    if (last) slug = last;
  }
  if (typeof document !== 'undefined') {
    document.title = `${slug}.craftai.app`;
  }
  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: '#FFFFFF', overflow: 'hidden' }}>
      <PreviewHost />
    </div>
  );
};
