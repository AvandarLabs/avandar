import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { LocalChatModelStore } from "@/lib/offlineChat/LocalChatModelStore/LocalChatModelStore";

/**
 * True when the browser is offline and no local WebLLM model has been
 * downloaded yet.
 */
export function useOfflineBlocksCloudChat(): boolean {
  const isOnline = useIsOnline();
  if (isOnline) {
    return false;
  }
  return !LocalChatModelStore.hasAnyDownloaded();
}
