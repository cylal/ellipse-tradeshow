import { create } from "zustand";
import { api, ApiError } from "../services/api";
import type { TradeShowEvent, Encounter, EventReport } from "../types";

// Generate a simple unique ID for offline mode
const generateId = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

interface OcrScanResult {
  parsed: {
    name?: string;
    company?: string;
    title?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  rawText: string;
  photoUri?: string;
  photoType: "badge" | "business_card";
}

export interface AudioResult {
  audioUrl: string;
  transcript: string;
  summary?: string;
  keyTopics?: string[];
  actionItems?: string[];
  sentiment?: string;
  followUpSuggestion?: string;
  memo?: string;
  duration?: number;
  mode: "live" | "dictation";
}

interface EventState {
  events: TradeShowEvent[];
  activeEvent: TradeShowEvent | null;
  encounters: Encounter[];
  report: EventReport | null;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  pendingOcrResult: OcrScanResult | null;
  pendingAudioResult: AudioResult | null;
  pendingPortraitUrl: string | null;

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

  // OCR & Audio & Portrait
  setPendingOcrResult: (result: OcrScanResult | null) => void;
  setPendingAudioResult: (result: AudioResult | null) => void;
  setPendingPortraitUrl: (url: string | null) => void;

  clearError: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  activeEvent: null,
  encounters: [],
  report: null,
  isLoading: false,
  isOffline: false,
  error: null,
  pendingOcrResult: null,
  pendingAudioResult: null,
  pendingPortraitUrl: null,

  // ─── Events ──────────────────────────────────────────────────────

  fetchEvents: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { events } = await api.listEvents(params);
      set({ events, isLoading: false, isOffline: false });
    } catch (err: any) {
      // In offline mode, just show local events
      set({ isLoading: false, isOffline: true });
    }
  },

  fetchEvent: async (id) => {
    // Check local first
    const local = get().events.find((e) => e.id === id);
    if (local) {
      set({ activeEvent: local });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const { event } = await api.getEvent(id);
      set({ activeEvent: event, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
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
        isOffline: false,
      }));
      return event;
    } catch (err: any) {
      // Offline fallback: create locally
      const now = new Date().toISOString();
      const localEvent: TradeShowEvent = {
        id: generateId(),
        name: data.name || "Untitled",
        location: data.location,
        startDate: data.startDate || now,
        endDate: data.endDate || now,
        boothNumber: data.boothNumber,
        description: data.description,
        region: data.region || "EMEA",
        status: "upcoming",
        encounterCount: 0,
        contactsCollected: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: "local",
      } as TradeShowEvent;

      set((state) => ({
        events: [localEvent, ...state.events],
        isLoading: false,
        isOffline: true,
      }));
      return localEvent;
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
      // Offline fallback: update locally
      set((state) => ({
        events: state.events.map((e) =>
          e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
        ),
        activeEvent:
          state.activeEvent?.id === id
            ? { ...state.activeEvent, ...data, updatedAt: new Date().toISOString() }
            : state.activeEvent,
        isLoading: false,
        isOffline: true,
      }));
    }
  },

  deleteEvent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteEvent(id);
    } catch {
      // Continue with local delete even if API fails
    }
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
      activeEvent: state.activeEvent?.id === id ? null : state.activeEvent,
      isLoading: false,
    }));
  },

  // ─── Encounters ──────────────────────────────────────────────────

  fetchEncounters: async (eventId, filters) => {
    set({ isLoading: true, error: null });
    try {
      const { encounters } = await api.listEncounters(eventId, filters);
      set({ encounters, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, isOffline: true });
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
      // Offline fallback
      const now = new Date().toISOString();
      const localEncounter: Encounter = {
        id: generateId(),
        eventId,
        type: data.type || "conversation",
        title: data.title || "New encounter",
        notes: data.notes,
        priority: data.priority || "medium",
        participants: data.participants || [],
        syncedToCrm: false,
        createdAt: now,
        updatedAt: now,
        createdBy: "local",
      } as Encounter;

      set((state) => ({
        encounters: [localEncounter, ...state.encounters],
        isLoading: false,
        isOffline: true,
      }));
      return localEncounter;
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
      set((state) => ({
        encounters: state.encounters.map((e) =>
          e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
        ),
        isLoading: false,
        isOffline: true,
      }));
    }
  },

  deleteEncounter: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteEncounter(id);
    } catch {
      // Continue locally
    }
    set((state) => ({
      encounters: state.encounters.filter((e) => e.id !== id),
      isLoading: false,
    }));
  },

  // ─── Sync & Report ──────────────────────────────────────────────

  syncEncounter: async (id) => {
    try {
      const { encounter } = await api.syncEncounter(id);
      set((state) => ({
        encounters: state.encounters.map((e) => (e.id === id ? encounter : e)),
      }));
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : "Sync failed — backend not connected.";
      set({ error: msg });
    }
  },

  bulkSync: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.bulkSync(eventId);
      await get().fetchEncounters(eventId);
      set({ isLoading: false });
      return result;
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : "Sync failed — backend not connected.";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchReport: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      const { report } = await api.getEventReport(eventId);
      set({ report, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
    }
  },

  setPendingOcrResult: (result) => set({ pendingOcrResult: result }),
  setPendingAudioResult: (result) => set({ pendingAudioResult: result }),
  setPendingPortraitUrl: (url) => set({ pendingPortraitUrl: url }),

  clearError: () => set({ error: null }),
}));
