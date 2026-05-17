import { v4 as uuidv4 } from 'uuid';
import type { BrowserWindow } from 'electron';
import type { ProjectScanResult, ProjectFact, FactStatus, FactType, Confidence, ModuleInfo, Evidence } from '@/types/core';
import { ProjectFactRepository } from '../../db/repositories/project-fact-repo';
import { scanProject } from './scanner';
import { buildDependencyGraph, type DependencyGraphResult } from './dependency-graph';
import { extractPublicApis } from './api-extractor';
import { FileWatcher } from './file-watcher';
import { EVENT_CHANNELS } from '@/ipc/event-channels';
import { getDatabase } from '../../db/connection';
import type { PluginRegistry } from '../plugin/plugin-registry';
import { LRUCache } from '../cache/lru-cache';

const SCAN_RESULT_TABLE = 'project_scan_results';

export class BrainService {
  private factRepo: ProjectFactRepository;
  private scanResult: ProjectScanResult | null = null;
  private dependencyGraphResult: DependencyGraphResult | null = null;
  private mainWindow: BrowserWindow | null = null;
  private watcher: FileWatcher = new FileWatcher();
  private scanResultCache: LRUCache<string, ProjectScanResult> = new LRUCache(10, 5 * 60 * 1000);
  private moduleListCache: LRUCache<string, ModuleInfo[]> = new LRUCache(20, 5 * 60 * 1000);
  private factQueryCache: LRUCache<string, ProjectFact[]> = new LRUCache(50, 2 * 60 * 1000);
  private pluginRegistry: PluginRegistry | null = null;

  constructor(factRepo?: ProjectFactRepository) {
    this.factRepo = factRepo || new ProjectFactRepository();
    this.ensureScanResultTable();
  }

  private ensureScanResultTable(): void {
    try {
      const db = getDatabase();
      db.exec(`
        CREATE TABLE IF NOT EXISTS ${SCAN_RESULT_TABLE} (
          rootPath TEXT PRIMARY KEY,
          scanResult TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);
    } catch {}
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  setPluginRegistry(registry: PluginRegistry): void {
    this.pluginRegistry = registry;
  }

  private sendScanProgress(data: { phase: string; progress: number; scanning: boolean }): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(EVENT_CHANNELS.SCAN_PROGRESS, data);
    }
  }

  async initializeProject(rootPath: string): Promise<ProjectScanResult> {
    const cached = this.scanResultCache.get(rootPath);
    if (cached) {
      this.scanResult = cached;
      this.dependencyGraphResult = buildDependencyGraph(rootPath, cached.modules);
      this.sendScanProgress({ phase: 'loaded', progress: 100, scanning: false });

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.watcher.setMarkStaleCallback((filePath: string) => this.markStaleFacts(filePath));
        this.watcher.start(rootPath, this.mainWindow);
      }

      return cached;
    }

    const persisted = this.loadPersistedResult(rootPath);
    if (persisted) {
      this.scanResult = persisted;
      this.dependencyGraphResult = buildDependencyGraph(rootPath, persisted.modules);
      this.sendScanProgress({ phase: 'loaded', progress: 100, scanning: false });

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.watcher.setMarkStaleCallback((filePath: string) => {
          this.markStaleFacts(filePath);
          this.invalidateCache(filePath);
        });
        this.watcher.start(rootPath, this.mainWindow);
      }

      return persisted;
    }

    this.sendScanProgress({ phase: 'scanning', progress: 0, scanning: true });

    this.scanResult = scanProject(rootPath);
    this.sendScanProgress({ phase: 'scanning', progress: 25, scanning: true });

    this.dependencyGraphResult = buildDependencyGraph(rootPath, this.scanResult.modules);
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

    if (this.pluginRegistry) {
      const analyzers = this.pluginRegistry.getAnalyzers();
      const filePaths = this.scanResult.modules.map((m) => m.path);
      for (const analyzer of analyzers) {
        try {
          const result = await analyzer.analyze(rootPath, filePaths);
          for (const fact of result.facts) {
            this.addFact({
              type: fact.type as FactType,
              statement: fact.statement,
              scope: { modules: [fact.scope] },
              evidence: fact.evidence.map((e) => ({ source: e as Evidence['source'] })),
              confidence: fact.confidence >= 0.8 ? 'high' : fact.confidence >= 0.5 ? 'medium' : 'low',
              status: 'active',
              expiresWhen: [{ type: 'file_change', value: fact.scope }],
            });
          }
        } catch (err) {
          console.error(`[BrainService] Analyzer plugin "${analyzer.name}" failed:`, err);
        }
      }
    }

    this.sendScanProgress({ phase: 'complete', progress: 100, scanning: false });

    this.persistScanResult();

    this.scanResultCache.set(rootPath, this.scanResult);
    this.moduleListCache.set(rootPath, this.scanResult.modules);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.watcher.setMarkStaleCallback((filePath: string) => {
        this.markStaleFacts(filePath);
        this.invalidateCache(filePath);
      });
      this.watcher.start(rootPath, this.mainWindow);
    }

    return this.scanResult;
  }

  incrementalUpdate(changedFiles: string[]): void {
    if (!this.scanResult) return;

    const affectedModules = new Set<string>();
    for (const filePath of changedFiles) {
      for (const mod of this.scanResult.modules) {
        if (filePath.startsWith(mod.path + '/') || filePath.startsWith(mod.path + '\\')) {
          affectedModules.add(mod.name);
        }
      }
    }

    if (affectedModules.size === 0) return;

    const rootPath = this.scanResult.rootPath;
    const updatedModules = this.scanResult.modules.map((mod) => {
      if (!affectedModules.has(mod.name)) return mod;
      return { ...mod };
    });

    this.scanResult = { ...this.scanResult, modules: updatedModules };

    for (const moduleName of affectedModules) {
      const mod = updatedModules.find((m) => m.name === moduleName);
      if (mod) {
        this.addFact({
          type: 'module',
          statement: `Module ${mod.name} updated (incremental rescan)`,
          scope: { modules: [mod.name] },
          evidence: [{ source: 'code' }],
          confidence: 'high',
          status: 'active',
          expiresWhen: [{ type: 'file_change', value: mod.path }],
        });
      }
    }

    this.dependencyGraphResult = buildDependencyGraph(rootPath, updatedModules);
    this.persistScanResult();
  }

  persistScanResult(): void {
    if (!this.scanResult) return;
    try {
      const db = getDatabase();
      const serialized = JSON.stringify(this.scanResult);
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO ${SCAN_RESULT_TABLE} (rootPath, scanResult, updatedAt) VALUES (?, ?, ?)
         ON CONFLICT(rootPath) DO UPDATE SET scanResult = ?, updatedAt = ?`
      ).run(this.scanResult.rootPath, serialized, now, serialized, now);
    } catch {}
  }

  loadPersistedResult(rootPath: string): ProjectScanResult | null {
    try {
      const db = getDatabase();
      const row = db.prepare(`SELECT scanResult FROM ${SCAN_RESULT_TABLE} WHERE rootPath = ?`).get(rootPath) as Record<string, string> | undefined;
      if (!row) return null;
      return JSON.parse(row.scanResult) as ProjectScanResult;
    } catch {
      return null;
    }
  }

  getFacts(filters?: { type?: FactType; status?: FactStatus; confidence?: Confidence; module?: string }): ProjectFact[] {
    const cacheKey = JSON.stringify(filters ?? {});
    const cachedFacts = this.factQueryCache.get(cacheKey);
    if (cachedFacts) {
      return cachedFacts;
    }

    let result: ProjectFact[];
    if (filters?.status) {
      result = this.factRepo.findByStatus(filters.status);
    } else if (filters?.type) {
      result = this.factRepo.findByType(filters.type);
    } else if (filters?.module) {
      result = this.factRepo.findByModule(filters.module);
    } else {
      result = this.factRepo.findAll(10000);
    }

    this.factQueryCache.set(cacheKey, result);
    return result;
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
    if (!this.scanResult) return [];

    const rootPath = this.scanResult.rootPath;
    const cached = this.moduleListCache.get(rootPath);
    if (cached) {
      return cached;
    }

    const modules = this.scanResult.modules;
    this.moduleListCache.set(rootPath, modules);
    return modules;
  }

  getDependencyGraph(): Map<string, string[]> | null {
    return this.dependencyGraphResult?.importMap ?? null;
  }

  getDependencyGraphResult(): DependencyGraphResult | null {
    return this.dependencyGraphResult;
  }

  invalidateCache(filePath?: string): void {
    if (filePath) {
      this.scanResultCache.invalidateByPrefix(filePath);
      this.moduleListCache.invalidateByPrefix(filePath);
      this.factQueryCache.invalidateByPrefix(filePath);
    } else {
      this.scanResultCache.clear();
      this.moduleListCache.clear();
      this.factQueryCache.clear();
    }
  }

  stopWatching(): void {
    this.watcher.stop();
  }
}
