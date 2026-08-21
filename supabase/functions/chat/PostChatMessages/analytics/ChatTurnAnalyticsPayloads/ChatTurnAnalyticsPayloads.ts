import type { ParsedAttempt } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";
import type {
  AnalyticsEventPayloads,
  ChatTurnErrorClass,
  ChatTurnOutcome,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types.ts";

/**
 * Reduces a parsed attempt to the single outcome recorded on the turn.
 *
 * The order is load-bearing. `generatedSql`, `clarification`, and
 * `dashboardBlock` are mutually exclusive by the parser's own guards, but
 * `text` is not: `parseOpenRouterResponse` always sets it to the raw model
 * text, and the SQL-extraction branch only runs when that text is non-empty,
 * so a turn that produced SQL carries both. `text` therefore has to rank last
 * or it would swallow every other outcome. The outcome mix in
 * `analytics.chat_health` reads as a distribution of work done, so a turn that
 * produced SQL counts as SQL even if it also asked something.
 */
function _classifyOutcome(parsed: ParsedAttempt): ChatTurnOutcome {
  return (
    parsed.generatedSql ? "sql"
    : parsed.clarification ? "clarification"
    : parsed.dashboardBlock ? "dashboard_block"
    : parsed.createdCaseTypes && parsed.createdCaseTypes.length > 0 ? "text"
    : parsed.text ? "text"
    : "empty"
  );
}

/**
 * `sendOpenRouterRequest` sets no `AbortSignal`, so abort and timeout are
 * unreachable today. If a timeout is added later, `AbortError` lands in
 * `unknown` rather than `network` until this is updated.
 */
function _classifyError(error: unknown): ChatTurnErrorClass {
  const message = error instanceof Error ? error.message : String(error);
  return (
    error instanceof SyntaxError ? "parse"
    : /OpenRouter API error/i.test(message) ? "upstream_error"
    : (
      error instanceof TypeError &&
      /fetch|network|sending request/i.test(message)
    ) ?
      "network"
    : "unknown"
  );
}

/** Privacy-safe payload builders for server-side chat turn analytics. */
export const ChatTurnAnalyticsPayloads = {
  /**
   * Builds the `chat.turn_completed` payload for a turn that produced a
   * response.
   */
  fromCompletedTurn: (
    options: Readonly<{
      modelId: string;
      latencyMs: number;
      attemptCount: number;
      promptChars: number;
      schemaDatasetCount: number;
      assistantText: string;
      parsed: ParsedAttempt;
    }>,
  ): AnalyticsEventPayloads["chat.turn_completed"] => {
    return {
      modelId: options.modelId,
      latencyMs: Math.round(options.latencyMs),
      attemptCount: options.attemptCount,
      outcome: _classifyOutcome(options.parsed),
      promptChars: options.promptChars,
      responseChars: options.assistantText.length,
      schemaDatasetCount: options.schemaDatasetCount,
      // Nothing retains chat samples yet, so no turn is ever sampled and no
      // severity is assessed.
      wasSampled: false,
    };
  },

  /**
   * Builds the `chat.turn_failed` payload. Records only the classification,
   * never the message: provider error bodies can echo the request, and the
   * message must never carry prompt text into an analytics payload.
   */
  fromFailedTurn: (
    options: Readonly<{
      modelId: string;
      latencyMs: number;
      error: unknown;
    }>,
  ): AnalyticsEventPayloads["chat.turn_failed"] => {
    return {
      modelId: options.modelId,
      errorClass: _classifyError(options.error),
      latencyMs: Math.round(options.latencyMs),
    };
  },
};
