import type { VoiceLanguageCode } from "@/lib/voice/voiceModels";

const VOICE_LANGUAGE_TO_WHISPER_CODE: Readonly<
  Record<VoiceLanguageCode, string>
> = {
  english: "en",
  spanish: "es",
  french: "fr",
  portuguese: "pt",
  swahili: "sw",
  chinese: "zh",
};

/** Maps UI language codes to whisper.cpp language identifiers. */
export function voiceLanguageToWhisperCode(
  language: VoiceLanguageCode,
): string {
  return VOICE_LANGUAGE_TO_WHISPER_CODE[language];
}
