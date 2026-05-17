import { create } from 'zustand';
import type { ProjectFact, ModuleInfo, ProjectScanResult } from '@/types/core';
import { bridge } from '@/ipc/bridge';

export interface TreeNode {
  id: string;
  label: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  path: string;
  size?: number;
}

interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
}

interface ProjectBrainState {
  facts: ProjectFact[];
  modules: ModuleInfo[];
  scanResult: ProjectScanResult | null;
}

interface ProjectState {
  rootPath: string | null;
  scanResult: ProjectScanResult | null;
  facts: ProjectFact[];
  modules: ModuleInfo[];
  isScanning: boolean;
  isInitialized: boolean;
  recentProjects: RecentProject[];
  allProjectStates: Map<string, ProjectBrainState>;
  error: string | null;
  fileTree: TreeNode | null;
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
  removeRecentProject: (path: string) => void;
  loadRecentProjects: () => Promise<void>;
  saveCurrentProjectState: () => void;
  switchProject: (projectPath: string) => Promise<void>;
  openProject: (path: string) => Promise<void>;
  setFileTree: (tree: TreeNode | null) => void;
  loadFileTree: (projectPath: string) => Promise<void>;
}

function persistRecentProjects(projects: RecentProject[]): void {
  try {
    bridge.project.saveRecentProjects(JSON.stringify(projects));
  } catch {}
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  rootPath: null,
  scanResult: null,
  facts: [],
  modules: [],
  isScanning: false,
  isInitialized: false,
  recentProjects: [],
  allProjectStates: new Map(),
  error: null,
  fileTree: null,
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
    persistRecentProjects(updated);
    return { recentProjects: updated };
  }),
  removeRecentProject: (path) => set((state) => {
    const updated = state.recentProjects.filter((p) => p.path !== path);
    persistRecentProjects(updated);
    return { recentProjects: updated };
  }),
  loadRecentProjects: async () => {
    try {
      const data = await bridge.project.getRecentProjects() as RecentProject[];
      set({ recentProjects: Array.isArray(data) ? data : [] });
    } catch {}
  },
  saveCurrentProjectState: () => {
    const { rootPath, facts, modules, scanResult, allProjectStates } = get();
    if (!rootPath) return;
    const updated = new Map(allProjectStates);
    updated.set(rootPath, { facts, modules, scanResult });
    set({ allProjectStates: updated });
  },
  switchProject: async (projectPath: string) => {
    const { rootPath, saveCurrentProjectState } = get();
    if (rootPath === projectPath) return;
    saveCurrentProjectState();
    set({ isScanning: true, error: null });
    try {
      const savedState = get().allProjectStates.get(projectPath);
      if (savedState) {
        set({
          rootPath: projectPath,
          scanResult: savedState.scanResult,
          modules: savedState.modules,
          facts: savedState.facts,
          isScanning: false,
          isInitialized: true,
        });
        get().loadFileTree(projectPath);
        if (savedState.scanResult) {
          get().addRecentProject(projectPath, savedState.scanResult.name);
        }
      } else {
        const result = await bridge.project.scan(projectPath) as ProjectScanResult;
        const modules = await bridge.project.getModules(projectPath) as ModuleInfo[];
        const facts = await bridge.project.getFacts() as ProjectFact[];
        get().addRecentProject(projectPath, result.name);
        set({
          rootPath: projectPath,
          scanResult: result,
          modules,
          facts,
          isScanning: false,
          isInitialized: true,
        });
        get().loadFileTree(projectPath);
      }
    } catch (err) {
      set({
        isScanning: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
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
      get().loadFileTree(path);
    } catch (err) {
      set({
        isScanning: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
  setFileTree: (tree) => set({ fileTree: tree }),
  loadFileTree: async (projectPath: string) => {
    try {
      const tree = await bridge.project.getFileTree(projectPath) as TreeNode | null;
      set({ fileTree: tree });
    } catch {}
  },
}));
