import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, FileCode2, Hash, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const metaKey = (projectId: string) => `craftai_projmeta_${projectId}`;

interface ProjectMeta {
  description: string;
}

function loadMeta(projectId: string): ProjectMeta {
  try {
    const raw = localStorage.getItem(metaKey(projectId));
    return raw ? { description: '', ...(JSON.parse(raw) as ProjectMeta) } : { description: '' };
  } catch {
    return { description: '' };
  }
}

/** Project settings: rename (Supabase `projects.title`, owner-only via RLS),
 *  description, and read-only metadata for the workspace header gear. */
export const ProjectSettingsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  projectId: string;
  initialTitle: string;
  fileCount: number;
  createdAt?: string;
}> = ({ open, onClose, projectId, initialTitle, fileCount, createdAt }) => {
  const { renameProject } = useApp();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Rehydrate per open — description lives in localStorage until the
  // projects table gains a description column.
  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setDescription(loadMeta(projectId).description);
    setError(null);
    setSaved(false);
  }, [open, projectId, initialTitle]);

  if (!open) return null;

  const handleSave = async () => {
    if (saving) return;
    const clean = title.trim();
    if (!clean) {
      setError('Project name cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (clean !== initialTitle) await renameProject(projectId, clean);
      try {
        localStorage.setItem(metaKey(projectId), JSON.stringify({ description }));
      } catch {
        /* storage unavailable — description stays session-only */
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
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
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1D1D1F] dark:text-white">Project Settings</h3>
            <button type="button" onClick={onClose} className="cursor-pointer border-none bg-transparent text-zinc-400">
              <X size={16} />
            </button>
          </div>

          <label className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wider text-zinc-500">
            Project Name
          </label>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setSaved(false); }}
            className="w-full rounded-lg border border-[#d2d2d7] bg-zinc-100 px-3 py-2 text-sm text-[#1D1D1F] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 dark:border-[#27272a] dark:bg-[#121215] dark:text-white"
          />

          <label className="mb-1 mt-4 block text-[0.7rem] font-bold uppercase tracking-wider text-zinc-500">
            Description
          </label>
          <textarea
            value={description}
            onChange={e => { setDescription(e.target.value); setSaved(false); }}
            rows={3}
            placeholder="What is this project?"
            className="w-full resize-none rounded-lg border border-[#d2d2d7] bg-zinc-100 px-3 py-2 text-sm text-[#1D1D1F] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 dark:border-[#27272a] dark:bg-[#121215] dark:text-white"
          />

          <div className="mt-4 space-y-1.5 rounded-lg border border-[#d2d2d7] bg-zinc-50 px-3 py-2.5 dark:border-[#27272a] dark:bg-black">
            <p className="flex items-center gap-2 font-mono text-[0.72rem] text-zinc-500 dark:text-zinc-400">
              <FileCode2 size={12} /> {fileCount} file{fileCount === 1 ? '' : 's'}
            </p>
            <p className="flex items-center gap-2 font-mono text-[0.72rem] text-zinc-500 dark:text-zinc-400">
              <Hash size={12} /> <span className="truncate">{projectId}</span>
            </p>
            {createdAt && (
              <p className="font-mono text-[0.72rem] text-zinc-500 dark:text-zinc-400">
                Created {new Date(createdAt).toLocaleString()}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.75rem] text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="mt-3 flex items-center gap-1.5 text-[0.75rem] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} /> Settings saved
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-shrink-0">
              Close
            </button>
            <button
              type="button"
              className="btn-primary flex flex-shrink-0 items-center gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProjectSettingsModal;
