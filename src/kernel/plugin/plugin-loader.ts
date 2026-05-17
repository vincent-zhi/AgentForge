import * as fs from 'fs';
import * as path from 'path';
import { PluginRegistry, IAnalyzerPlugin, IContractExtractorPlugin, ITestSelectorPlugin, IReviewPolicyPlugin } from './plugin-registry';

export interface PluginConfig {
  analyzers?: Array<{ name: string; path: string; options?: Record<string, any> }>;
  contractExtractors?: Array<{ name: string; path: string; options?: Record<string, any> }>;
  testSelectors?: Array<{ name: string; path: string; options?: Record<string, any> }>;
  reviewPolicies?: Array<{ name: string; path: string; options?: Record<string, any> }>;
}

async function loadPluginModule<T>(pluginPath: string): Promise<T | null> {
  try {
    const absolutePath = path.resolve(pluginPath);
    const module = await import(absolutePath);
    return module.default || module as T;
  } catch (err) {
    console.error(`[PluginLoader] Failed to load plugin from ${pluginPath}:`, err);
    return null;
  }
}

export async function loadPlugins(projectPath: string, registry: PluginRegistry): Promise<void> {
  const configPath = path.join(projectPath, '.agentforge', 'plugins.json');

  if (!fs.existsSync(configPath)) {
    return;
  }

  let config: PluginConfig;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(raw) as PluginConfig;
  } catch (err) {
    console.error('[PluginLoader] Failed to read plugins.json:', err);
    return;
  }

  if (config.analyzers) {
    for (const entry of config.analyzers) {
      const plugin = await loadPluginModule<IAnalyzerPlugin>(entry.path);
      if (plugin) {
        try {
          registry.registerAnalyzer(plugin);
        } catch (err) {
          console.error(`[PluginLoader] Failed to register analyzer "${entry.name}":`, err);
        }
      }
    }
  }

  if (config.contractExtractors) {
    for (const entry of config.contractExtractors) {
      const plugin = await loadPluginModule<IContractExtractorPlugin>(entry.path);
      if (plugin) {
        try {
          registry.registerContractExtractor(plugin);
        } catch (err) {
          console.error(`[PluginLoader] Failed to register contract extractor "${entry.name}":`, err);
        }
      }
    }
  }

  if (config.testSelectors) {
    for (const entry of config.testSelectors) {
      const plugin = await loadPluginModule<ITestSelectorPlugin>(entry.path);
      if (plugin) {
        try {
          registry.registerTestSelector(plugin);
        } catch (err) {
          console.error(`[PluginLoader] Failed to register test selector "${entry.name}":`, err);
        }
      }
    }
  }

  if (config.reviewPolicies) {
    for (const entry of config.reviewPolicies) {
      const plugin = await loadPluginModule<IReviewPolicyPlugin>(entry.path);
      if (plugin) {
        try {
          registry.registerReviewPolicy(plugin);
        } catch (err) {
          console.error(`[PluginLoader] Failed to register review policy "${entry.name}":`, err);
        }
      }
    }
  }
}
