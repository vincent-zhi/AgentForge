import { SettingsService } from '../settings/settings-service';
import { ModelPermissionPolicy } from '../../types/core';

export interface ProjectPolicy {
  riskPaths: string[];
  forbiddenPatterns: string[];
  commandWhitelist: string[];
  modelPermissions: {
    allowedModels: string[];
    maxCostPerTask: number;
    maxContextSize: number;
    localOnlyPaths: string[];
    allowThirdParty: boolean;
  };
}

const DEFAULT_POLICY: ProjectPolicy = {
  riskPaths: [],
  forbiddenPatterns: [],
  commandWhitelist: ['git', 'npm', 'pnpm', 'yarn', 'bun', 'node', 'npx', 'tsc', 'eslint', 'jest', 'vitest'],
  modelPermissions: {
    allowedModels: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'],
    maxCostPerTask: 10,
    maxContextSize: 128000,
    localOnlyPaths: [],
    allowThirdParty: true,
  },
};

export class PolicyManager {
  private settingsService: SettingsService;

  constructor(settingsService?: SettingsService) {
    this.settingsService = settingsService || new SettingsService();
  }

  async getPolicy(): Promise<ProjectPolicy> {
    try {
      const raw = await this.settingsService.get('projectPolicy');
      if (!raw) return { ...DEFAULT_POLICY };
      const parsed = JSON.parse(raw);
      return {
        riskPaths: parsed.riskPaths ?? DEFAULT_POLICY.riskPaths,
        forbiddenPatterns: parsed.forbiddenPatterns ?? DEFAULT_POLICY.forbiddenPatterns,
        commandWhitelist: parsed.commandWhitelist ?? DEFAULT_POLICY.commandWhitelist,
        modelPermissions: {
          allowedModels: parsed.modelPermissions?.allowedModels ?? DEFAULT_POLICY.modelPermissions.allowedModels,
          maxCostPerTask: parsed.modelPermissions?.maxCostPerTask ?? DEFAULT_POLICY.modelPermissions.maxCostPerTask,
          maxContextSize: parsed.modelPermissions?.maxContextSize ?? DEFAULT_POLICY.modelPermissions.maxContextSize,
          localOnlyPaths: parsed.modelPermissions?.localOnlyPaths ?? DEFAULT_POLICY.modelPermissions.localOnlyPaths,
          allowThirdParty: parsed.modelPermissions?.allowThirdParty ?? DEFAULT_POLICY.modelPermissions.allowThirdParty,
        },
      };
    } catch {
      return { ...DEFAULT_POLICY };
    }
  }

  async updatePolicy(policy: Partial<ProjectPolicy>): Promise<void> {
    const current = await this.getPolicy();
    const updated: ProjectPolicy = {
      riskPaths: policy.riskPaths ?? current.riskPaths,
      forbiddenPatterns: policy.forbiddenPatterns ?? current.forbiddenPatterns,
      commandWhitelist: policy.commandWhitelist ?? current.commandWhitelist,
      modelPermissions: {
        allowedModels: policy.modelPermissions?.allowedModels ?? current.modelPermissions.allowedModels,
        maxCostPerTask: policy.modelPermissions?.maxCostPerTask ?? current.modelPermissions.maxCostPerTask,
        maxContextSize: policy.modelPermissions?.maxContextSize ?? current.modelPermissions.maxContextSize,
        localOnlyPaths: policy.modelPermissions?.localOnlyPaths ?? current.modelPermissions.localOnlyPaths,
        allowThirdParty: policy.modelPermissions?.allowThirdParty ?? current.modelPermissions.allowThirdParty,
      },
    };
    await this.settingsService.set('projectPolicy', JSON.stringify(updated));
  }

  isPathForbidden(filePath: string, policy: ProjectPolicy): boolean {
    return policy.forbiddenPatterns.some((pattern) => {
      if (pattern === filePath) return true;
      const regexStr = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '{{DOUBLESTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/{{DOUBLESTAR}}/g, '.*');
      try {
        return new RegExp(`^${regexStr}$`).test(filePath);
      } catch {
        return pattern === filePath;
      }
    });
  }

  isCommandAllowed(command: string, policy: ProjectPolicy): boolean {
    const baseCommand = command.trim().split(/\s+/)[0];
    return policy.commandWhitelist.some((allowed) => {
      if (allowed === baseCommand) return true;
      return baseCommand.endsWith(`/${allowed}`);
    });
  }

  async getModelPermissionPolicy(): Promise<ModelPermissionPolicy> {
    const policy = await this.getPolicy();
    return {
      allowedModels: policy.modelPermissions.allowedModels,
      localOnlyPaths: policy.modelPermissions.localOnlyPaths,
      maxCostPerTask: policy.modelPermissions.maxCostPerTask,
      allowThirdParty: policy.modelPermissions.allowThirdParty,
      maxContextSize: policy.modelPermissions.maxContextSize,
    };
  }

  async setModelPermissionPolicy(modelPolicy: ModelPermissionPolicy): Promise<void> {
    await this.updatePolicy({
      modelPermissions: {
        allowedModels: modelPolicy.allowedModels,
        localOnlyPaths: modelPolicy.localOnlyPaths,
        maxCostPerTask: modelPolicy.maxCostPerTask,
        allowThirdParty: modelPolicy.allowThirdParty,
        maxContextSize: modelPolicy.maxContextSize,
      },
    });
  }
}
