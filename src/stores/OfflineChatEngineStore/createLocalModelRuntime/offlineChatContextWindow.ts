/**
 * Offline WebLLM context window, passed as `chatOpts` on every model load.
 * WebLLM's prebuilt config sets 4096 for Qwen3-4B; the offline data agent's
 * prompt (dataset profiles, matched values, preview rows) needs more.
 *
 * KV-cache bytes use Qwen3-4B's published dims: 36 layers, 8 KV heads,
 * head_dim 128, f16. That is 147,456 bytes per token, so raising 4096 to
 * 8192 adds 576 MiB, which `LOCAL_CHAT_MODEL_SPECS` counts in the model's
 * peak memory. Recheck both if the bundle's models change.
 */
export const OFFLINE_CHAT_CONTEXT_WINDOW_SIZE = 8192;

const QWEN3_4B_NUM_LAYERS = 36;
const QWEN3_4B_NUM_KV_HEADS = 8;
const QWEN3_4B_HEAD_DIM = 128;
const F16_BYTES = 2;

/** KV-cache bytes for Qwen3-4B at `contextWindowSize` tokens. */
export function estimateQwen3FourBKvCacheBytes(
  contextWindowSize: number,
): number {
  return (
    2 *
    QWEN3_4B_NUM_LAYERS *
    QWEN3_4B_NUM_KV_HEADS *
    QWEN3_4B_HEAD_DIM *
    F16_BYTES *
    contextWindowSize
  );
}
