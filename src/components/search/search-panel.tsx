import React, { useState, useCallback, useEffect, useRef } from 'react';
import { bridge } from '@/ipc/bridge';
import { useEditorStore } from '@/store';
import { useProjectStore } from '@/store/project-store';

interface SearchResult {
  file: string;
  line: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
}

const SearchPanel: React.FC = React.memo(() => {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [replaceMode, setReplaceMode] = useState(false);
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [fileFilter, setFileFilter] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const projectPath = useProjectStore((s) => s.rootPath);
  const openFile = useEditorStore((s) => s.openFile);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !projectPath) return;
    setSearching(true);
    try {
      const searchResults = await bridge.search.search(query, {
        regex,
        caseSensitive,
        wholeWord,
        fileFilter: fileFilter || undefined,
        projectPath,
      }) as SearchResult[];
      setResults(Array.isArray(searchResults) ? searchResults : []);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, regex, caseSensitive, wholeWord, fileFilter, projectPath]);

  const handleReplaceCurrent = useCallback(async () => {
    if (selectedIndex < 0 || selectedIndex >= results.length) return;
    const result = results[selectedIndex];
    try {
      await bridge.search.replaceInFile(result.file, query, replaceText, regex);
      handleSearch();
    } catch {}
  }, [selectedIndex, results, query, replaceText, regex, handleSearch]);

  const handleReplaceAll = useCallback(async () => {
    if (results.length === 0) return;
    const files = new Set(results.map((r) => r.file));
    for (const file of files) {
      try {
        await bridge.search.replaceInFile(file, query, replaceText, regex);
      } catch {}
    }
    handleSearch();
  }, [results, query, replaceText, regex, handleSearch]);

  const handleResultClick = useCallback((result: SearchResult) => {
    openFile(result.file);
  }, [openFile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, regex, caseSensitive, wholeWord, fileFilter, handleSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setReplaceMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const highlightMatch = (lineText: string, matchStart: number, matchEnd: number) => {
    const before = lineText.slice(0, matchStart);
    const match = lineText.slice(matchStart, matchEnd);
    const after = lineText.slice(matchEnd);
    return (
      <>
        {before}
        <span className="bg-ember-orange/30 text-bright-steel">{match}</span>
        {after}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-graphite">
      <div className="panel-header shrink-0">
        <span>Search</span>
      </div>

      <div className="p-3 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="input-field text-sm flex-1 focus:border-ember-orange focus:ring-1 focus:ring-ember-orange/50"
          />
          <button
            onClick={() => setReplaceMode((prev) => !prev)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              replaceMode ? 'bg-ember-orange/20 text-ember-orange' : 'text-forged-steel hover:text-bright-steel'
            }`}
            title="Toggle Replace (Ctrl+H)"
          >
            ⇄
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setRegex((prev) => !prev)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              regex ? 'bg-ember-orange/20 text-ember-orange' : 'text-forged-steel hover:text-bright-steel'
            }`}
            title="Regex"
          >
            .*
          </button>
          <button
            onClick={() => setCaseSensitive((prev) => !prev)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              caseSensitive ? 'bg-ember-orange/20 text-ember-orange' : 'text-forged-steel hover:text-bright-steel'
            }`}
            title="Case Sensitive"
          >
            Aa
          </button>
          <button
            onClick={() => setWholeWord((prev) => !prev)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              wholeWord ? 'bg-ember-orange/20 text-ember-orange' : 'text-forged-steel hover:text-bright-steel'
            }`}
            title="Whole Word"
          >
            Ab|
          </button>
          <input
            type="text"
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            placeholder="*.ts,*.tsx"
            className="input-field text-xs flex-1 ml-2"
          />
        </div>

        {replaceMode && (
          <div className="space-y-2">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace"
              className="input-field text-sm w-full"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleReplaceCurrent}
                disabled={selectedIndex < 0}
                className="btn-secondary text-xs disabled:opacity-50"
              >
                Replace Current
              </button>
              <button
                onClick={handleReplaceAll}
                disabled={results.length === 0}
                className="btn-primary text-xs disabled:opacity-50"
              >
                Replace All
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {searching && (
          <div className="text-xs text-forged-steel text-center py-4">Searching...</div>
        )}

        {!searching && results.length === 0 && query.trim() && (
          <div className="text-xs text-forged-steel text-center py-4">No results found</div>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-0.5 px-1">
            <div className="text-xs text-forged-steel px-2 py-1">
              {results.length} result{results.length !== 1 ? 's' : ''} in {new Set(results.map((r) => r.file)).size} file{new Set(results.map((r) => r.file)).size !== 1 ? 's' : ''}
            </div>
            {results.map((result, index) => (
              <div
                key={`${result.file}:${result.line}`}
                onClick={() => handleResultClick(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                  selectedIndex === index ? 'bg-ember-orange/10' : 'hover:bg-forge-black/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ember-orange truncate max-w-[60%]">{result.file.split('/').pop()}</span>
                  <span className="text-[10px] text-forged-steel">:{result.line}</span>
                </div>
                <div className="text-xs text-text-gray font-mono truncate mt-0.5">
                  {highlightMatch(result.lineText, result.matchStart, result.matchEnd)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

SearchPanel.displayName = 'SearchPanel';

export { SearchPanel };
export type { SearchResult };
