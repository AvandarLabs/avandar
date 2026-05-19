import { useSyncExternalStore } from "react";
import { getVoiceModelManager } from "./voiceModelManagerFactory";
import type {
  IVoiceModelManager,
  VoiceManagerStatus,
} from "./voiceManagerInterface";

/**
 * Subscribes to the active voice-model manager's status updates. Works on
 * both web and desktop because both implementations satisfy
 * `IVoiceModelManager`. Components re-render whenever the status changes.
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

export function useVoiceModelManager(): IVoiceModelManager {
  return getVoiceModelManager();
}
