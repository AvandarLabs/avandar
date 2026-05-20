/**
 * Persists which voice models have been successfully downloaded into the
 * browser cache. We intentionally use `localStorage` here (not IndexedDB or
 * OPFS) because we only need a tiny flag-per-model marker — the actual model
 * weights live in the Cache API store that `@huggingface/transformers`
 * maintains. This file is the source of truth for "has this user downloaded
 * model X yet?" so the UI can decide whether to prompt for download.
 */

import type { VoiceModelId } from "./voiceModels";

const STORAGE_KEY = "avandar.voice.downloadedModels";

type DownloadedModelsRecord = Partial<Record<VoiceModelId, true>>;

function readStorage(): DownloadedModelsRecord {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as DownloadedModelsRecord;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStorage(record: DownloadedModelsRecord): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage may be full or disabled (private browsing). Ignore — worst
    // case the user is re-prompted to download next time.
  }
}

export function isVoiceModelMarkedDownloaded(id: VoiceModelId): boolean {
  return readStorage()[id] === true;
}

export function markVoiceModelDownloaded(id: VoiceModelId): void {
  const record = readStorage();
  record[id] = true;
  writeStorage(record);
}

export function clearVoiceModelDownloaded(id: VoiceModelId): void {
  const record = readStorage();
  delete record[id];
  writeStorage(record);
}

export function listDownloadedVoiceModels(): readonly VoiceModelId[] {
  const record = readStorage();
  return Object.keys(record) as VoiceModelId[];
}

export const __TEST_ONLY = {
  STORAGE_KEY,
  readStorage,
  writeStorage,
};
