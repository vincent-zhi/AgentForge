export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'method';
  filePath: string;
  line: number;
  char: number;
  containerName?: string;
}

const SYMBOL_PATTERNS: Array<{ regex: RegExp; kind: SymbolInfo['kind'] }> = [
  { regex: /export\s+(?:async\s+)?function\s+(\w+)/g, kind: 'function' },
  { regex: /export\s+default\s+(?:async\s+)?function\s+(\w+)/g, kind: 'function' },
  { regex: /(?:async\s+)?function\s+(\w+)/g, kind: 'function' },
  { regex: /export\s+class\s+(\w+)/g, kind: 'class' },
  { regex: /export\s+default\s+class\s+(\w+)/g, kind: 'class' },
  { regex: /class\s+(\w+)/g, kind: 'class' },
  { regex: /export\s+interface\s+(\w+)/g, kind: 'interface' },
  { regex: /interface\s+(\w+)/g, kind: 'interface' },
  { regex: /export\s+type\s+(\w+)/g, kind: 'type' },
  { regex: /type\s+(\w+)\s*=/g, kind: 'type' },
  { regex: /export\s+enum\s+(\w+)/g, kind: 'enum' },
  { regex: /enum\s+(\w+)/g, kind: 'enum' },
  { regex: /export\s+const\s+(\w+)/g, kind: 'variable' },
  { regex: /export\s+let\s+(\w+)/g, kind: 'variable' },
  { regex: /export\s+var\s+(\w+)/g, kind: 'variable' },
  { regex: /(?:private|protected|public)\s+(?:async\s+)?(\w+)\s*\(/g, kind: 'method' },
  { regex: /(?:private|protected|public)\s+(?:static\s+)?(?:async\s+)?(\w+)\s*\(/g, kind: 'method' },
];

const CONTAINER_PATTERN = /(?:class|interface|enum)\s+(\w+)/;

export function getFileSymbols(filePath: string): SymbolInfo[] {
  let content: string;
  try {
    const fs = require('fs');
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const lines = content.split('\n');
  const symbols: SymbolInfo[] = [];
  const seen = new Set<string>();

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNum = lineIdx + 1;

    for (const { regex: pattern, kind } of SYMBOL_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = re.exec(line)) !== null) {
        const name = match[1];
        const key = `${name}:${kind}:${lineNum}`;
        if (seen.has(key)) continue;
        seen.add(key);

        let containerName: string | undefined;
        for (let back = lineIdx - 1; back >= 0; back--) {
          const containerMatch = lines[back].match(CONTAINER_PATTERN);
          if (containerMatch) {
            const indentCurrent = line.search(/\S/);
            const indentContainer = lines[back].search(/\S/);
            if (indentCurrent > indentContainer) {
              containerName = containerMatch[1];
            }
            break;
          }
        }

        symbols.push({
          name,
          kind,
          filePath,
          line: lineNum,
          char: match.index + 1,
          containerName,
        });
      }
    }
  }

  return symbols;
}

export function getWorkspaceSymbols(projectPath: string, query: string): SymbolInfo[] {
  const glob = require('glob');

  const lowerQuery = query.toLowerCase();
  const symbols: SymbolInfo[] = [];

  let files: string[];
  try {
    files = glob.sync('**/*.{ts,tsx,js,jsx}', {
      cwd: projectPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    });
  } catch {
    return [];
  }

  for (const file of files) {
    try {
      const fileSymbols = getFileSymbols(file);
      for (const sym of fileSymbols) {
        if (sym.name.toLowerCase().includes(lowerQuery)) {
          symbols.push(sym);
        }
      }
    } catch {}
  }

  return symbols;
}
