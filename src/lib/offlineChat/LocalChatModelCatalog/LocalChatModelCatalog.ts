import { prop, propEq } from "@utils";

export type LocalChatModelRamGb = 4 | 8 | 12 | 16 | 24 | 32;

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
  /** Approximate download size for UI copy only. */
  approxSizeMb: number;
  /** Minimum system RAM (GB) recommended for this model. */
  minRamGb: LocalChatModelRamGb;
};

/** Translated copy displayed for a local chat model. */
export type LocalChatModelCopy = {
  displayName: string;
  pickerName: string;
  description: string;
  systemRequirements: string;
  recommendedIf: string;
};

const LOCAL_CHAT_MODELS: readonly LocalChatModel[] = [
  {
    id: "llama-1b",
    mlcModelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    approxSizeMb: 600,
    minRamGb: 4,
  },
  {
    id: "qwen-1.5b",
    mlcModelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    approxSizeMb: 900,
    minRamGb: 8,
  },
  {
    id: "qwen-3b",
    mlcModelId: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    approxSizeMb: 1800,
    minRamGb: 12,
  },
  {
    id: "phi-3.5-mini",
    mlcModelId: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    approxSizeMb: 2300,
    minRamGb: 16,
  },
  {
    id: "qwen-7b",
    mlcModelId: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
    approxSizeMb: 4500,
    minRamGb: 24,
  },
  {
    id: "llama-8b",
    mlcModelId: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
    approxSizeMb: 5000,
    minRamGb: 32,
  },
] as const;

const DEFAULT_LOCAL_CHAT_MODEL_ID: LocalChatModelId = "qwen-1.5b";

const LOCAL_CHAT_MODEL_ID_SET = new Set<string>(
  LOCAL_CHAT_MODELS.map(prop("id")),
);

function _isValidId(id: string): id is LocalChatModelId {
  return LOCAL_CHAT_MODEL_ID_SET.has(id);
}

function _find(id: LocalChatModelId): LocalChatModel {
  const model = LOCAL_CHAT_MODELS.find(propEq("id", id));
  if (!model) {
    throw new Error(`Unknown local chat model id: ${id}`);
  }
  return model;
}

/** Catalog of local chat models available for offline inference. */
export const LocalChatModelCatalog = {
  values: LOCAL_CHAT_MODELS,
  defaultId: DEFAULT_LOCAL_CHAT_MODEL_ID,
  isValidId: _isValidId,
  find: _find,
};
