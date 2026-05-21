import { buildRamRequirementLabel } from "@/lib/localModels/modelSystemRequirements";
import type { ModelSystemRequirements } from "@/lib/localModels/modelSystemRequirements";

export type LocalChatModelId =
  | "llama-1b"
  | "qwen-1.5b"
  | "qwen-3b"
  | "phi-3.5-mini"
  | "qwen-7b"
  | "llama-8b";

export type LocalChatModel = {
  id: LocalChatModelId;
  /** MLC model id passed to `CreateMLCEngine`. */
  mlcModelId: string;
  displayName: string;
  description: string;
  /** Approximate download size for UI copy only. */
  approxSizeMb: number;
} & ModelSystemRequirements;

export const LOCAL_CHAT_MODELS: readonly LocalChatModel[] = [
  {
    id: "llama-1b",
    mlcModelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    displayName: "Llama 3.2 1B (offline)",
    description:
      "Smallest offline chat model. Weaker on complex SQL but fast to download.",
    approxSizeMb: 600,
    minRamGb: 4,
    systemRequirements: buildRamRequirementLabel(4),
    recommendedIf:
      "Recommended if you have 4 GB RAM or need the lightest download.",
  },
  {
    id: "qwen-1.5b",
    mlcModelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    displayName: "Qwen 2.5 1.5B (offline)",
    description:
      "Balanced offline model for everyday SQL questions on typical laptops.",
    approxSizeMb: 900,
    minRamGb: 8,
    systemRequirements: buildRamRequirementLabel(8),
    recommendedIf:
      "Recommended if you have about 8 GB RAM (default for most users).",
  },
  {
    id: "qwen-3b",
    mlcModelId: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    displayName: "Qwen 2.5 3B (offline)",
    description:
      "Stronger reasoning than 1.5B with a moderate download. Good step up from the 8 GB tier.",
    approxSizeMb: 1800,
    minRamGb: 12,
    systemRequirements: buildRamRequirementLabel(12),
    recommendedIf:
      "Recommended if you have 12 GB RAM and want noticeably better SQL answers offline.",
  },
  {
    id: "phi-3.5-mini",
    mlcModelId: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    displayName: "Phi 3.5 Mini (offline)",
    description:
      "Microsoft's compact instruct model. Solid structure and instruction following for dashboards.",
    approxSizeMb: 2300,
    minRamGb: 16,
    systemRequirements: buildRamRequirementLabel(16),
    recommendedIf:
      "Recommended if you have 16 GB RAM and run Avandar alongside other apps.",
  },
  {
    id: "qwen-7b",
    mlcModelId: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
    displayName: "Qwen 2.5 7B (offline)",
    description:
      "High-quality 7B instruct model. Best for difficult schemas and multi-step SQL offline.",
    approxSizeMb: 4500,
    minRamGb: 24,
    systemRequirements: buildRamRequirementLabel(24),
    recommendedIf:
      "Recommended if you have 24 GB RAM and want near-cloud quality fully on device.",
  },
  {
    id: "llama-8b",
    mlcModelId: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
    displayName: "Llama 3.1 8B (offline)",
    description:
      "Largest catalog option. Maximum offline capability when RAM and download size are not constraints.",
    approxSizeMb: 5000,
    minRamGb: 32,
    systemRequirements: buildRamRequirementLabel(32),
    recommendedIf:
      "Recommended if you have 32 GB RAM and a powerful machine used mainly for analytics work.",
  },
] as const;

export const DEFAULT_LOCAL_CHAT_MODEL_ID: LocalChatModelId = "qwen-1.5b";

const LOCAL_CHAT_MODEL_ID_SET = new Set<string>(
  LOCAL_CHAT_MODELS.map((model) => {
    return model.id;
  }),
);

/** Type guard for catalog ids (storage, picker ids, query params). */
export function isLocalChatModelId(id: string): id is LocalChatModelId {
  return LOCAL_CHAT_MODEL_ID_SET.has(id);
}

export function findLocalChatModel(id: LocalChatModelId): LocalChatModel {
  const model = LOCAL_CHAT_MODELS.find((entry) => {
    return entry.id === id;
  });
  if (!model) {
    throw new Error(`Unknown local chat model id: ${id}`);
  }
  return model;
}
