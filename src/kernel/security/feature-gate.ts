import type { FeatureTier, FeatureName } from '@/types/core';
import { SettingsService } from '../settings/settings-service';

const TIER_HIERARCHY: Record<FeatureTier, number> = {
  free: 0,
  pro: 1,
  team: 2,
  enterprise: 3,
};

const FEATURE_GATE_MAP: Record<FeatureName, FeatureTier> = {
  project_brain: 'free',
  impact_guard: 'free',
  single_agent: 'free',
  multi_agent: 'pro',
  context_lease: 'pro',
  evidence_review: 'pro',
  worktree_sandbox: 'pro',
  team_brain: 'team',
  pr_integration: 'team',
  team_policy: 'team',
  agent_audit: 'team',
  custom_agent: 'enterprise',
  private_model: 'enterprise',
  sso: 'enterprise',
  rbac: 'enterprise',
};

const TIER_SETTINGS_KEY = 'feature_tier';

export class FeatureGateService {
  private settingsService: SettingsService;

  constructor(settingsService?: SettingsService) {
    this.settingsService = settingsService || new SettingsService();
  }

  checkAccess(feature: FeatureName, tier: FeatureTier): boolean {
    const requiredTier = FEATURE_GATE_MAP[feature];
    return TIER_HIERARCHY[tier] >= TIER_HIERARCHY[requiredTier];
  }

  getUpgradeMessage(feature: FeatureName): string {
    const requiredTier = FEATURE_GATE_MAP[feature];
    return `Feature "${feature}" requires ${requiredTier} tier or above. Upgrade to unlock this feature.`;
  }

  async getCurrentTier(): Promise<FeatureTier> {
    const stored = await this.settingsService.get(TIER_SETTINGS_KEY);
    if (stored && stored in TIER_HIERARCHY) {
      return stored as FeatureTier;
    }
    return 'free';
  }

  async setCurrentTier(tier: FeatureTier): Promise<void> {
    await this.settingsService.set(TIER_SETTINGS_KEY, tier);
  }
}
