/**
 * Persists the user's voice-transcription language preference in
 * `localStorage` so it survives reloads and is shared across tabs. When set,
 * this overrides the workspace UI locale default used by the voice picker.
 */

import { VOICE_LANGUAGES } from "./voiceModels";
import type { VoiceLanguageCode } from "./voiceModels";

export const VOICE_LANGUAGE_STORAGE_KEY = "avandar.voice.language";

const VOICE_LANGUAGE_CODES = new Set<VoiceLanguageCode>(
  VOICE_LANGUAGES.map((entry) => {
    return entry.code;
  }),
);

function isVoiceLanguageCode(value: string): value is VoiceLanguageCode {
  return VOICE_LANGUAGE_CODES.has(value as VoiceLanguageCode);
}

/**
 * Returns the stored voice language, or `undefined` when the user has not
 * chosen one yet (workspace locale should supply the default).
 */
export function readStoredVoiceLanguage(): VoiceLanguageCode | undefined {
  if (typeof window === "undefined" || !window.localStorage) {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(VOICE_LANGUAGE_STORAGE_KEY);
    if (!raw || !isVoiceLanguageCode(raw)) {
      return undefined;
    }
    return raw;
  } catch {
    return undefined;
  }
}

export function hasStoredVoiceLanguage(): boolean {
  return readStoredVoiceLanguage() !== undefined;
}

export function writeStoredVoiceLanguage(code: VoiceLanguageCode): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(VOICE_LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Storage may be full or disabled. Ignore — worst case we fall back to
    // the workspace locale on the next visit.
  }
}

export const __TEST_ONLY = {
  isVoiceLanguageCode,
};
