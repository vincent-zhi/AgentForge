import React, { useState, useEffect, useCallback } from 'react';
import { bridge } from '@/ipc/bridge';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const MODEL_OPTIONS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('gpt-4');
  const [riskPaths, setRiskPaths] = useState('');
  const [commandWhitelist, setCommandWhitelist] = useState('');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (!open) return;
    bridge.settings.getAll().then((settings) => {
      setOpenaiApiKey(settings.openaiApiKey ?? '');
      setAnthropicApiKey(settings.anthropicApiKey ?? '');
      setDefaultModel(settings.defaultModel ?? 'gpt-4');
      setRiskPaths(settings.riskPaths ?? '');
      setCommandWhitelist(settings.commandWhitelist ?? '');
      setTheme(settings.theme ?? 'dark');
    });
  }, [open]);

  const handleSave = useCallback(async () => {
    await bridge.settings.set('openaiApiKey', openaiApiKey);
    await bridge.settings.set('anthropicApiKey', anthropicApiKey);
    await bridge.settings.set('defaultModel', defaultModel);
    await bridge.settings.set('riskPaths', riskPaths);
    await bridge.settings.set('commandWhitelist', commandWhitelist);
    await bridge.settings.set('theme', theme);
    onClose();
  }, [openaiApiKey, anthropicApiKey, defaultModel, riskPaths, commandWhitelist, theme, onClose]);

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

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
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
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-forged-steel/20">
          <button onClick={onClose} className="btn-secondary text-sm">取消</button>
          <button onClick={handleSave} className="btn-primary text-sm">保存</button>
        </div>
      </div>
    </div>
  );
};
