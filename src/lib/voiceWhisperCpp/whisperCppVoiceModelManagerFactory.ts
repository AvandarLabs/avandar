import { getWebWhisperCppVoiceModelManager } from "./WhisperCppVoiceModelManager";
import type { IVoiceModelManager } from "@/lib/voice/voiceManagerInterface";

/**
 * Returns the whisper.cpp WASM manager on web. Desktop keeps using native
 * whisper via `voiceModelManagerFactory`; the parallel WASM mic is web-only.
 */
export function getWhisperCppVoiceModelManager(): IVoiceModelManager {
  return getWebWhisperCppVoiceModelManager();
}
