import { buildRamRequirementLabel } from "@/lib/localModels/modelSystemRequirements";
import type { ModelSystemRequirements } from "@/lib/localModels/modelSystemRequirements";

/**
 * Whisper.cpp voice models (WASM on web, native whisper.cpp on Desktop).
 * Weights come from `ggerganov/whisper.cpp` on Hugging Face.
 *
 * Web ships quantized q5_1 ggml (tiny and base). Desktop uses full-precision
 * ggml for every catalog entry.
 */

export type WhisperCppVoiceModelId =
  | "whisper-tiny"
  | "whisper-base"
  | "whisper-small"
  | "whisper-medium"
  | "whisper-large-v3-turbo"
  | "whisper-large-v3";

export type WhisperCppVoiceModel = {
  id: WhisperCppVoiceModelId;
  displayName: string;
  description: string;
  /**
   * ggml file stem on HF without the `ggml-` prefix or `.bin` suffix, for
   * full-precision desktop downloads (e.g. `tiny` -> `ggml-tiny.bin`).
   */
  desktopGgmlStem: string;
  /**
   * Quantized ggml stem for web WASM when available (e.g. `tiny-q5_1`).
   * Omitted when the model is not offered on web.
   */
  webGgmlQuantStem?: string;
  /** Approximate download size on web (quantized ggml), if offered. */
  approxSizeMbWeb?: number;
  /** Approximate download size on desktop (full ggml). */
  approxSizeMbDesktop: number;
} & ModelSystemRequirements;

export const WHISPER_CPP_VOICE_MODELS: readonly WhisperCppVoiceModel[] = [
  {
    id: "whisper-tiny",
    displayName: "Whisper Tiny",
    description:
      "Fastest download and lowest RAM use. Best for short, clear phrases.",
    desktopGgmlStem: "tiny",
    webGgmlQuantStem: "tiny-q5_1",
    approxSizeMbWeb: 31,
    approxSizeMbDesktop: 78,
    minRamGb: 4,
    systemRequirements: buildRamRequirementLabel(4),
    recommendedIf:
      "Recommended if you have 4 GB RAM or very limited storage and bandwidth.",
  },
  {
    id: "whisper-base",
    displayName: "Whisper Base",
    description:
      "Better than Tiny for accents and non-English audio with a modest download.",
    desktopGgmlStem: "base",
    webGgmlQuantStem: "base-q5_1",
    approxSizeMbWeb: 57,
    approxSizeMbDesktop: 148,
    minRamGb: 8,
    systemRequirements: buildRamRequirementLabel(8),
    recommendedIf:
      "Recommended if you have about 8 GB RAM and want better accuracy than Tiny.",
  },
  {
    id: "whisper-small",
    displayName: "Whisper Small",
    description:
      "Stronger accuracy than Base for longer dictation and noisier audio.",
    desktopGgmlStem: "small",
    approxSizeMbDesktop: 488,
    minRamGb: 8,
    systemRequirements: buildRamRequirementLabel(8),
    recommendedIf:
      "Recommended if you have 8 GB RAM and can accept a larger download.",
  },
  {
    id: "whisper-medium",
    displayName: "Whisper Medium",
    description:
      "Markedly better for noisy audio and code-switching. Large ggml download.",
    desktopGgmlStem: "medium",
    approxSizeMbDesktop: 1534,
    minRamGb: 16,
    systemRequirements: buildRamRequirementLabel(16),
    recommendedIf:
      "Recommended if you have 16 GB RAM and record in noisy environments.",
  },
  {
    id: "whisper-large-v3-turbo",
    displayName: "Whisper Large v3 Turbo",
    description:
      "Near top-tier accuracy with a smaller footprint than full Large v3.",
    desktopGgmlStem: "large-v3-turbo",
    approxSizeMbDesktop: 1625,
    minRamGb: 24,
    systemRequirements: buildRamRequirementLabel(24),
    recommendedIf:
      "Recommended if you have 24 GB RAM and want high accuracy without the largest download.",
  },
  {
    id: "whisper-large-v3",
    displayName: "Whisper Large v3",
    description:
      "Highest-accuracy open Whisper ggml weights. Multi-GB; needs ample RAM.",
    desktopGgmlStem: "large-v3",
    approxSizeMbDesktop: 3095,
    minRamGb: 32,
    systemRequirements: buildRamRequirementLabel(32),
    recommendedIf:
      "Recommended if you have 32 GB RAM and need the best dictation quality.",
  },
] as const;

export const DEFAULT_WHISPER_CPP_VOICE_MODEL_ID: WhisperCppVoiceModelId =
  "whisper-tiny";

const WHISPER_CPP_VOICE_MODEL_ID_SET = new Set<string>(
  WHISPER_CPP_VOICE_MODELS.map((model) => {
    return model.id;
  }),
);

export function isWhisperCppVoiceModelId(
  id: string,
): id is WhisperCppVoiceModelId {
  return WHISPER_CPP_VOICE_MODEL_ID_SET.has(id);
}

export function findWhisperCppVoiceModel(
  id: WhisperCppVoiceModelId,
): WhisperCppVoiceModel {
  const model = WHISPER_CPP_VOICE_MODELS.find((entry) => {
    return entry.id === id;
  });
  if (!model) {
    throw new Error(`Unknown whisper.cpp voice model id: ${id}`);
  }
  return model;
}

/** Approximate download size shown in the voice model picker. */
export function whisperCppApproxDownloadSizeMb(
  model: WhisperCppVoiceModel,
  platform: "web" | "desktop",
): number {
  if (platform === "web") {
    return model.approxSizeMbWeb ?? model.approxSizeMbDesktop;
  }
  return model.approxSizeMbDesktop;
}

/** Whether whisper.cpp can load this model on the given platform. */
export function isWhisperCppModelAvailableOnPlatform(
  model: WhisperCppVoiceModel,
  platform: "web" | "desktop",
): boolean {
  if (platform === "desktop") {
    return true;
  }
  return model.webGgmlQuantStem !== undefined;
}

function compareWhisperCppModelsForPicker(
  left: WhisperCppVoiceModel,
  right: WhisperCppVoiceModel,
  platform: "web" | "desktop",
): number {
  if (left.minRamGb !== right.minRamGb) {
    return left.minRamGb - right.minRamGb;
  }
  return (
    whisperCppApproxDownloadSizeMb(left, platform) -
    whisperCppApproxDownloadSizeMb(right, platform)
  );
}

/** Full catalog sorted by RAM tier, then download size (smallest first). */
export function listWhisperCppVoiceModelsSorted(
  platform: "web" | "desktop",
): readonly WhisperCppVoiceModel[] {
  return [...WHISPER_CPP_VOICE_MODELS].sort((left, right) => {
    return compareWhisperCppModelsForPicker(left, right, platform);
  });
}

/**
 * Models that can run on the current platform (subset of the sorted catalog).
 */
export function listWhisperCppModelsForPlatform(
  platform: "web" | "desktop",
): readonly WhisperCppVoiceModel[] {
  return listWhisperCppVoiceModelsSorted(platform).filter((model) => {
    return isWhisperCppModelAvailableOnPlatform(model, platform);
  });
}
