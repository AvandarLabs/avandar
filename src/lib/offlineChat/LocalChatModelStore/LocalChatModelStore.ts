import { LocalChatModelCatalog } from "../LocalChatModelCatalog/LocalChatModelCatalog";
import type { LocalChatModelId } from "../LocalChatModelCatalog/LocalChatModelCatalog";

const SELECTED_MODEL_KEY = "avandar.offlineChat.selectedModelId";
const DOWNLOADED_MODELS_KEY = "avandar.offlineChat.downloadedModels";

type DownloadedRecord = Partial<Record<LocalChatModelId, true>>;

const downloadedListeners = new Set<() => void>();

/** Subscribes to changes in the downloaded-models list (mark/clear). */
function _subscribeDownloadedModels(listener: () => void): () => void {
  downloadedListeners.add(listener);
  return () => {
    downloadedListeners.delete(listener);
  };
}

function _notifyDownloadedModelsChanged(): void {
  downloadedListeners.forEach((listener) => {
    listener();
  });
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

function _readSelectedId(): LocalChatModelId {
  const raw = window.localStorage.getItem(SELECTED_MODEL_KEY);
  if (raw && LocalChatModelCatalog.isValidId(raw)) {
    return raw;
  }
  return LocalChatModelCatalog.defaultId;
}

function _writeSelectedId(id: LocalChatModelId): void {
  window.localStorage.setItem(SELECTED_MODEL_KEY, id);
}

function _isDownloaded(id: LocalChatModelId): boolean {
  return readDownloaded()[id] === true;
}

function _markDownloaded(id: LocalChatModelId): void {
  const record = readDownloaded();
  record[id] = true;
  writeDownloaded(record);
  _notifyDownloadedModelsChanged();
}

function _clearDownloaded(id: LocalChatModelId): void {
  const record = readDownloaded();
  delete record[id];
  writeDownloaded(record);
  _notifyDownloadedModelsChanged();
}

function _hasAnyDownloaded(): boolean {
  const record = readDownloaded();
  return Object.values(record).some((value) => {
    return value === true;
  });
}

/** Downloaded models in catalog order (for UI lists). */
function _listDownloadedIds(): LocalChatModelId[] {
  const record = readDownloaded();
  return LocalChatModelCatalog.values.flatMap((model) => {
    return record[model.id] === true ? [model.id] : [];
  });
}

/** Persistent selection and download metadata for local chat models. */
export const LocalChatModelStore = {
  subscribeDownloadedModels: _subscribeDownloadedModels,
  readSelectedId: _readSelectedId,
  writeSelectedId: _writeSelectedId,
  isDownloaded: _isDownloaded,
  markDownloaded: _markDownloaded,
  clearDownloaded: _clearDownloaded,
  hasAnyDownloaded: _hasAnyDownloaded,
  listDownloadedIds: _listDownloadedIds,
};
