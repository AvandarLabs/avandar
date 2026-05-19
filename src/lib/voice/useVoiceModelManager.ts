import { useSyncExternalStore } from "react";
import {
  getVoiceModelManager,
  type VoiceManagerStatus,
  type VoiceModelManager,
} from "./VoiceModelManager";

/**
 * Subscribes to the singleton `VoiceModelManager`'s status updates.
 * Components re-render whenever the status changes.
 */
export function useVoiceModelStatus(): VoiceManagerStatus {
  const manager = getVoiceModelManager();
  return useSyncExternalStore(
    (listener) => {
      return manager.subscribe(() => {
        listener();
      });
    },
    () => {
      return manager.getStatus();
    },
    () => {
      return { kind: "idle" } as const;
    },
  );
}

export function useVoiceModelManager(): VoiceModelManager {
  return getVoiceModelManager();
}
