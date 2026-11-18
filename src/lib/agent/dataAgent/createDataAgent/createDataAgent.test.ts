import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLUGIN_AI_TOOLS } from "$/agent/dataAgent/pluginAiTools.gen";
import {
  createDataAgent,
  createDataAgentToolList,
  getDataAgentReplyText,
} from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { createDataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import { createLocalModel } from "@/lib/agent/localModels/createLocalModelStreamFn/createLocalModelStreamFn";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
import { runPluginAiTool as runPluginAiToolOnScreen } from "@/lib/plugins/runPluginAiTool/runPluginAiTool";
import { runFitRegression } from "../../../../../plugins/epidemiology/src/fitRegression/runFitRegression";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
import type { CreateDataAgentOptions } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { AvandarApi, QueryHandle } from "@avandar/plugin-sdk";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import type {
  AssistantMessage,
  JsonObject,
  StopReason,
} from "@earendil-works/pi-ai";

const MODEL = createLocalModel({ id: "test", name: "test", contextWindow: 8 });

const HOST: DataAgentHost = {
  showQuery: vi.fn(),
  readColumnValues: vi.fn(),
  askUser: vi.fn(),
  approveValuesForModel: vi.fn(),
};

/** A stream function whose every model call ends as `reason`. */
function _createEndingStreamFn(
  reason: Extract<StopReason, "error" | "aborted">,
  errorMessage?: string,
): StreamFn {
  return () => {
    const stream = createAssistantMessageEventStream();
    const message: AssistantMessage = {
      role: "assistant",
      content: [],
      api: MODEL.api,
      provider: MODEL.provider,
      model: MODEL.id,
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: reason,
      errorMessage,
      timestamp: 0,
    };
    queueMicrotask(() => {
      stream.push({ type: "start", partial: message });
      stream.push({ type: "error", reason, error: message });
    });
    return stream;
  };
}

const OPTIONS = {
  datasets: [],
  host: HOST,
  policy: { primary: { model: MODEL, thinkingLevel: "off" as const } },
  today: "2026-11-08",
};

const STOP_STREAM = _createEndingStreamFn("aborted");

const FIT_DECLARATION: PluginAiToolDeclaration = {
  pluginId: "avandar.epidemiology",
  permissions: ["data:read"],
  name: "fitRegression",
  description: "Fits a line to two numeric columns.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: [],
    properties: {},
  },
};

type Row = Readonly<Record<string, unknown>>;

const LINE_COLUMNS = [
  { name: "x", dataType: "double" },
  { name: "y", dataType: "double" },
] as const;

const EXACT_LINE_ROWS: Row[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => {
  return { x, y: 2 * x + 1 };
});

const EPIDEMIOLOGY_DECLARATION = PLUGIN_AI_TOOLS.find((declaration) => {
  return declaration.name === "fitRegression";
})!;

/** Just enough of the plugin API for `runFitRegression` to read `rows`. */
function avandarWithRows(
  rows: readonly Row[],
  columnNames: readonly string[],
): AvandarApi {
  return {
    context: {
      slotId: "agent.tool",
      queryHandle: "query-handle-1" as QueryHandle,
      columns: columnNames.map((name) => {
        return { name, dataType: "double" as const };
      }),
      rowCount: rows.length,
    },
    data: {
      fetchRows: vi.fn(() => {
        return Promise.resolve({ rows, isTruncated: false });
      }),
    },
  } as unknown as AvandarApi;
}

function _createAssistantMessage(
  content: AssistantMessage["content"],
  stopReason: Extract<StopReason, "stop" | "toolUse">,
): AssistantMessage {
  return {
    role: "assistant",
    content,
    api: MODEL.api,
    provider: MODEL.provider,
    model: MODEL.id,
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason,
    timestamp: 0,
  };
}

function toolCallMessage(name: string, args: JsonObject): AssistantMessage {
  return _createAssistantMessage(
    [{ type: "toolCall", id: "call-1", name, arguments: args }],
    "toolUse",
  );
}

function textMessage(text: string): AssistantMessage {
  return _createAssistantMessage([{ type: "text", text }], "stop");
}

/** A stream function that answers model call N with `messages[N]`. */
function scriptedStream(messages: readonly AssistantMessage[]): StreamFn {
  let callCount = 0;
  return () => {
    const message = messages[callCount];
    callCount += 1;
    if (!message) {
      throw new Error("The script has no response for this model call.");
    }
    const stream = createAssistantMessageEventStream();
    queueMicrotask(() => {
      stream.push({ type: "start", partial: message });
      stream.push({
        type: "done",
        reason: message.stopReason as "stop" | "toolUse",
        message,
      });
    });
    return stream;
  };
}

function toolResultText(message: unknown): string {
  const { content } = message as {
    content: Array<{ type: string; text?: string }>;
  };
  return content
    .map((block) => {
      return block.text ?? "";
    })
    .join("");
}

function _createAgent(streamFn: StreamFn) {
  return createDataAgent({
    datasets: [],
    host: HOST,
    policy: { primary: { model: MODEL, thinkingLevel: "off" } },
    streamFn,
    today: "2026-11-08",
  });
}

describe("createDataAgent", () => {
  it("throws the model call's error when the request fails", async () => {
    const dataAgent = _createAgent(
      _createEndingStreamFn("error", "Failed to fetch"),
    );

    await expect(dataAgent.ask("How many?")).rejects.toThrow("Failed to fetch");
  });

  it("throws a general error when the failure has no message", async () => {
    const dataAgent = _createAgent(_createEndingStreamFn("error"));

    await expect(dataAgent.ask("How many?")).rejects.toThrow(
      "The assistant could not answer.",
    );
  });

  it("does not treat a stopped turn as a failure", async () => {
    const dataAgent = _createAgent(
      _createEndingStreamFn("aborted", "Request aborted by user"),
    );

    await expect(dataAgent.ask("How many?")).resolves.toMatchObject({
      text: "",
    });
  });

  it("adds the plugin tool on ask and leaves it off the plan tool list", async () => {
    let installedTools: readonly PluginAiToolDeclaration[] = [];
    const getPluginAiTools = vi.fn(() => {
      return installedTools;
    });
    const runPluginAiTool = vi
      .fn()
      .mockResolvedValue({ text: '{"slope":2}', isError: false });
    const agent = createDataAgent({
      ...OPTIONS,
      getPluginAiTools,
      runPluginAiTool,
      streamFn: STOP_STREAM,
    });
    // Installed after the agent exists, so only an ask-time read sees it.
    installedTools = [FIT_DECLARATION];
    await agent.ask("fit it");
    expect(getPluginAiTools).toHaveBeenCalled();
    expect(
      agent.agent.state.tools.map((tool) => {
        return tool.name;
      }),
    ).toContain("fitRegression");

    const planAgent = createDataAgent({
      ...OPTIONS,
      queryTools: "plan",
      getPluginAiTools,
      runPluginAiTool,
      streamFn: STOP_STREAM,
    });
    await planAgent.ask("fit it");
    expect(
      planAgent.agent.state.tools.map((tool) => {
        return tool.name;
      }),
    ).not.toContain("fitRegression");
  });

  describe("with a plugin tool", () => {
    afterEach(() => {
      ExplorerPluginResultStore.clear();
    });

    it("returns the five fields and lets the model state the slope", async () => {
      ExplorerPluginResultStore.set({
        columns: LINE_COLUMNS,
        rows: EXACT_LINE_ROWS,
      });
      const dataAgent = createDataAgent({
        ...OPTIONS,
        getPluginAiTools: () => {
          return [EPIDEMIOLOGY_DECLARATION];
        },
        runPluginAiTool: (request) => {
          return runPluginAiToolOnScreen({
            ...request,
            isDataExplorer: true,
            chatResults: [],
            runQuery: vi.fn(),
            invoke: (_context, args) => {
              return runFitRegression(
                avandarWithRows(EXACT_LINE_ROWS, ["x", "y"]),
                {
                  xColumn: String(args.xColumn),
                  yColumn: String(args.yColumn),
                },
              );
            },
          });
        },
        streamFn: scriptedStream([
          toolCallMessage("fitRegression", { xColumn: "x", yColumn: "y" }),
          textMessage("The slope is 2."),
        ]),
      });

      const reply = await dataAgent.ask("Fit y on x.");

      expect(reply.text).toBe("The slope is 2.");
      const toolResult = dataAgent.agent.state.messages.find((message) => {
        return message.role === "toolResult";
      });
      expect(JSON.parse(toolResultText(toolResult))).toMatchObject({
        slope: expect.closeTo(2),
        intercept: expect.closeTo(1),
        rSquared: expect.closeTo(1),
        n: 10,
        isTruncated: false,
      });
    });

    it("still ends the turn when run_query returns rows", async () => {
      const showQuery = vi.fn().mockResolvedValue({
        kind: "rows",
        columns: [],
        rowCount: 1,
      });
      const streamFn = scriptedStream([
        toolCallMessage("run_query", {
          sql: "select 1",
          summary: "One row.",
        }),
        textMessage("A second model call."),
      ]);
      const dataAgent = createDataAgent({
        ...OPTIONS,
        host: {
          ...HOST,
          showQuery,
          approveValuesForModel: vi.fn().mockResolvedValue(true),
        },
        getPluginAiTools: () => {
          return [EPIDEMIOLOGY_DECLARATION];
        },
        runPluginAiTool: vi.fn(),
        streamFn: vi.fn(streamFn),
      });

      const reply = await dataAgent.ask("How many?");

      expect(reply.text).toBe("One row.");
      expect(showQuery).toHaveBeenCalledTimes(1);
      expect(reply.modelIds).toHaveLength(1);
    });
  });
});

function _options(
  overrides: Partial<CreateDataAgentOptions>,
): CreateDataAgentOptions {
  return {
    datasets: [],
    host: HOST,
    policy: {} as CreateDataAgentOptions["policy"],
    streamFn: vi.fn(),
    today: "2026-11-11",
    ...overrides,
  };
}

function _namesOf(options: CreateDataAgentOptions): string[] {
  return createDataAgentToolList(options, [], createDataAgentRunState()).map(
    (tool) => {
      return tool.name;
    },
  );
}

describe("createDataAgentToolList", () => {
  it.each([
    "data-agent-v1",
    "data-agent-v2",
    "data-agent-v3",
    "data-agent-v4",
    "data-agent-v5",
  ] as const)("leaves the dashboard tool out for %s", (promptId) => {
    expect(_namesOf(_options({ promptId }))).not.toContain(
      "add_dashboard_block",
    );
  });

  it("adds the dashboard tool for v6, which serves it", () => {
    expect(_namesOf(_options({ promptId: "data-agent-v6" }))).toContain(
      "add_dashboard_block",
    );
  });

  it("adds it beside plan_query for the offline plan style", () => {
    expect(
      _namesOf(_options({ promptId: "data-agent-v6", queryTools: "plan" })),
    ).toEqual(["plan_query", "run_query", "ask_user", "add_dashboard_block"]);
  });

  it("lists v6's built-in tools, then the plugin tools, as the proxy does", () => {
    expect(
      _namesOf(
        _options({
          promptId: "data-agent-v6",
          getPluginAiTools: () => {
            return [FIT_DECLARATION];
          },
          runPluginAiTool: vi.fn(),
        }),
      ),
    ).toEqual([
      "run_query",
      "lookup_values",
      "ask_user",
      "add_dashboard_block",
      FIT_DECLARATION.name,
    ]);
  });
});

function _endedOn(
  toolName: string,
  text = "Let me add that.",
): Parameters<typeof getDataAgentReplyText>[0] {
  return [
    {
      role: "assistant",
      content: [
        { type: "text", text },
        { type: "toolCall", id: "c1", name: toolName, arguments: {} },
      ],
    },
  ] as unknown as Parameters<typeof getDataAgentReplyText>[0];
}

describe("getDataAgentReplyText", () => {
  it("replies with the dashboard tool's summary when the turn ended on it", () => {
    const state = createDataAgentRunState();
    state.dashboardBlock = { summary: "Added a heading to COVID 2022." };

    expect(getDataAgentReplyText(_endedOn("add_dashboard_block"), state)).toBe(
      "Added a heading to COVID 2022.",
    );
  });

  it("says the chart could not be built when its query cap ran out", () => {
    const state = createDataAgentRunState();
    state.queryRuns = 3;
    state.needsEscalation = true;

    expect(getDataAgentReplyText(_endedOn("add_dashboard_block"), state)).toBe(
      "I couldn't build that chart. Its query kept failing.",
    );
  });

  it("keeps the model's text while the chart query may still be retried", () => {
    const state = createDataAgentRunState();
    state.queryRuns = 2;

    expect(getDataAgentReplyText(_endedOn("add_dashboard_block"), state)).toBe(
      "Let me add that.",
    );
  });
});

type ScriptedToolCall = { name: string; arguments: JsonObject };

/** A stream function whose n-th model call is the n-th scripted tool call. */
function _createToolCallingStreamFn(
  script: readonly ScriptedToolCall[],
): StreamFn {
  let callCount = 0;
  return () => {
    const scripted = script[callCount];
    if (!scripted) {
      throw new Error("The model was called more often than scripted.");
    }
    callCount += 1;
    const toolCall = {
      type: "toolCall" as const,
      id: `call-${callCount}`,
      ...scripted,
    };
    const message: AssistantMessage = {
      role: "assistant",
      content: [toolCall],
      api: MODEL.api,
      provider: MODEL.provider,
      model: MODEL.id,
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "toolUse",
      timestamp: 0,
    };
    const stream = createAssistantMessageEventStream();
    queueMicrotask(() => {
      stream.push({ type: "start", partial: message });
      stream.push({ type: "done", reason: "toolUse", message });
    });
    return stream;
  };
}

function _addHeading(summary: string): ScriptedToolCall {
  return {
    name: "add_dashboard_block",
    arguments: {
      dashboard: "COVID 2022",
      block: { kind: "HeadingBlock", text: "Deaths in 2022" },
      summary,
    },
  };
}

describe("createDataAgent across several asks", () => {
  function _createDashboardAgent(script: readonly ScriptedToolCall[]) {
    const host: DataAgentHost = {
      ...HOST,
      approveValuesForModel: vi.fn().mockResolvedValue(true),
      showQuery: vi
        .fn()
        .mockResolvedValue({ kind: "rows", columns: [], rowCount: 2 }),
      checkQuery: vi
        .fn()
        .mockResolvedValue({ kind: "rows", columns: [], rowCount: 2 }),
      addDashboardBlock: vi.fn().mockResolvedValue({ kind: "added_to_editor" }),
    };
    const dataAgent = createDataAgent({
      datasets: [],
      host,
      policy: { primary: { model: MODEL, thinkingLevel: "off" } },
      streamFn: _createToolCallingStreamFn(script),
      today: "2026-11-08",
      promptId: "data-agent-v6",
    });
    return { dataAgent, host };
  }

  it("adds a block on a later ask after one was added", async () => {
    const { dataAgent, host } = _createDashboardAgent([
      _addHeading("Added the first heading."),
      _addHeading("Added the second heading."),
    ]);

    await dataAgent.ask("Add a heading");
    const second = await dataAgent.ask("Add another heading");

    expect(host.addDashboardBlock).toHaveBeenCalledTimes(2);
    expect(second.text).toBe("Added the second heading.");
  });

  it("does not reply with an earlier answer's block summary", async () => {
    const { dataAgent } = _createDashboardAgent([
      _addHeading("Added the first heading."),
      {
        name: "run_query",
        arguments: { sql: "SELECT 1", summary: "One row of numbers." },
      },
    ]);

    await dataAgent.ask("Add a heading");
    const second = await dataAgent.ask("How many deaths?");

    expect(second.text).toBe("One row of numbers.");
  });

  describe("after a run_query answer", () => {
    function _createQueryAgent(streamFn: StreamFn) {
      const host: DataAgentHost = {
        ...HOST,
        approveValuesForModel: vi.fn().mockResolvedValue(true),
        showQuery: vi
          .fn()
          .mockResolvedValue({ kind: "rows", columns: [], rowCount: 2 }),
      };
      return createDataAgent({
        datasets: [],
        host,
        policy: { primary: { model: MODEL, thinkingLevel: "off" } },
        streamFn,
        today: "2026-11-08",
        promptId: "data-agent-v6",
      });
    }

    const FIRST_QUERY = toolCallMessage("run_query", {
      sql: "SELECT 1",
      summary: "One row of numbers.",
    });

    it("keeps its query out of a later message-only reply", async () => {
      const dataAgent = _createQueryAgent(
        scriptedStream([FIRST_QUERY, textMessage("Glad to help.")]),
      );

      const first = await dataAgent.ask("How many deaths?");
      expect(first.state.lastQuery?.summary).toBe("One row of numbers.");
      const second = await dataAgent.ask("Thanks");

      expect(second.text).toBe("Glad to help.");
      expect(second.state.lastQuery).toBeUndefined();
    });

    it("does not fall back to its summary for an empty reply", async () => {
      const dataAgent = _createQueryAgent(
        scriptedStream([FIRST_QUERY, _createAssistantMessage([], "stop")]),
      );

      await dataAgent.ask("How many deaths?");
      const second = await dataAgent.ask("Thanks");

      expect(second.text).toBe("");
    });
  });
});
