/**
 * Offline WebLLM context window. web-llm's prebuiltAppConfig defaults to
 * 4096; Qwen2.5 declares 32,768. 8192 is the override passed as `chatOpts`.
 *
 * KV-cache bytes use published Qwen2.5-1.5B dims (default offline model):
 * 28 layers, 2 KV heads, head_dim 128, f16. That is 28,672 bytes/token, so
 * raising 4096 → 8192 adds 112 MiB of KV cache. Recheck if the default
 * model changes.
 */
export const OFFLINE_CHAT_CONTEXT_WINDOW_SIZE = 8192;

const QWEN_15B_NUM_LAYERS = 28;
const QWEN_15B_NUM_KV_HEADS = 2;
const QWEN_15B_HEAD_DIM = 128;
const F16_BYTES = 2;

/**
 * KV-cache bytes for Qwen2.5-1.5B at `contextWindowSize` tokens.
 */
export function estimateQwen15bKvCacheBytes(contextWindowSize: number): number {
  return (
    2 *
    QWEN_15B_NUM_LAYERS *
    QWEN_15B_NUM_KV_HEADS *
    QWEN_15B_HEAD_DIM *
    F16_BYTES *
    contextWindowSize
  );
}

/** ChatOpts passed as the third argument to `CreateMLCEngine`. */
export function buildWebLlmChatOpts(): { context_window_size: number } {
  return { context_window_size: OFFLINE_CHAT_CONTEXT_WINDOW_SIZE };
}
