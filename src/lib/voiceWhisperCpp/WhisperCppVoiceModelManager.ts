import { OfflineChatResourceManager } from "@/lib/offlineChat/OfflineChatResourceManager";
import { createDownloadingStatus } from "@/lib/voice/voiceDownloadProgress";
import { isSameVoiceManagerStatus } from "@/lib/voice/voiceManagerInterface";
import { downloadWhisperCppModelToCache } from "./downloadWhisperCppModel";
import {
  deleteWhisperCppModelFromCache,
  getWhisperCppModelBytes,
  hasWhisperCppModelInCache,
} from "./whisperCppModelCache";
import {
  loadWhisperCppModelBytes,
  releaseWhisperCppRuntime,
  transcribeWithWhisperCpp,
} from "./whisperCppRuntime";
import {
  clearWhisperCppVoiceModelDownloaded,
  markWhisperCppVoiceModelDownloaded,
} from "./whisperCppVoiceModelStore";
import { ggmlFileNameForVoiceModelId } from "./whisperGgml";
import type {
  IVoiceModelManager,
  VoiceManagerListener,
  VoiceManagerStatus,
} from "@/lib/voice/voiceManagerInterface";
import type { VoiceLanguageCode, VoiceModelId } from "@/lib/voice/voiceModels";

/**
 * Web-only whisper.cpp WASM voice manager. Downloads ggml weights into
 * IndexedDB, then runs WASM inference on the main thread.
 */
export class WhisperCppVoiceModelManager implements IVoiceModelManager {
  private status: VoiceManagerStatus = { kind: "idle" };
  private readonly listeners = new Set<VoiceManagerListener>();
  private loadedModelId: VoiceModelId | null = null;
  private readonly downloadInFlight = new Map<VoiceModelId, Promise<void>>();
  private readonly loadInFlight = new Map<VoiceModelId, Promise<void>>();

  getStatus(): VoiceManagerStatus {
    return this.status;
  }

  subscribe(listener: VoiceManagerListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(next: VoiceManagerStatus): void {
    if (isSameVoiceManagerStatus(this.status, next)) {
      return;
    }
    this.status = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  async isModelDownloaded(id: VoiceModelId): Promise<boolean> {
    return hasWhisperCppModelInCache(id);
  }

  /** Streams ggml weights into IndexedDB only (no WASM init). */
  async ensureModelDownloaded(id: VoiceModelId): Promise<void> {
    if (await hasWhisperCppModelInCache(id)) {
      markWhisperCppVoiceModelDownloaded(id);
      return;
    }

    const inFlight = this.downloadInFlight.get(id);
    if (inFlight) {
      return inFlight;
    }

    const downloadPromise = this.runEnsureModelDownloaded(id);
    this.downloadInFlight.set(id, downloadPromise);
    try {
      await downloadPromise;
    } finally {
      this.downloadInFlight.delete(id);
    }
  }

  private async runEnsureModelDownloaded(id: VoiceModelId): Promise<void> {
    const fileName = ggmlFileNameForVoiceModelId(id, "web");
    this.setStatus({
      ...createDownloadingStatus(id),
      files: [
        {
          fileName,
          progressPercent: 0,
          state: "downloading",
        },
      ],
    });

    try {
      await downloadWhisperCppModelToCache(id, (progressPercent) => {
        if (this.status.kind !== "downloading" || this.status.modelId !== id) {
          return;
        }
        this.setStatus({
          ...this.status,
          files: [
            {
              fileName,
              progressPercent,
              state:
                progressPercent >= 100 ?
                  ("complete" as const)
                : ("downloading" as const),
            },
          ],
        });
      });
      markWhisperCppVoiceModelDownloaded(id);
      this.setStatus({ kind: "idle" });
    } catch (error) {
      clearWhisperCppVoiceModelDownloaded(id);
      await deleteWhisperCppModelFromCache(id).catch(() => {
        return undefined;
      });
      const message =
        error instanceof Error ?
          error.message
        : "Failed to download voice model";
      this.setStatus({ kind: "error", modelId: id, message });
      throw error;
    }
  }

  async ensureModelLoaded(
    id: VoiceModelId,
    options: { silent?: boolean } = {},
  ): Promise<void> {
    if (this.loadedModelId === id) {
      return;
    }

    const inFlight = this.loadInFlight.get(id);
    if (inFlight) {
      return inFlight;
    }

    const loadPromise = this.runEnsureModelLoaded(id, options.silent === true);
    this.loadInFlight.set(id, loadPromise);
    try {
      await loadPromise;
    } finally {
      this.loadInFlight.delete(id);
    }
  }

  private async runEnsureModelLoaded(
    id: VoiceModelId,
    silent: boolean,
  ): Promise<void> {
    await OfflineChatResourceManager.releaseForVoice();

    const cached = await getWhisperCppModelBytes(id);
    if (!cached || cached.byteLength === 0) {
      throw new Error(
        "Voice model is not downloaded. Download it before dictating.",
      );
    }

    if (!silent) {
      this.setStatus({
        kind: "loading",
        modelId: id,
      });
    }

    try {
      const modelBytes = new Uint8Array(cached);
      const fileName = ggmlFileNameForVoiceModelId(id, "web");
      await loadWhisperCppModelBytes(id, modelBytes, fileName);
      this.loadedModelId = id;
      markWhisperCppVoiceModelDownloaded(id);
      if (!silent) {
        this.setStatus({ kind: "ready", modelId: id });
      }
    } catch (error) {
      this.loadedModelId = null;
      await releaseWhisperCppRuntime().catch(() => {
        return undefined;
      });
      const message =
        error instanceof Error ? error.message : "Failed to load voice model";
      if (!silent) {
        this.setStatus({ kind: "error", modelId: id, message });
      }
      throw error;
    }
  }

  async deleteModel(id: VoiceModelId): Promise<void> {
    if (this.loadedModelId === id) {
      await this.releaseLoadedPipeline();
    }
    clearWhisperCppVoiceModelDownloaded(id);
    await deleteWhisperCppModelFromCache(id);
    if (
      this.status.kind !== "idle" &&
      ("modelId" in this.status ? this.status.modelId === id : false)
    ) {
      this.setStatus({ kind: "idle" });
    }
  }

  async transcribe(
    audio: Float32Array,
    options: { modelId: VoiceModelId; language: VoiceLanguageCode },
  ): Promise<string> {
    await this.ensureModelLoaded(options.modelId);
    this.setStatus({ kind: "transcribing", modelId: options.modelId });
    try {
      const text = await transcribeWithWhisperCpp(audio, options.language);
      this.setStatus({ kind: "ready", modelId: options.modelId });
      return text;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transcription failed";
      this.setStatus({
        kind: "error",
        modelId: options.modelId,
        message,
      });
      throw error;
    }
  }

  async releaseLoadedPipeline(): Promise<void> {
    await releaseWhisperCppRuntime();
    this.loadedModelId = null;
    this.loadInFlight.clear();
    if (this.status.kind !== "idle") {
      this.setStatus({ kind: "idle" });
    }
  }
}

let webSingleton: WhisperCppVoiceModelManager | null = null;

export function getWebWhisperCppVoiceModelManager(): // eslint-disable-line max-len -- export name
WhisperCppVoiceModelManager {
  if (!webSingleton) {
    webSingleton = new WhisperCppVoiceModelManager();
  }
  return webSingleton;
}

export const __TEST_ONLY = {
  resetSingletonForTests(): void {
    webSingleton = null;
  },
};
