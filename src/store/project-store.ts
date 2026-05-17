import { create } from 'zustand';
import type { ProjectFact, ModuleInfo, ProjectScanResult } from '@/types/core';
import { bridge } from '@/ipc/bridge';

interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
}

interface ProjectState {
  rootPath: string | null;
  scanResult: ProjectScanResult | null;
  facts: ProjectFact[];
  modules: ModuleInfo[];
  isScanning: boolean;
  isInitialized: boolean;
  recentProjects: RecentProject[];
  error: string | null;
  setRootPath: (path: string) => void;
  setScanResult: (result: ProjectScanResult) => void;
  setFacts: (facts: ProjectFact[]) => void;
  setModules: (modules: ModuleInfo[]) => void;
  setScanning: (scanning: boolean) => void;
  setInitialized: (val: boolean) => void;
  setError: (error: string | null) => void;
  addFact: (fact: ProjectFact) => void;
  updateFact: (id: string, updates: Partial<ProjectFact>) => void;
  removeFact: (id: string) => void;
  addRecentProject: (path: string, name: string) => void;
  openProject: (path: string) => Promise<void>;
}

const RECENT_PROJECTS_KEY = 'agentforge:recentProjects';

function loadRecentProjects(): RecentProject[] {
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentProjects(projects: RecentProject[]): void {
  try {
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
  } catch {}
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  rootPath: null,
  scanResult: null,
  facts: [],
  modules: [],
  isScanning: false,
  isInitialized: false,
  recentProjects: loadRecentProjects(),
  error: null,
  setRootPath: (path) => set({ rootPath: path }),
  setScanResult: (result) => set({ scanResult: result }),
  setFacts: (facts) => set({ facts }),
  setModules: (modules) => set({ modules }),
  setScanning: (scanning) => set({ isScanning: scanning }),
  setInitialized: (val) => set({ isInitialized: val }),
  setError: (error) => set({ error }),
  addFact: (fact) => set((state) => ({ facts: [...state.facts, fact] })),
  updateFact: (id, updates) => set((state) => ({
    facts: state.facts.map((f) => f.id === id ? { ...f, ...updates } : f),
  })),
  removeFact: (id) => set((state) => ({
    facts: state.facts.filter((f) => f.id !== id),
  })),
  addRecentProject: (path, name) => set((state) => {
    const filtered = state.recentProjects.filter((p) => p.path !== path);
    const updated = [{ path, name, lastOpened: new Date().toISOString() }, ...filtered].slice(0, 5);
    saveRecentProjects(updated);
    return { recentProjects: updated };
  }),
  openProject: async (path: string) => {
    set({ isScanning: true, error: null });
    try {
      const result = await bridge.project.scan(path) as ProjectScanResult;
      const modules = await bridge.project.getModules(path) as ModuleInfo[];
      const facts = await bridge.project.getFacts() as ProjectFact[];
      get().addRecentProject(path, result.name);
      set({
        rootPath: path,
        scanResult: result,
        modules,
        facts,
        isScanning: false,
        isInitialized: true,
      });
    } catch (err) {
      set({
        isScanning: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
}));
