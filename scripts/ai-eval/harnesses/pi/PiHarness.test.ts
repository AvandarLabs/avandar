import { afterEach, describe, expect, it, vi } from "vitest";
import { PAGE_QUESTIONS } from "../../covid/covidPageQuestions";
import { createPiConversation } from "./PiHarness";
import type { EvalQuestion } from "../../EvalQuestion";
import type { EvalDatabase } from "../../runtime/EvalDatabase";
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

const { runEvalSqlMock } = vi.hoisted(() => {
  return { runEvalSqlMock: vi.fn() };
});

vi.mock("../../runtime/runEvalSql", () => {
  return { runEvalSql: runEvalSqlMock };
});

afterEach(() => {
  vi.clearAllMocks();
});

const QUESTION = {
  id: "Q01",
  category: "basic",
  prompt: "How many cases?",
  clarification: "not_needed",
  truth: {},
} as unknown as EvalQuestion;

/**
 * A data agent whose answer records one billed model call, then fails the
 * way `createDataAgent` does when a later call is refused.
 */
function _createFailingAgent(): DataAgent {
  const messages: unknown[] = [];
  return {
    agent: { state: { messages } },
    ask: async () => {
      messages.push(
        { role: "user", content: "How many cases?" },
        {
          role: "assistant",
          content: [],
          usage: {
            input: 100,
            output: 20,
            cacheRead: 30,
            cacheWrite: 0,
            reasoning: 5,
            cost: { total: 0.01 },
          },
        },
      );
      throw new Error("429 Too Many Requests");
    },
  } as unknown as DataAgent;
}

describe("createPiConversation", () => {
  it("grades a failed model call as a miss instead of rejecting", async () => {
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: _createFailingAgent,
    });

    const answer = await conversation.ask(QUESTION);

    expect(answer.finalSql).toBeUndefined();
    expect(answer.result).toBeUndefined();
    expect(answer).toMatchObject({
      error: "429 Too Many Requests",
      assistantText: "",
      clarifications: [],
      valuesSentToModel: [],
      usage: {
        calls: 1,
        promptTokens: 130,
        cachedPromptTokens: 30,
        completionTokens: 20,
        reasoningTokens: 5,
        cost: 0.01,
      },
    });
    expect(answer.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

/** P07: a dashboard chart filtered to Kings County, a personal column. */
const P07 = PAGE_QUESTIONS.find((question) => {
  return question.id === "P07";
})!;

/**
 * A data agent that records each message it is asked and, on its first
 * answer, runs the page's filter back through the host with the placeholder
 * the model read.
 */
function _createPlaceholderAgent(
  host: DataAgentHost,
  asked: string[],
): DataAgent {
  return {
    agent: { state: { messages: [] } },
    ask: async (text: string) => {
      asked.push(text);
      await host.showQuery({
        sql: `SELECT 1 FROM t WHERE "Admin2" = '<value 1>'`,
        summary: "Weekly",
      });
      await host.readColumnValues(
        `SELECT DISTINCT "Admin2" FROM t WHERE "Admin2" = '<value 1>'`,
      );
      return {
        text: "Done.",
        state: { questions: [], valuesSentToModel: [] },
        usage: {},
      };
    },
  } as unknown as DataAgent;
}

describe("createPiConversation page placeholders", () => {
  it("hides P07's personal filter value and restores it to run", async () => {
    runEvalSqlMock.mockResolvedValue({
      kind: "rows",
      result: { columns: [{ name: "x", type: "varchar" }], rows: [["Kings"]] },
    });
    const asked: string[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: (host) => {
        return _createPlaceholderAgent(host, asked);
      },
    });

    await conversation.ask(P07);

    expect(asked[0]).toContain(`"Admin2" = '<value 1>'`);
    expect(asked[0]).toContain(`"Province_State" = 'New York'`);
    expect(asked[0]).not.toContain("Kings");
    expect(runEvalSqlMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      `SELECT 1 FROM t WHERE "Admin2" = 'Kings'`,
    );
    expect(runEvalSqlMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      `SELECT DISTINCT "Admin2" FROM t WHERE "Admin2" = 'Kings'`,
    );
  });
});
