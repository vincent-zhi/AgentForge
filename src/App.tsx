import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { WorkbenchLayout } from '@/components/workbench';
import { WelcomeScreen } from '@/components/welcome';
import { SettingsPanel } from '@/components/settings';
import { CommandPalette, ToastContainer } from '@/components/ui';
import { useProjectStore } from '@/store/project-store';
import { useLayoutStore } from '@/store/layout-store';
import { initializeEventListeners, cleanupEventListeners } from '@/ipc/event-listener';
import { bridge } from '@/ipc/bridge';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

const COMMANDS = [
  { id: 'open-project', label: '打开项目', shortcut: 'Ctrl+O', category: '项目' },
  { id: 'submit-goal', label: '提交目标', shortcut: 'Ctrl+Enter', category: '项目' },
  { id: 'toggle-brain', label: '切换脑图面板', shortcut: 'Ctrl+B', category: '视图' },
  { id: 'toggle-evidence', label: '切换证据面板', shortcut: 'Ctrl+J', category: '视图' },
  { id: 'focus-brain', label: '聚焦脑图面板', shortcut: 'Ctrl+1', category: '视图' },
  { id: 'focus-editor', label: '聚焦编辑器面板', shortcut: 'Ctrl+2', category: '视图' },
  { id: 'focus-hud', label: '聚焦HUD面板', shortcut: 'Ctrl+3', category: '视图' },
  { id: 'open-settings', label: '打开设置', shortcut: 'Ctrl+,', category: '设置' },
];

const App: React.FC = () => {
  const isInitialized = useProjectStore((s) => s.isInitialized);
  const openProject = useProjectStore((s) => s.openProject);
  const toggleEvidencePanel = useLayoutStore((s) => s.toggleEvidencePanel);
  const toggleSearchPanel = useLayoutStore((s) => s.toggleSearchPanel);
  const setBrainPanelWidth = useLayoutStore((s) => s.setBrainPanelWidth);
  const brainPanelWidth = useLayoutStore((s) => s.brainPanelWidth);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    initializeEventListeners();
    return () => {
      cleanupEventListeners();
    };
  }, []);

  const handleOpenProject = useCallback(async () => {
    try {
      const result = await bridge.project.open() as any;
      if (result?.filePaths?.[0]) {
        await openProject(result.filePaths[0]);
      }
    } catch {}
  }, [openProject]);

  const handleSubmitGoal = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('input[placeholder="你想让这个项目发生什么变化？"]');
    if (input) {
      input.focus();
    }
  }, []);

  const handleToggleBrain = useCallback(() => {
    setBrainPanelWidth(brainPanelWidth > 0 ? 0 : 280);
  }, [brainPanelWidth, setBrainPanelWidth]);

  const handleFocusPanel = useCallback((_panel: number) => {}, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const keyboardCallbacks = useMemo(() => ({
    onOpenProject: handleOpenProject,
    onSubmitGoal: handleSubmitGoal,
    onCommandPalette: () => setCommandPaletteOpen((prev) => !prev),
    onToggleBrain: handleToggleBrain,
    onToggleEvidence: toggleEvidencePanel,
    onFocusPanel: handleFocusPanel,
    onOpenSettings: handleOpenSettings,
    onToggleSearch: toggleSearchPanel,
  }), [handleOpenProject, handleSubmitGoal, handleToggleBrain, toggleEvidencePanel, handleFocusPanel, handleOpenSettings, toggleSearchPanel]);

  useKeyboardShortcuts(keyboardCallbacks);

  return (
    <div className="h-full">
      {isInitialized ? <WorkbenchLayout /> : <WelcomeScreen />}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={COMMANDS}
      />
      <ToastContainer />
    </div>
  );
};

export default App;
