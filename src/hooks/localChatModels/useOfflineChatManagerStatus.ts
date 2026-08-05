import { useSyncExternalStore } from "react";
import { OfflineChatResourceManager } from "@/clients/LocalChatModel/OfflineChatResourceManager/OfflineChatResourceManager";
import type { OfflineChatManagerStatus } from "@/clients/LocalChatModel/OfflineChatResourceManager/OfflineChatResourceManager";

/**
 * Subscribes to offline chat engine load/download status for UI indicators.
 */
export function useOfflineChatManagerStatus(): OfflineChatManagerStatus {
  return useSyncExternalStore(
    (listener) => {
      return OfflineChatResourceManager.subscribe(listener);
    },
    () => {
      return OfflineChatResourceManager.getStatus();
    },
    () => {
      return { kind: "idle" } as const;
    },
  );
}
