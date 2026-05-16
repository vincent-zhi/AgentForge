import type { ContextLease } from '@/types/core';
import { matchGlob } from '../context-lease/lease-manager';

export const SENSITIVE_PATTERNS: string[] = [
  '.env*',
  '*.pem',
  '*.key',
  'secrets/**',
  'credentials/**',
  'production/**',
];

export const HIGH_RISK_PATTERNS: string[] = [
  'database/migrations/**',
  'services/auth/**',
  'payment/**',
  'infra/**',
  'ci/**',
  'package.json',
  '*lockfile*',
];

export function isSensitivePath(filePath: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => matchGlob(pattern, filePath));
}

export function isHighRiskPath(filePath: string): boolean {
  return HIGH_RISK_PATTERNS.some((pattern) => matchGlob(pattern, filePath));
}

export function checkFileAccess(filePath: string, lease: ContextLease): { allowed: boolean; reason?: string } {
  if (isSensitivePath(filePath)) {
    const canWrite = lease.canWrite.some((pattern) => matchGlob(pattern, filePath));
    if (!canWrite) {
      return { allowed: false, reason: `Path "${filePath}" matches sensitive pattern and is not in lease writable scope` };
    }
    const requiresApproval = lease.requiresApprovalFor.some((pattern) => matchGlob(pattern, filePath));
    if (requiresApproval) {
      return { allowed: false, reason: `Path "${filePath}" is sensitive and requires approval` };
    }
  }

  if (isHighRiskPath(filePath)) {
    const canWrite = lease.canWrite.some((pattern) => matchGlob(pattern, filePath));
    if (!canWrite) {
      return { allowed: false, reason: `Path "${filePath}" matches high-risk pattern and is not in lease writable scope` };
    }
  }

  return { allowed: true };
}
