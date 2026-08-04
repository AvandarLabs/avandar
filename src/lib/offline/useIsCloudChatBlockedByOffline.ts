import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { LocalChatModelStore } from "@/clients/LocalChatModel/LocalChatModelStore/LocalChatModelStore";

/**
 * Whether cloud chat is blocked by being offline with no local fallback: true
 * when the browser is offline and no local WebLLM model has been downloaded
 * yet.
 */
export function useIsCloudChatBlockedByOffline(): boolean {
  const isOnline = useIsOnline();
  if (isOnline) {
    return false;
  }
  return !LocalChatModelStore.hasAnyDownloaded();
}
