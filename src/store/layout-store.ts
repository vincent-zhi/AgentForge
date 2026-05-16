import { create } from 'zustand';

interface LayoutState {
  brainPanelWidth: number;
  hudPanelWidth: number;
  evidencePanelHeight: number;
  evidencePanelCollapsed: boolean;
  setBrainPanelWidth: (width: number) => void;
  setHudPanelWidth: (width: number) => void;
  setEvidencePanelHeight: (height: number) => void;
  toggleEvidencePanel: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  brainPanelWidth: 280,
  hudPanelWidth: 320,
  evidencePanelHeight: 200,
  evidencePanelCollapsed: false,
  setBrainPanelWidth: (width) => set({ brainPanelWidth: width }),
  setHudPanelWidth: (width) => set({ hudPanelWidth: width }),
  setEvidencePanelHeight: (height) => set({ evidencePanelHeight: height }),
  toggleEvidencePanel: () => set((state) => ({ evidencePanelCollapsed: !state.evidencePanelCollapsed })),
}));
