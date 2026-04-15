import * as SecureStore from "expo-secure-store";
import { CONFIG } from "../constants/config";
import type {
  TradeShowEvent, Encounter, EventReport, OcrParsedData, EncounterTask,
} from "../types";

const TOKEN_KEY = "ellipse_access_token";
const USER_KEY = "ellipse_user_info";

class ApiClient {
  private baseUrl: string;
  private _userName: string = "";
  private _userEmail: string = "";

  constructor() {
    this.baseUrl = CONFIG.API_BASE_URL;
  }

  /** Set the current user info so it's sent with every request */
  setUserInfo(name: string, email: string) {
    this._userName = name;
    this._userEmail = email;
  }

  /** Read user info from SecureStore if not already set in memory */
  private async ensureUserInfo(): Promise<void> {
    if (this._userName) return;
    try {
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      if (userJson) {
        const user = JSON.parse(userJson);
        this._userName = user.name || "";
        this._userEmail = user.email || "";
      }
    } catch {
      // ignore
    }
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

  // Callback to notify the app that re-authentication is needed
  private _onAuthExpired: (() => void) | null = null;

  /** Register a callback that fires when the token is expired/invalid */
  onAuthExpired(callback: () => void) {
    this._onAuthExpired = callback;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: { timeout?: number }
  ): Promise<T> {
    const token = await this.getToken();
    await this.ensureUserInfo();
    // Inject auth query params (userRole/userRegion/userName/userEmail) required by backend
    const separator = path.includes("?") ? "&" : "?";
    const nameParam = this._userName ? `&userName=${encodeURIComponent(this._userName)}` : "";
    const emailParam = this._userEmail ? `&userEmail=${encodeURIComponent(this._userEmail)}` : "";
    const authParams = `userRole=superAdmin&userRegion=global${nameParam}${emailParam}`;
    const url = `${this.baseUrl}${path}${separator}${authParams}`;

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
        const errorMsg = (errorBody as any).error?.message || (errorBody as any).error || `HTTP ${response.status}`;

        // Auto-detect expired/invalid token and force re-login
        if (response.status === 401 || errorMsg.toLowerCase().includes("token")) {
          await this.clearToken();
          if (this._onAuthExpired) {
            this._onAuthExpired();
          }
          throw new ApiError(401, "Session expired — please sign in again", errorBody);
        }

        throw new ApiError(
          response.status,
          errorMsg,
          errorBody
        );
      }

      const json = await response.json();
      // Backend wraps responses in { success, data } — extract data
      return json.data !== undefined ? json.data : json;
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

  // ─── Tasks ──────────────────────────────────────────────────────

  async listTasks(encounterId: string): Promise<{ tasks: EncounterTask[] }> {
    return this.request("GET", `/tasks?entityType=encounters&entityId=${encounterId}`);
  }

  async createTask(data: Partial<EncounterTask>): Promise<{ task: EncounterTask }> {
    return this.request("POST", "/tasks", {
      description: data.description,
      status: data.status || "todo",
      priority: data.priority || "medium",
      dueDate: data.dueDate,
      assigneeId: data.assignee,
      relatedEntityType: "encounters",
      relatedEntityId: data.encounterId,
    });
  }

  async updateTask(id: string, data: Partial<EncounterTask>): Promise<{ task: EncounterTask }> {
    return this.request("PATCH", `/tasks/${id}`, data);
  }

  async deleteTask(id: string): Promise<void> {
    await this.request("DELETE", `/tasks/${id}`);
  }

  // ─── Contacts ────────────────────────────────────────────────────

  async createContact(data: {
    firstName: string;
    lastName: string;
    company?: string;
    title?: string;
    email?: string;
    website?: string;
    notes?: string;
    source?: string;
    phones?: Array<{ type: string; value: string }>;
    addresses?: Array<{ type: string; street: string }>;
  }): Promise<any> {
    return this.request("POST", "/contacts", data);
  }

  async updateContact(id: string, data: Record<string, any>): Promise<any> {
    return this.request("PUT", `/contacts/${id}`, data);
  }

  async checkDuplicate(params: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ duplicate: Array<{ contact: any; confidence: number; matchType: string }> }> {
    return this.request("POST", "/contacts/check-duplicate", params);
  }

  async listContacts(params?: {
    sort?: string;
    limit?: number;
    leadSourceDetail?: string;
  }): Promise<{ contacts: any[] }> {
    const query = new URLSearchParams();
    if (params?.sort) query.set("sort", params.sort);
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.leadSourceDetail) query.set("leadSourceDetail", params.leadSourceDetail);
    const qs = query.toString();
    return this.request("GET", `/contacts${qs ? `?${qs}` : ""}`);
  }

  // ─── Meetings (via __meetings__ system event) ───────────────────

  static readonly MEETINGS_EVENT_ID = "__meetings__";

  async listMeetings(): Promise<{ encounters: Encounter[] }> {
    return this.request("GET", `/events/${ApiClient.MEETINGS_EVENT_ID}/encounters`);
  }

  async createMeeting(data: Partial<Encounter>): Promise<{ encounter: Encounter }> {
    return this.request("POST", `/events/${ApiClient.MEETINGS_EVENT_ID}/encounters`, {
      ...data,
      context: "meeting",
    });
  }

  async deleteMeeting(id: string): Promise<void> {
    await this.request("DELETE", `/encounters/${id}`);
  }

  async syncMeeting(id: string): Promise<{ encounter: Encounter }> {
    return this.request("POST", `/encounters/${id}/sync`);
  }

  // ─── Calendar (Outlook via Graph API) ─────────────────────────────

  async getCalendarEvents(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ events: Array<{
    subject: string;
    start: string;
    end: string;
    attendees: Array<{ name: string; email: string }>;
    isReminder: boolean;
  }> }> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    const qs = query.toString();
    return this.request("GET", `/outlook/calendar${qs ? `?${qs}` : ""}`);
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
    participants?: Array<{ name: string; company?: string; title?: string }>,
    eventName?: string,
    encounterDate?: string
  ): Promise<{
    summary: string;
    keyTopics: string[];
    actionItems: string[];
    sentiment: string;
    followUpSuggestion: string;
    memo?: string;
  }> {
    return this.request("POST", "/ai/summarize", {
      transcript,
      manualNotes,
      participants,
      eventName,
      encounterDate,
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
