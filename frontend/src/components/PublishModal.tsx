import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Eye, EyeOff, ExternalLink, GitBranch, Globe, Loader2, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { publishGithubApi, GeneratedFile } from '../services/api';

const PAT_STORAGE_KEY = 'craftai_github_pat';

interface PublishResult {
  repoUrl: string;
  liveUrl: string | null;
  warning: string | null;
}

/** Publish dialog: capture the project slug (subdomain preview) and the
 *  GitHub PAT, push the monorepo as a private repo in one commit, then let
 *  the backend auto-deploy it to Vercel under the project's subdomain.
 *  The PAT lives in the viewer's localStorage only — it is sent to the
 *  backend per publish request and never persisted server-side. */
export const PublishModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onPublished: (result: PublishResult) => void;
  files: GeneratedFile[];
}> = ({ open, onClose, onPublished, files }) => {
  const [slug, setSlug] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);

  // Rehydrate the saved PAT + slug once per open, and reset any stale error.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setResult(null);
    try {
      setToken(localStorage.getItem(PAT_STORAGE_KEY) ?? '');
    } catch {
      /* storage unavailable — user re-enters the PAT */
    }
  }, [open]);

  if (!open) return null;

  /** Free-form input -> GitHub-legal repo/slug name */
  const cleanSlug = (raw: string): string =>
    raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 100);

  const handlePush = async () => {
    if (publishing) return;
    setError(null);
    if (!token.trim()) {
      setError('Paste a GitHub Personal Access Token with the repo scope first.');
      return;
    }
    const finalSlug = cleanSlug(slug) || 'craftai-project';
    setPublishing(true);
    try {
      const { repo_url, files_pushed, live_url, deploy_warning } =
        await publishGithubApi(finalSlug, token.trim(), files);
      const pushResult: PublishResult = {
        repoUrl: repo_url,
        liveUrl: live_url ?? null,
        warning: deploy_warning ?? null
      };
      try {
        localStorage.setItem(PAT_STORAGE_KEY, token.trim());
      } catch {
        /* storage unavailable — token stays session-only */
      }
      onPublished(pushResult);
      setResult(pushResult);
      // eslint-disable-next-line no-console
      console.info(`[publish] pushed ${files_pushed} files to ${repo_url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-[#d2d2d7] dark:border-[#27272a] bg-white dark:bg-[#09090b] p-6 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1D1D1F] dark:text-white">Publish</h3>
            <button type="button" onClick={onClose} className="cursor-pointer border-none bg-transparent text-zinc-400">
              <X size={16} />
            </button>
          </div>

          {/* Slug / subdomain */}
          <label className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wider text-zinc-500">
            Project Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="my-latest-build"
            className="w-full rounded-lg border border-[#d2d2d7] bg-zinc-100 px-3 py-2 text-sm text-[#1D1D1F] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 dark:border-[#27272a] dark:bg-[#121215] dark:text-white"
          />
          <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-[#d2d2d7] dark:border-[#27272a] bg-zinc-50 dark:bg-black px-3 py-1.5">
            <Globe size={12} className="text-zinc-400" />
            <span className="truncate font-mono text-[0.75rem] text-zinc-500 dark:text-zinc-400">
              {`https://${cleanSlug(slug) || 'your-project'}.craftai.diy`}
            </span>
          </div>

          {/* GitHub PAT */}
          <label className="mb-1 mt-5 block text-[0.7rem] font-bold uppercase tracking-wider text-zinc-500">
            GitHub Personal Access Token
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_… (repo scope required)"
              className="w-full rounded-lg border border-[#d2d2d7] bg-zinc-100 px-3 py-2 pr-9 font-mono text-sm text-[#1D1D1F] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 dark:border-[#27272a] dark:bg-[#121215] dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowToken(t => !t)}
              title={showToken ? 'Hide token' : 'Show token'}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent text-zinc-400"
              aria-label={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[0.72rem] leading-relaxed text-zinc-500 dark:text-zinc-400">
            <ShieldCheck size={13} className="mt-0.5 flex-shrink-0" />
            Your token is stored in this browser only and sent once per publish
            to create the private repo and commit your files — never saved on
            the server.
          </p>
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=CraftAI%20Publish"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#1D1D1F] underline decoration-zinc-300 underline-offset-2 dark:text-white"
          >
            <GitBranch size={13} /> Create a token on GitHub
          </a>

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.75rem] text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}

          {result && error === null && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="mb-2 flex items-center gap-1.5 text-[0.8rem] font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={13} /> Pushed to GitHub
              </p>
              {result.liveUrl ? (
                <>
                  <p className="mb-2 flex items-center gap-1.5 text-[0.75rem] text-zinc-500 dark:text-zinc-400">
                    <Loader2 size={12} className="animate-spin" /> Vercel is building{' '}
                    {result.liveUrl} — the site goes live within a minute.
                  </p>
                  <a
                    href={result.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary inline-flex items-center gap-2"
                    style={{ borderRadius: 8 }}
                  >
                    <Globe size={13} /> View Live Site <ExternalLink size={11} />
                  </a>
                </>
              ) : (
                result.warning && (
                  <p role="alert" className="flex items-start gap-1.5 text-[0.75rem] leading-relaxed text-amber-700 dark:text-amber-400">
                    <TriangleAlert size={13} className="mt-0.5 flex-shrink-0" />
                    {result.warning}{' '}
                    <a
                      href={result.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-shrink-0 items-center gap-1 font-semibold underline"
                    >
                      <GitBranch size={12} /> View repo
                    </a>
                  </p>
                )
              )}
            </div>
          )}

          {!result && (
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost flex-shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex items-center gap-2 flex-shrink-0"
                onClick={handlePush}
                disabled={publishing || files.length === 0}
                title={files.length === 0 ? 'Generate a project first' : `Push ${files.length} files to GitHub and deploy`}
              >
                {publishing ? (
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <GitBranch size={13} />
                )}
                {publishing ? 'Pushing & deploying…' : 'Push to GitHub'}
                {!publishing && <ArrowRight size={12} />}
              </button>
            </div>
          )}
          {result && (
            <div className="mt-5 flex justify-end">
              <button type="button" className="btn-ghost flex-shrink-0" onClick={onClose}>
                Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PublishModal;