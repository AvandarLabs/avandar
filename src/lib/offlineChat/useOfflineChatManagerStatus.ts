import { useSyncExternalStore } from "react";
import { OfflineChatResourceManager } from "./OfflineChatResourceManager";
import type { OfflineChatManagerStatus } from "./OfflineChatResourceManager";

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
