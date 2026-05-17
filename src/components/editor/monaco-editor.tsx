import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { bridge } from '@/ipc/bridge';
import { useInlineSuggestion } from './inline-suggestion';
import { SymbolPicker, type SymbolInfo } from './symbol-picker';
import { useDebugStore } from '@/store/debug-store';

interface MonacoEditorProps {
  filePath?: string;
  content?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
  projectPath?: string;
}

interface Diagnostic {
  file: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  message: string;
  category: string;
  code: number;
}

interface DefinitionLocation {
  file: string;
  line: number;
  char: number;
}

interface ReferenceLocation {
  file: string;
  line: number;
  char: number;
  lineText: string;
}

interface HoverInfo {
  displayString: string;
  documentation?: string;
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

function categoryToSeverity(category: string): number {
  switch (category) {
    case 'error': return 8;
    case 'warning': return 4;
    default: return 2;
  }
}

const MonacoEditor: React.FC<MonacoEditorProps> = React.memo(({
  filePath,
  content: contentProp,
  onSave,
  readOnly = false,
  projectPath,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [localContent, setLocalContent] = useState<string>(contentProp ?? '');
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const lspInitializedRef = useRef(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);
  const [symbolPickerSymbols, setSymbolPickerSymbols] = useState<SymbolInfo[]>([]);
  const [symbolPickerQuery, setSymbolPickerQuery] = useState('');
  const breakpointDecorationsRef = useRef<string[]>([]);
  const debugBreakpoints = useDebugStore((s) => s.breakpoints);
  const toggleBreakpoint = useDebugStore((s) => s.toggleBreakpoint);
  const startSession = useDebugStore((s) => s.startSession);

  const {
    triggerSuggestion,
    acceptSuggestion,
    dismissSuggestion,
    disposeSuggestion,
  } = useInlineSuggestion(editorRef);

  const updateDiagnostics = useCallback(async (path: string) => {
    try {
      const ed = editorRef.current;
      if (!ed) return;
      const result = await bridge.lsp.diagnostics(path) as Diagnostic[] | { error: string };
      if (result && !Array.isArray(result)) return;
      const diagnostics = result as Diagnostic[];
      const model = ed.getModel();
      if (!model) return;

      const monaco = await import('monaco-editor');
      const markers = diagnostics
        .filter((d) => d.file === path || path.endsWith(d.file))
        .map((d) => ({
          severity: categoryToSeverity(d.category),
          message: `${d.message} (TS${d.code})`,
          startLineNumber: d.startLine,
          startColumn: d.startChar,
          endLineNumber: d.endLine,
          endColumn: d.endChar,
        }));
      monaco.editor.setModelMarkers(model, 'lsp', markers);
    } catch {}
  }, []);

  const showHover = useCallback(async (path: string, lineNumber: number, column: number) => {
    try {
      const ed = editorRef.current;
      if (!ed) return;
      const result = await bridge.lsp.hover(path, lineNumber, column) as HoverInfo | null | { error: string };
      if (!result || 'error' in result) return;
      const hoverInfo = result as HoverInfo;
      if (!hoverInfo.displayString) return;

      const model = ed.getModel();
      if (!model) return;

      const word = model.getWordAtPosition({ lineNumber, column });
      if (!word) return;

      ed.deltaDecorations(
        ed.getModel()?.getAllDecorations()
          ?.filter((d) => d.options.afterContentClassName === 'lsp-hover-decoration')
          ?.map((d) => d.id) ?? [],
        [],
      );
    } catch {}
  }, []);

  const goToDefinition = useCallback(async (path: string) => {
    try {
      const ed = editorRef.current;
      if (!ed) return;
      const position = ed.getPosition();
      if (!position) return;
      const result = await bridge.lsp.definition(path, position.lineNumber, position.column) as DefinitionLocation | null | { error: string };
      if (!result || 'error' in result) return;
      const definition = result as DefinitionLocation;
      if (definition.file) {
        const monaco = await import('monaco-editor');
        const uri = monaco.Uri.file(definition.file);
        const existingModel = monaco.editor.getModel(uri);
        if (existingModel) {
          ed.setModel(existingModel);
          ed.setPosition({ lineNumber: definition.line, column: definition.char + 1 });
          ed.revealPositionInCenter({ lineNumber: definition.line, column: definition.char + 1 });
        }
      }
    } catch {}
  }, []);

  const findReferences = useCallback(async (path: string) => {
    try {
      const ed = editorRef.current;
      if (!ed) return;
      const position = ed.getPosition();
      if (!position) return;
      const result = await bridge.lsp.references(path, position.lineNumber, position.column) as ReferenceLocation[] | { error: string };
      if (!result || !Array.isArray(result)) return;
      const references = result as ReferenceLocation[];
      if (references.length === 0) return;

      const model = ed.getModel();
      if (!model) return;

      const monaco = await import('monaco-editor');
      const decorations = references.map((ref) => ({
        range: new monaco.Range(ref.line, ref.char + 1, ref.line, ref.char + 1),
        options: {
          inlineClassName: 'reference-highlight',
          overviewRuler: {
            color: '#3B82F6',
            position: monaco.editor.OverviewRulerLane.Full,
          },
        },
      }));
      ed.deltaDecorations([], decorations);
    } catch {}
  }, []);

  const openFileSymbols = useCallback(async (path: string) => {
    try {
      const result = await bridge.lsp.symbols(path) as SymbolInfo[] | { error: string };
      if (result && !Array.isArray(result)) return;
      setSymbolPickerSymbols(result as SymbolInfo[]);
      setSymbolPickerQuery('');
      setSymbolPickerOpen(true);
    } catch {}
  }, []);

  const openWorkspaceSymbols = useCallback(async (projPath: string) => {
    try {
      const result = await bridge.lsp.workspaceSymbols(projPath, '') as SymbolInfo[] | { error: string };
      if (result && !Array.isArray(result)) return;
      setSymbolPickerSymbols(result as SymbolInfo[]);
      setSymbolPickerQuery('');
      setSymbolPickerOpen(true);
    } catch {}
  }, []);

  const handleSymbolSelect = useCallback((symbol: SymbolInfo) => {
    setSymbolPickerOpen(false);
    const ed = editorRef.current;
    if (!ed) return;
    ed.setPosition({ lineNumber: symbol.line, column: symbol.char });
    ed.revealPositionInCenter({ lineNumber: symbol.line, column: symbol.char });
    ed.focus();
  }, []);

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

  useEffect(() => {
    return () => {
      disposeSuggestion();
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [disposeSuggestion]);

  const handleEditorMount: OnMount = useCallback((ed) => {
    editorRef.current = ed;

    ed.onMouseDown((e) => {
      if (
        e.target.type === 2 ||
        e.target.type === 3
      ) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber && filePath) {
          toggleBreakpoint(filePath, lineNumber);
        }
      }
    });

    ed.addAction({
      id: 'agentforge-save',
      label: 'Save',
      keybindings: [2048 | 49],
      run: (ed) => {
        const value = ed.getValue();
        onSave?.(value);
      },
    });

    ed.addAction({
      id: 'agentforge-start-debug',
      label: 'Start Debugging',
      keybindings: [63],
      run: () => {
        if (projectPath && filePath) {
          startSession(projectPath, filePath);
        }
      },
    });

    ed.addAction({
      id: 'agentforge-goto-definition',
      label: 'Go to Definition',
      keybindings: [59],
      run: () => {
        if (filePath) goToDefinition(filePath);
      },
    });

    ed.addAction({
      id: 'agentforge-find-references',
      label: 'Find References',
      keybindings: [2048 | 59],
      run: () => {
        if (filePath) findReferences(filePath);
      },
    });

    ed.addAction({
      id: 'agentforge-inline-suggestion',
      label: 'Trigger Inline Suggestion',
      keybindings: [2048 | 33],
      run: () => {
        triggerSuggestion();
      },
    });

    ed.addAction({
      id: 'agentforge-accept-suggestion',
      label: 'Accept Inline Suggestion',
      keybindings: [2],
      run: () => {
        acceptSuggestion();
      },
    });

    ed.addAction({
      id: 'agentforge-dismiss-suggestion',
      label: 'Dismiss Inline Suggestion',
      keybindings: [9],
      run: () => {
        dismissSuggestion();
      },
    });

    ed.addAction({
      id: 'agentforge-file-symbols',
      label: 'Go to Symbol in File',
      keybindings: [2048 | 512 | 39],
      run: () => {
        if (filePath) openFileSymbols(filePath);
      },
    });

    ed.addAction({
      id: 'agentforge-workspace-symbols',
      label: 'Go to Symbol in Workspace',
      keybindings: [2048 | 50],
      run: () => {
        if (projectPath) openWorkspaceSymbols(projectPath);
      },
    });

    ed.onDidChangeCursorPosition((e) => {
      if (!filePath) return;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        showHover(filePath, e.position.lineNumber, e.position.column);
      }, 500);
    });
  }, [onSave, filePath, goToDefinition, findReferences, triggerSuggestion, acceptSuggestion, dismissSuggestion, showHover, openFileSymbols, openWorkspaceSymbols, projectPath, toggleBreakpoint, startSession]);

  useEffect(() => {
    if (filePath && editorRef.current && projectPath && !lspInitializedRef.current) {
      bridge.lsp.initialize(projectPath).then(() => {
        lspInitializedRef.current = true;
        if (editorRef.current) {
          updateDiagnostics(filePath);
        }
      }).catch(() => {});
    }
  }, [filePath, projectPath, updateDiagnostics]);

  useEffect(() => {
    if (filePath && editorRef.current && lspInitializedRef.current) {
      updateDiagnostics(filePath);
    }
  }, [filePath, loadedPath, updateDiagnostics]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !filePath) return;
    const fileBreakpoints = debugBreakpoints.filter(
      (bp) => bp.filePath === filePath
    );
    const decorations = fileBreakpoints.map((bp) => ({
      range: { startLineNumber: bp.line, startColumn: 1, endLineNumber: bp.line, endColumn: 1 },
      options: {
        isWholeLine: true,
        glyphMarginClassName: 'debug-breakpoint-glyph',
        glyphMarginHoverMessage: { value: `Breakpoint at line ${bp.line}${bp.verified ? '' : ' (unverified)'}` },
        stickiness: 1,
      },
    }));
    breakpointDecorationsRef.current = ed.deltaDecorations(breakpointDecorationsRef.current, decorations);
  }, [debugBreakpoints, filePath]);

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
            glyphMargin: true,
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
      <style>{`
        .inline-suggestion-ghost {
          color: #6F7782 !important;
          font-style: italic !important;
          opacity: 0.6;
        }
        .reference-highlight {
          background-color: #3B82F630 !important;
          border: 1px solid #3B82F660 !important;
        }
        .debug-breakpoint-glyph {
          background: #FF7A1A;
          border-radius: 50%;
          width: 10px !important;
          height: 10px !important;
          margin-left: 4px;
          margin-top: 4px;
        }
      `}</style>
      {symbolPickerOpen && (
        <SymbolPicker
          symbols={symbolPickerSymbols}
          onSelect={handleSymbolSelect}
          onClose={() => setSymbolPickerOpen(false)}
          query={symbolPickerQuery}
        />
      )}
    </div>
  );
});

MonacoEditor.displayName = 'MonacoEditor';

export { MonacoEditor };
