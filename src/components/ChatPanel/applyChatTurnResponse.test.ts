import { describe, expect, it, vi } from "vitest";
import { applyChatTurnResponse } from "./applyChatTurnResponse";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";

function createHandlers() {
  return {
    queueDashboardBlock: vi.fn(),
    setPendingClarification: vi.fn(),
    recordClarificationShown: vi.fn().mockResolvedValue("audit-id"),
  };
}

describe("applyChatTurnResponse", () => {
  it("preserves dashboard, clarification, and generated SQL handling", async () => {
    const handlers = createHandlers();
    const response = {
      __type: "ChatResponse",
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
    } satisfies ChatResponse.T;

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
