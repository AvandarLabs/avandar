import { OfflineChatResourceManager } from "@/lib/offlineChat/OfflineChatResourceManager";
import { getVoiceModelManager } from "@/lib/voice/voiceModelManagerFactory";
import {
  createDownloadingStatus,
  VOICE_MODEL_LOADING_ROW_FILE_NAME,
} from "@/lib/voice/voiceDownloadProgress";
import {
  isSameVoiceManagerStatus,
  type IVoiceModelManager,
  type VoiceManagerListener,
  type VoiceManagerStatus,
} from "@/lib/voice/voiceManagerInterface";
import type { VoiceLanguageCode, VoiceModelId } from "@/lib/voice/voiceModels";
import { ggmlFileNameForVoiceModelId, ggmlUrlForVoiceModelId } from "./whisperGgml";
import {
  clearWhisperCppVoiceModelDownloaded,
  isWhisperCppVoiceModelMarkedDownloaded,
  markWhisperCppVoiceModelDownloaded,
} from "./whisperCppVoiceModelStore";
import type {
  WhisperCppWorkerRequest,
  WhisperCppWorkerResponse,
} from "./whisperCppVoice.worker";

type PendingCall = {
  resolve: (value: string | undefined) => void;
  reject: (error: Error) => void;
};

/**
 * Web-only whisper.cpp WASM voice manager. Inference runs in a dedicated
 * worker; only one ggml model is loaded in the worker at a time.
 */
export class WhisperCppVoiceModelManager implements IVoiceModelManager {
  private status: VoiceManagerStatus = { kind: "idle" };
  private readonly listeners = new Set<VoiceManagerListener>();
  private worker: Worker | null = null;
  private readonly pending = new Map<string, PendingCall>();
  private loadedModelId: VoiceModelId | null = null;
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

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }
    const worker = new Worker(
      new URL("./whisperCppVoice.worker.ts", import.meta.url),
      { type: "module", name: "whisper-cpp-voice" },
    );
    worker.addEventListener("message", (event: MessageEvent) => {
      this.handleWorkerMessage(event.data as WhisperCppWorkerResponse);
    });
    this.worker = worker;
    return worker;
  }

  private handleWorkerMessage(message: WhisperCppWorkerResponse): void {
    if (message.type === "progress") {
      if (this.status.kind !== "downloading") {
        return;
      }
      const fileName = message.fileName;
      const files = this.status.files.map((file) => {
        if (file.fileName === fileName) {
          return {
            ...file,
            progressPercent: message.progressPercent,
            state: "downloading" as const,
          };
        }
        return file;
      });
      const hasFile = files.some((file) => {
        return file.fileName === fileName;
      });
      const nextFiles =
        hasFile ?
          files
        : [
            ...files,
            {
              fileName,
              progressPercent: message.progressPercent,
              state: "downloading" as const,
            },
          ];
      this.setStatus({
        ...this.status,
        files: nextFiles,
      });
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }
    this.pending.delete(message.id);
    if (message.type === "error") {
      pending.reject(new Error(message.message));
      return;
    }
    pending.resolve(message.result);
  }

  private postToWorker(
    request: Omit<WhisperCppWorkerRequest, "id">,
    transfer?: Transferable[],
  ): Promise<string | undefined> {
    const worker = this.ensureWorker();
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const payload = { ...request, id } as WhisperCppWorkerRequest;
      if (transfer && transfer.length > 0) {
        worker.postMessage(payload, transfer);
      } else {
        worker.postMessage(payload);
      }
    });
  }

  async isModelDownloaded(id: VoiceModelId): Promise<boolean> {
    return isWhisperCppVoiceModelMarkedDownloaded(id);
  }

  async ensureModelLoaded(id: VoiceModelId): Promise<void> {
    if (this.loadedModelId === id && this.status.kind === "ready") {
      return;
    }

    const inFlight = this.loadInFlight.get(id);
    if (inFlight) {
      return inFlight;
    }

    const loadPromise = this.runEnsureModelLoaded(id);
    this.loadInFlight.set(id, loadPromise);
    try {
      await loadPromise;
    } finally {
      this.loadInFlight.delete(id);
    }
  }

  private async runEnsureModelLoaded(id: VoiceModelId): Promise<void> {
    await OfflineChatResourceManager.releaseForVoice();
    await getVoiceModelManager().releaseLoadedPipeline();

    const alreadyOnDevice = await this.isModelDownloaded(id);
    const fileName = ggmlFileNameForVoiceModelId(id);
    this.setStatus(
      alreadyOnDevice ?
        { kind: "loading", modelId: id }
      : {
          ...createDownloadingStatus(id),
          files: [
            {
              fileName,
              progressPercent: 0,
              state: "pending",
            },
          ],
        },
    );

    try {
      if (!alreadyOnDevice) {
        this.setStatus({
          kind: "downloading",
          modelId: id,
          phase: "files",
          files: [
            {
              fileName,
              progressPercent: 0,
              state: "downloading",
            },
          ],
        });
      } else {
        this.setStatus({
          kind: "downloading",
          modelId: id,
          phase: "loading",
          files: [
            {
              fileName,
              progressPercent: 100,
              state: "complete",
            },
            {
              fileName: VOICE_MODEL_LOADING_ROW_FILE_NAME,
              progressPercent: 0,
              state: "downloading",
            },
          ],
        });
      }

      const modelUrl = ggmlUrlForVoiceModelId(id);
      await this.postToWorker({ type: "loadModel", modelUrl });
      this.loadedModelId = id;
      markWhisperCppVoiceModelDownloaded(id);
      this.setStatus({ kind: "ready", modelId: id });
    } catch (error) {
      this.loadedModelId = null;
      clearWhisperCppVoiceModelDownloaded(id);
      await this.postToWorker({ type: "clearModelCache" }).catch(() => {
        return undefined;
      });
      const message =
        error instanceof Error ? error.message : "Failed to load voice model";
      this.setStatus({ kind: "error", modelId: id, message });
      throw error;
    }
  }

  async deleteModel(id: VoiceModelId): Promise<void> {
    if (this.loadedModelId === id) {
      await this.releaseLoadedPipeline();
    }
    clearWhisperCppVoiceModelDownloaded(id);
    await this.postToWorker({ type: "clearModelCache" }).catch(() => {
      return undefined;
    });
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
      const pcm = audio.slice();
      const text = await this.postToWorker(
        {
          type: "transcribe",
          audio: pcm,
          language: options.language,
        },
        [pcm.buffer],
      );
      this.setStatus({ kind: "ready", modelId: options.modelId });
      return (text ?? "").trim();
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
    if (this.worker) {
      await this.postToWorker({ type: "release" }).catch(() => {
        return undefined;
      });
      this.worker.terminate();
      this.worker = null;
    }
    this.pending.clear();
    this.loadedModelId = null;
    this.loadInFlight.clear();
    if (this.status.kind !== "idle") {
      this.setStatus({ kind: "idle" });
    }
  }
}

let webSingleton: WhisperCppVoiceModelManager | null = null;

export function getWebWhisperCppVoiceModelManager()
: WhisperCppVoiceModelManager {
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
