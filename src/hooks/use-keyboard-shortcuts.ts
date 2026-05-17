import { useEffect } from 'react';

interface KeyboardShortcutCallbacks {
  onOpenProject: () => void;
  onSubmitGoal: () => void;
  onCommandPalette: () => void;
  onToggleBrain: () => void;
  onToggleEvidence: () => void;
  onFocusPanel: (panel: number) => void;
  onOpenSettings: () => void;
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        callbacks.onOpenProject();
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        callbacks.onSubmitGoal();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        callbacks.onCommandPalette();
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
        e.preventDefault();
        callbacks.onToggleBrain();
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'j') {
        e.preventDefault();
        callbacks.onToggleEvidence();
      } else if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        callbacks.onFocusPanel(1);
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        callbacks.onFocusPanel(2);
      } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        callbacks.onFocusPanel(3);
      } else if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        callbacks.onOpenSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
}
