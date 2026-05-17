import { v4 as uuidv4 } from 'uuid';
import type { BrowserWindow } from 'electron';
import type { ProjectScanResult, ProjectFact, FactStatus, FactType, Confidence } from '@/types/core';
import { ProjectFactRepository } from '../../db/repositories/project-fact-repo';
import { scanProject } from './scanner';
import { buildDependencyGraph } from './dependency-graph';
import { extractPublicApis } from './api-extractor';
import { FileWatcher } from './file-watcher';
import { EVENT_CHANNELS } from '@/ipc/event-channels';

export class BrainService {
  private factRepo: ProjectFactRepository;
  private scanResult: ProjectScanResult | null = null;
  private dependencyGraph: Map<string, string[]> | null = null;
  private mainWindow: BrowserWindow | null = null;
  private watcher: FileWatcher = new FileWatcher();

  constructor(factRepo?: ProjectFactRepository) {
    this.factRepo = factRepo || new ProjectFactRepository();
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private sendScanProgress(data: { phase: string; progress: number; scanning: boolean }): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(EVENT_CHANNELS.SCAN_PROGRESS, data);
    }
  }

  async initializeProject(rootPath: string): Promise<ProjectScanResult> {
    this.sendScanProgress({ phase: 'scanning', progress: 0, scanning: true });

    this.scanResult = scanProject(rootPath);
    this.sendScanProgress({ phase: 'scanning', progress: 25, scanning: true });

    this.dependencyGraph = buildDependencyGraph(rootPath, this.scanResult.modules);
    this.sendScanProgress({ phase: 'dependency-graph', progress: 50, scanning: true });

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
    this.sendScanProgress({ phase: 'api-extraction', progress: 65, scanning: true });

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
    this.sendScanProgress({ phase: 'module-facts', progress: 80, scanning: true });

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
    this.sendScanProgress({ phase: 'complete', progress: 100, scanning: false });

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.watcher.setMarkStaleCallback((filePath: string) => this.markStaleFacts(filePath));
      this.watcher.start(rootPath, this.mainWindow);
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

  getModules(): import('@/types/core').ModuleInfo[] {
    return this.scanResult?.modules ?? [];
  }

  getDependencyGraph(): Map<string, string[]> | null {
    return this.dependencyGraph;
  }

  stopWatching(): void {
    this.watcher.stop();
  }
}
