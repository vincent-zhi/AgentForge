import { v4 as uuidv4 } from 'uuid';
import type { ProjectScanResult, ProjectFact, FactStatus, FactType, Confidence } from '@/types/core';
import { ProjectFactRepository } from '../../db/repositories/project-fact-repo';
import { scanProject } from './scanner';
import { buildDependencyGraph } from './dependency-graph';
import { extractPublicApis } from './api-extractor';

export class BrainService {
  private factRepo: ProjectFactRepository;
  private scanResult: ProjectScanResult | null = null;
  private dependencyGraph: Map<string, string[]> | null = null;

  constructor(factRepo?: ProjectFactRepository) {
    this.factRepo = factRepo || new ProjectFactRepository();
  }

  async initializeProject(rootPath: string): Promise<ProjectScanResult> {
    this.scanResult = scanProject(rootPath);
    this.dependencyGraph = buildDependencyGraph(rootPath, this.scanResult.modules);

    const apiExports = extractPublicApis(rootPath, this.scanResult.modules);
    for (const api of apiExports) {
      for (const exp of api.exports) {
        this.addFact({
          type: 'api',
          statement: `Module ${api.module} exports: ${exp}`,
          scope: { modules: [api.module] },
          evidence: [{ source: 'code' }],
          confidence: 'high',
          status: 'active',
          expiresWhen: [{ type: 'file_change', value: api.module }],
        });
      }
    }

    for (const mod of this.scanResult.modules) {
      this.addFact({
        type: 'module',
        statement: `Module ${mod.name} at ${mod.path} (language: ${mod.language || 'unknown'}, framework: ${mod.framework || 'none'}, risk: ${mod.riskLevel})`,
        scope: { modules: [mod.name] },
        evidence: [{ source: 'code' }],
        confidence: 'high',
        status: 'active',
        expiresWhen: [{ type: 'file_change', value: mod.path }],
      });
    }

    for (const testCmd of this.scanResult.testCommands) {
      this.addFact({
        type: 'command',
        statement: `Test command for ${testCmd.module}: ${testCmd.command}`,
        scope: { modules: [testCmd.module] },
        evidence: [{ source: 'code' }],
        confidence: 'high',
        status: 'active',
        expiresWhen: [{ type: 'file_change', value: testCmd.module }],
      });
    }

    for (const riskPath of this.scanResult.highRiskPaths) {
      this.addFact({
        type: 'risk',
        statement: `High-risk path detected: ${riskPath}`,
        scope: { modules: [riskPath] },
        evidence: [{ source: 'agent_inference' }],
        confidence: 'medium',
        status: 'active',
        expiresWhen: [{ type: 'file_change', value: riskPath }],
      });
    }

    return this.scanResult;
  }

  getFacts(filters?: { type?: FactType; status?: FactStatus; confidence?: Confidence; module?: string }): ProjectFact[] {
    if (filters?.status) {
      return this.factRepo.findByStatus(filters.status);
    }
    if (filters?.type) {
      return this.factRepo.findByType(filters.type);
    }
    if (filters?.module) {
      return this.factRepo.findByModule(filters.module);
    }
    return this.factRepo.findAll(10000);
  }

  searchFacts(query: string): ProjectFact[] {
    return this.factRepo.search(query);
  }

  addFact(fact: Omit<ProjectFact, 'id' | 'createdAt' | 'updatedAt'>): ProjectFact {
    const now = new Date().toISOString();
    const newFact: ProjectFact = {
      id: uuidv4(),
      ...fact,
      createdAt: now,
      updatedAt: now,
    };
    this.factRepo.insert(newFact);
    return newFact;
  }

  updateFactStatus(id: string, status: FactStatus): void {
    this.factRepo.updateStatus(id, status);
  }

  markStaleFacts(filePath: string): void {
    this.factRepo.markStaleByFile(filePath);
  }

  getScanResult(): ProjectScanResult | null {
    return this.scanResult;
  }

  getDependencyGraph(): Map<string, string[]> | null {
    return this.dependencyGraph;
  }
}
