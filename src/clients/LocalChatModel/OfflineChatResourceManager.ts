import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { createOfflineChatEngine } from "./createOfflineChatEngine/createOfflineChatEngine";
import { deleteLocalChatModelCache } from "@/clients/LocalChatModel/deleteLocalChatModelCache/deleteLocalChatModelCache";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import type { OfflineChatEngine } from "./offlineChat.types";

export type OfflineChatManagerStatus =
  | { kind: "idle" }
  | {
      kind: "downloading";
      modelId: LocalChatModel.Id;
      progress: number;
    }
  | { kind: "ready"; modelId: LocalChatModel.Id }
  | { kind: "error"; modelId: LocalChatModel.Id; message: string };

type Listener = (status: OfflineChatManagerStatus) => void;

/**
 * Singleton that owns the resident WebLLM engine used for offline chat.
 *
 * This is intentionally a class rather than a `createModule` module: it needs
 * genuinely *mutable* state (a single owner whose `subscribe` observers must
 * see in-place updates on one stable instance), and `createModule`'s generated
 * setters are immutable (each returns a new module), which would strand
 * existing subscribers.
 *
 * TODO(pablo): migrate this to `createModule` once the module library exposes
 * a mutable-state API.
 */
class OfflineChatResourceManagerImpl {
  private status: OfflineChatManagerStatus = { kind: "idle" };
  private listeners = new Set<Listener>();
  private engine: OfflineChatEngine | undefined;
  private loadedModelId: LocalChatModel.Id | undefined;

  /** Subscribes to status changes and immediately emits the current status. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Returns the current engine lifecycle status. */
  getStatus(): OfflineChatManagerStatus {
    return this.status;
  }

  private setStatus(status: OfflineChatManagerStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => {
      listener(status);
    });
  }

  /** Loads the selected model and returns its reusable chat engine. */
  async ensureEngine(modelId: LocalChatModel.Id): Promise<OfflineChatEngine> {
    if (this.engine && this.loadedModelId === modelId) {
      return this.engine;
    }
    await this.unload();
    this.setStatus({
      kind: "downloading",
      modelId,
      progress: 0,
    });
    const engine = createOfflineChatEngine({
      modelId,
      onDownloadProgress: (report) => {
        this.setStatus({
          kind: "downloading",
          modelId,
          progress: report.progress,
        });
      },
    });
    try {
      await engine.preload();
      this.engine = engine;
      this.loadedModelId = modelId;
      LocalChatModelStore.markDownloaded(modelId);
      this.setStatus({ kind: "ready", modelId });
      return engine;
    } catch (error) {
      this.engine = undefined;
      this.loadedModelId = undefined;
      const message =
        error instanceof Error ? error.message : "Failed to load offline model";
      this.setStatus({ kind: "error", modelId, message });
      throw error;
    }
  }

  /**
   * Removes cached WebLLM artifacts and the downloaded marker for `modelId`.
   * Unloads first when that model is resident in memory.
   */
  async deleteModel(modelId: LocalChatModel.Id): Promise<void> {
    if (this.loadedModelId === modelId) {
      await this.unload();
    }
    await deleteLocalChatModelCache(modelId);
    LocalChatModelStore.clearDownloaded(modelId);
    if (
      this.status.kind !== "idle" &&
      "modelId" in this.status &&
      this.status.modelId === modelId
    ) {
      this.setStatus({ kind: "idle" });
    }
  }

  /** Unloads the resident engine and resets lifecycle status. */
  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
    }
    this.engine = undefined;
    this.loadedModelId = undefined;
    if (this.status.kind !== "idle") {
      this.setStatus({ kind: "idle" });
    }
  }
}

/** Shared owner of the browser's resident offline chat engine. */
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
