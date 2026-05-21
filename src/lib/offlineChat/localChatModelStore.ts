import {
  DEFAULT_LOCAL_CHAT_MODEL_ID,
  isLocalChatModelId,
  LOCAL_CHAT_MODELS,
} from "./localChatModelCatalog";
import type { LocalChatModelId } from "./localChatModelCatalog";

const SELECTED_MODEL_KEY = "avandar.offlineChat.selectedModelId";
const DOWNLOADED_MODELS_KEY = "avandar.offlineChat.downloadedModels";

type DownloadedRecord = Partial<Record<LocalChatModelId, true>>;

const downloadedListeners = new Set<() => void>();

/** Subscribes to changes in the downloaded-models list (mark/clear). */
export function subscribeDownloadedLocalChatModels(
  listener: () => void,
): () => void {
  downloadedListeners.add(listener);
  return () => {
    downloadedListeners.delete(listener);
  };
}

function notifyDownloadedLocalChatModelsChanged(): void {
  for (const listener of downloadedListeners) {
    listener();
  }
}

function readDownloaded(): DownloadedRecord {
  try {
    const raw = window.localStorage.getItem(DOWNLOADED_MODELS_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as DownloadedRecord;
  } catch {
    return {};
  }
}

function writeDownloaded(record: DownloadedRecord): void {
  window.localStorage.setItem(DOWNLOADED_MODELS_KEY, JSON.stringify(record));
}

export function readStoredLocalChatModelId(): LocalChatModelId {
  const raw = window.localStorage.getItem(SELECTED_MODEL_KEY);
  if (raw && isLocalChatModelId(raw)) {
    return raw;
  }
  return DEFAULT_LOCAL_CHAT_MODEL_ID;
}

export function writeStoredLocalChatModelId(id: LocalChatModelId): void {
  window.localStorage.setItem(SELECTED_MODEL_KEY, id);
}

export function isLocalChatModelMarkedDownloaded(
  id: LocalChatModelId,
): boolean {
  return readDownloaded()[id] === true;
}

export function markLocalChatModelDownloaded(id: LocalChatModelId): void {
  const record = readDownloaded();
  record[id] = true;
  writeDownloaded(record);
  notifyDownloadedLocalChatModelsChanged();
}

export function clearLocalChatModelDownloaded(id: LocalChatModelId): void {
  const record = readDownloaded();
  delete record[id];
  writeDownloaded(record);
  notifyDownloadedLocalChatModelsChanged();
}

export function hasAnyDownloadedLocalChatModel(): boolean {
  const record = readDownloaded();
  return Object.values(record).some((value) => {
    return value === true;
  });
}

/** Downloaded models in catalog order (for UI lists). */
export function listDownloadedLocalChatModelIds(): LocalChatModelId[] {
  const record = readDownloaded();
  return LOCAL_CHAT_MODELS.flatMap((model) => {
    return record[model.id] === true ? [model.id] : [];
  });
}
