import { useSyncExternalStore } from "react";
import { getWhisperCppVoiceModelManager } from "./whisperCppVoiceModelManagerFactory";
import type {
  IVoiceModelManager,
  VoiceManagerStatus,
} from "@/lib/voice/voiceManagerInterface";

export function useWhisperCppVoiceModelStatus(): VoiceManagerStatus {
  const manager = getWhisperCppVoiceModelManager();
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

export function useWhisperCppVoiceModelManager(): IVoiceModelManager {
  return getWhisperCppVoiceModelManager();
}
