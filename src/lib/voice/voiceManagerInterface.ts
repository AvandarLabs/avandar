/**
 * Shared interface that web and desktop voice managers both implement.
 * The chat composer and download indicator program against this surface
 * so the same React UI runs on both platforms with no per-platform
 * branching inside the components themselves.
 */

import type { VoiceDownloadFileEntry } from "./voiceDownloadProgress";
import type { VoiceLanguageCode, VoiceModelId } from "./voiceModels";

export type { VoiceDownloadFileEntry } from "./voiceDownloadProgress";

export type VoiceManagerStatus =
  | { kind: "idle" }
  | {
      kind: "downloading";
      modelId: VoiceModelId;
      /**
       * `files`: one row per HF asset (web) or weight file (desktop).
       * `loading`: all assets are on disk; the runtime is warming up.
       */
      phase: "files" | "loading";
      files: readonly VoiceDownloadFileEntry[];
    }
  | {
      kind: "loading";
      modelId: VoiceModelId;
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

export type IVoiceModelManager = {
  getStatus(): VoiceManagerStatus;
  subscribe(listener: VoiceManagerListener): () => void;
  isModelDownloaded(id: VoiceModelId): Promise<boolean>;
  ensureModelLoaded(
    id: VoiceModelId,
    options?: { silent?: boolean },
  ): Promise<void>;
  /** Removes cached weights and clears the downloaded marker for `id`. */
  deleteModel(id: VoiceModelId): Promise<void>;
  transcribe(
    audio: Float32Array,
    options: { modelId: VoiceModelId; language: VoiceLanguageCode },
  ): Promise<string>;
  /**
   * Drops the in-memory ASR runtime (web: whisper.cpp WASM; desktop: main
   * state only) so offline chat can load WebLLM. Cached weights stay on disk.
   */
  releaseLoadedPipeline(): Promise<void>;
};
