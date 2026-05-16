import type { ContractRef } from '@/types/core';

const BREAKING_CHANGE_PATTERNS = [
  { pattern: /remove\s+/i, reason: 'Removal of contract element' },
  { pattern: /delete\s+/i, reason: 'Deletion of contract element' },
  { pattern: /rename\s+/i, reason: 'Renaming breaks existing references' },
  { pattern: /change\s+(?:signature|params|parameters|return|interface)/i, reason: 'Signature change breaks consumers' },
  { pattern: /break(?:ing)?\s/i, reason: 'Explicit breaking change' },
  { pattern: /drop\s+(?:support|column|field|property)/i, reason: 'Dropping supported element' },
  { pattern: /deprecate\s+/i, reason: 'Deprecation may break consumers' },
];

export function checkCompatibility(contract: ContractRef, changes: string[]): { compatible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (contract.compatibility === 'must_preserve') {
    for (const change of changes) {
      for (const { pattern, reason } of BREAKING_CHANGE_PATTERNS) {
        if (pattern.test(change)) {
          reasons.push(`${reason} for must-preserve contract "${contract.name}"`);
          break;
        }
      }
    }

    if (changes.length > 0 && contract.consumers.length > 2) {
      reasons.push(`High-impact contract "${contract.name}" has ${contract.consumers.length} consumers - any change is risky`);
    }
  }

  if (contract.compatibility === 'should_preserve') {
    for (const change of changes) {
      if (/remove|delete|rename/i.test(change)) {
        reasons.push(`Potentially breaking change for should-preserve contract "${contract.name}"`);
      }
    }
  }

  return {
    compatible: reasons.length === 0,
    reasons,
  };
}
