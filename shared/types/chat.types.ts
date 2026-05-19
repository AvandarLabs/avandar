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

/**
 * The shape of a clarification request the LLM may emit instead of, or
 * before, generating SQL. See
 * `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`
 * Phase 1 for the design.
 */
export type ChatClarifyResponseShape =
  | { kind: "free_text"; placeholder?: string }
  | { kind: "fixed_options"; options: string[]; multi: boolean };

export type ChatClarifyRequest = {
  /** ≤ 25 words, neutrally phrased. */
  question: string;
  /** Optional one-sentence "why I'm asking". */
  rationale?: string;
  responseShape: ChatClarifyResponseShape;
  /** Which clarification turn this is within the current analytic question. */
  turnNumber: 1 | 2 | 3;
};

export type ChatResponse = {
  assistantText: string;
  generatedSql?: ChatGeneratedSql;
  /**
   * Present when the model called the `clarify` tool. The client renders
   * the clarification UI inline in the thread; on answer it issues a new
   * turn with the answer attached.
   */
  clarification?: ChatClarifyRequest;
};

/**
 * Response shape for `GET /chat/:workspaceId/session-secret`. The
 * returned secret is base64-encoded; the client stores it in memory
 * (never localStorage) and uses it to HMAC-sign `ackToken`s via
 * `crossBoundary`.
 */
export type ChatSessionSecretResponse = {
  /** Base64-encoded HMAC key. Treat as sensitive material in memory. */
  sessionSecret: string;
  issuedAt: number;
};

/**
 * Client-side proof that the user consented to send a specific
 * payload to the LLM. The backend verifies the HMAC + payload hash
 * before forwarding any flagged content. See
 * `supabase/functions/_shared/privacy/ackToken.ts`.
 */
export type ConsentAck = {
  ackToken: string;
  /** What the token covers — used by the backend to look up the payload. */
  scope:
    | { kind: "message_index"; index: number }
    | { kind: "values"; sourceColumn?: string };
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
