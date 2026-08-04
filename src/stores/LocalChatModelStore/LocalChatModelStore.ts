import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";

const SELECTED_MODEL_KEY = "avandar.offlineChat.selectedModelId";
const DOWNLOADED_MODELS_KEY = "avandar.offlineChat.downloadedModels";

type DownloadedRecord = Partial<Record<LocalChatModel.Id, true>>;

const downloadedListeners = new Set<() => void>();

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

function _readSelectedId(): LocalChatModel.Id {
  const raw = window.localStorage.getItem(SELECTED_MODEL_KEY);
  if (raw && LocalChatModel.Catalog.isValidId(raw)) {
    return raw;
  }
  return LocalChatModel.Catalog.defaultId;
}

function _writeSelectedId(id: LocalChatModel.Id): void {
  window.localStorage.setItem(SELECTED_MODEL_KEY, id);
}

function _isDownloaded(id: LocalChatModel.Id): boolean {
  return readDownloaded()[id] === true;
}

function _markDownloaded(id: LocalChatModel.Id): void {
  const record = readDownloaded();
  record[id] = true;
  writeDownloaded(record);
  _notifyDownloadedModelsChanged();
}

function _clearDownloaded(id: LocalChatModel.Id): void {
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

function _listDownloadedIds(): LocalChatModel.Id[] {
  const record = readDownloaded();
  return LocalChatModel.Catalog.values.flatMap((model) => {
    return record[model.id] === true ? [model.id] : [];
  });
}

/** Persistent selection and download metadata for local chat models. */
export const LocalChatModelStore = {
  /** Subscribes to changes in the downloaded-models list (mark/clear). */
  subscribeDownloadedModels: _subscribeDownloadedModels,
  readSelectedId: _readSelectedId,
  writeSelectedId: _writeSelectedId,
  isDownloaded: _isDownloaded,
  markDownloaded: _markDownloaded,
  clearDownloaded: _clearDownloaded,
  hasAnyDownloaded: _hasAnyDownloaded,
  /** Downloaded models in catalog order (for UI lists). */
  listDownloadedIds: _listDownloadedIds,
};
