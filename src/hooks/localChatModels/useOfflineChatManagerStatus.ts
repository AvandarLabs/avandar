import { useSyncExternalStore } from "react";
import { OfflineChatResourceStore } from "@/stores/OfflineChatResourceStore/OfflineChatResourceStore";
import type { OfflineChatManagerStatus } from "@/stores/OfflineChatResourceStore/OfflineChatResourceStore";

/**
 * Subscribes to offline chat engine load/download status for UI indicators.
 */
export function useOfflineChatManagerStatus(): OfflineChatManagerStatus {
  return useSyncExternalStore(
    (listener) => {
      return OfflineChatResourceStore.subscribe(listener);
    },
    () => {
      return OfflineChatResourceStore.getStatus();
    },
    () => {
      return { kind: "idle" } as const;
    },
  );
}
