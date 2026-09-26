import React from 'react';
import Editor, { BeforeMount } from '@monaco-editor/react';
import { useApp } from '../context/AppContext';

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

const defineCraftAiTheme: BeforeMount = monaco => {
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
      'editor.background': '#0A0A0A',
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
};

const CodeViewer: React.FC = () => {
  const { selectedFile } = useApp();

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
          background: '#0A0A0A',
          color: '#64748B',
          fontSize: '0.85rem'
        }}
      >
        Select a file from the explorer to view code.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, background: '#0A0A0A' }}>
      <Editor
        height="100%"
        width="100%"
        language={languageForPath(selectedFile.path)}
        theme="craftai-dark"
        value={selectedFile.content}
        beforeMount={defineCraftAiTheme}
        options={{
          readOnly: true,
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