import { useSyncExternalStore } from "react";
import { OfflineChatResourceManager } from "@/stores/OfflineChatResourceManager/OfflineChatResourceManager";
import type { OfflineChatManagerStatus } from "@/stores/OfflineChatResourceManager/OfflineChatResourceManager";

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
