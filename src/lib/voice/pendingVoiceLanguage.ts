import type { VoiceLanguageCode } from "@/lib/voice/voiceLanguages";

/**
 * Module-scope handoff for the language Whisper just transcribed in. The
 * `VoiceInputButton` writes it after a successful dictation; the chat
 * runtime reads-and-clears it on the next chat turn so the backend can
 * inject a "user is speaking in X" hint into the system prompt.
 *
 * Scoped narrowly on purpose: we only consume Swahili for now (low-resource
 * languages where the LLM struggles to identify the language from the
 * transcribed text alone), to avoid regressing the no-hint baseline for
 * languages the model already handles well.
 *
 * Lives at module scope rather than React state for the same reason as
 * `pendingAcks`: the chat composer submission can race with React state
 * commits, and a stable read just before the adapter fires avoids the
 * race entirely.
 */
let pendingVoiceLanguage: VoiceLanguageCode | undefined;

export function setPendingVoiceLanguage(
  language: VoiceLanguageCode | undefined,
): void {
  pendingVoiceLanguage = language;
}

/**
 * Reads and clears the pending voice language. Returns `undefined` when
 * the last composer fill wasn't from voice or the language has already
 * been consumed by a prior turn.
 */
export function consumePendingVoiceLanguage(): VoiceLanguageCode | undefined {
  const value = pendingVoiceLanguage;
  pendingVoiceLanguage = undefined;
  return value;
}
