/**
 * Auxiliary chat types not yet promoted to dedicated models under
 * `shared/models/chat/`. These cover clarifications, dashboard-block
 * generation, retry context, voice hints, session secrets, consent acks, and
 * the OpenRouter models endpoint envelope.
 *
 * Shared by both the frontend (`src/`) and the edge function
 * (`supabase/functions/chat/`). The frontend imports through the `$/` alias
 * and the edge function through Deno's path alias of the same name.
 */

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

/**
 * The shape of a clarification request the LLM may emit instead of, or
 * before, generating SQL. See
 * `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`
 * for the design.
 */
export type ChatClarifyResponseShape =
  | { kind: "free_text"; placeholder?: string }
  | { kind: "fixed_options"; options: string[]; multi: boolean }
  /**
   * Discovery clarifications. The LLM emits a DuckDB SELECT
   * (typically a `SELECT DISTINCT col FROM ...`) whose result populates a
   * dropdown in the follow-up question. The query is run client-side in
   * DuckDB-WASM; its result is NOT rendered on the canvas. The user's
   * selection routes through `decideIfDataCanCrossBoundary` with context
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
  /** Kind of dashboard block the prior turn appended, if any. */
  priorDashboardBlockKind?: string;
};

/**
 * Response shape for `GET /chat/:workspaceId/session-secret`. The
 * returned secret is base64-encoded; the client stores it in memory
 * (never localStorage) and uses it to HMAC-sign `ackToken`s via
 * `decideIfDataCanCrossBoundary`.
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
 * `supabase/functions/_shared/privacy/verifyAckToken.ts`.
 */
export type ConsentAck = {
  ackToken: string;
  /** What the token covers: used by the backend to look up the payload. */
  scope:
    | { kind: "message_index"; index: number }
    | { kind: "values"; sourceColumn?: string };
};
