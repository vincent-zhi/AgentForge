import { create } from 'zustand';
import type { ContextLease, BlackboardEvent, EvidenceEntry, AgentRole } from '@/types/core';

interface AgentInfo {
  id: string;
  role: AgentRole;
  status: 'idle' | 'running' | 'completed' | 'failed';
  leaseId?: string;
}

interface AgentState {
  agents: AgentInfo[];
  leases: ContextLease[];
  timeline: BlackboardEvent[];
  evidenceStack: EvidenceEntry[];
  isRunning: boolean;
  setAgents: (agents: AgentInfo[]) => void;
  setLeases: (leases: ContextLease[]) => void;
  setTimeline: (events: BlackboardEvent[]) => void;
  setEvidenceStack: (entries: EvidenceEntry[]) => void;
  setRunning: (running: boolean) => void;
  addAgent: (agent: AgentInfo) => void;
  updateAgentStatus: (id: string, status: AgentInfo['status']) => void;
  addTimelineEvent: (event: BlackboardEvent) => void;
  addEvidence: (entry: EvidenceEntry) => void;
  addLease: (lease: ContextLease) => void;
  updateLeaseStatus: (id: string, status: ContextLease['status']) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  leases: [],
  timeline: [],
  evidenceStack: [],
  isRunning: false,
  setAgents: (agents) => set({ agents }),
  setLeases: (leases) => set({ leases }),
  setTimeline: (events) => set({ timeline: events }),
  setEvidenceStack: (entries) => set({ evidenceStack: entries }),
  setRunning: (running) => set({ isRunning: running }),
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
  updateAgentStatus: (id, status) => set((state) => ({
    agents: state.agents.map((a) => a.id === id ? { ...a, status } : a),
  })),
  addTimelineEvent: (event) => set((state) => ({
    timeline: [...state.timeline, event],
  })),
  addEvidence: (entry) => set((state) => ({
    evidenceStack: [...state.evidenceStack, entry],
  })),
  addLease: (lease) => set((state) => ({
    leases: [...state.leases, lease],
  })),
  updateLeaseStatus: (id, status) => set((state) => ({
    leases: state.leases.map((l) => l.id === id ? { ...l, status } : l),
  })),
}));
