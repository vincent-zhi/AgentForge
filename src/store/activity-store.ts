import { create } from 'zustand';

export interface ActivityEvent {
  id: string;
  type: 'agent' | 'task' | 'risk' | 'system';
  title: string;
  description: string;
  timestamp: number;
  source: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  relatedPanel?: string;
  relatedId?: string;
  read: boolean;
}

const MAX_EVENTS = 100;

interface ActivityState {
  events: ActivityEvent[];
  filter: 'all' | 'agent' | 'task' | 'risk' | 'system';
  unreadCount: number;
  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (eventId: string) => void;
  markAllAsRead: () => void;
  clearEvents: () => void;
  setFilter: (filter: ActivityState['filter']) => void;
  removeEvent: (eventId: string) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  events: [],
  filter: 'all',
  unreadCount: 0,
  addEvent: (event) =>
    set((state) => {
      const newEvent: ActivityEvent = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        read: false,
      };
      const updated = [newEvent, ...state.events].slice(0, MAX_EVENTS);
      return {
        events: updated,
        unreadCount: updated.filter((e) => !e.read).length,
      };
    }),
  markAsRead: (eventId) =>
    set((state) => {
      const updated = state.events.map((e) =>
        e.id === eventId ? { ...e, read: true } : e,
      );
      return {
        events: updated,
        unreadCount: updated.filter((e) => !e.read).length,
      };
    }),
  markAllAsRead: () =>
    set((state) => ({
      events: state.events.map((e) => ({ ...e, read: true })),
      unreadCount: 0,
    })),
  clearEvents: () => set({ events: [], unreadCount: 0 }),
  setFilter: (filter) => set({ filter }),
  removeEvent: (eventId) =>
    set((state) => {
      const updated = state.events.filter((e) => e.id !== eventId);
      return {
        events: updated,
        unreadCount: updated.filter((e) => !e.read).length,
      };
    }),
}));
