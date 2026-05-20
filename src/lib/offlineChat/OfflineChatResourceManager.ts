import { releaseAllVoiceRuntimes } from "@/lib/voiceWhisperCpp/releaseAllVoiceRuntimes";
import { createOfflineChatEngine } from "./createOfflineChatEngine";
import { markLocalChatModelDownloaded } from "./localChatModelStore";
import type { LocalChatModelId } from "./localChatModelCatalog";
import type { OfflineChatEngine } from "./offlineChat.types";

export type OfflineChatManagerStatus =
  | { kind: "idle" }
  | {
      kind: "downloading";
      modelId: LocalChatModelId;
      progress: number;
      statusText: string;
    }
  | { kind: "ready"; modelId: LocalChatModelId }
  | { kind: "error"; modelId: LocalChatModelId; message: string };

type Listener = (status: OfflineChatManagerStatus) => void;

/**
 * Singleton that owns the resident WebLLM engine. Voice transcription must call
 * `releaseForVoice()` before loading Whisper. Chat calls `releaseAllVoiceRuntimes`
 * before WebLLM so voice and LLM are never resident together.
 */
class OfflineChatResourceManagerImpl {
  private status: OfflineChatManagerStatus = { kind: "idle" };
  private listeners = new Set<Listener>();
  private engine: OfflineChatEngine | null = null;
  private loadedModelId: LocalChatModelId | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): OfflineChatManagerStatus {
    return this.status;
  }

  private setStatus(next: OfflineChatManagerStatus): void {
    this.status = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  async ensureEngine(modelId: LocalChatModelId): Promise<OfflineChatEngine> {
    await releaseAllVoiceRuntimes();
    if (this.engine && this.loadedModelId === modelId) {
      return this.engine;
    }
    await this.unload();
    this.setStatus({
      kind: "downloading",
      modelId,
      progress: 0,
      statusText: "Preparing offline chat model…",
    });
    const engine = createOfflineChatEngine({
      modelId,
      onDownloadProgress: (report) => {
        this.setStatus({
          kind: "downloading",
          modelId,
          progress: report.progress,
          statusText: report.text,
        });
      },
    });
    try {
      await engine.preload();
      this.engine = engine;
      this.loadedModelId = modelId;
      markLocalChatModelDownloaded(modelId);
      this.setStatus({ kind: "ready", modelId });
      return engine;
    } catch (error) {
      this.engine = null;
      this.loadedModelId = null;
      const message =
        error instanceof Error ? error.message : "Failed to load offline model";
      this.setStatus({ kind: "error", modelId, message });
      throw error;
    }
  }

  async releaseForVoice(): Promise<void> {
    await this.unload();
  }

  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
    }
    this.engine = null;
    this.loadedModelId = null;
    if (this.status.kind !== "idle") {
      this.setStatus({ kind: "idle" });
    }
  }
}

export const OfflineChatResourceManager = new OfflineChatResourceManagerImpl();

declare global {
  interface Window {
    /** Playwright: drop cached engine so the next turn picks up an updated
     * mock script. */
    __resetOfflineChatEngine?: () => Promise<void>;
  }
}

if (
  typeof window !== "undefined" &&
  import.meta.env.VITE_OFFLINE_CHAT_MOCK === "true"
) {
  window.__resetOfflineChatEngine = async () => {
    await OfflineChatResourceManager.unload();
  };
}
