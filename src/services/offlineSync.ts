import * as FileSystem from "expo-file-system";
import { api, ApiError } from "./api";
import type { SyncQueueItem, LocalEncounter, SyncStatus } from "../types";
import { CONFIG } from "../constants/config";

const QUEUE_FILE = `${FileSystem.documentDirectory}sync_queue.json`;
const LOCAL_ENCOUNTERS_FILE = `${FileSystem.documentDirectory}local_encounters.json`;

/**
 * Offline-first sync service using file-based persistence.
 * In production, this would be replaced with expo-sqlite for better performance.
 */
class OfflineSyncService {
  private syncInProgress = false;

  // ─── Queue Management ────────────────────────────────────────────

  async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const content = await FileSystem.readAsStringAsync(QUEUE_FILE);
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async saveQueue(queue: SyncQueueItem[]): Promise<void> {
    await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(queue));
  }

  async addToQueue(item: Omit<SyncQueueItem, "createdAt" | "retryCount" | "status">): Promise<void> {
    const queue = await this.getQueue();
    queue.push({
      ...item,
      status: "pending",
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
    await this.saveQueue(queue);
  }

  async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    await this.saveQueue(queue.filter((q) => q.id !== id));
  }

  async updateQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const queue = await this.getQueue();
    const idx = queue.findIndex((q) => q.id === id);
    if (idx >= 0) {
      queue[idx] = { ...queue[idx], ...updates };
      await this.saveQueue(queue);
    }
  }

  // ─── Local Encounters ────────────────────────────────────────────

  async getLocalEncounters(): Promise<LocalEncounter[]> {
    try {
      const content = await FileSystem.readAsStringAsync(LOCAL_ENCOUNTERS_FILE);
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async saveLocalEncounters(encounters: LocalEncounter[]): Promise<void> {
    await FileSystem.writeAsStringAsync(
      LOCAL_ENCOUNTERS_FILE,
      JSON.stringify(encounters)
    );
  }

  async addLocalEncounter(encounter: LocalEncounter): Promise<void> {
    const encounters = await this.getLocalEncounters();
    encounters.push(encounter);
    await this.saveLocalEncounters(encounters);

    // Also add to sync queue
    await this.addToQueue({
      id: encounter._localId,
      type: "encounter",
      payload: encounter,
    });
  }

  async updateLocalEncounter(localId: string, updates: Partial<LocalEncounter>): Promise<void> {
    const encounters = await this.getLocalEncounters();
    const idx = encounters.findIndex((e) => e._localId === localId);
    if (idx >= 0) {
      encounters[idx] = { ...encounters[idx], ...updates };
      await this.saveLocalEncounters(encounters);
    }
  }

  // ─── Sync Engine ─────────────────────────────────────────────────

  async processQueue(): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress) return { synced: 0, failed: 0 };
    this.syncInProgress = true;

    let synced = 0;
    let failed = 0;

    try {
      const queue = await this.getQueue();
      const pending = queue.filter(
        (q) => q.status === "pending" && q.retryCount < CONFIG.MAX_RETRY_COUNT
      );

      for (const item of pending) {
        try {
          await this.updateQueueItem(item.id, { status: "uploading" });

          switch (item.type) {
            case "photo":
              await this.syncPhoto(item);
              break;
            case "audio":
              await this.syncAudio(item);
              break;
            case "encounter":
              await this.syncEncounter(item);
              break;
          }

          await this.removeFromQueue(item.id);
          synced++;
        } catch (err: any) {
          const isNetworkError = err instanceof ApiError && err.isNetworkError;
          await this.updateQueueItem(item.id, {
            status: isNetworkError ? "pending" : "error",
            retryCount: item.retryCount + 1,
            errorMessage: err.message,
          });
          failed++;

          // Stop processing on network errors (offline)
          if (isNetworkError) break;
        }
      }
    } finally {
      this.syncInProgress = false;
    }

    return { synced, failed };
  }

  private async syncPhoto(item: SyncQueueItem): Promise<void> {
    const { localUri, filename, mimeType } = item.payload;
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await api.uploadPhoto(base64, filename, mimeType);
  }

  private async syncAudio(item: SyncQueueItem): Promise<void> {
    const { localUri, filename, mimeType } = item.payload;
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await api.uploadAudio(base64, filename, mimeType);
  }

  private async syncEncounter(item: SyncQueueItem): Promise<void> {
    const encounter = item.payload as LocalEncounter;

    // First upload any local photos
    const uploadedPhotos = [];
    for (const localPhoto of encounter._localPhotos || []) {
      if (!localPhoto.uploaded && localPhoto.localUri) {
        const base64 = await FileSystem.readAsStringAsync(localPhoto.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const filename = `${localPhoto.photoType}_${Date.now()}.jpg`;
        const result = await api.uploadPhoto(base64, filename, "image/jpeg");
        uploadedPhotos.push({
          ...localPhoto,
          uploaded: true,
          remoteUrl: result.imageUrl,
        });
      } else {
        uploadedPhotos.push(localPhoto);
      }
    }

    // Upload audio if local
    let audioUrl = encounter.audioUrl;
    if (encounter._localAudioUri) {
      const base64 = await FileSystem.readAsStringAsync(encounter._localAudioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await api.uploadAudio(base64, `audio_${Date.now()}.m4a`);
      audioUrl = result.audioUrl;
    }

    // Create encounter on server
    const { _localId, _syncStatus, _localAudioUri, _localPhotos, _errorMessage, _retryCount, ...serverData } = encounter;
    await api.createEncounter(encounter.eventId, {
      ...serverData,
      audioUrl,
    });

    // Update local status
    await this.updateLocalEncounter(encounter._localId, {
      _syncStatus: "synced",
    });
  }

  // ─── Background Sync ────────────────────────────────────────────

  private intervalId: ReturnType<typeof setInterval> | null = null;

  startBackgroundSync(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.processQueue().catch(console.error);
    }, CONFIG.SYNC_INTERVAL_MS);
  }

  stopBackgroundSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ─── Stats ───────────────────────────────────────────────────────

  async getStats(): Promise<{
    pendingCount: number;
    errorCount: number;
    totalQueued: number;
  }> {
    const queue = await this.getQueue();
    return {
      pendingCount: queue.filter((q) => q.status === "pending").length,
      errorCount: queue.filter((q) => q.status === "error").length,
      totalQueued: queue.length,
    };
  }
}

export const offlineSync = new OfflineSyncService();
