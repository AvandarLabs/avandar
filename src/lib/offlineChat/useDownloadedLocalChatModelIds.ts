import { useSyncExternalStore } from "react";
import {
  listDownloadedLocalChatModelIds,
  subscribeDownloadedLocalChatModels,
} from "./localChatModelStore";
import type { LocalChatModelId } from "./localChatModelCatalog";

const EMPTY_DOWNLOADED_IDS: readonly LocalChatModelId[] = [];

let cachedDownloadedIds: readonly LocalChatModelId[] = EMPTY_DOWNLOADED_IDS;
let cachedDownloadedKey = "";

/**
 * Stable snapshot for `useSyncExternalStore`. `listDownloadedLocalChatModelIds`
 * allocates a new array each call; returning it directly causes infinite
 * re-renders because React compares snapshots with `Object.is`.
 */
function getDownloadedLocalChatModelIdsSnapshot(): readonly LocalChatModelId[] {
  const next = listDownloadedLocalChatModelIds();
  const nextKey = next.join("\0");
  if (nextKey === cachedDownloadedKey) {
    return cachedDownloadedIds;
  }
  cachedDownloadedKey = nextKey;
  cachedDownloadedIds = next.length === 0 ? EMPTY_DOWNLOADED_IDS : next;
  return cachedDownloadedIds;
}

/**
 * Reactive list of offline chat models marked downloaded in this browser.
 */
export function useDownloadedLocalChatModelIds(): LocalChatModelId[] {
  return useSyncExternalStore(
    subscribeDownloadedLocalChatModels,
    getDownloadedLocalChatModelIdsSnapshot,
    () => {
      return EMPTY_DOWNLOADED_IDS;
    },
  );
}
