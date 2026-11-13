import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
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

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

function _questionById(id: string): EvalQuestion {
  return MENTION_QUESTIONS.find((candidate) => {
    return candidate.id === id;
  })!;
}

/** Asks the questions in order in one conversation, returning each text. */
async function _askAll(ids: readonly string[]): Promise<string[]> {
  const asked: string[] = [];
  runEvalSqlMock.mockResolvedValue({
    kind: "rows",
    result: { columns: [], rows: [] },
  });
  const conversation = createPiConversation({
    database: {} as EvalDatabase,
    createAgent: () => {
      return _createRecordingAgent(asked);
    },
  });
  for (const id of ids) {
    await conversation.ask(_questionById(id));
  }
  return asked;
}

function _blockOf(text: string, tag: string): string {
  return text.match(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`))?.[0] ?? "";
}

describe("the mention questions", () => {
  it.each(
    MENTION_QUESTIONS.map((question) => {
      return question.id;
    }),
  )("%s sends no token and no gadget id", async (id) => {
    const asked = await _askAll(id === "M03b" ? ["M03", id] : [id]);

    expect(asked.join("\n")).not.toContain("@{");
    expect(asked.join("\n")).not.toMatch(UUID_PATTERN);
  });

  it("M01 names the US deaths dataset in the mentioned block", async () => {
    const [text = ""] = await _askAll(["M01"]);

    expect(_blockOf(text, "mentioned")).toContain('"long-us-deaths.csv"');
  });

  it("M02 shows the mentioned tile's SQL in the mentioned block", async () => {
    const [text = ""] = await _askAll(["M02"]);

    expect(_blockOf(text, "mentioned")).toContain("daily_new_deaths");
  });

  it("M02 keeps the page's cases tile out of the mentioned block", async () => {
    const [text = ""] = await _askAll(["M02"]);

    expect(_blockOf(text, "mentioned")).not.toContain("daily_new_cases");
    expect(_blockOf(text, "current_page")).toContain("daily_new_cases");
  });

  it("M03 sends the attached block", async () => {
    const [text = ""] = await _askAll(["M03"]);

    expect(_blockOf(text, "attached")).toContain("Mortality");
  });

  it("M03b sends the unchanged line after M03", async () => {
    const asked = await _askAll(["M03", "M03b"]);

    expect(asked[1]).toContain(
      "<attached>Unchanged since the last message.</attached>",
    );
  });

  it("M04 names both datasets in the mentioned block", async () => {
    const [text = ""] = await _askAll(["M04"]);

    expect(_blockOf(text, "mentioned")).toContain('"long-us-deaths.csv"');
    expect(_blockOf(text, "mentioned")).toContain(
      '"long-us-confirmed-cases.csv"',
    );
  });

  it("M05 names the mention as an unavailable dashboard", async () => {
    const [text = ""] = await _askAll(["M05"]);

    expect(text).toContain("an unavailable dashboard");
  });

  it("M06 hides the county behind a placeholder", async () => {
    const [text = ""] = await _askAll(["M06"]);

    expect(text).toContain("'<value 1>'");
    expect(text).not.toContain("Kings");
  });
});

describe("createPiConversation mention placeholders", () => {
  it("restores M06's county placeholder before its SQL runs", async () => {
    runEvalSqlMock.mockResolvedValue({
      kind: "rows",
      result: { columns: [{ name: "x", type: "varchar" }], rows: [["Kings"]] },
    });
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: (host) => {
        return _createPlaceholderAgent(host, []);
      },
    });

    await conversation.ask(_questionById("M06"));

    expect(runEvalSqlMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      `SELECT 1 FROM t WHERE "Admin2" = 'Kings'`,
    );
  });
});

const FIT_QUESTION = {
  id: "R01",
  category: "page_context",
  prompt: "Fit y on x for the result on screen.",
  clarification: "not_needed",
  truth: {},
  fitRegression: {
    rows: [{ x: 1, y: 3 }],
    columns: ["x", "y"],
    xColumn: "x",
    yColumn: "y",
    slope: 2,
  },
} as unknown as EvalQuestion;

/** An agent that reads the store during `ask` and calls `fitRegression`. */
function _createFitAgent(
  seenDuringAsk: Array<ReturnType<typeof ExplorerPluginResultStore.get>>,
): DataAgent {
  const messages: unknown[] = [];
  return {
    agent: { state: { messages } },
    ask: async () => {
      seenDuringAsk.push(ExplorerPluginResultStore.get());
      messages.push(
        { role: "user", content: "Fit y on x for the result on screen." },
        {
          role: "assistant",
          content: [
            { type: "toolCall", id: "1", name: "fitRegression", arguments: {} },
          ],
        },
      );
      return {
        text: "The slope is 2.",
        state: { questions: [], valuesSentToModel: [] },
        usage: {},
      };
    },
  } as unknown as DataAgent;
}

describe("createPiConversation with a fitRegression question", () => {
  it("shows the rows to the tool during ask, then clears them", async () => {
    const seenDuringAsk: Array<
      ReturnType<typeof ExplorerPluginResultStore.get>
    > = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: () => {
        return _createFitAgent(seenDuringAsk);
      },
    });

    const answer = await conversation.ask(FIT_QUESTION);

    expect(seenDuringAsk).toEqual([
      {
        columns: [
          { name: "x", dataType: "double" },
          { name: "y", dataType: "double" },
        ],
        rows: [{ x: 1, y: 3 }],
      },
    ]);
    expect(ExplorerPluginResultStore.get()).toBeUndefined();
    expect(answer.toolNames).toEqual(["fitRegression"]);
  });

  it("records no tool names for a question that calls none", async () => {
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: _createFailingAgent,
    });

    const answer = await conversation.ask(QUESTION);

    expect(answer.toolNames).toEqual([]);
  });
});

describe("createPiConversation store isolation", () => {
  it("does not clear rows a fit ask set when a non-fit ask finishes", async () => {
    ExplorerPluginResultStore.set({
      columns: [{ name: "x", dataType: "double" }],
      rows: [{ x: 1 }],
    });
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: _createFailingAgent,
    });

    await conversation.ask(QUESTION);

    expect(ExplorerPluginResultStore.get()?.rows).toEqual([{ x: 1 }]);
    ExplorerPluginResultStore.clear();
  });

  it("does not write the store for a non-fit ask", async () => {
    const seenDuringAsk: Array<
      ReturnType<typeof ExplorerPluginResultStore.get>
    > = [];
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: () => {
        return _createFitAgent(seenDuringAsk);
      },
    });

    await conversation.ask(QUESTION);

    expect(seenDuringAsk).toEqual([undefined]);
  });
});
