import type {
  LocalChatModelBundle,
  LocalChatModelSpec,
} from "$/models/chat/LocalChatModel/LocalChatModel.types.ts";

/**
 * Size figures for every local model offline mode can use, keyed by WebLLM
 * model id. Holds only the models `OFFLINE_MODEL_BUNDLE` names. Adding a key
 * here is what makes an id valid in `OFFLINE_MODEL_BUNDLE`.
 *
 * `peakMemoryMb` is WebLLM's `vram_required_MB` at its default 4,096-token
 * window plus the KV cache for the larger window the app sets (see
 * `OFFLINE_CHAT_CONTEXT_WINDOW_SIZE`). For Qwen3-4B that is 3,432 MB plus
 * 576 MB.
 */
export const LOCAL_CHAT_MODEL_SPECS = {
  "Qwen3-4B-q4f16_1-MLC": {
    approxDownloadMb: 2200,
    peakMemoryMb: 4000,
    minRamGb: 16,
  },
} as const satisfies Record<string, LocalChatModelSpec>;

/**
 * The offline models Avandar downloads when a user turns on offline mode,
 * and the job each one does. Users never pick a model: this constant is the
 * whole choice, read by the offline mode dialog (download size), the
 * download itself, and the offline chat runtime.
 *
 * To swap a model, change its id here. A model not yet in
 * `LOCAL_CHAT_MODEL_SPECS` needs its size figures added there too, and must
 * still pass the 16 GB budget test in `LocalChatModelModule.test.ts`.
 */
export const OFFLINE_MODEL_BUNDLE: LocalChatModelBundle = {
  answer: "Qwen3-4B-q4f16_1-MLC",
  router: "Qwen3-4B-q4f16_1-MLC",
};

/**
 * The most GPU memory offline models may hold at once, so offline mode fits
 * a 16 GB computer running Chrome, the app, and DuckDB. Only one large model
 * is resident at a time, so this caps the largest model in the bundle.
 */
export const PEAK_MODEL_MEMORY_BUDGET_MB = 4500;
