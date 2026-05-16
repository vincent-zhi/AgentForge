import { create } from 'zustand';
import type { ProjectFact, ModuleInfo, ProjectScanResult } from '@/types/core';

interface ProjectState {
  rootPath: string | null;
  scanResult: ProjectScanResult | null;
  facts: ProjectFact[];
  modules: ModuleInfo[];
  isScanning: boolean;
  error: string | null;
  setRootPath: (path: string) => void;
  setScanResult: (result: ProjectScanResult) => void;
  setFacts: (facts: ProjectFact[]) => void;
  setModules: (modules: ModuleInfo[]) => void;
  setScanning: (scanning: boolean) => void;
  setError: (error: string | null) => void;
  addFact: (fact: ProjectFact) => void;
  updateFact: (id: string, updates: Partial<ProjectFact>) => void;
  removeFact: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  rootPath: null,
  scanResult: null,
  facts: [],
  modules: [],
  isScanning: false,
  error: null,
  setRootPath: (path) => set({ rootPath: path }),
  setScanResult: (result) => set({ scanResult: result }),
  setFacts: (facts) => set({ facts }),
  setModules: (modules) => set({ modules }),
  setScanning: (scanning) => set({ isScanning: scanning }),
  setError: (error) => set({ error }),
  addFact: (fact) => set((state) => ({ facts: [...state.facts, fact] })),
  updateFact: (id, updates) => set((state) => ({
    facts: state.facts.map((f) => f.id === id ? { ...f, ...updates } : f),
  })),
  removeFact: (id) => set((state) => ({
    facts: state.facts.filter((f) => f.id !== id),
  })),
}));
