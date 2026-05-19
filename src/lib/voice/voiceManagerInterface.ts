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

export type IVoiceModelManager = {
  getStatus(): VoiceManagerStatus;
  subscribe(listener: VoiceManagerListener): () => void;
  isModelDownloaded(id: VoiceModelId): Promise<boolean>;
  ensureModelLoaded(id: VoiceModelId): Promise<void>;
  transcribe(
    audio: Float32Array,
    options: { modelId: VoiceModelId; language?: VoiceLanguageCode },
  ): Promise<string>;
};
