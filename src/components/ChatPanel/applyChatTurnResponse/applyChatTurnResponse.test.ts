import { describe, expect, it, vi } from "vitest";
import { applyChatTurnResponse } from "./applyChatTurnResponse";
import type { ApplyChatTurnResponseArgs } from "./applyChatTurnResponse";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";

function createHandlers(): ApplyChatTurnResponseArgs["handlers"] {
  return {
    queueDashboardBlock: vi.fn(),
    setPendingClarification: vi.fn(),
    recordClarificationShown: vi.fn().mockResolvedValue("audit-1"),
  };
}

describe("applyChatTurnResponse", () => {
  it("includes generated SQL when it was applied", async () => {
    const result = await applyChatTurnResponse({
      response: {
        assistantText: "Here is the query.",
        generatedSql: {
          prompt: "Count rows",
          sql: 'SELECT count(*) FROM "dataset"',
        },
      } as ChatResponse.T,
      sqlApplied: true,
      handlers: createHandlers(),
    });

    expect(result.content).toEqual([
      { type: "text", text: "Here is the query." },
      {
        type: "text",
        text: '\n```sql\nSELECT count(*) FROM "dataset"\n```',
      },
    ]);
  });

  it("audits and installs a clarification", async () => {
    const handlers = createHandlers();
    const clarification = {
      question: "Which region?",
      responseShape: {
        kind: "fixed_options" as const,
        options: ["North", "South"],
        multi: false,
      },
      turnNumber: 1 as const,
    };

    await applyChatTurnResponse({
      response: {
        assistantText: clarification.question,
        clarification,
      } as ChatResponse.T,
      sqlApplied: false,
      handlers,
    });

    expect(handlers.recordClarificationShown).toHaveBeenCalledWith(
      clarification,
    );
    expect(handlers.setPendingClarification).toHaveBeenCalledWith({
      ...clarification,
      auditId: "audit-1",
    });
  });

  it("queues a generated dashboard block", async () => {
    const handlers = createHandlers();
    const dashboardBlock = { kind: "DividerBlock" as const };

    await applyChatTurnResponse({
      response: {
        assistantText: "Added a divider.",
        dashboardBlock,
      } as ChatResponse.T,
      sqlApplied: false,
      handlers,
    });

    expect(handlers.queueDashboardBlock).toHaveBeenCalledWith(dashboardBlock);
  });
});
