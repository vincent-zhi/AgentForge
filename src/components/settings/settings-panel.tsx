import React, { useState, useEffect, useCallback } from 'react';
import { bridge } from '@/ipc/bridge';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = 'model' | 'project' | 'teamRules' | 'appearance' | 'plugins';

const settingsTabs: { key: SettingsTab; label: string }[] = [
  { key: 'model', label: '模型配置' },
  { key: 'project', label: '项目偏好' },
  { key: 'teamRules', label: '团队规则' },
  { key: 'appearance', label: '外观' },
  { key: 'plugins', label: '插件' },
];

const MODEL_OPTIONS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('model');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('gpt-4');
  const [riskPaths, setRiskPaths] = useState('');
  const [commandWhitelist, setCommandWhitelist] = useState('');
  const [theme, setTheme] = useState('dark');
  const [forbiddenPatterns, setForbiddenPatterns] = useState('');
  const [allowedModels, setAllowedModels] = useState<string[]>(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']);
  const [maxCostPerTask, setMaxCostPerTask] = useState('10');
  const [maxContextSize, setMaxContextSize] = useState('128000');
  const [plugins, setPlugins] = useState<{
    analyzers: Array<{ name: string; version: string }>;
    contractExtractors: Array<{ name: string; version: string }>;
    testSelectors: Array<{ name: string; version: string }>;
    reviewPolicies: Array<{ name: string; version: string }>;
  }>({ analyzers: [], contractExtractors: [], testSelectors: [], reviewPolicies: [] });

  useEffect(() => {
    if (!open) return;
    bridge.settings.getAll().then((settings) => {
      setOpenaiApiKey(settings.openaiApiKey ?? '');
      setAnthropicApiKey(settings.anthropicApiKey ?? '');
      setDefaultModel(settings.defaultModel ?? 'gpt-4');
      setRiskPaths(settings.riskPaths ?? '');
      setCommandWhitelist(settings.commandWhitelist ?? '');
      setTheme(settings.theme ?? 'dark');
      setForbiddenPatterns(settings.forbiddenPatterns ?? '');
      try {
        const policy = settings.projectPolicy ? JSON.parse(settings.projectPolicy) : null;
        if (policy) {
          setRiskPaths(policy.riskPaths?.join('\n') ?? settings.riskPaths ?? '');
          setForbiddenPatterns(policy.forbiddenPatterns?.join('\n') ?? '');
          setCommandWhitelist(policy.commandWhitelist?.join('\n') ?? settings.commandWhitelist ?? '');
          if (policy.modelPermissions) {
            setAllowedModels(policy.modelPermissions.allowedModels ?? ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']);
            setMaxCostPerTask(String(policy.modelPermissions.maxCostPerTask ?? 10));
            setMaxContextSize(String(policy.modelPermissions.maxContextSize ?? 128000));
          }
        }
      } catch {}
    });

    bridge.settings.get('plugins').then((data: any) => {
      if (data) {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          setPlugins({
            analyzers: parsed.analyzers ?? [],
            contractExtractors: parsed.contractExtractors ?? [],
            testSelectors: parsed.testSelectors ?? [],
            reviewPolicies: parsed.reviewPolicies ?? [],
          });
        } catch {
          setPlugins({ analyzers: [], contractExtractors: [], testSelectors: [], reviewPolicies: [] });
        }
      }
    });
  }, [open]);

  const handleSave = useCallback(async () => {
    await bridge.settings.set('openaiApiKey', openaiApiKey);
    await bridge.settings.set('anthropicApiKey', anthropicApiKey);
    await bridge.settings.set('defaultModel', defaultModel);
    await bridge.settings.set('riskPaths', riskPaths);
    await bridge.settings.set('commandWhitelist', commandWhitelist);
    await bridge.settings.set('theme', theme);
    await bridge.settings.set('projectPolicy', JSON.stringify({
      riskPaths: riskPaths.split('\n').filter(Boolean),
      forbiddenPatterns: forbiddenPatterns.split('\n').filter(Boolean),
      commandWhitelist: commandWhitelist.split('\n').filter(Boolean),
      modelPermissions: {
        allowedModels,
        maxCostPerTask: parseFloat(maxCostPerTask) || 10,
        maxContextSize: parseInt(maxContextSize, 10) || 128000,
      },
    }));
    onClose();
  }, [openaiApiKey, anthropicApiKey, defaultModel, riskPaths, commandWhitelist, theme, forbiddenPatterns, allowedModels, maxCostPerTask, maxContextSize, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-forge-black/70" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-graphite border border-forged-steel/30 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span>设置</span>
          <button onClick={onClose} className="text-forged-steel hover:text-bright-steel transition-colors">✕</button>
        </div>

        <div className="flex shrink-0 border-b border-forged-steel/20">
          {settingsTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-xs whitespace-nowrap transition-colors duration-fast ${
                activeTab === tab.key
                  ? 'text-ember-orange border-b-2 border-ember-orange'
                  : 'text-forged-steel hover:text-bright-steel'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'model' && (
          <div>
            <h3 className="text-sm font-semibold text-bright-steel mb-3">模型配置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-gray mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className="input-field text-sm"
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-gray mb-1">Anthropic API Key</label>
                <input
                  type="password"
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  className="input-field text-sm"
                  placeholder="sk-ant-..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-gray mb-1">Default Model</label>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="input-field text-sm"
                >
                  {MODEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          )}

          {activeTab === 'project' && (
          <div>
            <h3 className="text-sm font-semibold text-bright-steel mb-3">项目偏好</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-gray mb-1">自定义风险路径</label>
                <textarea
                  value={riskPaths}
                  onChange={(e) => setRiskPaths(e.target.value)}
                  className="input-field text-sm min-h-[80px] resize-y"
                  placeholder="每行一个路径..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-gray mb-1">命令白名单</label>
                <textarea
                  value={commandWhitelist}
                  onChange={(e) => setCommandWhitelist(e.target.value)}
                  className="input-field text-sm min-h-[80px] resize-y"
                  placeholder="每行一个命令..."
                />
              </div>
            </div>
          </div>
          )}

          {activeTab === 'teamRules' && (
          <div>
            <h3 className="text-sm font-semibold text-bright-steel mb-3">团队规则</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-gray mb-1">自定义风险路径</label>
                <textarea
                  value={riskPaths}
                  onChange={(e) => setRiskPaths(e.target.value)}
                  className="input-field text-sm min-h-[80px] resize-y"
                  placeholder="每行一个路径..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-gray mb-1">禁止变更模式</label>
                <textarea
                  value={forbiddenPatterns}
                  onChange={(e) => setForbiddenPatterns(e.target.value)}
                  className="input-field text-sm min-h-[80px] resize-y"
                  placeholder="每行一个模式 (如 .env*, config/**)..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-gray mb-1">命令白名单</label>
                <textarea
                  value={commandWhitelist}
                  onChange={(e) => setCommandWhitelist(e.target.value)}
                  className="input-field text-sm min-h-[80px] resize-y"
                  placeholder="每行一个命令..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-gray mb-2">模型权限</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {MODEL_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-1.5 text-xs text-text-gray">
                        <input
                          type="checkbox"
                          checked={allowedModels.includes(opt.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedModels((prev) => [...prev, opt.value]);
                            } else {
                              setAllowedModels((prev) => prev.filter((m) => m !== opt.value));
                            }
                          }}
                          className="accent-ember-orange"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-forged-steel mb-1">Max Cost Per Task ($)</label>
                      <input
                        type="number"
                        value={maxCostPerTask}
                        onChange={(e) => setMaxCostPerTask(e.target.value)}
                        className="input-field text-sm"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-forged-steel mb-1">Max Context Size</label>
                      <input
                        type="number"
                        value={maxContextSize}
                        onChange={(e) => setMaxContextSize(e.target.value)}
                        className="input-field text-sm"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {activeTab === 'appearance' && (
          <div>
            <h3 className="text-sm font-semibold text-bright-steel mb-3">外观</h3>
            <div>
              <label className="block text-xs text-text-gray mb-1">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="input-field text-sm"
              >
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
          )}

          {activeTab === 'plugins' && (
          <div>
            <h3 className="text-sm font-semibold text-bright-steel mb-3">插件管理</h3>
            <p className="text-xs text-forged-steel mb-4">在项目根目录的 .agentforge/plugins.json 中配置插件</p>
            <div className="space-y-4">
              {([
                { label: 'Analyzers', items: plugins.analyzers, badge: 'analyzer' },
                { label: 'Contract Extractors', items: plugins.contractExtractors, badge: 'contract' },
                { label: 'Test Selectors', items: plugins.testSelectors, badge: 'test' },
                { label: 'Review Policies', items: plugins.reviewPolicies, badge: 'review' },
              ] as const).map((group) => (
                <div key={group.label}>
                  <h4 className="text-xs font-medium text-bright-steel mb-2">{group.label}</h4>
                  {group.items.length === 0 ? (
                    <p className="text-xs text-forged-steel">暂无已注册的插件</p>
                  ) : (
                    <div className="space-y-1.5">
                      {group.items.map((plugin) => (
                        <div key={plugin.name} className="flex items-center gap-2 px-3 py-1.5 bg-forge-black/40 rounded border border-forged-steel/20">
                          <span className="text-xs text-bright-steel">{plugin.name}</span>
                          <span className="text-[10px] text-forged-steel">v{plugin.version}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-ember-orange/20 text-ember-orange">{group.badge}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-forged-steel/20">
          <button onClick={onClose} className="btn-secondary text-sm">取消</button>
          <button onClick={handleSave} className="btn-primary text-sm">保存</button>
        </div>
      </div>
    </div>
  );
};
