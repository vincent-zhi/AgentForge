import type { ProjectScanResult } from '@/types/core';
import { BrainService } from '../project-brain/brain-service';
import { scanProject } from '../project-brain/scanner';
import { identifyModules } from '../project-brain/module-identifier';
import { buildDependencyGraph } from '../project-brain/dependency-graph';
import { extractPublicApis } from '../project-brain/api-extractor';
import { mapTests } from '../project-brain/test-mapper';
import { markRisks } from '../project-brain/risk-marker';
import { GraphEngine } from '../contract-graph/graph-engine';

export class ProjectOpenWorkflow {
  private brainService: BrainService;
  private graphEngine: GraphEngine;

  constructor(brainService?: BrainService, graphEngine?: GraphEngine) {
    this.brainService = brainService || new BrainService();
    this.graphEngine = graphEngine || new GraphEngine();
  }

  async openProject(rootPath: string): Promise<ProjectScanResult> {
    const scanResult = scanProject(rootPath);

    const modules = identifyModules(scanResult);

    const dependencyGraph = buildDependencyGraph(rootPath, modules);

    const contracts = this.graphEngine.buildGraph(rootPath, modules, dependencyGraph);

    const apiExports = extractPublicApis(rootPath, modules);

    const testCommands = mapTests(rootPath, modules);

    const riskMap = markRisks(modules, rootPath);
    const highRiskPaths = Array.from(riskMap.entries())
      .filter(([, level]) => level === 'high' || level === 'critical')
      .map(([modPath]) => modPath);

    const fullScanResult: ProjectScanResult = {
      rootPath: scanResult.rootPath,
      name: scanResult.name,
      language: scanResult.language,
      framework: scanResult.framework,
      packageManager: scanResult.packageManager,
      modules,
      testCommands,
      highRiskPaths,
    };

    await this.brainService.initializeProject(rootPath);

    for (const api of apiExports) {
      for (const exp of api.exports) {
        this.brainService.addFact({
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

    for (const contract of contracts) {
      this.brainService.addFact({
        type: 'contract',
        statement: `Contract ${contract.name} (${contract.type}) provided by ${contract.provider}, consumed by [${contract.consumers.join(', ')}]`,
        scope: { modules: [contract.provider, ...contract.consumers] },
        evidence: [{ source: 'code' }],
        confidence: 'high',
        status: 'active',
        expiresWhen: [{ type: 'file_change', value: contract.provider }],
      });
    }

    return fullScanResult;
  }
}
