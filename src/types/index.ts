// ─── Shared types mirroring backend models ──────────────────────────────────

export type Region = "NORAM" | "LATAM" | "APAC" | "EMEA";
export type TradeShowEventStatus = "upcoming" | "active" | "completed";
export type EncounterType = "meeting" | "booth_visit" | "networking" | "presentation" | "other";
export type CaptureMode = "audio" | "manual" | "both";
export type PhotoType = "badge" | "business_card" | "portrait";

export interface ParticipantPhoto {
  id: string;
  photoType: PhotoType;
  imageUrl: string;
  thumbnailUrl?: string;
  ocrRawText?: string;
  ocrParsed?: OcrParsedData;
  capturedAt: string;
}

export interface OcrParsedData {
  name?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

export interface EncounterParticipant {
  id: string;
  contactId?: string;
  contactName: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  photos: ParticipantPhoto[];
  portraitUrl?: string;
  isNew: boolean;
}

export interface TradeShowEvent {
  id: string;
  type: "tradeShowEvent";
  name: string;
  location?: string;
  startDate: string;
  endDate: string;
  description?: string;
  boothNumber?: string;
  teamMembers: string[];
  region: Region;
  status: TradeShowEventStatus;
  coverImageUrl?: string;
  tags?: string[];
  encounterCount: number;
  contactsCollected: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Encounter {
  id: string;
  type: "encounter";
  eventId: string;
  eventName: string;
  title: string;
  encounterType: EncounterType;
  timestamp: string;
  duration?: number;
  location?: string;
  participants: EncounterParticipant[];
  captureMode: CaptureMode;
  audioUrl?: string;
  audioTranscript?: string;
  manualNotes?: string;
  aiSummary?: string;
  aiKeyTopics?: string[];
  aiActionItems?: string[];
  aiSentiment?: "positive" | "neutral" | "cautious" | "negative";
  aiFollowUpSuggestion?: string;
  syncedToCrm: boolean;
  crmActivityIds?: string[];
  linkedAccountId?: string;
  linkedAccountName?: string;
  tags?: string[];
  priority?: "high" | "medium" | "low";
  followUpDate?: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Response wrappers ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface EventReport {
  event: TradeShowEvent;
  stats: {
    totalEncounters: number;
    uniqueContacts: number;
    companiesMet: number;
    syncedToCrm: number;
    pendingSync: number;
    priorityBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
    sentimentBreakdown: Record<string, number>;
  };
  encounters: Encounter[];
  actionItems: Array<{
    encounterTitle: string;
    actionItem: string;
    priority?: string;
  }>;
}

// ─── Local / Offline types ──────────────────────────────────────────────────

export type SyncStatus = "pending" | "uploading" | "synced" | "error";

export interface LocalEncounter extends Encounter {
  _localId: string;
  _syncStatus: SyncStatus;
  _localAudioUri?: string;
  _localPhotos: Array<{
    localUri: string;
    photoType: PhotoType;
    uploaded: boolean;
    remoteUrl?: string;
  }>;
  _errorMessage?: string;
  _retryCount: number;
}

export interface SyncQueueItem {
  id: string;
  type: "encounter" | "photo" | "audio";
  payload: any;
  status: SyncStatus;
  createdAt: string;
  retryCount: number;
  errorMessage?: string;
}
