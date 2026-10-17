import React, { useEffect, useState } from 'react';
import { Loader2, Lock, SearchX } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { GeneratedFile } from '../services/api';
import WorkspacePreview from './WorkspacePreview';

interface ProjectRow {
  id: string;
  title: string;
  files: string;
}

/** Standalone live preview at /preview/<slug-or-id>: pulls the project's
 *  stored file snapshot from Supabase and bundles it in-browser. The table's
 *  public SELECT policy makes sharded share links anonymous-readable; only
 *  published rows matter, and the demo "Allow all access" policy is the
 *  broader ceiling. */
export const PublicPreviewHost: React.FC<{ slug: string }> = ({ slug }) => {
  const [title, setTitle] = useState<string | null>(null);
  const [files, setFiles] = useState<GeneratedFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Match: full workspace id ("{epoch}-{slug}"), its slug suffix, or the
      // Publish modal's stored slug column. RLS is public-read, so the
      // snapshot loads anonymously too.
      let query = supabase.from('projects').select('id, title, files');
      query = query.or(
        `slug.eq.${slug},id.eq.${slug},id.like.*-${slug}`
      );
      const { data, error: err } = await query.limit(1);
      if (cancelled) return;
      if (err) {
        setError(err.message);
      } else if (!data || data.length === 0) {
        setError('not-found');
      } else {
        const row = data[0] as ProjectRow;
        try {
          const parsed = JSON.parse(row.files) as GeneratedFile[];
          if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty');
          setTitle(row.title || row.id);
          setFiles(parsed);
        } catch {
          setError('not-found');
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (title) document.title = `${title} — CraftAI Preview`;
  }, [title]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#090D16' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 18px',
          borderBottom: '1px solid var(--border-subtle, #1f2937)',
          color: '#E5E7EB',
          fontFamily: 'system-ui'
        }}
      >
        <span style={{ fontWeight: 700 }}>
          Craft<span style={{ color: '#818CF8' }}>Ai</span>
        </span>
        <span
          style={{
            fontSize: '0.78rem',
            fontFamily: 'ui-monospace, monospace',
            color: '#94A3B8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {title ?? slug}
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {loading && (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#64748B' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {!loading && error && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: '#94A3B8',
              fontFamily: 'system-ui',
              padding: 24,
              textAlign: 'center'
            }}
          >
            {error === 'not-found' ? <SearchX size={22} /> : <Lock size={22} />}
            <p style={{ fontSize: '0.9rem', maxWidth: 420 }}>
              {error === 'not-found'
                ? `No stored project matches "${slug}" for this account. Sign in as the project owner, or publish the project for a public link.`
                : `Couldn't load this preview: ${error}`}
            </p>
          </div>
        )}
        {!loading && !error && files && (
          <WorkspacePreview files={files} remountKey={slug} onReady={() => undefined} />
        )}
      </div>
    </div>
  );
};

export default PublicPreviewHost;
