import { create } from 'zustand';
import { bridge } from '@/ipc/bridge';

interface EditorTab {
  id: string;
  path: string;
  name: string;
  modified: boolean;
}

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;
  contents: Map<string, string>;
  openFile: (filePath: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  saveFile: (id: string) => Promise<void>;
}

function fileNameFromPath(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}

function generateId(filePath: string): string {
  return filePath;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  contents: new Map(),

  openFile: (filePath: string) => {
    const id = generateId(filePath);
    const state = get();
    const existing = state.tabs.find((t) => t.id === id);
    if (existing) {
      set({ activeTabId: id });
      return;
    }
    const name = fileNameFromPath(filePath);
    const newTab: EditorTab = { id, path: filePath, name, modified: false };
    set({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    });
    bridge.file.read(filePath).then((content) => {
      set((s) => {
        const next = new Map(s.contents);
        next.set(filePath, content);
        return { contents: next };
      });
    }).catch(() => {
      set((s) => {
        const next = new Map(s.contents);
        next.set(filePath, '');
        return { contents: next };
      });
    });
  },

  closeTab: (id: string) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      const nextTabs = state.tabs.filter((t) => t.id !== id);
      let nextActive = state.activeTabId;
      if (state.activeTabId === id) {
        if (nextTabs.length === 0) {
          nextActive = null;
        } else if (idx > 0) {
          nextActive = nextTabs[idx - 1].id;
        } else {
          nextActive = nextTabs[0].id;
        }
      }
      return { tabs: nextTabs, activeTabId: nextActive };
    });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  updateContent: (id: string, content: string) => {
    set((state) => {
      const nextContents = new Map(state.contents);
      const tab = state.tabs.find((t) => t.id === id);
      if (tab) {
        nextContents.set(tab.path, content);
      }
      const nextTabs = state.tabs.map((t) =>
        t.id === id ? { ...t, modified: true } : t
      );
      return { tabs: nextTabs, contents: nextContents };
    });
  },

  saveFile: async (id: string) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === id);
    if (!tab) return;
    const content = state.contents.get(tab.path) ?? '';
    try {
      await bridge.file.write(tab.path, content);
      set((s) => ({
        tabs: s.tabs.map((t) => (t.id === id ? { ...t, modified: false } : t)),
      }));
    } catch {
      // swallow write errors
    }
  },
}));
