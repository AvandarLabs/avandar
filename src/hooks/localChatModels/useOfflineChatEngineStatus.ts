import type { OfflineChatManagerStatus } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";

import { useSyncExternalStore } from "react";

import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";

/**
 * Subscribes to offline chat engine load/download status for UI indicators.
 */
export function useOfflineChatEngineStatus(): OfflineChatManagerStatus {
  return useSyncExternalStore(
    (listener) => {
      return OfflineChatEngineStore.subscribe(listener);
    },
    () => {
      return OfflineChatEngineStore.getStatus();
    },
    () => {
      return { kind: "idle" } as const;
    },
  );
}
