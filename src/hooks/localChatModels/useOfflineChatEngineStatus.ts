import { useSyncExternalStore } from "react";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import type { OfflineChatEngineStatus } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";

/**
 * Subscribes to the offline models' download and removal status, for UI
 * such as a control that shows download progress.
 */
export function useOfflineChatEngineStatus(): OfflineChatEngineStatus {
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
