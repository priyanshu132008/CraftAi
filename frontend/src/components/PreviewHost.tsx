import React, { Suspense, lazy, useEffect, useState } from 'react';

// The backend rewrites src/generated/GeneratedPage.tsx on every generation;
// the lazy import picks up the new version on iframe reload.
const GeneratedPage = lazy(() =>
  import('../generated/GeneratedPage').then(m => ({ default: m.default }))
);

class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (msg: string) => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#F87171', fontFamily: 'monospace' }}>
          <h3>Generated app failed to render</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Serves the generated application at http://localhost:3000/preview. */
export const PreviewHost: React.FC = () => {
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'CraftAI Preview';
    // Module 6: Universal Runtime Compiler — guarantee Tailwind utilities
    // and Google Fonts compile in the generated page even when the Vite
    // plugin hasn't picked up the mirrored entry yet. The compiled
    // Tailwind from index.css is the primary path; the CDN script +
    // Fonts <link> only patch anything that slipped through.
    if (!document.getElementById('tailwind-cdn-fallback')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn-fallback';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
    if (!document.getElementById('craftai-google-fonts')) {
      const link = document.createElement('link');
      link.id = 'craftai-google-fonts';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
    if (!document.getElementById('craftai-reset')) {
      const style = document.createElement('style');
      style.id = 'craftai-reset';
      style.textContent =
        'button,input,select,textarea{outline:0;border:0;background:transparent;font:inherit;color:inherit;}*{box-sizing:border-box;}';
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#090D16' }}>
      {renderError && (
        <div style={{ padding: '8px 16px', background: '#7F1D1D', color: '#FECACA' }}>
          Preview error: {renderError}
        </div>
      )}
      <Suspense
        fallback={
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
        }
      >
        <PreviewErrorBoundary onError={setRenderError}>
          <GeneratedPage />
        </PreviewErrorBoundary>
      </Suspense>
    </div>
  );
};