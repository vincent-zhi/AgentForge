import { create } from 'zustand';
import type { TaskCapsule, TaskStatus, ImpactMap, ReviewPacket, MemoryUpdateProposal } from '@/types/core';

interface TaskState {
  tasks: TaskCapsule[];
  currentTaskId: string | null;
  impactMap: ImpactMap | null;
  reviewPacket: ReviewPacket | null;
  memoryProposals: MemoryUpdateProposal[];
  isCreating: boolean;
  isExecuting: boolean;
  error: string | null;
  currentStep: string | null;
  planCapsule: TaskCapsule | null;
  setTasks: (tasks: TaskCapsule[]) => void;
  setCurrentTask: (id: string | null) => void;
  setImpactMap: (map: ImpactMap | null) => void;
  setReviewPacket: (packet: ReviewPacket | null) => void;
  setMemoryProposals: (proposals: MemoryUpdateProposal[]) => void;
  setCreating: (creating: boolean) => void;
  setExecuting: (executing: boolean) => void;
  setError: (error: string | null) => void;
  addTask: (task: TaskCapsule) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  setCurrentStep: (step: string | null) => void;
  setPlanCapsule: (capsule: TaskCapsule | null) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  currentTaskId: null,
  impactMap: null,
  reviewPacket: null,
  memoryProposals: [],
  isCreating: false,
  isExecuting: false,
  error: null,
  currentStep: null,
  planCapsule: null,
  setTasks: (tasks) => set({ tasks }),
  setCurrentTask: (id) => set({ currentTaskId: id }),
  setImpactMap: (map) => set({ impactMap: map }),
  setReviewPacket: (packet) => set({ reviewPacket: packet, memoryProposals: packet?.memoryUpdates || [] }),
  setMemoryProposals: (proposals) => set({ memoryProposals: proposals }),
  setCreating: (creating) => set({ isCreating: creating }),
  setExecuting: (executing) => set({ isExecuting: executing }),
  setError: (error) => set({ error }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTaskStatus: (id, status) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t),
  })),
  setCurrentStep: (step) => set({ currentStep: step }),
  setPlanCapsule: (capsule) => set({ planCapsule: capsule }),
}));
