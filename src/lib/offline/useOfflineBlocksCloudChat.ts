import { useIsOnline } from "@/lib/offline/useIsOnline";
import { hasAnyDownloadedLocalChatModel } from "@/lib/offlineChat/localChatModelStore";

/**
 * True when the browser is offline and no local WebLLM model has been
 * downloaded yet.
 */
export function useOfflineBlocksCloudChat(): boolean {
  const isOnline = useIsOnline();
  if (isOnline) {
    return false;
  }
  return !hasAnyDownloadedLocalChatModel();
}
