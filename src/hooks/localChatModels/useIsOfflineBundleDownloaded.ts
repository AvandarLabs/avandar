import { useSyncExternalStore } from "react";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";

/**
 * Whether every offline model is downloaded in this browser, kept current
 * as downloads finish or are removed. Use it to decide whether offline mode
 * can be turned on.
 */
export function useIsOfflineBundleDownloaded(): boolean {
  return useSyncExternalStore(
    LocalChatModelStore.subscribeDownloadedModels,
    LocalChatModelStore.isBundleDownloaded,
    () => {
      return false;
    },
  );
}
