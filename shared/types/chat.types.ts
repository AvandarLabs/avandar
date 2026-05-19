/**
 * Shared chat types used by both the frontend (`src/`) and the edge function
 * (`supabase/functions/chat/`). The frontend imports through the `$/` alias
 * and the edge function through Deno's path alias of the same name.
 */

export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatClientMessage = {
  role: ChatMessageRole;
  content: string;
};

export type ChatApp = "data-explorer" | "data-sources" | "dashboards" | "other";

export type ChatPageContext = {
  app: ChatApp;
  openDatasetId?: string;
  lastSql?: string;
  /**
   * Runtime error message from the most recent SQL execution, if any. Sent
   * so the model can offer to fix the prior SQL when the user asks to
   * regenerate.
   */
  lastError?: string;
};

export type ChatGeneratedSql = {
  prompt: string;
  sql: string;
};

export type ChatResponse = {
  assistantText: string;
  generatedSql?: ChatGeneratedSql;
};

export type ChatModelLicenseTier = "open" | "proprietary";

/** A chat-capable model returned from OpenRouter via our edge function. */
export type ChatModelOption = {
  id: string;
  name: string; // e.g. MoonshotAI: Kimi K2.6
  nameWithoutProvider: string; // e.g. Kimi K2.6
  description?: string;
  supportsTools: boolean;
  licenseTier: ChatModelLicenseTier;
  provider: string;
};

export type ChatModelOptionGroup = {
  group: string;
  models: ChatModelOption[];
};

export type ChatModelsResponse = {
  groups: ChatModelOptionGroup[];
};
