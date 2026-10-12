import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronRight, FileCode, FileJson, FileType2, FileText, Folder, Globe } from 'lucide-react';
import { GeneratedFile } from '../services/api';

export interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
  content?: string;
}

/** Build a nested tree from a flat [{path, content}] file list. */
export const buildFileTree = (files: GeneratedFile[]): TreeNode[] => {
  const root: TreeNode = { name: '', path: '', isFile: false, children: [] };

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let node = root;
    segments.forEach((segment, i) => {
      const isFile = i === segments.length - 1;
      const path = segments.slice(0, i + 1).join('/');
      let child = node.children.find(c => c.name === segment && c.isFile === isFile);
      if (!child) {
        child = {
          name: segment,
          path,
          isFile,
          children: [],
          content: isFile ? file.content : undefined
        };
        node.children.push(child);
      }
      node = child;
    });
  }

  // Sort: folders first, then files, both alphabetical.
  const sortTree = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map(n => ({ ...n, children: sortTree(n.children) }))
      .sort((a, b) =>
        a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1
      );

  return sortTree(root.children);
};

/** Language-matched file icon: per-extension glyph + color. */
const FileIcon = ({ name }: { name: string }) => {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (ext === '.json') return <FileJson size={12} style={{ flexShrink: 0, color: '#FACC15', opacity: 0.9 }} />;
  if (ext === '.tsx' || ext === '.ts') return <FileType2 size={12} style={{ flexShrink: 0, color: 'var(--accent-indigo-bright)', opacity: 0.9 }} />;
  if (ext === '.css') return <FileCode size={12} style={{ flexShrink: 0, color: '#38BDF8', opacity: 0.9 }} />;
  if (ext === '.html') return <Globe size={12} style={{ flexShrink: 0, color: '#FB923C', opacity: 0.9 }} />;
  if (ext === '.md') return <FileText size={12} style={{ flexShrink: 0, color: '#94A3B8', opacity: 0.9 }} />;
  return <FileCode size={12} style={{ flexShrink: 0, color: '#94A3B8', opacity: 0.8 }} />;
};

interface FileTreeProps {
  files: GeneratedFile[];
  selectedPath: string | null;
  onSelect: (file: GeneratedFile) => void;
  /** Bump to collapse every folder (Explorer "collapse all" button). */
  collapseAllSignal?: number;
}

/** VS Code-style collapsible file tree (Phase 6: animated folder expand,
 *  language icons, sliding layoutId active-file indicator). */
export const FileTree: React.FC<FileTreeProps> = ({ files, selectedPath, onSelect, collapseAllSignal }) => {
  const tree = useMemo(() => buildFileTree(files), [files]);
  // Folders are expanded by default; collapse persists per folder path.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const reduceMotion = useReducedMotion();

  const folderPaths = useMemo(() => {
    const paths: string[] = [];
    const walk = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        if (!n.isFile) {
          paths.push(n.path);
          walk(n.children);
        }
      });
    };
    walk(tree);
    return paths;
  }, [tree]);

  useEffect(() => {
    if (collapseAllSignal) setCollapsed(new Set(folderPaths));
  }, [collapseAllSignal, folderPaths]);

  const toggleFolder = (path: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const paddingLeft = 8 + depth * 14;

    if (node.isFile) {
      const active = selectedPath === node.path;
      return (
        <button
          key={node.path}
          type="button"
          onClick={() => {
            const file = files.find(f => f.path === node.path);
            if (file) onSelect(file);
          }}
          title={node.path}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            width: '100%',
            padding: '4px 10px',
            paddingLeft,
            position: 'relative',
            background: 'transparent',
            border: 'none',
            color: active ? 'var(--accent-indigo-bright)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
            textAlign: 'left',
            whiteSpace: 'nowrap'
          }}
        >
          {/* Sliding active-file indicator */}
          {active && (
            <motion.span
              layoutId="filetree-active"
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 6,
                background: 'var(--accent-indigo-soft)',
                borderLeft: '2px solid var(--accent-indigo-bright)'
              }}
            />
          )}
          <FileIcon name={node.name} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', position: 'relative' }}>{node.name}</span>
        </button>
      );
    }

    const isCollapsed = collapsed.has(node.path);
    return (
      <div key={node.path || 'root'}>
        <button
          type="button"
          onClick={() => toggleFolder(node.path)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '4px 10px',
            paddingLeft,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            textAlign: 'left',
            whiteSpace: 'nowrap'
          }}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <Folder size={12} style={{ flexShrink: 0, color: 'var(--accent-indigo-bright)', opacity: 0.9 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
        </button>
        {/* Folder expand/collapse: height + opacity morph */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              key="children"
              initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              {node.children.map(child => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (files.length === 0) {
    return (
      <p style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        The generated file tree will appear here.
      </p>
    );
  }

  return <div style={{ paddingBottom: 8 }}>{tree.map(node => renderNode(node, 0))}</div>;
};