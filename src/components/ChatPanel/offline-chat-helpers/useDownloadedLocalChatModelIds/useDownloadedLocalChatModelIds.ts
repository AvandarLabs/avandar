import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { useSyncExternalStore } from "react";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";

const EMPTY_DOWNLOADED_IDS: readonly LocalChatModel.Id[] = [];

let cachedDownloadedIds: readonly LocalChatModel.Id[] = EMPTY_DOWNLOADED_IDS;
let cachedDownloadedKey = "";

/**
 * Stable snapshot for `useSyncExternalStore`. The store allocates a new array
 * each call; returning it directly causes infinite re-renders because React
 * compares snapshots with `Object.is`.
 */
function _getDownloadedIdsSnapshot(): readonly LocalChatModel.Id[] {
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
export function useDownloadedLocalChatModelIds(): readonly LocalChatModel.Id[] {
  return useSyncExternalStore(
    LocalChatModelStore.subscribeDownloadedModels,
    _getDownloadedIdsSnapshot,
    () => {
      return EMPTY_DOWNLOADED_IDS;
    },
  );
}
