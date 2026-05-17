import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { bridge } from '@/ipc/bridge';

interface MonacoEditorProps {
  filePath?: string;
  content?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

const EXT_LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  md: 'markdown',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  yaml: 'yaml',
  yml: 'yaml',
  py: 'python',
  rs: 'rust',
  go: 'go',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  xml: 'xml',
  graphql: 'graphql',
  vue: 'html',
  svelte: 'html',
};

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXT_LANGUAGE_MAP[ext] ?? 'plaintext';
}

const MonacoEditor: React.FC<MonacoEditorProps> = React.memo(({
  filePath,
  content: contentProp,
  onSave,
  readOnly = false,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [localContent, setLocalContent] = useState<string>(contentProp ?? '');
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  useEffect(() => {
    if (contentProp !== undefined) {
      setLocalContent(contentProp);
      setLoadedPath(filePath ?? null);
      return;
    }
    if (filePath && filePath !== loadedPath) {
      bridge.file.read(filePath).then((data) => {
        setLocalContent(data);
        setLoadedPath(filePath);
      }).catch(() => {
        setLocalContent('');
        setLoadedPath(filePath);
      });
    }
  }, [filePath, contentProp, loadedPath]);

  const handleEditorMount: OnMount = useCallback((ed) => {
    editorRef.current = ed;
    ed.addAction({
      id: 'agentforge-save',
      label: 'Save',
      keybindings: [2048 | 49],
      run: (ed) => {
        const value = ed.getValue();
        onSave?.(value);
      },
    });
  }, [onSave]);

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setLocalContent(value);
    }
  }, []);

  const language = filePath ? getLanguageFromPath(filePath) : 'plaintext';

  return (
    <div className="flex flex-col h-full">
      {filePath && (
        <div className="shrink-0 px-3 py-1 text-xs text-forged-steel bg-forge-black/80 border-b border-forged-steel/20 font-mono truncate">
          {filePath}
        </div>
      )}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={localContent}
          theme="agentforge"
          onMount={handleEditorMount}
          onChange={handleChange}
          options={{
            readOnly,
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            fontSize: 13,
            minimap: { enabled: true, size: 'fill' as const },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 8 },
            lineNumbersMinChars: 3,
            renderLineHighlight: 'line',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            bracketPairColorization: { enabled: true },
          }}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme('agentforge', {
              base: 'vs-dark',
              inherit: true,
              rules: [
                { token: 'comment', foreground: '6F7782', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'FF7A1A' },
                { token: 'string', foreground: '22C55E' },
                { token: 'number', foreground: '22C55E' },
                { token: 'type', foreground: '3B82F6' },
                { token: 'type.identifier', foreground: '3B82F6' },
                { token: 'identifier', foreground: 'F2F4F6' },
                { token: 'delimiter', foreground: 'F2F4F6' },
                { token: 'tag', foreground: 'FF7A1A' },
                { token: 'attribute.name', foreground: 'F2F4F6' },
                { token: 'attribute.value', foreground: '22C55E' },
                { token: 'variable', foreground: 'F2F4F6' },
                { token: 'variable.predefined', foreground: '3B82F6' },
                { token: 'operator', foreground: 'FF7A1A' },
              ],
              colors: {
                'editor.background': '#0B0D10',
                'editor.foreground': '#F2F4F6',
                'editorLineNumber.foreground': '#6F7782',
                'editorLineNumber.activeForeground': '#F2F4F6',
                'editor.selectionBackground': '#FF7A1A40',
                'editor.inactiveSelectionBackground': '#FF7A1A20',
                'editor.lineHighlightBackground': '#1A1D22',
                'editorCursor.foreground': '#FF7A1A',
                'editorIndentGuide.background': '#1A1D22',
                'editorIndentGuide.activeBackground': '#6F778240',
                'editorWhitespace.foreground': '#6F778230',
                'editorBracketMatch.background': '#FF7A1A30',
                'editorBracketMatch.border': '#FF7A1A60',
                'minimap.background': '#0B0D10',
                'scrollbarSlider.background': '#6F778240',
                'scrollbarSlider.hoverBackground': '#6F778260',
                'scrollbarSlider.activeBackground': '#FF7A1A60',
              },
            });
          }}
        />
      </div>
    </div>
  );
});

MonacoEditor.displayName = 'MonacoEditor';

export { MonacoEditor };
