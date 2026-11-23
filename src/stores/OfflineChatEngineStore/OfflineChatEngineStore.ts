import { t } from "@lingui/core/macro";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { createLocalModelRuntime } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/createLocalModelRuntime";
import type { OfflineChatEngine } from "$/types/offlineChat.types";
import type {
  LocalLlm,
  LocalLlmCompletion,
} from "@/lib/agent/localModels/LocalLlm";
import type { JobId } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import type {
  LocalModelRequest,
  LocalModelRuntime,
} from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/createLocalModelRuntime";

/**
 * What the offline models are doing, for the offline mode control:
 * downloading the bundle (overall progress from 0 to 1), removing it, or
 * stopped after a failed download.
 */
export type OfflineChatEngineStatus =
  | { kind: "idle" }
  | { kind: "downloading"; progress: number }
  | { kind: "removing" }
  | { kind: "error"; message: string };

type Listener = (status: OfflineChatEngineStatus) => void;

function _getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : t`The offline models could not be loaded.`;
}

/**
 * Owns the browser's one in-browser model engine and the offline bundle's
 * lifecycle. It is the `LocalLlm` the offline data agent runs on: each
 * request names its model, and the store swaps the resident model when it
 * differs, so at most one model holds GPU memory at a time. Requests run
 * one at a time because there is one GPU.
 *
 * This is a class rather than a `createModule` module because it needs
 * mutable state on one stable instance that `subscribe` observers see in
 * place, and `createModule`'s generated setters return new modules.
 */
class OfflineChatEngineStoreImpl implements LocalLlm {
  private status: OfflineChatEngineStatus = { kind: "idle" };
  private listeners = new Set<Listener>();
  private runtime: LocalModelRuntime | undefined;
  private residentModelId: string | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  /** The live entry in {@link JobProgressStore}, while a load runs. */
  private jobId: JobId | undefined;

  /** Subscribes to status changes and immediately emits the current status. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Returns the current status. */
  getStatus(): OfflineChatEngineStatus {
    return this.status;
  }

  /** Runs one completion, loading the request's model first if needed. */
  complete = (
    request: Readonly<LocalModelRequest>,
  ): Promise<LocalLlmCompletion> => {
    return this._enqueue(async () => {
      await this._ensureResident(request.modelId);
      return this._getRuntime().complete(request);
    });
  };

  /**
   * Downloads every model in the offline bundle, in turn, as one job in
   * {@link JobProgressStore}, and marks each one downloaded. Afterwards no
   * model stays resident, so a user who never chats offline gets their GPU
   * memory back; the first offline question loads the answer model from
   * the browser cache.
   */
  downloadBundle(): Promise<void> {
    return this._enqueue(async () => {
      const modelIds = LocalChatModel.getModelIdsFromBundle(
        LocalChatModel.OFFLINE_BUNDLE,
      );
      this._startJob(t`Downloading offline models`);
      this._setStatus({ kind: "downloading", progress: 0 });
      try {
        await this._downloadModels(modelIds);
        await this._unloadResident();
        this._finishJob();
        this._setStatus({ kind: "idle" });
      } catch (error) {
        await this._unloadResident();
        this._failJob(error);
        throw error;
      }
    });
  }

  /** Deletes every bundle model from the browser cache and its marker. */
  deleteBundle(): Promise<void> {
    return this._enqueue(async () => {
      this._setStatus({ kind: "removing" });
      try {
        await this._unloadResident();
        const modelIds = LocalChatModel.getModelIdsFromBundle(
          LocalChatModel.OFFLINE_BUNDLE,
        );
        await Promise.all(
          modelIds.map(async (modelId) => {
            await this._getRuntime().deleteFromCache(modelId);
            LocalChatModelStore.clearDownloaded(modelId);
          }),
        );
      } finally {
        this._setStatus({ kind: "idle" });
      }
    });
  }

  /**
   * An {@link OfflineChatEngine} bound to the bundle's answer model, for the
   * multi-pass offline chat pipeline outside the Data Explorer.
   */
  async ensureEngine(): Promise<OfflineChatEngine> {
    const modelId = LocalChatModel.OFFLINE_BUNDLE.answer;
    return {
      preload: () => {
        return this._enqueue(() => {
          return this._ensureResident(modelId);
        });
      },
      complete: async (request) => {
        const completion = await this.complete({ ...request, modelId });
        return completion.text;
      },
      unload: () => {
        return this.unload();
      },
    };
  }

  /**
   * Frees the resident model and drops the runtime, so the next request
   * builds a new one (Playwright relies on this to pick up a new mock
   * script). Closes any load job it interrupts.
   */
  async unload(): Promise<void> {
    const runtime = this.runtime;
    this.runtime = undefined;
    this.residentModelId = undefined;
    this.queue = Promise.resolve();
    if (runtime) {
      await runtime.unload();
    }
    this._finishJob();
    this._setStatus({ kind: "idle" });
  }

  private async _downloadModels(
    modelIds: readonly LocalChatModel.Id[],
  ): Promise<void> {
    const sizesMb = modelIds.map((modelId) => {
      return LocalChatModel.Catalog.find(modelId).approxDownloadMb;
    });
    const totalMb = sizesMb.reduce((sum, sizeMb) => {
      return sum + sizeMb;
    }, 0);
    // Models download one after another: there is one engine, and loading
    // a model is what downloads it.
    await modelIds.reduce(async (previous, modelId, index) => {
      await previous;
      const doneMb = sizesMb.slice(0, index).reduce((sum, sizeMb) => {
        return sum + sizeMb;
      }, 0);
      const sizeMb = sizesMb[index] ?? 0;
      await this._loadModel(modelId, (progress) => {
        const overall = (doneMb + progress * sizeMb) / totalMb;
        this._setStatus({ kind: "downloading", progress: overall });
        this._reportJobProgress(overall);
      });
      LocalChatModelStore.markDownloaded(modelId);
    }, Promise.resolve());
  }

  /** Loads `modelId` unless it is already resident, as its own job. */
  private async _ensureResident(modelId: string): Promise<void> {
    if (this.residentModelId === modelId) {
      return;
    }
    this._startJob(t`Preparing offline models`);
    try {
      await this._loadModel(modelId, (progress) => {
        this._reportJobProgress(progress);
      });
      this._finishJob();
    } catch (error) {
      this._failJob(error);
      throw error;
    }
  }

  private async _loadModel(
    modelId: string,
    onProgress: (progress: number) => void,
  ): Promise<void> {
    this.residentModelId = undefined;
    await this._getRuntime().load(modelId, onProgress);
    this.residentModelId = modelId;
  }

  private async _unloadResident(): Promise<void> {
    if (this.runtime && this.residentModelId !== undefined) {
      await this.runtime.unload();
    }
    this.residentModelId = undefined;
  }

  private _getRuntime(): LocalModelRuntime {
    this.runtime ??= createLocalModelRuntime();
    return this.runtime;
  }

  /** Chains `task` after every earlier task, whether they failed or not. */
  private _enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => {
      // A failed task must not block the next one.
    });
    return run;
  }

  private _setStatus(status: OfflineChatEngineStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => {
      listener(status);
    });
  }

  private _startJob(label: string): void {
    this._finishJob();
    this.jobId = JobProgressStore.startJob(label, {
      detail: t`Keep this tab open until it finishes.`,
    });
  }

  private _reportJobProgress(progress: number): void {
    const entry = this.jobId ? JobProgressStore.getJob(this.jobId) : undefined;
    if (this.jobId && entry && entry.status !== "error") {
      JobProgressStore.updateJob(this.jobId, {
        status: "determinate",
        label: entry.label,
        detail: entry.detail,
        current: Math.round(progress * 100),
        total: 100,
      });
    }
  }

  private _finishJob(): void {
    if (this.jobId !== undefined) {
      JobProgressStore.finishJob(this.jobId);
      this.jobId = undefined;
    }
  }

  private _failJob(error: unknown): void {
    const message = _getErrorMessage(error);
    if (this.jobId !== undefined) {
      JobProgressStore.failJob(this.jobId, message);
      this.jobId = undefined;
    }
    this._setStatus({ kind: "error", message });
  }
}

/** Shared owner of the browser's offline models. */
export const OfflineChatEngineStore = new OfflineChatEngineStoreImpl();

declare global {
  interface Window {
    /**
     * Playwright: drop the runtime so the next turn picks up an updated mock
     * script.
     */
    __resetOfflineChatEngine?: () => Promise<void>;
  }
}

if (
  typeof window !== "undefined" &&
  import.meta.env.VITE_OFFLINE_CHAT_MOCK === "true"
) {
  window.__resetOfflineChatEngine = async () => {
    await OfflineChatEngineStore.unload();
  };
}
