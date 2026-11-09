import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { MENTION_QUESTIONS } from "../../covid/covidMentionQuestions";
import { PAGE_QUESTIONS } from "../../covid/covidPageQuestions";
import { createPiConversation } from "./PiHarness";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
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

const DASHBOARD_CONTEXT: AgentGadgetContext = {
  kind: "dashboard",
  ref: {
    gadgetType: "dashboard",
    gadgetId: "1a2b3c4d-0001-4000-8000-000000000001",
    subId: null,
  },
  name: "COVID 2022",
  tiles: [{ title: "Deaths by month", chartType: "line", sql: "SELECT 1" }],
};

const DATASET_CONTEXT: AgentGadgetContext = {
  kind: "dataset",
  ref: {
    gadgetType: "dataset",
    gadgetId: "86440223-249d-4b3d-9be4-159a4e615e0a",
    subId: null,
  },
  name: "US deaths",
};

/** A data agent that only records the text of each message it is asked. */
function _createRecordingAgent(asked: string[]): DataAgent {
  return {
    agent: { state: { messages: [] } },
    ask: async (text: string) => {
      asked.push(text);
      return {
        text: "Done.",
        state: { questions: [], valuesSentToModel: [] },
        usage: {},
      };
    },
  } as unknown as DataAgent;
}

function _createMentionQuestion(
  overrides: Partial<EvalQuestion>,
): EvalQuestion {
  return {
    ...QUESTION,
    prompt: `Totals for ${ChatMentionToken.buildToken(DATASET_CONTEXT.ref)}`,
    attached: [DASHBOARD_CONTEXT],
    mentions: [DATASET_CONTEXT],
    ...overrides,
  };
}

describe("createPiConversation mentions", () => {
  it("sends attached and mentioned blocks and named mentions", async () => {
    const asked: string[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: () => {
        return _createRecordingAgent(asked);
      },
    });

    await conversation.ask(_createMentionQuestion({}));

    expect(asked[0]).toContain("<attached>");
    expect(asked[0]).toContain("COVID 2022");
    expect(asked[0]).toContain("<mentioned>");
    expect(asked[0]).toContain('Totals for @"US deaths"');
    expect(asked[0]).not.toContain("@{");
  });

  it("sends the unchanged line for a repeated attached block", async () => {
    const asked: string[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: () => {
        return _createRecordingAgent(asked);
      },
    });

    await conversation.ask(_createMentionQuestion({ mentions: [] }));
    await conversation.ask(
      _createMentionQuestion({ mentions: [], prompt: "and last year?" }),
    );

    expect(asked[1]).toContain(
      "<attached>Unchanged since the last message.</attached>",
    );
    expect(asked[1]).not.toContain("Deaths by month");
  });

  it("clears the attached block once a question attaches nothing", async () => {
    const asked: string[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: () => {
        return _createRecordingAgent(asked);
      },
    });

    await conversation.ask(_createMentionQuestion({ mentions: [] }));
    await conversation.ask({ ...QUESTION, prompt: "next" });

    expect(asked[1]).toContain("Nothing is attached any more.");
  });

  it("names a mention it was not given as unavailable", async () => {
    const asked: string[] = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: () => {
        return _createRecordingAgent(asked);
      },
    });

    await conversation.ask(
      _createMentionQuestion({ attached: [], mentions: [] }),
    );

    expect(asked[0]).toContain('Totals for @"an unavailable dataset"');
  });
});

describe("the mention questions", () => {
  it.each(MENTION_QUESTIONS.map((question) => {return question.id}))(
    "%s reaches the model with named mentions and no tokens",
    async (id) => {
      const question = MENTION_QUESTIONS.find((candidate) => {
        return candidate.id === id;
      })!;
      const asked: string[] = [];
      const conversation = createPiConversation({
        database: {} as EvalDatabase,
        createAgent: () => {
          return _createRecordingAgent(asked);
        },
      });

      await conversation.ask(question);

      expect(asked[0]).not.toContain("@{");
      expect(asked[0]).toContain(question.prompt.includes("@{") ? '@"' : "");
    },
  );
});
