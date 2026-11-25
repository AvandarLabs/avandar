import { createMockLocalModelRuntime } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/createMockLocalModelRuntime";
import { createWebLlmModelRuntime } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/createWebLlmModelRuntime";
import { isOfflineChatMockForced } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/isOfflineChatMockForced";
import type {
  LocalLlmCompletion,
  LocalLlmRequest,
} from "@/lib/agent/localModels/LocalLlm";
import type { MockOfflineChatResponse } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/createMockLocalModelRuntime";

/** A local model completion, optionally streamed token by token. */
export type LocalModelRequest = LocalLlmRequest & {
  onToken?: (delta: string) => void;
};

/**
 * One in-browser model engine that holds one resident model at a time. The
 * caller decides which model is resident; the runtime only loads, runs, and
 * deletes.
 */
export type LocalModelRuntime = {
  /**
   * Makes `modelId` the resident model, downloading it first when the
   * browser cache lacks it. Reports progress from 0 to 1.
   */
  load: (
    modelId: string,
    onProgress?: (progress: number) => void,
  ) => Promise<void>;
  /** Runs one completion on the resident model. */
  complete: (
    request: Readonly<LocalModelRequest>,
  ) => Promise<LocalLlmCompletion>;
  /** Frees the resident model's memory. */
  unload: () => Promise<void>;
  /** Deletes a model's weights from the browser cache. */
  deleteFromCache: (modelId: string) => Promise<void>;
};

const DEFAULT_MOCK_SCRIPT: readonly MockOfflineChatResponse[] = [
  {
    match: "offline assistant",
    response: '{"summary":"Mock analyze","proceed":true}',
  },
  {
    match: "DuckDB SQL generator",
    response: "Here is the query.\n```sql\nSELECT 1 AS mock_offline\n```",
  },
];

/**
 * Creates the runtime offline chat runs on: WebLLM in the app, or a scripted
 * mock when `VITE_OFFLINE_CHAT_MOCK` is set or a test installs
 * `window.__AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__`.
 */
export function createLocalModelRuntime(): LocalModelRuntime {
  const windowScript =
    typeof window !== "undefined"
      ? window.__AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__
      : undefined;
  if (isOfflineChatMockForced() || windowScript) {
    return createMockLocalModelRuntime(windowScript ?? DEFAULT_MOCK_SCRIPT);
  }
  return createWebLlmModelRuntime();
}
