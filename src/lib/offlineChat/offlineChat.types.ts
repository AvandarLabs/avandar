import type { LocalChatModelId } from "./localChatModelCatalog";
import type {
  ChatClarifyRequest,
  ChatGeneratedSQL,
  ChatPageContext,
} from "$/types/chat.types";

/** Compact schema slice sent to offline prompts. */
export type OfflineChatSchemaDataset = {
  id: string;
  name: string;
};

export type OfflineChatSchemaColumn = {
  dataset_id: string;
  name: string;
  data_type: string;
};

export type OfflineChatSchema = {
  datasets: readonly OfflineChatSchemaDataset[];
  columns: readonly OfflineChatSchemaColumn[];
};

export type OfflineChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OfflineChatCompletionRequest = {
  messages: readonly OfflineChatMessage[];
  maxTokens: number;
  onToken?: (delta: string) => void;
};

/** Pluggable local LLM backend (WebLLM in prod, mock in tests). */
export type OfflineChatEngine = {
  preload: () => Promise<void>;
  complete: (request: OfflineChatCompletionRequest) => Promise<string>;
  unload: () => Promise<void>;
};

export type OfflineAnalyzeResult = {
  summary: string;
  proceed: boolean;
  /** Valid workspace dataset UUID from analyze JSON when the model obeys. */
  tableName?: string;
  clarifyQuestion?: string;
  clarifyOptions?: string[];
};

export type OfflineChatPipelineArgs = {
  engine: OfflineChatEngine;
  schema: OfflineChatSchema;
  pageContext: ChatPageContext;
  messages: readonly OfflineChatMessage[];
  lastUserPrompt: string;
  lastSql?: string;
  lastError?: string;
  executeSql?: (
    sql: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onPhase?: (label: string) => void;
};

export type OfflineChatPipelineResult = {
  assistantText: string;
  generatedSql?: ChatGeneratedSQL;
  clarification?: ChatClarifyRequest;
  phaseLabels: readonly string[];
};

export type OfflineChatTurnResult = {
  assistantText: string;
  generatedSql?: ChatGeneratedSQL;
  clarification?: ChatClarifyRequest;
};

export type OfflineChatMode =
  | { kind: "cloud" }
  | {
      kind: "local";
      /** When set, overrides the offline settings modal selection. */
      localChatModelId?: LocalChatModelId;
    }
  | { kind: "offer_local_fallback" };
