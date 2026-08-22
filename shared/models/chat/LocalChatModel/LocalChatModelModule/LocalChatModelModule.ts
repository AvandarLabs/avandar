import type { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel.ts";

import { prop, propEq } from "@avandar/utils";

const LOCAL_CHAT_MODELS: readonly LocalChatModel.T[] = [
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
];

const DEFAULT_LOCAL_CHAT_MODEL_ID: LocalChatModel.Id = "qwen-1.5b";

const LOCAL_CHAT_MODEL_ID_SET = new Set<string>(
  LOCAL_CHAT_MODELS.map(prop("id")),
);

function _isValidId(id: string): id is LocalChatModel.Id {
  return LOCAL_CHAT_MODEL_ID_SET.has(id);
}

function _find(id: LocalChatModel.Id): LocalChatModel.T {
  const model = LOCAL_CHAT_MODELS.find(propEq("id", id));
  if (!model) {
    throw new Error(`Unknown local chat model id: ${id}`);
  }
  return model;
}

/**
 * Runtime surface for the {@link LocalChatModel} model. Groups the static
 * catalog of offline-inference models under `Catalog` so callers reference it
 * as `LocalChatModel.Catalog.find(...)`.
 */
export const LocalChatModelModule = {
  /** Catalog of local chat models available for offline inference. */
  Catalog: {
    values: LOCAL_CHAT_MODELS,
    defaultId: DEFAULT_LOCAL_CHAT_MODEL_ID,
    isValidId: _isValidId,
    find: _find,
  },
};
