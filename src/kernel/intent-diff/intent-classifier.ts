import type { IntentType, IntentDiff, IntentHunk } from '@/types/core';
import type { DiffHunk, DiffChange } from './diff-generator';

type ScoreMap = Record<IntentType, number>;

const EMPTY_SCORES: ScoreMap = {
  business_fix: 0,
  compatibility: 0,
  test_coverage: 0,
  documentation: 0,
  refactor: 0,
};

function addScores(base: ScoreMap, delta: ScoreMap): ScoreMap {
  return {
    business_fix: base.business_fix + delta.business_fix,
    compatibility: base.compatibility + delta.compatibility,
    test_coverage: base.test_coverage + delta.test_coverage,
    documentation: base.documentation + delta.documentation,
    refactor: base.refactor + delta.refactor,
  };
}

function isTestFile(filePath: string): boolean {
  return (
    /\.test\.[jt]sx?$/.test(filePath) ||
    /\.spec\.[jt]sx?$/.test(filePath) ||
    /(?:^|\/)(?:test|tests|__tests__|spec)\//.test(filePath) ||
    /(?:^|\/)test-[a-z0-9-]+\.[jt]sx?$/.test(filePath)
  );
}

function isDocFile(filePath: string): boolean {
  return (
    /\.md$/.test(filePath) ||
    /\.txt$/.test(filePath) ||
    /\.adoc$/.test(filePath) ||
    /\.rst$/.test(filePath) ||
    /^docs?\//.test(filePath) ||
    /(?:^|\/)(?:README|CHANGELOG|CONTRIBUTING|LICENSE)/.test(filePath)
  );
}

function isConfigFile(filePath: string): boolean {
  return (
    /\.config\.[jt]s$/.test(filePath) ||
    /\.config\.mjs$/.test(filePath) ||
    /\.config\.cjs$/.test(filePath) ||
    /\.json$/.test(filePath) ||
    /\.yaml$/.test(filePath) ||
    /\.yml$/.test(filePath) ||
    /\.toml$/.test(filePath) ||
    /\.env/.test(filePath) ||
    /(?:^|\/)(?:tsconfig|jsconfig|eslint|prettier|babel|vite|webpack|rollup|jest|vitest)/.test(filePath) ||
    /(?:^|\/)\.[a-z]+rc(?:\.[jt]s)?$/.test(filePath)
  );
}

function isTypeDefinitionFile(filePath: string): boolean {
  return /\.d\.ts$/.test(filePath) || /\.d\.mts$/.test(filePath);
}

function getAddedLines(changes: DiffChange[]): string[] {
  return changes.filter((c) => c.type === 'add').map((c) => c.content);
}

function getRemovedLines(changes: DiffChange[]): string[] {
  return changes.filter((c) => c.type === 'remove').map((c) => c.content);
}

function scoreFilePath(filePath: string): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  if (isTestFile(filePath)) {
    scores.test_coverage += 15;
  }

  if (isDocFile(filePath)) {
    scores.documentation += 15;
  }

  if (isConfigFile(filePath)) {
    scores.compatibility += 8;
  }

  if (isTypeDefinitionFile(filePath)) {
    scores.compatibility += 10;
  }

  if (/(?:^|\/)src\//.test(filePath) && !isTestFile(filePath) && !isDocFile(filePath)) {
    scores.business_fix += 2;
  }

  if (/(?:^|\/)(?:utils|helpers|lib|core|shared)\//.test(filePath)) {
    scores.refactor += 3;
  }

  return scores;
}

function scoreErrorHandling(added: string[], removed: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const errorPatterns = [
    /\btry\s*\{/,
    /\bcatch\s*\(/,
    /\bfinally\s*\{/,
    /\.catch\s*\(/,
    /\bthrow\s+new\s/,
    /\bError\s*\(/,
    /\bError\b/,
    /\bcatch\b/,
    /\bfinally\b/,
    /Promise\.reject/,
    /\.reject\(/,
    /\bassert\b/,
    /\bguard\b/,
    /\bvalidate\b/,
    /\bhandleError\b/,
    /\bhandleException\b/,
    /\bonError\b/,
    /\bcatchError\b/,
  ];

  let addedErrorCount = 0;
  let removedErrorCount = 0;

  for (const line of added) {
    if (errorPatterns.some((p) => p.test(line))) {
      addedErrorCount++;
    }
  }

  for (const line of removed) {
    if (errorPatterns.some((p) => p.test(line))) {
      removedErrorCount++;
    }
  }

  if (addedErrorCount > 0) {
    scores.compatibility += Math.min(addedErrorCount * 3, 12);
  }

  if (removedErrorCount > 0 && addedErrorCount === 0) {
    scores.refactor += 4;
  }

  return scores;
}

function scoreTypeSignatureChanges(added: string[], removed: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const typeChangePatterns = [
    /:\s*[A-Z][A-Za-z0-9]*(?:<[^>]*>)?(?:\s*[|&]\s*[A-Z][A-Za-z0-9]*)*\s*[=;,{]/,
    /\bas\s+[A-Z]/,
    /<[^>]+>/,
    /\binterface\s+\w+/,
    /\btype\s+\w+\s*=/,
    /\benum\s+\w+/,
    /\bimplements\s+/,
    /\bextends\s+/,
    /\breadonly\b/,
    /\boptional\b/,
    /\?\s*:/,
  ];

  let typeChangeCount = 0;

  for (const line of added) {
    if (typeChangePatterns.some((p) => p.test(line))) {
      typeChangeCount++;
    }
  }

  for (const line of removed) {
    if (typeChangePatterns.some((p) => p.test(line))) {
      typeChangeCount++;
    }
  }

  if (typeChangeCount > 0) {
    scores.compatibility += Math.min(typeChangeCount * 2, 10);
  }

  return scores;
}

function scoreImportChanges(added: string[], removed: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const importPattern = /^\s*(?:import\s|export\s|export\s+default\s|export\s+\{)/;

  const addedImports = added.filter((l) => importPattern.test(l));
  const removedImports = removed.filter((l) => importPattern.test(l));

  if (addedImports.length > 0 && removedImports.length > 0) {
    scores.refactor += Math.min((addedImports.length + removedImports.length) * 2, 10);
  } else if (addedImports.length > 0) {
    scores.business_fix += 2;
    scores.refactor += 1;
  } else if (removedImports.length > 0) {
    scores.refactor += 3;
  }

  return scores;
}

function scoreBugFixKeywords(added: string[], removed: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const bugFixPatterns = [
    /\bfix\b/i,
    /\bbug\b/i,
    /\bissue\b/i,
    /\berror\b/i,
    /\bcrash\b/i,
    /\bpatch\b/i,
    /\bhotfix\b/i,
    /\bworkaround\b/i,
    /\bregression\b/i,
    /\bdefect\b/i,
    /\bvulnerability\b/i,
    /\bsecurity\b/i,
    /\bexploit\b/i,
    /\bdeadlock\b/i,
    /\brace\s*condition\b/i,
    /\bnull\s*pointer\b/i,
    /\bundefined\b/i,
    /\bNaN\b/,
    /\bmemory\s*leak\b/i,
    /\bsegfault\b/i,
    /\btimeout\b/i,
    /\bincorrect\b/i,
    /\bwrong\b/i,
    /\bbroken\b/i,
  ];

  let fixKeywordCount = 0;

  for (const line of added) {
    if (bugFixPatterns.some((p) => p.test(line))) {
      fixKeywordCount++;
    }
  }

  for (const line of removed) {
    if (bugFixPatterns.some((p) => p.test(line))) {
      fixKeywordCount++;
    }
  }

  if (fixKeywordCount > 0) {
    scores.business_fix += Math.min(fixKeywordCount * 3, 15);
  }

  return scores;
}

function scoreNewFeatureKeywords(added: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const featurePatterns = [
    /\badd\b/i,
    /\bcreate\b/i,
    /\bimplement\b/i,
    /\bsupport\b/i,
    /\bnew\s+(?:feature|method|function|class|component|module|service|handler|route|endpoint|api|command|option|flag|property|field|parameter|argument)/i,
    /\benable\b/i,
    /\bintroduce\b/i,
    /\bprovide\b/i,
    /\bexpose\b/i,
    /\bextend\b/i,
    /\bnew\b(?!\s*(?:Error|TypeError|RangeError|SyntaxError))/i,
  ];

  let featureCount = 0;

  for (const line of added) {
    if (featurePatterns.some((p) => p.test(line))) {
      featureCount++;
    }
  }

  if (featureCount > 0) {
    scores.business_fix += Math.min(featureCount * 2, 10);
  }

  return scores;
}

function scorePerformanceOptimization(added: string[], removed: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const perfPatterns = [
    /\buseMemo\b/,
    /\buseCallback\b/,
    /\bReact\.memo\b/,
    /\bmemoize\b/i,
    /\bcache\b/i,
    /\boptimize\b/i,
    /\bperformance\b/i,
    /\blazy\b/i,
    /\bdefer\b/i,
    /\bthrottle\b/i,
    /\bdebounce\b/i,
    /\bbatch\b/i,
    /\bpool\b/i,
    /\breuse\b/i,
    /\bO\(/,
    /\befficient\b/i,
    /\bfaster\b/i,
    /\bspeed\b/i,
    /\breduce\s+(?:allocation|overhead|memory|latency)/i,
    /\bWeakMap\b/,
    /\bWeakSet\b/,
    /\bWeakRef\b/,
  ];

  let perfCount = 0;

  for (const line of added) {
    if (perfPatterns.some((p) => p.test(line))) {
      perfCount++;
    }
  }

  for (const line of removed) {
    if (perfPatterns.some((p) => p.test(line))) {
      perfCount++;
    }
  }

  if (perfCount > 0) {
    scores.refactor += Math.min(perfCount * 3, 12);
  }

  return scores;
}

function scoreConfigChanges(added: string[], removed: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const newEntryPatterns = [
    /^\s*"[^"]+"\s*:/,
    /^\s*\w+\s*[:=]/,
    /^\s*-\s+/,
  ];

  let newEntryCount = 0;

  for (const line of added) {
    if (newEntryPatterns.some((p) => p.test(line))) {
      newEntryCount++;
    }
  }

  if (newEntryCount > removed.length) {
    scores.compatibility += Math.min((newEntryCount - removed.length) * 2, 8);
  }

  return scores;
}

function scoreTestPatterns(added: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const testPatterns = [
    /\bdescribe\s*\(/,
    /\bit\s*\(/,
    /\btest\s*\(/,
    /\bbeforeEach\s*\(/,
    /\bafterEach\s*\(/,
    /\bbeforeAll\s*\(/,
    /\bafterAll\s*\(/,
    /\bexpect\s*\(/,
    /\bassert\b/,
    /\.should\b/,
    /\.toEqual\b/,
    /\.toBe\b/,
    /\.toThrow\b/,
    /\.toHaveBeenCalled\b/,
    /\.toHaveBeenCalledWith\b/,
    /\.toHaveProperty\b/,
    /\.toMatch\b/,
    /\.toContain\b/,
    /\.rejects\b/,
    /\.resolves\b/,
    /\bvi\.\b/,
    /\bjest\.\b/,
    /\bcy\.\b/,
    /\brender\s*\(/,
    /\bfireEvent\b/,
    /\bscreen\.\b/,
    /\bwaitFor\b/,
  ];

  let testCount = 0;

  for (const line of added) {
    if (testPatterns.some((p) => p.test(line))) {
      testCount++;
    }
  }

  if (testCount > 0) {
    scores.test_coverage += Math.min(testCount * 2, 12);
  }

  return scores;
}

function scoreDocPatterns(added: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const docPatterns = [
    /\/\*\*/,
    /\*\s*@/,
    /^\s*\*\s/,
    /^\s*\/\/\//,
    /\bTODO\b/,
    /\bFIXME\b/,
    /\bNOTE\b/,
    /\bWARNING\b/,
    /\b@param\b/,
    /\b@returns?\b/,
    /\b@throws\b/,
    /\b@example\b/,
    /\b@see\b/,
    /\b@deprecated\b/,
  ];

  let docCount = 0;

  for (const line of added) {
    if (docPatterns.some((p) => p.test(line))) {
      docCount++;
    }
  }

  if (docCount > 0) {
    scores.documentation += Math.min(docCount * 2, 8);
  }

  return scores;
}

function scoreRefactorPatterns(added: string[], removed: string[]): ScoreMap {
  const scores = { ...EMPTY_SCORES };

  const refactorPatterns = [
    /\bextract\b/i,
    /\brename\b/i,
    /\bmove\b/i,
    /\breorganiz\b/i,
    /\brestructur\b/i,
    /\bclean\s*up\b/i,
    /\bsimplify\b/i,
    /\bconsolidat\b/i,
    /\bdeduplicat\b/i,
    /\bdeprecat\b/i,
    /\bremove\s+(?:unused|dead|stale|obsolete)/i,
    /\binline\b/i,
    /\babstract\b/i,
    /\bencapsulat\b/i,
    /\bpolymorph/i,
  ];

  let refactorCount = 0;

  for (const line of added) {
    if (refactorPatterns.some((p) => p.test(line))) {
      refactorCount++;
    }
  }

  for (const line of removed) {
    if (refactorPatterns.some((p) => p.test(line))) {
      refactorCount++;
    }
  }

  if (refactorCount > 0) {
    scores.refactor += Math.min(refactorCount * 3, 10);
  }

  const pureRemovals = removed.length;
  const pureAdditions = added.length;

  if (pureRemovals > pureAdditions * 2 && pureRemovals >= 3) {
    scores.refactor += 4;
  }

  return scores;
}

function applyEdgeCaseOverrides(scores: ScoreMap, filePath: string): ScoreMap {
  const result = { ...scores };

  if (isTestFile(filePath) && result.compatibility > 0) {
    const compatBonus = result.compatibility;
    result.compatibility = 0;
    result.test_coverage += Math.ceil(compatBonus * 0.5);
  }

  if (isConfigFile(filePath) && result.business_fix > result.compatibility) {
    const hasNewEntries = result.compatibility > 0;
    if (hasNewEntries) {
      result.compatibility += 3;
    }
  }

  if (isTypeDefinitionFile(filePath) && result.compatibility < 5) {
    result.compatibility += 5;
  }

  return result;
}

function getHighestScoreIntent(scores: ScoreMap): IntentType {
  const entries = Object.entries(scores) as [IntentType, number][];
  let maxScore = -Infinity;
  let bestIntent: IntentType = 'business_fix';

  for (const [intent, score] of entries) {
    if (score > maxScore) {
      maxScore = score;
      bestIntent = intent;
    }
  }

  if (maxScore <= 0) {
    return 'business_fix';
  }

  return bestIntent;
}

export function classifyIntent(hunk: DiffHunk, fileName: string): IntentType {
  const added = getAddedLines(hunk.changes);
  const removed = getRemovedLines(hunk.changes);

  let scores = { ...EMPTY_SCORES };

  scores = addScores(scores, scoreFilePath(fileName));
  scores = addScores(scores, scoreErrorHandling(added, removed));
  scores = addScores(scores, scoreTypeSignatureChanges(added, removed));
  scores = addScores(scores, scoreImportChanges(added, removed));
  scores = addScores(scores, scoreBugFixKeywords(added, removed));
  scores = addScores(scores, scoreNewFeatureKeywords(added));
  scores = addScores(scores, scorePerformanceOptimization(added, removed));
  scores = addScores(scores, scoreConfigChanges(added, removed));
  scores = addScores(scores, scoreTestPatterns(added));
  scores = addScores(scores, scoreDocPatterns(added));
  scores = addScores(scores, scoreRefactorPatterns(added, removed));

  scores = applyEdgeCaseOverrides(scores, fileName);

  return getHighestScoreIntent(scores);
}

export function classifyAllDiffs(hunks: DiffHunk[], fileName: string): IntentDiff {
  const intentHunks: IntentHunk[] = hunks.map((hunk) => ({
    intent: classifyIntent(hunk, fileName),
    oldStart: hunk.oldStart,
    oldLines: hunk.oldLines,
    newStart: hunk.newStart,
    newLines: hunk.newLines,
    content: hunk.content,
  }));

  return {
    file: fileName,
    hunks: intentHunks,
  };
}
