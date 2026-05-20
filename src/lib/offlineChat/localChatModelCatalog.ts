export type LocalChatModelId = "qwen-1.5b" | "llama-1b";

export type LocalChatModel = {
  id: LocalChatModelId;
  /** MLC model id passed to `CreateMLCEngine`. */
  mlcModelId: string;
  displayName: string;
  description: string;
  /** Approximate download size for UI copy only. */
  approxSizeMb: number;
  /** Recommended when system RAM is around 8 GB. */
  recommendedFor8Gb: boolean;
};

export const LOCAL_CHAT_MODELS: readonly LocalChatModel[] = [
  {
    id: "qwen-1.5b",
    mlcModelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    displayName: "Qwen 2.5 1.5B (offline)",
    description:
      "Best balance for 8 GB machines. Slower than cloud but runs fully on device.",
    approxSizeMb: 900,
    recommendedFor8Gb: true,
  },
  {
    id: "llama-1b",
    mlcModelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    displayName: "Llama 3.2 1B (offline)",
    description:
      "Smallest offline model. Faster download, weaker on complex SQL.",
    approxSizeMb: 600,
    recommendedFor8Gb: true,
  },
] as const;

export const DEFAULT_LOCAL_CHAT_MODEL_ID: LocalChatModelId = "qwen-1.5b";

export function findLocalChatModel(id: LocalChatModelId): LocalChatModel {
  const model = LOCAL_CHAT_MODELS.find((entry) => {
    return entry.id === id;
  });
  if (!model) {
    throw new Error(`Unknown local chat model id: ${id}`);
  }
  return model;
}
