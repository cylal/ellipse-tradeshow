import * as SecureStore from "expo-secure-store";
import { CONFIG } from "../constants/config";
import type {
  TradeShowEvent, Encounter, EventReport, OcrParsedData,
} from "../types";

const TOKEN_KEY = "ellipse_access_token";

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = CONFIG.API_BASE_URL;
  }

  private async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: { timeout?: number }
  ): Promise<T> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options?.timeout || 30000
    );

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          (errorBody as any).error || `HTTP ${response.status}`,
          errorBody
        );
      }

      return response.json();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new ApiError(0, "Request timeout");
      }
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, err.message || "Network error");
    }
  }

  // ─── Events ──────────────────────────────────────────────────────

  async listEvents(params?: {
    status?: string;
    region?: string;
  }): Promise<{ events: TradeShowEvent[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.region) query.set("region", params.region);
    const qs = query.toString();
    return this.request("GET", `/events${qs ? `?${qs}` : ""}`);
  }

  async getEvent(id: string): Promise<{ event: TradeShowEvent }> {
    return this.request("GET", `/events/${id}`);
  }

  async createEvent(data: Partial<TradeShowEvent>): Promise<{ event: TradeShowEvent }> {
    return this.request("POST", "/events", data);
  }

  async updateEvent(id: string, data: Partial<TradeShowEvent>): Promise<{ event: TradeShowEvent }> {
    return this.request("PUT", `/events/${id}`, data);
  }

  async deleteEvent(id: string): Promise<void> {
    await this.request("DELETE", `/events/${id}`);
  }

  async getEventReport(id: string): Promise<{ report: EventReport }> {
    return this.request("GET", `/events/${id}/report`);
  }

  // ─── Encounters ──────────────────────────────────────────────────

  async listEncounters(
    eventId: string,
    params?: { type?: string; priority?: string; synced?: string }
  ): Promise<{ encounters: Encounter[] }> {
    const query = new URLSearchParams();
    if (params?.type) query.set("type", params.type);
    if (params?.priority) query.set("priority", params.priority);
    if (params?.synced) query.set("synced", params.synced);
    const qs = query.toString();
    return this.request("GET", `/events/${eventId}/encounters${qs ? `?${qs}` : ""}`);
  }

  async getEncounter(id: string): Promise<{ encounter: Encounter }> {
    return this.request("GET", `/encounters/${id}`);
  }

  async createEncounter(
    eventId: string,
    data: Partial<Encounter>
  ): Promise<{ encounter: Encounter }> {
    return this.request("POST", `/events/${eventId}/encounters`, data);
  }

  async updateEncounter(id: string, data: Partial<Encounter>): Promise<{ encounter: Encounter }> {
    return this.request("PUT", `/encounters/${id}`, data);
  }

  async deleteEncounter(id: string): Promise<void> {
    await this.request("DELETE", `/encounters/${id}`);
  }

  async syncEncounter(id: string): Promise<{ encounter: Encounter }> {
    return this.request("POST", `/encounters/${id}/sync`);
  }

  async bulkSync(eventId: string): Promise<{ synced: number; failed: number; errors: string[] }> {
    return this.request("POST", "/encounters/bulk-sync", { eventId });
  }

  // ─── AI Endpoints ────────────────────────────────────────────────

  async ocrBadge(
    imageUrl: string,
    photoType: "badge" | "business_card"
  ): Promise<{ rawText: string; parsed: OcrParsedData }> {
    return this.request("POST", "/ai/badge-ocr", { imageUrl, photoType });
  }

  async transcribeAudio(audioUrl: string): Promise<{
    transcript: string;
    language: string;
    duration: number;
  }> {
    return this.request("POST", "/ai/transcribe", { audioUrl }, { timeout: 120000 });
  }

  async summarizeEncounter(
    transcript?: string,
    manualNotes?: string,
    participants?: Array<{ name: string; company?: string; title?: string }>
  ): Promise<{
    summary: string;
    keyTopics: string[];
    actionItems: string[];
    sentiment: string;
    followUpSuggestion: string;
  }> {
    return this.request("POST", "/ai/summarize", {
      transcript,
      manualNotes,
      participants,
    }, { timeout: 60000 });
  }

  // ─── Upload ──────────────────────────────────────────────────────

  async uploadPhoto(
    base64: string,
    filename: string,
    mimeType: string = "image/jpeg"
  ): Promise<{ imageUrl: string; thumbnailUrl: string; blobName: string }> {
    return this.request("POST", "/upload/photo", { base64, filename, mimeType });
  }

  async uploadAudio(
    base64: string,
    filename: string,
    mimeType: string = "audio/m4a"
  ): Promise<{ audioUrl: string; blobName: string }> {
    return this.request("POST", "/upload/audio", { base64, filename, mimeType });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: any
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export const api = new ApiClient();
