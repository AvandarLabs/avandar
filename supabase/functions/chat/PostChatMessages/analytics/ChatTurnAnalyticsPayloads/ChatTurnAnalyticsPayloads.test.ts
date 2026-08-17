/**
 * `analytics.chat_health` parses `outcome`, `attemptCount`, and `latencyMs`
 * out of these payloads with `->>`. A wrong value here produces a silently
 * empty report rather than an error, so the classification is pinned.
 */
import { ChatTurnAnalyticsPayloads } from "@sbfn/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads/ChatTurnAnalyticsPayloads.ts";
import { describe, expect, it } from "vitest";

const BASE_COMPLETED = {
  modelId: "openai/gpt-4o-mini",
  latencyMs: 1234.6,
  attemptCount: 1,
  promptChars: 40,
  schemaDatasetCount: 3,
};

const CLARIFICATION = {
  question: "Which region?",
  responseShape: { kind: "free_text" } as const,
  turnNumber: 1 as const,
};

const DASHBOARD_BLOCK = {
  kind: "DataViz" as const,
  prompt: "chart the totals",
  sql: "SELECT 1",
  vizType: "bar" as const,
};

describe("ChatTurnAnalyticsPayloads.fromCompletedTurn", () => {
  it("classifies a turn that generated SQL", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "Here is the SQL I ran.",
      parsed: { text: "", generatedSql: { sql: "SELECT 1", prompt: "p" } },
    });

    expect(payload.outcome).toBe("sql");
    expect(payload.latencyMs).toBe(1235);
    expect(payload.responseChars).toBe("Here is the SQL I ran.".length);
    expect(payload.wasSampled).toBe(false);
    expect(payload).not.toHaveProperty("piiSeverity");
  });

  it("prefers clarification over a dashboard block when both are present", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "Which region?",
      parsed: {
        text: "",
        clarification: CLARIFICATION,
        dashboardBlock: DASHBOARD_BLOCK,
      },
    });

    expect(payload.outcome).toBe("clarification");
  });

  // The parser only ever emits both of these when neither generatedSql nor
  // clarification blocked them, which is the exclusivity described in
  // `_classifyOutcome`'s comment; the case above and this one are defensive,
  // not states the parser can currently reach.
  it("counts a turn that produced SQL as sql even when it also asked something", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "Here is the SQL I ran.",
      parsed: {
        text: "",
        generatedSql: { sql: "SELECT 1", prompt: "p" },
        clarification: CLARIFICATION,
      },
    });

    expect(payload.outcome).toBe("sql");
  });

  it("classifies a dashboard block turn", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "Added a bar chart.",
      parsed: { text: "", dashboardBlock: DASHBOARD_BLOCK },
    });

    expect(payload.outcome).toBe("dashboard_block");
  });

  it("classifies a plain text answer", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "Your dataset has 4 columns.",
      parsed: { text: "Your dataset has 4 columns." },
    });

    expect(payload.outcome).toBe("text");
  });

  it("classifies an escalation that still produced nothing as empty", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      attemptCount: 3,
      assistantText: "I could not generate a query for that. Try rephrasing.",
      parsed: { text: "" },
    });

    expect(payload.outcome).toBe("empty");
    expect(payload.attemptCount).toBe(3);
  });
});

describe("ChatTurnAnalyticsPayloads.fromFailedTurn", () => {
  it("classifies a non-2xx from the model provider", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 900.2,
      error: new Error("OpenRouter API error: 429 rate limited"),
    });

    expect(payload).toEqual({
      modelId: "openai/gpt-4o-mini",
      errorClass: "upstream_error",
      latencyMs: 900,
    });
  });

  it("classifies a transport failure as network", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 10,
      error: new TypeError("error sending request for url"),
    });

    expect(payload.errorClass).toBe("network");
  });

  it("classifies a malformed response body as parse", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 10,
      error: new SyntaxError("Unexpected token < in JSON at position 0"),
    });

    expect(payload.errorClass).toBe("parse");
  });

  it("classifies anything else as unknown", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 10,
      error: new Error("something else"),
    });

    expect(payload.errorClass).toBe("unknown");
  });

  it("attributes a provider error body to the provider, not to the network", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 10,
      // A TypeError whose message matches the network pattern too, so both
      // rules claim this fixture and the assertion pins which one wins. A
      // plain Error could never reach the network arm, which requires a
      // TypeError, so it would pass under any rule order.
      error: new TypeError(
        "OpenRouter API error: error sending request for url",
      ),
    });

    expect(payload.errorClass).toBe("upstream_error");
  });

  it("never carries the error message, which can echo the provider's body", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 10,
      error: new Error('OpenRouter API error: {"prompt":"my secret data"}'),
    });

    expect(JSON.stringify(payload)).not.toContain("secret");
  });
});
