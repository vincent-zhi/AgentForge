import path from 'path';
import type { ModuleInfo, RiskLevel } from '@/types/core';

const HIGH_RISK_KEYWORDS = ['auth', 'payment', 'database', 'infra', 'ci', 'security', 'credential', 'secret', 'encryption'];
const MEDIUM_RISK_KEYWORDS = ['config', 'settings', 'middleware', 'env', 'migration', 'deploy', 'logging'];

function getRiskFromPath(modulePath: string): RiskLevel {
  const segments = modulePath.toLowerCase().split(path.sep);
  for (const segment of segments) {
    for (const keyword of HIGH_RISK_KEYWORDS) {
      if (segment.includes(keyword)) return 'critical';
    }
  }
  for (const segment of segments) {
    for (const keyword of MEDIUM_RISK_KEYWORDS) {
      if (segment.includes(keyword)) return 'medium';
    }
  }
  return 'low';
}

function getRiskFromName(moduleName: string): RiskLevel {
  const lower = moduleName.toLowerCase();
  for (const keyword of HIGH_RISK_KEYWORDS) {
    if (lower.includes(keyword)) return 'critical';
  }
  for (const keyword of MEDIUM_RISK_KEYWORDS) {
    if (lower.includes(keyword)) return 'medium';
  }
  return 'low';
}

export function markRisks(modules: ModuleInfo[], _rootPath: string): Map<string, RiskLevel> {
  const riskMap = new Map<string, RiskLevel>();

  for (const mod of modules) {
    const pathRisk = getRiskFromPath(mod.path);
    const nameRisk = getRiskFromName(mod.name);

    const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const pathIdx = riskOrder.indexOf(pathRisk);
    const nameIdx = riskOrder.indexOf(nameRisk);
    const finalRisk = riskOrder[Math.max(pathIdx, nameIdx)];

    riskMap.set(mod.path, finalRisk);
    mod.riskLevel = finalRisk;
  }

  return riskMap;
}
