import Dexie from "dexie";
import { isValidGgmlModelBytes } from "./validateGgmlModelBytes";
import {
  ggmlFileNameForVoiceModelId,
  ggmlUrlForVoiceModelId,
} from "./whisperGgml";
import type { VoiceModelId } from "@/lib/voice/voiceModels";
import type { EntityTable } from "dexie";

type CachedModelRow = {
  modelId: VoiceModelId;
  fileName: string;
  sourceUrl: string;
  body: ArrayBuffer;
  byteLength: number;
  storedAt: number;
};

type WhisperCppModelCacheDB = Dexie & {
  models: EntityTable<CachedModelRow, "modelId">;
};

let dbInstance: WhisperCppModelCacheDB | null = null;

function getDb(): WhisperCppModelCacheDB {
  if (dbInstance) {
    return dbInstance;
  }
  const db = new Dexie("AvandarWhisperCppModelCache") as WhisperCppModelCacheDB;
  db.version(1).stores({
    models: "modelId",
  });
  dbInstance = db;
  return db;
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/** Returns cached ggml bytes when present in our Dexie store. */
export async function getWhisperCppModelBytes(
  modelId: VoiceModelId,
): Promise<ArrayBuffer | undefined> {
  if (!isIndexedDbAvailable()) {
    return undefined;
  }
  try {
    const row = await getDb().models.get(modelId);
    if (!row) {
      return undefined;
    }
    const expectedFileName = ggmlFileNameForVoiceModelId(modelId, "web");
    if (row.fileName !== expectedFileName || !isValidGgmlModelBytes(row.body)) {
      await deleteWhisperCppModelFromCache(modelId);
      return undefined;
    }
    return row.body;
  } catch {
    return undefined;
  }
}

export async function hasWhisperCppModelInCache(
  modelId: VoiceModelId,
): Promise<boolean> {
  const body = await getWhisperCppModelBytes(modelId);
  return body !== undefined && body.byteLength > 0;
}

export async function putWhisperCppModelBytes(
  modelId: VoiceModelId,
  body: ArrayBuffer,
): Promise<void> {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is not available in this environment.");
  }
  const fileName = ggmlFileNameForVoiceModelId(modelId, "web");
  await getDb().models.put({
    modelId,
    fileName,
    sourceUrl: ggmlUrlForVoiceModelId(modelId, "web"),
    body,
    byteLength: body.byteLength,
    storedAt: Date.now(),
  });
}

export async function deleteWhisperCppModelFromCache(
  modelId: VoiceModelId,
): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }
  try {
    await getDb().models.delete(modelId);
  } catch {
    // Ignore.
  }
}

export async function listWhisperCppCachedModelIds(): Promise<VoiceModelId[]> {
  if (!isIndexedDbAvailable()) {
    return [];
  }
  try {
    const rows = await getDb().models.toArray();
    return rows.map((row) => {
      return row.modelId;
    });
  } catch {
    return [];
  }
}

export const __TEST_ONLY = {
  getDb,
  closeDb: (): void => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  },
};
