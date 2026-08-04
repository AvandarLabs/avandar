import { createModule } from "@modules";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { createOfflineChatEngine } from "./createOfflineChatEngine";
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
 * Shared owner of the browser's resident WebLLM engine used for offline chat.
 *
 * The state lives in closures inside the builder rather than in the
 * `createModule` getters/setters on purpose: those setters are immutable (they
 * each return a *new* module), but this is a single mutable owner with an
 * observer/`subscribe` contract and a resident engine, so every consumer must
 * see in-place updates on one stable instance and be notified on change.
 */
export const OfflineChatResourceManager = createModule(
  "OfflineChatResourceManager",
  {
    builder: () => {
      let status: OfflineChatManagerStatus = { kind: "idle" };
      const listeners = new Set<Listener>();
      let engine: OfflineChatEngine | undefined;
      let loadedModelId: LocalChatModel.Id | undefined;

      const setStatus = (nextStatus: OfflineChatManagerStatus): void => {
        status = nextStatus;
        listeners.forEach((listener) => {
          listener(nextStatus);
        });
      };

      const unload = async (): Promise<void> => {
        if (engine) {
          await engine.unload();
        }
        engine = undefined;
        loadedModelId = undefined;
        if (status.kind !== "idle") {
          setStatus({ kind: "idle" });
        }
      };

      return {
        /** Subscribes to status changes and emits the current status now. */
        subscribe: (listener: Listener): (() => void) => {
          listeners.add(listener);
          listener(status);
          return () => {
            listeners.delete(listener);
          };
        },

        /** Returns the current engine lifecycle status. */
        getStatus: (): OfflineChatManagerStatus => {
          return status;
        },

        /** Loads the selected model and returns its reusable chat engine. */
        ensureEngine: async (
          modelId: LocalChatModel.Id,
        ): Promise<OfflineChatEngine> => {
          if (engine && loadedModelId === modelId) {
            return engine;
          }
          await unload();
          setStatus({ kind: "downloading", modelId, progress: 0 });
          const nextEngine = createOfflineChatEngine({
            modelId,
            onDownloadProgress: (report) => {
              setStatus({ kind: "downloading", modelId, progress: report.progress });
            },
          });
          try {
            await nextEngine.preload();
            engine = nextEngine;
            loadedModelId = modelId;
            LocalChatModelStore.markDownloaded(modelId);
            setStatus({ kind: "ready", modelId });
            return nextEngine;
          } catch (error) {
            engine = undefined;
            loadedModelId = undefined;
            const message =
              error instanceof Error ?
                error.message
              : "Failed to load offline model";
            setStatus({ kind: "error", modelId, message });
            throw error;
          }
        },

        /**
         * Removes cached WebLLM artifacts and the downloaded marker for
         * `modelId`. Unloads first when that model is resident in memory.
         */
        deleteModel: async (modelId: LocalChatModel.Id): Promise<void> => {
          if (loadedModelId === modelId) {
            await unload();
          }
          await deleteLocalChatModelCache(modelId);
          LocalChatModelStore.clearDownloaded(modelId);
          if (
            status.kind !== "idle" &&
            "modelId" in status &&
            status.modelId === modelId
          ) {
            setStatus({ kind: "idle" });
          }
        },

        /** Unloads the resident engine and resets lifecycle status. */
        unload,
      };
    },
  },
);

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
