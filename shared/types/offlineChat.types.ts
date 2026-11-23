import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type { ChatClarifyRequest } from "$/types/chat.types.ts";

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
  /** The field's id. Absent in an older cache, which lists the bare name. */
  id?: string;
  concept_id: string;
  name: string;
  /** True for a field that keeps every value. Absent in an older cache. */
  is_array?: boolean;
  /** The period of a per-period field. Absent in an older cache. */
  bucket_grain?: string | null;
  /** The type of one value, or of each period's. Absent in an older cache. */
  data_type?: string;
};

export type OfflineChatSchemaConceptStatus = {
  concept_id: string;
  name: string;
  position: number;
};

export type OfflineChatSchema = {
  datasets: readonly OfflineChatSchemaDataset[];
  columns: readonly OfflineChatSchemaColumn[];
  concepts?: readonly OfflineChatSchemaConcept[];
  conceptAttributes?: readonly OfflineChatSchemaConceptAttribute[];
  conceptStatuses?: readonly OfflineChatSchemaConceptStatus[];
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
 * The chat runtime mode chosen by `resolveChatRuntimeMode`, based on the
 * user's offline mode choice, connectivity, whether the offline models are
 * downloaded, and whether the cloud request failed:
 * - `cloud`: use the normal server-backed chat. The default when online, and
 *   the only non-erroring choice when offline without the offline models.
 * - `local`: run the whole turn on the device with the offline models.
 *   Chosen when offline mode is on, or when the device is offline and the
 *   offline models are downloaded.
 * - `offer_local_fallback`: online, but the cloud request just failed and the
 *   offline models are downloaded, so offer to answer with them instead.
 */
export type ChatRuntimeMode =
  | { kind: "cloud" }
  | { kind: "local" }
  | { kind: "offer_local_fallback" };
