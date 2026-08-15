import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { applyChatTurnResponse } from "./applyChatTurnResponse";
import type { ApplyChatTurnResponseOptions } from "./applyChatTurnResponse";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";

function _createHandlers(): ApplyChatTurnResponseOptions["handlers"] {
  return {
    queueDashboardBlock: vi.fn(),
    setPendingClarification: vi.fn(),
    recordClarificationShown: vi.fn().mockResolvedValue("audit-id"),
  };
}

describe("applyChatTurnResponse", () => {
  it("marks a discovery clarification as an internal continuation", async () => {
    const handlers = _createHandlers();
    const responseData: Omit<ChatResponse.T, "__type"> = {
      assistantText: "Which stored state represents California?",
      clarification: {
        question: "Which stored state represents California?",
        responseShape: {
          kind: "discovery",
          query: 'SELECT DISTINCT "state" FROM "mortality"',
          column: "state",
          multi: false,
          candidateValues: ["California", "CA"],
        },
        turnNumber: 1,
      },
    };
    const response = Model.make("ChatResponse", responseData);

    const result = await applyChatTurnResponse({
      response,
      sqlApplied: false,
      handlers,
    });

    expect(result.metadata?.custom).toEqual({
      isDiscoveryContinuation: true,
    });
  });

  it("keeps an ordinary clarification visible", async () => {
    const handlers = _createHandlers();
    const responseData: Omit<ChatResponse.T, "__type"> = {
      assistantText: "Which period?",
      clarification: {
        question: "Which period?",
        responseShape: {
          kind: "fixed_options",
          options: ["This month", "Last month"],
          multi: false,
        },
        turnNumber: 1,
      },
    };
    const response = Model.make("ChatResponse", responseData);

    const result = await applyChatTurnResponse({
      response,
      sqlApplied: false,
      handlers,
    });

    expect(result.metadata).toBeUndefined();
  });

  it("preserves dashboard, clarification, and generated SQL handling", async () => {
    const handlers = _createHandlers();
    const responseData: Omit<ChatResponse.T, "__type"> = {
      assistantText: "Here is the result.",
      generatedSql: {
        prompt: "Show totals",
        sql: "select 1",
      },
      dashboardBlock: {
        kind: "HeadingBlock",
        text: "Totals",
      },
      clarification: {
        question: "Which period?",
        responseShape: {
          kind: "fixed_options",
          options: ["This month", "Last month"],
          multi: false,
        },
        turnNumber: 1,
      },
    };
    const response = Model.make("ChatResponse", responseData);

    const result = await applyChatTurnResponse({
      response,
      sqlApplied: true,
      handlers,
    });

    expect(handlers.queueDashboardBlock).toHaveBeenCalledWith(
      response.dashboardBlock,
    );
    expect(handlers.recordClarificationShown).toHaveBeenCalledWith(
      response.clarification,
    );
    expect(handlers.setPendingClarification).toHaveBeenCalledWith({
      ...response.clarification,
      auditId: "audit-id",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Here is the result." },
      { type: "text", text: "\n```sql\nselect 1\n```" },
    ]);
  });
});
