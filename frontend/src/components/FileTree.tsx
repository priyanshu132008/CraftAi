import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, Folder } from 'lucide-react';
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

interface FileTreeProps {
  files: GeneratedFile[];
  selectedPath: string | null;
  onSelect: (file: GeneratedFile) => void;
}

/** VS Code-style collapsible file tree over the generated project. */
export const FileTree: React.FC<FileTreeProps> = ({ files, selectedPath, onSelect }) => {
  const tree = useMemo(() => buildFileTree(files), [files]);
  // Folders are expanded by default; collapse persists per folder path.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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
            background: active ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
            border: 'none',
            color: active ? '#A5B4FC' : '#94A3B8',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
            textAlign: 'left',
            whiteSpace: 'nowrap'
          }}
        >
          <FileCode size={12} style={{ flexShrink: 0, opacity: 0.8 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
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
            color: '#E2E8F0',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            textAlign: 'left',
            whiteSpace: 'nowrap'
          }}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <Folder size={12} style={{ flexShrink: 0, color: '#818CF8', opacity: 0.9 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
        </button>
        {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (files.length === 0) {
    return (
      <p style={{ padding: '12px 14px', color: '#64748B', fontSize: '0.78rem' }}>
        The generated file tree will appear here.
      </p>
    );
  }

  return <div style={{ paddingBottom: 8 }}>{tree.map(node => renderNode(node, 0))}</div>;
};