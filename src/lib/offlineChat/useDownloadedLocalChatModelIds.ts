import { useSyncExternalStore } from "react";
import { LocalChatModelStore } from "./LocalChatModelStore/LocalChatModelStore";
import type { LocalChatModelId } from "./LocalChatModelCatalog/LocalChatModelCatalog";

const EMPTY_DOWNLOADED_IDS: readonly LocalChatModelId[] = [];

let cachedDownloadedIds: readonly LocalChatModelId[] = EMPTY_DOWNLOADED_IDS;
let cachedDownloadedKey = "";

/**
 * Stable snapshot for `useSyncExternalStore`. The store allocates a new array
 * each call; returning it directly causes infinite re-renders because React
 * compares snapshots with `Object.is`.
 */
function getDownloadedLocalChatModelIdsSnapshot(): readonly LocalChatModelId[] {
  const downloadedIds = LocalChatModelStore.listDownloadedIds();
  const downloadedKey = downloadedIds.join("\0");
  if (downloadedKey === cachedDownloadedKey) {
    return cachedDownloadedIds;
  }
  cachedDownloadedKey = downloadedKey;
  cachedDownloadedIds =
    downloadedIds.length === 0 ? EMPTY_DOWNLOADED_IDS : downloadedIds;
  return cachedDownloadedIds;
}

/**
 * Reactive list of offline chat models marked downloaded in this browser.
 */
export function useDownloadedLocalChatModelIds(): readonly LocalChatModelId[] {
  return useSyncExternalStore(
    LocalChatModelStore.subscribeDownloadedModels,
    getDownloadedLocalChatModelIdsSnapshot,
    () => {
      return EMPTY_DOWNLOADED_IDS;
    },
  );
}
