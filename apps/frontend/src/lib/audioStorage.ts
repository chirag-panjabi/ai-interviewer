/**
 * IndexedDB & In-Memory Storage for Client-Side Interview Audio Recordings
 * - Persists session recordings keyed by interviewId
 * - Enforces LRU 5-session cap and 7-day retention TTL
 * - Graceful fallback to in-memory cache if IndexedDB is unavailable (e.g. strict private mode)
 */

export interface StoredAudioRecording {
  id: string; // interviewId
  blob: Blob;
  mimeType: string;
  extension: string;
  duration: number; // in seconds
  timestamp: number; // Date.now()
}

export interface SessionAudioResult {
  blob: Blob;
  url: string;
  mimeType: string;
  extension: string;
  duration: number;
}

const DB_NAME = "ai_interviewer_audio_db";
const DB_VERSION = 1;
const STORE_NAME = "recordings";
const MAX_SESSIONS = 5;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache fallback
const memoryCache = new Map<string, StoredAudioRecording>();

function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Prunes old recordings to enforce LRU 5-session cap and 7-day TTL.
 */
async function pruneOldRecordings(db: IDBDatabase): Promise<void> {
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("timestamp");
    const request = index.getAll();

    request.onsuccess = () => {
      const allRecords: StoredAudioRecording[] = request.result || [];
      const now = Date.now();

      // Sort oldest first
      allRecords.sort((a, b) => a.timestamp - b.timestamp);

      const toDelete: string[] = [];

      // 1. Delete records older than 7 days
      for (const rec of allRecords) {
        if (now - rec.timestamp > RETENTION_MS) {
          toDelete.push(rec.id);
        }
      }

      // 2. Enforce MAX_SESSIONS cap
      const remainingCount = allRecords.length - toDelete.length;
      if (remainingCount > MAX_SESSIONS) {
        const excess = remainingCount - MAX_SESSIONS;
        for (let i = 0; i < allRecords.length && toDelete.length < excess; i++) {
          const id = allRecords[i]?.id;
          if (id && !toDelete.includes(id)) {
            toDelete.push(id);
          }
        }
      }

      // Execute deletions
      for (const id of toDelete) {
        store.delete(id);
        memoryCache.delete(id);
      }
    };
  } catch (err) {
    console.warn("[audioStorage] Error pruning old recordings:", err);
  }
}

/**
 * Saves a completed session audio recording to IndexedDB and in-memory cache.
 */
export async function saveSessionAudio(
  id: string,
  blob: Blob,
  mimeType: string,
  extension: string,
  duration: number
): Promise<void> {
  const record: StoredAudioRecording = {
    id,
    blob,
    mimeType,
    extension,
    duration: Math.max(1, Math.round(duration)),
    timestamp: Date.now(),
  };

  // Always update in-memory cache for immediate route transitions
  memoryCache.set(id, record);

  try {
    const db = await openAudioDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(record);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Run background LRU eviction
    pruneOldRecordings(db).catch(() => {});
  } catch (err) {
    console.warn("[audioStorage] Failed to save to IndexedDB, stored in memory only:", err);
  }
}

/**
 * Retrieves a session audio recording by interviewId.
 */
export async function getSessionAudio(id: string): Promise<SessionAudioResult | null> {
  // Check memory cache first
  if (memoryCache.has(id)) {
    const cached = memoryCache.get(id)!;
    return {
      blob: cached.blob,
      url: URL.createObjectURL(cached.blob),
      mimeType: cached.mimeType,
      extension: cached.extension,
      duration: cached.duration,
    };
  }

  try {
    const db = await openAudioDatabase();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    const record: StoredAudioRecording | undefined = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!record) return null;

    // Cache in memory
    memoryCache.set(id, record);

    return {
      blob: record.blob,
      url: URL.createObjectURL(record.blob),
      mimeType: record.mimeType,
      extension: record.extension,
      duration: record.duration,
    };
  } catch (err) {
    console.warn("[audioStorage] Failed to load from IndexedDB:", err);
    return null;
  }
}

/**
 * Deletes a session audio recording by interviewId.
 */
export async function deleteSessionAudio(id: string): Promise<void> {
  memoryCache.delete(id);
  try {
    const db = await openAudioDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.warn("[audioStorage] Failed to delete from IndexedDB:", err);
  }
}
