export interface PluginAnalysisResult {
  facts: Array<{
    type: string;
    statement: string;
    confidence: number;
    scope: string;
    evidence: string[];
  }>;
}

export interface PluginContractResult {
  contracts: Array<{
    name: string;
    type: string;
    filePath: string;
    consumers: string[];
    mustPreserve: boolean;
  }>;
}

export interface PluginTestResult {
  tests: Array<{
    filePath: string;
    testName: string;
    reason: string;
  }>;
}

export interface PluginReviewResult {
  approved: boolean;
  issues: Array<{
    severity: string;
    message: string;
    line?: number;
  }>;
}

export interface IAnalyzerPlugin {
  name: string;
  version: string;
  analyze(projectPath: string, filePaths: string[]): Promise<PluginAnalysisResult>;
}

export interface IContractExtractorPlugin {
  name: string;
  version: string;
  extractContracts(projectPath: string, filePaths: string[]): Promise<PluginContractResult>;
}

export interface ITestSelectorPlugin {
  name: string;
  version: string;
  selectTests(projectPath: string, changedFiles: string[]): Promise<PluginTestResult>;
}

export interface IReviewPolicyPlugin {
  name: string;
  version: string;
  review(diff: string, context: any): Promise<PluginReviewResult>;
}

export class PluginRegistry {
  private analyzers: Map<string, IAnalyzerPlugin> = new Map();
  private contractExtractors: Map<string, IContractExtractorPlugin> = new Map();
  private testSelectors: Map<string, ITestSelectorPlugin> = new Map();
  private reviewPolicies: Map<string, IReviewPolicyPlugin> = new Map();

  registerAnalyzer(plugin: IAnalyzerPlugin): void {
    this.analyzers.set(plugin.name, plugin);
  }

  registerContractExtractor(plugin: IContractExtractorPlugin): void {
    this.contractExtractors.set(plugin.name, plugin);
  }

  registerTestSelector(plugin: ITestSelectorPlugin): void {
    this.testSelectors.set(plugin.name, plugin);
  }

  registerReviewPolicy(plugin: IReviewPolicyPlugin): void {
    this.reviewPolicies.set(plugin.name, plugin);
  }

  getAnalyzers(): IAnalyzerPlugin[] {
    return Array.from(this.analyzers.values());
  }

  getContractExtractors(): IContractExtractorPlugin[] {
    return Array.from(this.contractExtractors.values());
  }

  getTestSelectors(): ITestSelectorPlugin[] {
    return Array.from(this.testSelectors.values());
  }

  getReviewPolicies(): IReviewPolicyPlugin[] {
    return Array.from(this.reviewPolicies.values());
  }

  getAllPlugins(): {
    analyzers: IAnalyzerPlugin[];
    contractExtractors: IContractExtractorPlugin[];
    testSelectors: ITestSelectorPlugin[];
    reviewPolicies: IReviewPolicyPlugin[];
  } {
    return {
      analyzers: this.getAnalyzers(),
      contractExtractors: this.getContractExtractors(),
      testSelectors: this.getTestSelectors(),
      reviewPolicies: this.getReviewPolicies(),
    };
  }

  unregister(name: string): void {
    this.analyzers.delete(name);
    this.contractExtractors.delete(name);
    this.testSelectors.delete(name);
    this.reviewPolicies.delete(name);
  }
}
