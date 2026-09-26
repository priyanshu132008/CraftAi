// @ts-nocheck
// Stable preview entry for http://localhost:3000/preview.
//
// The backend mirrors each generated project under src/generated/project/
// and rewrites the `entryPath` line below to point at that generation's
// entry file. The import is resolved at runtime (not at build time) so the
// repo always builds, even before the first generation.
import React, { useEffect, useState } from 'react';

let entryPath = './project/src/components/Hero.tsx';

export default function GeneratedPage() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setComponent(null);
    import(/* @vite-ignore */ entryPath)
      .then(m => {
        if (!cancelled) setComponent(() => m.default);
      })
      .catch(e => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: '#090D16',
          color: '#64748B',
          fontFamily: 'system-ui'
        }}
      >
        <span style={{ fontSize: '1.1rem', color: '#94A3B8' }}>No preview yet</span>
        <span style={{ fontSize: '0.82rem' }}>
          Generate an app from the CraftAI dashboard — it will render here.
        </span>
      </div>
    );
  }

  if (!Component) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748B',
          fontFamily: 'system-ui'
        }}
      >
        Compiling generated app…
      </div>
    );
  }

  return <Component />;
}