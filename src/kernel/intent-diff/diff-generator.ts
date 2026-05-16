export interface DiffChange {
  type: 'add' | 'remove' | 'context';
  content: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  changes: DiffChange[];
}

function computeLcsTable(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

function backtrackLcs(dp: number[][], oldLines: string[], newLines: string[]): DiffChange[] {
  const changes: DiffChange[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  const stack: DiffChange[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: 'context', content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'add', content: newLines[j - 1] });
      j--;
    } else {
      stack.push({ type: 'remove', content: oldLines[i - 1] });
      i--;
    }
  }

  for (let k = stack.length - 1; k >= 0; k--) {
    changes.push(stack[k]);
  }

  return changes;
}

function groupChangesIntoHunks(changes: DiffChange[]): DiffHunk[] {
  if (changes.length === 0) return [];

  const hunks: DiffHunk[] = [];
  const contextLines = 3;

  let changeIndices: number[] = [];
  for (let i = 0; i < changes.length; i++) {
    if (changes[i].type !== 'context') {
      changeIndices.push(i);
    }
  }

  if (changeIndices.length === 0) return [];

  const groups: number[][] = [];
  let currentGroup: number[] = [changeIndices[0]];

  for (let i = 1; i < changeIndices.length; i++) {
    const prevIdx = changeIndices[i - 1];
    const currIdx = changeIndices[i];
    const gap = currIdx - prevIdx;

    if (gap <= contextLines * 2 + 1) {
      currentGroup.push(currIdx);
    } else {
      groups.push(currentGroup);
      currentGroup = [currIdx];
    }
  }
  groups.push(currentGroup);

  for (const group of groups) {
    const firstChange = group[0];
    const lastChange = group[group.length - 1];

    const startIdx = Math.max(0, firstChange - contextLines);
    const endIdx = Math.min(changes.length - 1, lastChange + contextLines);

    const hunkChanges = changes.slice(startIdx, endIdx + 1);

    let oldStart = 1;
    let newStart = 1;

    for (let i = 0; i < startIdx; i++) {
      if (changes[i].type === 'context' || changes[i].type === 'remove') {
        oldStart++;
      }
      if (changes[i].type === 'context' || changes[i].type === 'add') {
        newStart++;
      }
    }

    let oldLines = 0;
    let newLines = 0;

    for (const change of hunkChanges) {
      if (change.type === 'context' || change.type === 'remove') oldLines++;
      if (change.type === 'context' || change.type === 'add') newLines++;
    }

    const content = hunkChanges
      .map((c) => {
        const prefix = c.type === 'add' ? '+' : c.type === 'remove' ? '-' : ' ';
        return `${prefix}${c.content}`;
      })
      .join('\n');

    hunks.push({
      oldStart,
      oldLines,
      newStart,
      newLines,
      content,
      changes: hunkChanges,
    });
  }

  return hunks;
}

export function generateDiff(oldContent: string, newContent: string, fileName: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const dp = computeLcsTable(oldLines, newLines);
  const changes = backtrackLcs(dp, oldLines, newLines);
  const hunks = groupChangesIntoHunks(changes);

  if (hunks.length === 0) return '';

  const lines: string[] = [];
  lines.push(`--- a/${fileName}`);
  lines.push(`+++ b/${fileName}`);

  for (const hunk of hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    for (const change of hunk.changes) {
      const prefix = change.type === 'add' ? '+' : change.type === 'remove' ? '-' : ' ';
      lines.push(`${prefix}${change.content}`);
    }
  }

  return lines.join('\n');
}

export function parseDiff(diffString: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = diffString.split('\n');

  let currentHunk: DiffHunk | null = null;
  let currentChanges: DiffChange[] = [];

  const hunkHeaderRegex = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/;

  for (const line of lines) {
    const match = line.match(hunkHeaderRegex);
    if (match) {
      if (currentHunk) {
        currentHunk.changes = currentChanges;
        currentHunk.content = currentChanges
          .map((c) => {
            const prefix = c.type === 'add' ? '+' : c.type === 'remove' ? '-' : ' ';
            return `${prefix}${c.content}`;
          })
          .join('\n');
        hunks.push(currentHunk);
      }

      currentHunk = {
        oldStart: parseInt(match[1], 10),
        oldLines: parseInt(match[2], 10),
        newStart: parseInt(match[3], 10),
        newLines: parseInt(match[4], 10),
        content: '',
        changes: [],
      };
      currentChanges = [];
    } else if (currentHunk) {
      if (line.startsWith('+')) {
        currentChanges.push({ type: 'add', content: line.slice(1) });
      } else if (line.startsWith('-')) {
        currentChanges.push({ type: 'remove', content: line.slice(1) });
      } else if (line.startsWith(' ')) {
        currentChanges.push({ type: 'context', content: line.slice(1) });
      }
    }
  }

  if (currentHunk) {
    currentHunk.changes = currentChanges;
    currentHunk.content = currentChanges
      .map((c) => {
        const prefix = c.type === 'add' ? '+' : c.type === 'remove' ? '-' : ' ';
        return `${prefix}${c.content}`;
      })
      .join('\n');
    hunks.push(currentHunk);
  }

  return hunks;
}
