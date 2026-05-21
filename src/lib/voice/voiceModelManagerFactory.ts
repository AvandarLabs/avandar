/**
 * Returns the voice-model manager for the current runtime: whisper.cpp WASM
 * on web, IPC-backed whisper.cpp on Avandar Desktop.
 */

import { callIpc } from "$/platform/ipc/client";
import { isDesktop } from "$/platform/isDesktop";
import { getWebWhisperCppVoiceModelManager } from "@/lib/voiceWhisperCpp/WhisperCppVoiceModelManager";
import { DesktopVoiceModelManager } from "./DesktopVoiceModelManager";
import type { IVoiceModelManager } from "./voiceManagerInterface";

let desktopSingleton: DesktopVoiceModelManager | null = null;

export function getVoiceModelManager(): IVoiceModelManager {
  if (isDesktop()) {
    if (!desktopSingleton) {
      desktopSingleton = new DesktopVoiceModelManager({ callIpc });
    }
    return desktopSingleton;
  }
  return getWebWhisperCppVoiceModelManager();
}

export const __TEST_ONLY = {
  resetDesktopSingleton: (): void => {
    if (desktopSingleton) {
      desktopSingleton.stopPolling();
    }
    desktopSingleton = null;
  },
};
