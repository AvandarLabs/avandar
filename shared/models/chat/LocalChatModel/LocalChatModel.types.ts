import type { LOCAL_CHAT_MODEL_SPECS } from "$/models/chat/LocalChatModel/LocalChatModel.constants.ts";

/** Smallest computer, in GB of memory, a local model is meant to run on. */
export type LocalChatModelRamGb = 8 | 12 | 16;

/** A WebLLM model id from the catalog, such as `Qwen3-4B-q4f16_1-MLC`. */
export type LocalChatModelId = keyof typeof LOCAL_CHAT_MODEL_SPECS;

/** The size figures of one local model, keyed by id in the catalog. */
export type LocalChatModelSpec = {
  /** Approximate download size, for the offline mode dialog's copy. */
  approxDownloadMb: number;
  /**
   * Approximate GPU memory the model holds while resident, at the context
   * window the app gives offline models.
   */
  peakMemoryMb: number;
  /** Smallest computer, in GB of memory, this model is meant to run on. */
  minRamGb: LocalChatModelRamGb;
};

/** A local (WebLLM) chat model that runs on the user's device. */
export type LocalChatModelT = LocalChatModelSpec & {
  /** The WebLLM model id passed to `MLCEngine.reload`. */
  id: LocalChatModelId;
};

/**
 * Which local model does each job in offline mode. One model may do several
 * jobs. Mirrors the models the offline data agent takes.
 */
export type LocalChatModelBundle = {
  /** Writes the queries and replies. */
  answer: LocalChatModelId;
  /** Sorts messages into data questions and chat, when set. */
  router?: LocalChatModelId;
  /** Takes over after a failed or empty query, when set. */
  escalation?: LocalChatModelId;
};
