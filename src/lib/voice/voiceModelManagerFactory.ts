/**
 * Returns the right voice-model manager singleton for the current
 * runtime. On Avandar Desktop this is the IPC-backed
 * `DesktopVoiceModelManager` (whisper.cpp lives in the main process); on
 * web it's the `VoiceModelManager` that uses `@huggingface/transformers`
 * + an IndexedDB cache.
 *
 * Both implementations satisfy `IVoiceModelManager`, so the chat composer
 * and download indicator don't branch on platform internally.
 */

import { callIpc } from "$/platform/ipc/client";
import { isDesktop } from "$/platform/isDesktop";
import { DesktopVoiceModelManager } from "./DesktopVoiceModelManager";
import { getWebVoiceModelManager } from "./VoiceModelManager";
import type { IVoiceModelManager } from "./voiceManagerInterface";

let desktopSingleton: DesktopVoiceModelManager | null = null;

export function getVoiceModelManager(): IVoiceModelManager {
  if (isDesktop()) {
    if (!desktopSingleton) {
      desktopSingleton = new DesktopVoiceModelManager({ callIpc });
    }
    return desktopSingleton;
  }
  return getWebVoiceModelManager();
}

export const __TEST_ONLY = {
  resetDesktopSingleton: (): void => {
    if (desktopSingleton) {
      desktopSingleton.stopPolling();
    }
    desktopSingleton = null;
  },
};
