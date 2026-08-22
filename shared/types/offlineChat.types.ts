import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type { ChatClarifyRequest } from "$/types/chat.types.ts";

import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel.ts";

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

export type OfflineChatSchemaConcept = {
  id: string;
  name: string;
};

export type OfflineChatSchemaConceptAttribute = {
  concept_id: string;
  name: string;
};

export type OfflineChatSchema = {
  datasets: readonly OfflineChatSchemaDataset[];
  columns: readonly OfflineChatSchemaColumn[];
  concepts?: readonly OfflineChatSchemaConcept[];
  conceptAttributes?: readonly OfflineChatSchemaConceptAttribute[];
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

/** Translated copy emitted by the offline chat pipeline. */
export type OfflineChatPipelineCopy = {
  replying: string;
  understandingQuestion: string;
  writingQuery: string;
  generatingSql: string;
  repairingQuery: string;
  fixingQuery: string;
  noSql: string;
  metadataQuery: string;
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
  /**
   * Valid workspace dataset alias or id from analyze JSON when the model
   * obeys.
   */
  tableName?: string;
  clarifyQuestion?: string;
  clarifyOptions?: string[];
};

export type OfflineChatPipelineArgs = {
  engine: OfflineChatEngine;
  schema: OfflineChatSchema;
  pageContext: ChatPageContext.T;
  messages: readonly OfflineChatMessage[];
  lastUserPrompt: string;
  lastSql?: string;
  lastError?: string;
  copy: OfflineChatPipelineCopy;
  executeSql?: (
    sql: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onPhase?: (label: string) => void;
};

export type OfflineChatPipelineResult = {
  assistantText: string;
  generatedSql?: ChatResponse.GeneratedSql;
  clarification?: ChatClarifyRequest;
  phaseLabels: readonly string[];
};

export type OfflineChatTurnResult = {
  assistantText: string;
  generatedSql?: ChatResponse.GeneratedSql;
  clarification?: ChatClarifyRequest;
};

/**
 * The chat runtime mode chosen by `resolveChatRuntimeMode`, based on
 * connectivity, what's downloaded, and whether the cloud request failed. It
 * enumerates every outcome the offline-capability logic can pick, including
 * staying on the normal cloud path:
 * - `cloud`: use the normal server-backed chat. The default when online, and
 *   the only non-erroring choice when offline with no local model downloaded.
 * - `local`: run the whole turn on-device with a downloaded WebLLM model.
 *   Chosen when the user selected a downloaded local model, or when the device
 *   is offline and a model is available.
 * - `offer_local_fallback`: online, but the cloud request just failed and a
 *   local model is downloaded, so prompt the user to switch to it.
 */
export type ChatRuntimeMode =
  | { kind: "cloud" }
  | {
      kind: "local";
      /** When set, overrides the offline settings modal selection. */
      localChatModelId?: LocalChatModel.Id;
    }
  | { kind: "offer_local_fallback" };
