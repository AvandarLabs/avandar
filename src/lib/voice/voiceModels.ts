/**
 * Catalog of Whisper models that we support for local voice-to-text.
 *
 * **Web build** uses `@huggingface/transformers` with the `Xenova/whisper-*`
 * ONNX exports — model weights are stored in IndexedDB. Anything larger
 * than `whisper-small` is gated out because the ONNX runtime in the
 * browser can't realistically hold the medium / large weights in RAM (and
 * downloading 3–6 GB over an ICT4D-target network would be hostile).
 *
 * **Desktop build** uses `smart-whisper` (whisper.cpp via N-API) with
 * ggml weights cached on disk under `<userData>/whisper-models/`. The
 * large multi-GB models are available there because disk-backed mmap
 * keeps the working set sane and the binary CPU implementation is much
 * faster than ONNX in the webview.
 */

export type VoiceModelId =
  | "whisper-tiny"
  | "whisper-base"
  | "whisper-small"
  | "whisper-medium"
  | "whisper-large-v3"
  | "whisper-large-v3-turbo";

export type VoiceModel = {
  id: VoiceModelId;

  /** Hub repo id used by the web (transformers.js) build. */
  hubRepo: string;

  /** Human-readable name shown in the download prompt + indicator. */
  displayName: string;

  /** Short blurb describing the trade-off. */
  description: string;

  /** Approximate quantized download size (used for messaging only). */
  approxSizeMb: number;

  /**
   * When true, the model is only offered on Avandar Desktop. The web UI
   * still lists it but renders the option disabled with an explanatory
   * tooltip; selecting it from a non-desktop build is a no-op.
   */
  desktopOnly: boolean;
};

export const VOICE_MODELS: readonly VoiceModel[] = [
  {
    id: "whisper-tiny",
    hubRepo: "Xenova/whisper-tiny",
    displayName: "Whisper Tiny (multilingual)",
    description:
      "Smallest multilingual model — fastest to download, good for short clear phrases.",
    approxSizeMb: 75,
    desktopOnly: false,
  },
  {
    id: "whisper-base",
    hubRepo: "Xenova/whisper-base",
    displayName: "Whisper Base (multilingual)",
    description:
      "Larger model with better accuracy, especially for non-English audio.",
    approxSizeMb: 145,
    desktopOnly: false,
  },
  {
    id: "whisper-small",
    hubRepo: "Xenova/whisper-small",
    displayName: "Whisper Small (multilingual)",
    description:
      "Best web-friendly accuracy. Download is ~485 MB; may be slow on low-bandwidth connections.",
    approxSizeMb: 485,
    desktopOnly: false,
  },
  {
    id: "whisper-medium",
    hubRepo: "Xenova/whisper-medium",
    displayName: "Whisper Medium (desktop only)",
    description:
      "Markedly better than Small for noisy audio and code-switching. Runs natively via whisper.cpp on Avandar Desktop.",
    approxSizeMb: 1500,
    desktopOnly: true,
  },
  {
    id: "whisper-large-v3",
    hubRepo: "Xenova/whisper-large-v3",
    displayName: "Whisper Large v3 (desktop only)",
    description:
      "OpenAI's highest-accuracy open Whisper model. Multi-GB; only practical on Avandar Desktop's on-disk cache.",
    approxSizeMb: 3100,
    desktopOnly: true,
  },
  {
    id: "whisper-large-v3-turbo",
    hubRepo: "Xenova/whisper-large-v3-turbo",
    displayName: "Whisper Large v3 Turbo (desktop only)",
    description:
      "Faster sibling of Large v3 with comparable accuracy. Desktop-only because the weights are still well above the web budget.",
    approxSizeMb: 1620,
    desktopOnly: true,
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
 * Returns models that the current platform can actually load. Used by the
 * default-picker logic so a user on web doesn't end up stuck on a
 * `desktopOnly` model that was selected on a previous desktop session.
 */
export function listModelsForPlatform(
  platform: "web" | "desktop",
): readonly VoiceModel[] {
  if (platform === "desktop") {
    return VOICE_MODELS;
  }
  return VOICE_MODELS.filter((m) => {
    return !m.desktopOnly;
  });
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
