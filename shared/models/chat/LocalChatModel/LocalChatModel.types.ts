export type LocalChatModelRamGb = 4 | 8 | 12 | 16 | 24 | 32;

export type LocalChatModelId =
  | "llama-1b"
  | "qwen-1.5b"
  | "qwen-3b"
  | "phi-3.5-mini"
  | "qwen-7b"
  | "llama-8b";

/** A local (WebLLM) chat model available for offline inference. */
export type LocalChatModelT = {
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
