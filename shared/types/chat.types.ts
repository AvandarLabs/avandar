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
  /**
   * The SQL that's currently driving the canvas — whether the assistant
   * generated it, the user typed it, or it came from a manual form edit.
   * Always reflects the live document, not just the last assistant
   * generation. The backend uses this so the next turn knows what the
   * user is looking at right now.
   */
  lastSql?: string;
  /**
   * The columns of the result the user is currently looking at. Sent
   * alongside `lastSql` so the model can reason about the current result
   * schema (which may differ from the dataset schema when the SQL contains
   * `SELECT`-list projections, aggregations, or `AS` aliases).
   */
  lastResultColumns?: ReadonlyArray<{
    name: string;
    /** DuckDB type id, e.g. "bigint", "double", "varchar". */
    dataType: string;
  }>;
  /**
   * Runtime error message from the most recent SQL execution, if any. Sent
   * so the model can offer to fix the prior SQL when the user asks to
   * regenerate.
   */
  lastError?: string;
  /**
   * Set when the user is currently editing a dashboard. The chat panel uses
   * this to offer the `addDashboardBlock` tool and to attach the dashboard
   * id to analytics events. Only present when `app === "dashboards"`.
   */
  dashboardId?: string;
};

export type ChatDashboardVizType =
  | "table"
  | "bar"
  | "line"
  | "area"
  | "scatter"
  | "pie";

export type ChatDashboardBlockAlign = "left" | "center" | "right";

export type ChatDashboardHeadingLevel = 1 | 2 | 3 | 4;

export type ChatDashboardCalloutTone = "info" | "warning" | "neutral";

export type ChatDashboardListType = "ordered" | "unordered";

export type ChatDashboardTableDelimiter = "comma" | "tab" | "pipe";

/**
 * A P-block the LLM produced for the dashboard editor. The client converts
 * this to a Puck content item before appending it to the dashboard.
 */
export type ChatGeneratedDashboardBlock =
  | {
      kind: "DataViz";
      prompt: string;
      sql: string;
      vizType: ChatDashboardVizType;
    }
  | {
      kind: "HeadingBlock";
      text: string;
      level?: ChatDashboardHeadingLevel;
      align?: ChatDashboardBlockAlign;
    }
  | {
      kind: "ParagraphBlock";
      text: string;
      align?: ChatDashboardBlockAlign;
    }
  | {
      kind: "QuoteBlock";
      quote: string;
      cite?: string;
    }
  | { kind: "DividerBlock" }
  | {
      kind: "CalloutBlock";
      title: string;
      body: string;
      tone?: ChatDashboardCalloutTone;
    }
  | {
      kind: "ListBlock";
      items: string[];
      listType?: ChatDashboardListType;
    }
  | {
      kind: "CodeBlock";
      code: string;
      language?: string;
    }
  | {
      kind: "TableBlock";
      data: string;
      delimiter?: ChatDashboardTableDelimiter;
      hasHeader?: boolean;
    }
  | {
      kind: "Card";
      title: string;
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
  | { kind: "fixed_options"; options: string[]; multi: boolean }
  /**
   * Phase 2 — Discovery clarifications. The LLM emits a DuckDB SELECT
   * (typically a `SELECT DISTINCT col FROM ...`) whose result populates a
   * dropdown in the follow-up question. The query is run client-side in
   * DuckDB-WASM; its result is NOT rendered on the canvas. The user's
   * selection routes through `crossBoundary` with context
   * `discovery_clarification` before crossing the LLM boundary again.
   */
  | {
      kind: "discovery";
      query: string;
      column: string;
      multi: boolean;
    };

export type ChatClarifyRequest = {
  /** ≤ 25 words, neutrally phrased. */
  question: string;
  /** Optional one-sentence "why I'm asking". */
  rationale?: string;
  responseShape: ChatClarifyResponseShape;
  /** Which clarification turn this is within the current analytic question. */
  turnNumber: 1 | 2 | 3;
};

/**
 * Phase 3 — Plans + DAG. A single step in a multi-step analytic plan
 * proposed by the LLM. The frontend stores these in the plan state
 * manager and renders them as nodes in an xyflow DAG.
 */
export type ChatPlanStep = {
  /** Stable id the LLM uses to reference this step from `inputs`. */
  id: string;
  /** One-sentence description for the DAG node label. */
  description: string;
  /**
   * Execution engine for this step. v1 of Phase 3 ships `sql` and
   * `clarification` only; `python` and `r` are reserved for Phase 6.
   */
  type: "sql" | "python" | "r" | "clarification";
  /** SQL or code for the step. */
  code: string;
  /** ids of steps this step depends on. */
  inputs: string[];
  /**
   * The LLM's prediction of the output schema. Used to detect schema
   * drift (Phase 4) and to pre-pick a default viz.
   */
  predictedSchema: Array<{ name: string; type: string }>;
  /** Default visualization for the step's output. */
  defaultViz?: "table" | "bar" | "line" | "scatter" | "pie";
};

export type ChatPlan = {
  steps: ChatPlanStep[];
  /** The LLM's one-paragraph summary of the plan, shown above the DAG. */
  rootMessage: string;
};

/**
 * Language hint attached to a chat turn when the user just dictated their
 * message. Intentionally narrow for now: we only forward Swahili because
 * the cloud LLMs often fail to identify low-resource Bantu languages from
 * the transcribed text alone, while English / Spanish / French etc. are
 * already detected reliably and we don't want a hint to regress them.
 */
export type ChatVoiceLanguage = "swahili";

/**
 * Sent on the next turn when the user clicks "Try Again" on a prior
 * assistant message. The backend uses these fields to inject a system
 * note telling the model NOT to repeat the same output. Only the field
 * that matches what the prior turn produced is set; the rest are
 * omitted.
 */
export type ChatRetryContext = {
  /** Plain-text assistant body from the prior turn, if any. */
  priorAssistantText?: string;
  /** SQL the prior turn emitted via `generateSql`, if any. */
  priorGeneratedSql?: string;
  /** Question the prior turn asked via `clarify`, if any. */
  priorClarificationQuestion?: string;
  /** rootMessage of the plan the prior turn proposed, if any. */
  priorPlanRootMessage?: string;
  /** Kind of dashboard block the prior turn appended, if any. */
  priorDashboardBlockKind?: string;
};

export type ChatResponse = {
  assistantText: string;
  generatedSql?: ChatGeneratedSql;
  /**
   * Present when the model called the `clarify` tool. The client renders
   * the clarification UI inline in the thread; on answer it issues a new
   * turn with a `[Clarification answer: ...]` user message (preset,
   * custom, or none of the listed options).
   */
  clarification?: ChatClarifyRequest;
  /**
   * Present when the model called the `proposePlan` tool. The frontend
   * switches the canvas to the plan view (xyflow DAG) and runs each
   * step in DuckDB.
   */
  plan?: ChatPlan;
  /**
   * Present when the model called the `addDashboardBlock` tool while the
   * user was editing a dashboard. The frontend appends the block to the
   * Puck data via `DashboardEditorStateManager.queuePendingBlock`.
   */
  dashboardBlock?: ChatGeneratedDashboardBlock;
};

/**
 * Phase 4 — Schema-Drift Regen. After a plan step executes, the
 * frontend diffs `actualSchema` against the LLM's `predictedSchema`.
 * If they differ, the frontend asks the model to regenerate the
 * affected downstream steps via this request shape.
 */
export type SchemaDriftReport = {
  /** The plan step that produced unexpected columns. */
  driftedStepId: string;
  driftedStepDescription: string;
  predictedSchema: Array<{ name: string; type: string }>;
  actualSchema: Array<{ name: string; type: string }>;
  /** Downstream step ids that need to be regenerated. */
  affectedStepIds: string[];
  /**
   * The current plan in full so the LLM can see the surrounding
   * context — what each step does and how steps reference each other.
   */
  plan: ChatPlan;
};

/**
 * One regenerated step. The frontend swaps the matching step's `code`
 * and re-runs.
 */
export type RegeneratedStep = {
  stepId: string;
  /** Replacement SQL for the step. */
  code: string;
  /**
   * Updated `predictedSchema` so a second drift-detection pass can
   * notice if THIS regeneration also drifts (cap-bounded by the
   * caller).
   */
  predictedSchema: Array<{ name: string; type: string }>;
};

export type RegeneratePlanResponse = {
  /**
   * Steps the model rewrote. Caller dispatches `replaceStepCode` for
   * each and re-runs the plan from `driftedStepId` forward.
   */
  steps: RegeneratedStep[];
  /** Plain-text explanation for the chat thread. */
  explanation: string;
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
