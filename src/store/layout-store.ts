import { create } from 'zustand';

interface LayoutState {
  brainPanelWidth: number;
  hudPanelWidth: number;
  evidencePanelHeight: number;
  evidencePanelCollapsed: boolean;
  searchPanelOpen: boolean;
  activePanel: string;
  setBrainPanelWidth: (width: number) => void;
  setHudPanelWidth: (width: number) => void;
  setEvidencePanelHeight: (height: number) => void;
  toggleEvidencePanel: () => void;
  toggleSearchPanel: () => void;
  setSearchPanelOpen: (open: boolean) => void;
  setActivePanel: (panel: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  brainPanelWidth: 280,
  hudPanelWidth: 320,
  evidencePanelHeight: 200,
  evidencePanelCollapsed: false,
  searchPanelOpen: false,
  activePanel: 'brain',
  setBrainPanelWidth: (width) => set({ brainPanelWidth: width }),
  setHudPanelWidth: (width) => set({ hudPanelWidth: width }),
  setEvidencePanelHeight: (height) => set({ evidencePanelHeight: height }),
  toggleEvidencePanel: () => set((state) => ({ evidencePanelCollapsed: !state.evidencePanelCollapsed })),
  toggleSearchPanel: () => set((state) => ({ searchPanelOpen: !state.searchPanelOpen })),
  setSearchPanelOpen: (open) => set({ searchPanelOpen: open }),
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
