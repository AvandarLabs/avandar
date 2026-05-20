/**
 * Shared interface that web and desktop voice managers both implement.
 * The chat composer and download indicator program against this surface
 * so the same React UI runs on both platforms with no per-platform
 * branching inside the components themselves.
 */

import type { VoiceLanguageCode, VoiceModelId } from "./voiceModels";

export type VoiceManagerStatus =
  | { kind: "idle" }
  | {
      kind: "downloading";
      modelId: VoiceModelId;
      /** 0–100. -1 means "indeterminate / starting". */
      progressPercent: number;
      currentFile?: string;
    }
  | { kind: "ready"; modelId: VoiceModelId }
  | { kind: "transcribing"; modelId: VoiceModelId }
  | { kind: "error"; modelId?: VoiceModelId; message: string };

export type VoiceManagerListener = (status: VoiceManagerStatus) => void;

/** Returns true when two status snapshots are equivalent for UI updates. */
export function isSameVoiceManagerStatus(
  left: VoiceManagerStatus,
  right: VoiceManagerStatus,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Keeps download progress monotonic and never drops back to indeterminate (-1)
 * once a numeric percent has been reported (e.g. between HF asset files).
 */
export function mergeDownloadingProgressPercent(
  previous: VoiceManagerStatus,
  modelId: VoiceModelId,
  nextPercent: number,
): number {
  const previousPercent =
    previous.kind === "downloading" && previous.modelId === modelId ?
      previous.progressPercent
    : -1;
  if (nextPercent < 0) {
    return previousPercent >= 0 ? previousPercent : -1;
  }
  return previousPercent >= 0 ?
      Math.max(previousPercent, nextPercent)
    : nextPercent;
}

export type IVoiceModelManager = {
  getStatus(): VoiceManagerStatus;
  subscribe(listener: VoiceManagerListener): () => void;
  isModelDownloaded(id: VoiceModelId): Promise<boolean>;
  ensureModelLoaded(id: VoiceModelId): Promise<void>;
  /** Removes cached weights and clears the downloaded marker for `id`. */
  deleteModel(id: VoiceModelId): Promise<void>;
  transcribe(
    audio: Float32Array,
    options: { modelId: VoiceModelId; language?: VoiceLanguageCode },
  ): Promise<string>;
};
