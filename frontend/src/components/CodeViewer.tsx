import React, { useEffect, useRef, useState } from 'react';
import Editor, { BeforeMount, OnMount } from '@monaco-editor/react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeProvider';

export const languageForPath = (path: string): string => {
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();

  switch (extension) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
      return 'javascript';
    case '.json':
      return 'json';
    case '.css':
      return 'css';
    case '.html':
      return 'html';
    case '.md':
      return 'markdown';
    case '.py':
      return 'python';
    default:
      return 'plaintext';
  }
};

/**
 * Both editor themes are defined up front so toggling is a pure
 * monaco.editor.setTheme call — the editor instance survives the switch
 * (no remount, no cursor loss).
 * Phase 6: dark → deep obsidian #09090B, light → pristine snow #FAFAFA.
 */
const defineCraftAiThemes: BeforeMount = monaco => {
  monaco.editor.defineTheme('craftai-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'A5B4FC' },
      { token: 'string', foreground: '6EE7B7' },
      { token: 'number', foreground: 'FDA4AF' },
      { token: 'type', foreground: '67E8F9' },
      { token: 'delimiter', foreground: 'CBD5E1' }
    ],
    colors: {
      'editor.background': '#09090B',
      'editor.foreground': '#E2E8F0',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#A5B4FC',
      'editorCursor.foreground': '#A5B4FC',
      'editor.selectionBackground': '#3730A366',
      'editor.inactiveSelectionBackground': '#3730A344',
      'editorIndentGuide.background1': '#1E293B',
      'editorIndentGuide.activeBackground1': '#334155',
      'editorWhitespace.foreground': '#1E293B'
    }
  });
  monaco.editor.defineTheme('craftai-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
      { token: 'keyword', foreground: '4F46E5' },
      { token: 'string', foreground: '059669' },
      { token: 'number', foreground: 'BE185D' },
      { token: 'type', foreground: '0E7490' },
      { token: 'delimiter', foreground: '334155' }
    ],
    colors: {
      'editor.background': '#FAFAFA',
      'editor.foreground': '#18181B',
      'editorLineNumber.foreground': '#94A3B8',
      'editorLineNumber.activeForeground': '#4F46E5',
      'editorCursor.foreground': '#4F46E5',
      'editor.selectionBackground': '#C7D2FE',
      'editor.inactiveSelectionBackground': '#E0E7FF',
      'editorIndentGuide.background1': '#E4E4E7',
      'editorIndentGuide.activeBackground1': '#A1A1AA',
      'editorWhitespace.foreground': '#D4D4D8'
    }
  });
};

type MonacoEditorInstance = Parameters<OnMount>[0];

const CodeViewer: React.FC = () => {
  const { selectedFile, saveFile } = useApp();
  const { theme } = useTheme();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  /** Latest save closure — the Cmd+S command registered on mount calls this. */
  const saveRef = useRef<() => Promise<void>>(async () => {});

  saveRef.current = async () => {
    const editor = editorRef.current;
    if (!editor || !selectedFile || saving) return;
    setSaving(true);
    try {
      await saveFile(selectedFile.path, editor.getValue());
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  // Switching files discards unsaved edits — reset the dirty badge.
  useEffect(() => {
    setDirty(false);
  }, [selectedFile?.path]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
      saveRef.current()
    );
  };

  if (!selectedFile) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-muted)',
          fontSize: '0.85rem'
        }}
      >
        Select a file from the explorer to view code.
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Editor header: breadcrumb (open file) + save status (Ctrl/Cmd+S) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0
        }}
      >
        <span
          className="text-zinc-500 dark:text-zinc-400"
          title={selectedFile.path}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0
          }}
        >
          {selectedFile.path}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            color: saving ? 'var(--accent-indigo-bright)' : dirty ? 'var(--agent-architect)' : 'var(--text-muted)',
            flexShrink: 0
          }}
        >
          {saving
            ? 'Saving…'
            : dirty
              ? 'Edited — Ctrl/Cmd+S to save'
              : 'All changes saved'}
        </span>
      </div>
      <Editor
        height="100%"
        width="100%"
        language={languageForPath(selectedFile.path)}
        theme={theme === 'dark' ? 'craftai-dark' : 'craftai-light'}
        value={selectedFile.content}
        beforeMount={defineCraftAiThemes}
        onMount={onMount}
        onChange={() => setDirty(true)}
        options={{
          minimap: { enabled: false },
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          automaticLayout: true,
          padding: { top: 12, bottom: 12 }
        }}
      />
    </div>
  );
};

export default CodeViewer;