import { useIsOnline } from "@/lib/offline/useIsOnline";
import { isOfflineChatEnabled } from "@/lib/offlineChat/isOfflineChatEnabled";
import { hasAnyDownloadedLocalChatModel } from "@/lib/offlineChat/localChatModelStore";

/**
 * True when the browser is offline and cloud chat is unavailable: either
 * offline WebLLM is disabled, or no local model has been downloaded yet.
 */
export function useOfflineBlocksCloudChat(): boolean {
  const isOnline = useIsOnline();
  if (isOnline) {
    return false;
  }
  if (!isOfflineChatEnabled()) {
    return true;
  }
  return !hasAnyDownloadedLocalChatModel();
}
