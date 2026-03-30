import { create } from "zustand";
import { api } from "../services/api";
import type { TradeShowEvent, Encounter, EventReport } from "../types";

interface EventState {
  events: TradeShowEvent[];
  activeEvent: TradeShowEvent | null;
  encounters: Encounter[];
  report: EventReport | null;
  isLoading: boolean;
  error: string | null;

  // Event actions
  fetchEvents: (params?: { status?: string }) => Promise<void>;
  fetchEvent: (id: string) => Promise<void>;
  setActiveEvent: (event: TradeShowEvent | null) => void;
  createEvent: (data: Partial<TradeShowEvent>) => Promise<TradeShowEvent>;
  updateEvent: (id: string, data: Partial<TradeShowEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Encounter actions
  fetchEncounters: (eventId: string, filters?: any) => Promise<void>;
  createEncounter: (eventId: string, data: Partial<Encounter>) => Promise<Encounter>;
  updateEncounter: (id: string, data: Partial<Encounter>) => Promise<void>;
  deleteEncounter: (id: string) => Promise<void>;

  // Sync & Report
  syncEncounter: (id: string) => Promise<void>;
  bulkSync: (eventId: string) => Promise<{ synced: number; failed: number }>;
  fetchReport: (eventId: string) => Promise<void>;

  clearError: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  activeEvent: null,
  encounters: [],
  report: null,
  isLoading: false,
  error: null,

  // ─── Events ──────────────────────────────────────────────────────

  fetchEvents: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { events } = await api.listEvents(params);
      set({ events, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchEvent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { event } = await api.getEvent(id);
      set({ activeEvent: event, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setActiveEvent: (event) => set({ activeEvent: event }),

  createEvent: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { event } = await api.createEvent(data);
      set((state) => ({
        events: [event, ...state.events],
        isLoading: false,
      }));
      return event;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateEvent: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const { event } = await api.updateEvent(id, data);
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? event : e)),
        activeEvent: state.activeEvent?.id === id ? event : state.activeEvent,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteEvent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteEvent(id);
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        activeEvent: state.activeEvent?.id === id ? null : state.activeEvent,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  // ─── Encounters ──────────────────────────────────────────────────

  fetchEncounters: async (eventId, filters) => {
    set({ isLoading: true, error: null });
    try {
      const { encounters } = await api.listEncounters(eventId, filters);
      set({ encounters, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createEncounter: async (eventId, data) => {
    set({ isLoading: true, error: null });
    try {
      const { encounter } = await api.createEncounter(eventId, data);
      set((state) => ({
        encounters: [encounter, ...state.encounters],
        isLoading: false,
      }));
      return encounter;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateEncounter: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const { encounter } = await api.updateEncounter(id, data);
      set((state) => ({
        encounters: state.encounters.map((e) => (e.id === id ? encounter : e)),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteEncounter: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteEncounter(id);
      set((state) => ({
        encounters: state.encounters.filter((e) => e.id !== id),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  // ─── Sync & Report ──────────────────────────────────────────────

  syncEncounter: async (id) => {
    try {
      const { encounter } = await api.syncEncounter(id);
      set((state) => ({
        encounters: state.encounters.map((e) => (e.id === id ? encounter : e)),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  bulkSync: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.bulkSync(eventId);
      // Re-fetch encounters after sync
      await get().fetchEncounters(eventId);
      set({ isLoading: false });
      return result;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  fetchReport: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      const { report } = await api.getEventReport(eventId);
      set({ report, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
