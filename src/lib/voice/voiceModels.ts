/**
 * Catalog of Whisper models that we support for local voice-to-text in the
 * web app. All models are multilingual and downloadable from the public
 * Hugging Face Hub without an API key. Sizes are approximate disk usage
 * after quantization (q8 / int8).
 */

export type VoiceModelId = "whisper-tiny" | "whisper-base" | "whisper-small";

export type VoiceModel = {
  id: VoiceModelId;

  /** Hub repo id passed to `pipeline("automatic-speech-recognition", repo)`. */
  hubRepo: string;

  /** Human-readable name shown in the download prompt + indicator. */
  displayName: string;

  /** Short blurb describing the trade-off. */
  description: string;

  /** Approximate quantized download size (used for messaging only). */
  approxSizeMb: number;
};

export const VOICE_MODELS: readonly VoiceModel[] = [
  {
    id: "whisper-tiny",
    hubRepo: "Xenova/whisper-tiny",
    displayName: "Whisper Tiny (multilingual)",
    description:
      "Smallest multilingual model — fastest to download, good for short clear phrases.",
    approxSizeMb: 75,
  },
  {
    id: "whisper-base",
    hubRepo: "Xenova/whisper-base",
    displayName: "Whisper Base (multilingual)",
    description:
      "Larger model with better accuracy, especially for non-English audio.",
    approxSizeMb: 145,
  },
  {
    id: "whisper-small",
    hubRepo: "Xenova/whisper-small",
    displayName: "Whisper Small (multilingual)",
    description:
      "Best accuracy in this set. Download is ~485 MB; may be slow on low-bandwidth connections.",
    approxSizeMb: 485,
  },
] as const;

export const DEFAULT_VOICE_MODEL_ID: VoiceModelId = "whisper-tiny";

export function findVoiceModel(id: VoiceModelId): VoiceModel {
  const model = VOICE_MODELS.find((m) => {
    return m.id === id;
  });
  if (!model) {
    throw new Error(`Unknown voice model id: ${id}`);
  }
  return model;
}

/**
 * Languages we surface in the UI for the voice prompt feature. Whisper itself
 * supports ~99 languages, but the ict4d-demo brief targets six. Codes match
 * Whisper's language identifiers.
 */
export type VoiceLanguageCode =
  | "auto"
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
  { code: "auto", label: "Auto-detect" },
  { code: "english", label: "English" },
  { code: "spanish", label: "Español" },
  { code: "french", label: "Français" },
  { code: "portuguese", label: "Português" },
  { code: "swahili", label: "Kiswahili" },
  { code: "chinese", label: "中文" },
];
