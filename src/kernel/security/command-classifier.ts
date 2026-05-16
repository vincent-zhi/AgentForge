import type { CommandRisk } from '@/types/core';

const SAFE_COMMANDS: string[] = [
  'ls', 'cat', 'head', 'tail', 'grep', 'find',
  'git status', 'git log', 'git diff',
  'npm list', 'pnpm list',
];

const MEDIUM_COMMANDS: string[] = [
  'npm test', 'pnpm test',
  'npm run', 'pnpm run',
  'tsc', 'eslint',
];

const HIGH_COMMANDS: string[] = [
  'npm publish',
  'rm -rf',
  'git push', 'git reset --hard',
  'docker', 'kubectl',
  'sudo',
];

function normalizeCommand(command: string): string {
  return command.trim().toLowerCase();
}

export function classifyCommand(command: string): CommandRisk {
  const normalized = normalizeCommand(command);

  for (const safe of SAFE_COMMANDS) {
    if (normalized === safe || normalized.startsWith(safe + ' ')) {
      return 'safe';
    }
  }

  for (const high of HIGH_COMMANDS) {
    if (normalized === high || normalized.startsWith(high + ' ') || normalized.includes(high)) {
      return 'high';
    }
  }

  for (const medium of MEDIUM_COMMANDS) {
    if (normalized === medium || normalized.startsWith(medium + ' ')) {
      return 'medium';
    }
  }

  return 'medium';
}
