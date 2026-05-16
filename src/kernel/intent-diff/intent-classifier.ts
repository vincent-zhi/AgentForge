import type { IntentType, IntentDiff, IntentHunk } from '@/types/core';
import type { DiffHunk } from './diff-generator';

function isTestFile(fileName: string): boolean {
  return /\.test\./.test(fileName) || /\.spec\./.test(fileName);
}

function isDocFile(fileName: string): boolean {
  return /\.md$/.test(fileName) || /\.txt$/.test(fileName) || /^docs\//.test(fileName);
}

function hasImportExportChanges(hunk: DiffHunk): boolean {
  return hunk.changes.some(
    (change) =>
      (change.type === 'add' || change.type === 'remove') &&
      (/^\s*(import\s|export\s|export\s+default\s|export\s+\{)/.test(change.content) ||
        /^\s*(import\s|export\s)/.test(change.content))
  );
}

function hasErrorHandling(hunk: DiffHunk): boolean {
  return hunk.changes.some(
    (change) =>
      (change.type === 'add' || change.type === 'remove') &&
      (/^\s*try\s*\{/.test(change.content) ||
        /^\s*catch\s*\(/.test(change.content) ||
        /^\s*finally\s*\{/.test(change.content) ||
        /\.catch\s*\(/.test(change.content) ||
        /throw\s+new\s/.test(change.content) ||
        /Error\s*\(/.test(change.content))
  );
}

export function classifyIntent(hunk: DiffHunk, fileName: string): IntentType {
  if (isTestFile(fileName)) return 'test_coverage';
  if (isDocFile(fileName)) return 'documentation';
  if (hasImportExportChanges(hunk)) return 'refactor';
  if (hasErrorHandling(hunk)) return 'compatibility';
  return 'business_fix';
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
