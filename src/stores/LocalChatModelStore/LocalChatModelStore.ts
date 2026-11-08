import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";

const DOWNLOADED_MODELS_KEY = "avandar.offlineChat.downloadedModels";

type DownloadedRecord = Partial<Record<string, true>>;

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

function _readDownloaded(): DownloadedRecord {
  try {
    const raw = window.localStorage.getItem(DOWNLOADED_MODELS_KEY);
    return raw ? (JSON.parse(raw) as DownloadedRecord) : {};
  } catch {
    return {};
  }
}

function _writeDownloaded(record: DownloadedRecord): void {
  try {
    window.localStorage.setItem(DOWNLOADED_MODELS_KEY, JSON.stringify(record));
  } catch {
    // Storage disabled: the marker lives only until the page reloads.
  }
}

function _isDownloaded(id: LocalChatModel.Id): boolean {
  return _readDownloaded()[id] === true;
}

function _markDownloaded(id: LocalChatModel.Id): void {
  _writeDownloaded({ ..._readDownloaded(), [id]: true });
  _notifyDownloadedModelsChanged();
}

function _clearDownloaded(id: LocalChatModel.Id): void {
  const { [id]: _cleared, ...rest } = _readDownloaded();
  _writeDownloaded(rest);
  _notifyDownloadedModelsChanged();
}

function _isBundleDownloaded(): boolean {
  return LocalChatModel.getModelIdsFromBundle(
    LocalChatModel.OFFLINE_BUNDLE,
  ).every(_isDownloaded);
}

/**
 * Remembers, in this browser's local storage, which local models finished
 * downloading. The browser cache holds the weights; these markers let the
 * chat runtime and the offline mode control know whether offline mode can
 * run without opening that cache.
 */
export const LocalChatModelStore = {
  /** Subscribes to changes in the downloaded markers (mark or clear). */
  subscribeDownloadedModels: _subscribeDownloadedModels,
  isDownloaded: _isDownloaded,
  markDownloaded: _markDownloaded,
  clearDownloaded: _clearDownloaded,
  /** True when every model in the offline bundle is downloaded. */
  isBundleDownloaded: _isBundleDownloaded,
};
