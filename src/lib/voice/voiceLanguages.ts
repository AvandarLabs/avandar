/**
 * Languages surfaced in the voice dictation UI. Whisper supports many more;
 * these six match the ict4d-demo brief. Codes match Whisper language ids.
 */

export type VoiceLanguageCode =
  | "english"
  | "spanish"
  | "french"
  | "portuguese"
  | "swahili"
  | "chinese";

export type VoiceLanguageOption = {
  code: VoiceLanguageCode;
  label: string;
};

export const VOICE_LANGUAGES: readonly VoiceLanguageOption[] = [
  { code: "english", label: "English" },
  { code: "spanish", label: "Español" },
  { code: "french", label: "Français" },
  { code: "portuguese", label: "Português" },
  { code: "swahili", label: "Kiswahili" },
  { code: "chinese", label: "中文" },
];

/**
 * Maps a workspace UI locale (Lingui code) to the Whisper language code used
 * when transcribing. Unsupported locales fall back to English.
 */
export function voiceLanguageForLocale(
  locale: string | undefined,
): VoiceLanguageCode {
  switch (locale) {
    case "en":
      return "english";
    case "es":
      return "spanish";
    case "pt":
      return "portuguese";
    case "fr":
      return "french";
    case "sw":
      return "swahili";
    case "zh-Hans":
    case "zh-Hant":
      return "chinese";
    default:
      return "english";
  }
}
