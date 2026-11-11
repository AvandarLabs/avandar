import { Model } from "@avandar/models";
import { definePlugin } from "@avandar/plugin-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLUGIN_AI_TOOLS } from "$/agent/dataAgent/pluginAiTools.gen";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { runDataAgentTurn } from "./runDataAgentTurn";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { AgentPageInputs } from "./runDataAgentTurn";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { CreateDataAgentOptions } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { runPluginAiTool } from "@/lib/plugins/runPluginAiTool/runPluginAiTool";
import type { AgentToolContext } from "@avandar/plugin-sdk";

const {
  askMock,
  createDataAgentMock,
  createAgentPageContextMock,
  getAllDatasetsMock,
  runPluginAiToolMock,
  showQueryInChatMock,
} = vi.hoisted(() => {
  return {
    askMock: vi.fn(),
    createDataAgentMock: vi.fn(),
    createAgentPageContextMock: vi.fn(),
    getAllDatasetsMock: vi.fn(),
    runPluginAiToolMock: vi.fn(),
    showQueryInChatMock: vi.fn(),
  };
});

/**
 * The one bundled plugin in these tests. Its id is the epidemiology
 * plugin's, so the generated `fitRegression` declaration names it, and each
 * test sets the definition its code chunk holds. The module cache keeps the
 * first chunk for the session, so the chunk reads the definition live.
 */
const bundledPluginMocks = vi.hoisted(() => {
  return { definition: undefined as unknown };
});

vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: (pluginId: string) => {
      if (pluginId !== "avandar.epidemiology") {
        return undefined;
      }
      return {
        id: pluginId,
        loadManifest: () => {
          return Promise.reject(new Error("Not loaded in these tests"));
        },
        loadCode: () => {
          return Promise.resolve({
            get definition() {
              return bundledPluginMocks.definition;
            },
            messages: {},
          });
        },
      };
    },
  };
});

vi.mock("@/lib/plugins/runPluginAiTool/runPluginAiTool", () => {
  return { runPluginAiTool: runPluginAiToolMock };
});

vi.mock("@/lib/agent/dataAgent/createDataAgent/createDataAgent", () => {
  return { createDataAgent: createDataAgentMock };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getAllDatasetsWithColumns: getAllDatasetsMock } };
});

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/agentPageNameLoader",
  () => {
    return {
      createAgentPageNameLoader: () => {
        return {
          getDashboard: vi.fn().mockResolvedValue(undefined),
          getMapName: vi.fn().mockResolvedValue(undefined),
          getCaseTypeName: vi.fn().mockResolvedValue(undefined),
        };
      },
    };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext",
  async (importOriginal) => {
    const original = await importOriginal<{
      createAgentPageContext: (...args: never[]) => unknown;
    }>();
    createAgentPageContextMock.mockImplementation(
      original.createAgentPageContext,
    );
    return { createAgentPageContext: createAgentPageContextMock };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat",
  () => {
    return { showQueryInChat: showQueryInChatMock };
  },
);

const DATASET_A = {
  id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  name: "cases.csv",
  columns: [
    { name: "email", dataType: "varchar" },
    { name: "last_name", dataType: "varchar" },
    { name: "state", dataType: "varchar" },
  ],
};
/** Sorts before A, so a list with it would make A's alias `t1`. */
const DATASET_B = {
  id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  name: "deaths.csv",
  columns: [],
};
const DASHBOARD_ID = "cccccccc-3333-4333-8333-cccccccccccc";

const DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: DATASET_A.id,
  subId: null,
};
const DATASET_TOKEN = ChatMentionToken.buildToken(DATASET_REF);
const DATASET_CONTEXT: AgentGadgetContext = {
  kind: "dataset",
  ref: DATASET_REF,
  name: "US deaths",
};
const OTHER_DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: "dddddddd-4444-4444-8444-dddddddddddd",
  subId: null,
};
const OTHER_DATASET_TOKEN = ChatMentionToken.buildToken(OTHER_DATASET_REF);
const OTHER_DATASET_CONTEXT: AgentGadgetContext = {
  kind: "dataset",
  ref: OTHER_DATASET_REF,
  name: "Hospital beds",
};
const DASHBOARD_REF: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
  subId: null,
};
const DASHBOARD_CONTEXT: AgentGadgetContext = {
  kind: "dashboard",
  ref: DASHBOARD_REF,
  name: "Weekly outbreak",
  tiles: [{ title: "Cases", chartType: "table", sql: "SELECT 1" }],
};

/** The contexts by ref key, as the turn's loader returns them. */
function _contexts(
  ...contexts: readonly AgentGadgetContext[]
): Map<string, AgentGadgetContext> {
  return new Map(
    contexts.map((context) => {
      return [ChatMentionToken.buildRefKey(context.ref), context];
    }),
  );
}

function _turn(
  workspaceId: string,
  content: string | readonly string[],
  chatGeneration = 0,
): DataAgentTurnOptions {
  const contents = typeof content === "string" ? [content] : content;
  return {
    apiMessages: contents.map((text, index) => {
      return { role: index % 2 === 0 ? "user" : "assistant", content: text };
    }),
    workspaceId,
    currentUser: undefined,
    chatGeneration,
    parseSqlRef: { current: vi.fn() },
    dataExplorerDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
  } as unknown as DataAgentTurnOptions;
}

function _page(pathname: string): AgentPageInputs {
  return {
    pathname,
    chatPageContext: Model.make("ChatPageContext", { app: "other" }),
    dashboardEditorState: {
      activeDashboardId: undefined,
      editorData: undefined,
    } as never,
  };
}

function _dashboardWithTile(sql: string, title = "Cases"): AgentPageContext {
  return {
    app: "dashboard",
    dashboard: {
      id: DASHBOARD_ID,
      name: "Outbreak",
      tiles: [{ title, chartType: "table", sql }],
    },
  };
}

function _askedTexts(): string[] {
  return askMock.mock.calls.map(([text]) => {
    return text as string;
  });
}

function _lastAgentOptions(): CreateDataAgentOptions {
  return createDataAgentMock.mock.calls.at(-1)![0];
}

/** A result with only an `x` column, for a plugin tool to run against. */
const PLUGIN_TOOL_CONTEXT = {
  slotId: "agent.tool",
  queryHandle: "query-handle-1",
  columns: [{ name: "x", dataType: "double" }],
  rowCount: 0,
} as unknown as AgentToolContext;

const FIT_REGRESSION_DECLARATION = PLUGIN_AI_TOOLS.find((declaration) => {
  return declaration.name === "fitRegression";
})!;

/** Calls the conversation's plugin tool runner, as the agent would. */
async function _runPluginAiToolFromAgent(): Promise<
  Parameters<typeof runPluginAiTool>[0]
> {
  await _lastAgentOptions().runPluginAiTool!({
    declaration: FIT_REGRESSION_DECLARATION,
    args: { xColumn: "x", yColumn: "y" },
  });
  return runPluginAiToolMock.mock.calls.at(-1)![0];
}

/** Makes the agent's next ask show `result` as a chat result card. */
function _showChatResultOnNextAsk(result: AgentQueryResultData): void {
  showQueryInChatMock.mockImplementationOnce(
    (options: { results: AgentQueryResultData[] }) => {
      options.results.push(result);
      return Promise.resolve({ kind: "rows", columns: [], rowCount: 1 });
    },
  );
  askMock.mockImplementationOnce(async () => {
    await _lastAgentOptions().host.showQuery({ sql: "SELECT 1" } as never);
    return { text: "Here it is." };
  });
}

beforeEach(() => {
  askMock.mockResolvedValue({ text: "Done." });
  createDataAgentMock.mockImplementation(() => {
    return { agent: { abort: vi.fn() }, ask: askMock };
  });
  showQueryInChatMock.mockResolvedValue({
    kind: "empty",
    columns: [],
    rowCount: 0,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("runDataAgentTurn", () => {
  it("passes the turn's plugin tools into the agent", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    const getPluginAiTools = () => {
      return [];
    };
    await runDataAgentTurn({
      ..._turn("workspace-1", "Fit a line."),
      getPluginAiTools,
    });
    expect(_lastAgentOptions().getPluginAiTools).toBe(getPluginAiTools);
  });

  it("lets a plugin tool read the result an earlier turn added to the chat", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    const chatResult = { sql: "SELECT x, y FROM t0" } as AgentQueryResultData;
    _showChatResultOnNextAsk(chatResult);
    await runDataAgentTurn(_turn("workspace-earlier-result", "Show x and y."));
    await runDataAgentTurn(
      _turn("workspace-earlier-result", [
        "Show x and y.",
        "Here it is.",
        "Fit a line.",
      ]),
    );

    const request = await _runPluginAiToolFromAgent();

    expect(request.chatResults).toEqual([chatResult]);
    expect(request.isDataExplorer).toBe(false);
  });

  it("keeps an older chat result when a later turn shows none", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    const chatResult = { sql: "SELECT x, y FROM t0" } as AgentQueryResultData;
    _showChatResultOnNextAsk(chatResult);
    await runDataAgentTurn(_turn("workspace-older-result", "Show x and y."));
    await runDataAgentTurn(
      _turn("workspace-older-result", [
        "Show x and y.",
        "Here it is.",
        "Thanks.",
      ]),
    );

    const request = await _runPluginAiToolFromAgent();

    expect(request.chatResults.at(-1)).toBe(chatResult);
  });

  it("tells the plugin runner when the turn is on the Data Explorer", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    createAgentPageContextMock.mockResolvedValueOnce({ app: "data-explorer" });
    await runDataAgentTurn(
      _turn("workspace-explorer-tool", "Fit a line."),
      _page("/acme/data-explorer"),
    );

    const request = await _runPluginAiToolFromAgent();

    expect(request.isDataExplorer).toBe(true);
  });

  it("calls the bundled plugin's handler with the plugin API and arguments", async () => {
    const fitRegression = vi.fn().mockResolvedValue({ slope: 2 });
    bundledPluginMocks.definition = definePlugin({
      aiTools: { fitRegression },
    });
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    await runDataAgentTurn(_turn("workspace-bundled-tool", "Fit a line."));
    const request = await _runPluginAiToolFromAgent();

    await expect(
      request.invoke(PLUGIN_TOOL_CONTEXT, { xColumn: "x", yColumn: "y" }),
    ).resolves.toEqual({ slope: 2 });
    const [pluginApi, args] = fitRegression.mock.calls[0]!;
    expect(pluginApi.context).toBe(PLUGIN_TOOL_CONTEXT);
    expect(pluginApi.workspace.id).toBe("workspace-bundled-tool");
    expect(args).toEqual({ xColumn: "x", yColumn: "y" });
  });

  it("fails a tool whose bundled plugin has no handler for it", async () => {
    bundledPluginMocks.definition = definePlugin({});
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    await runDataAgentTurn(_turn("workspace-missing-handler", "Fit a line."));
    const request = await _runPluginAiToolFromAgent();

    await expect(request.invoke(PLUGIN_TOOL_CONTEXT, {})).rejects.toThrow(
      'Plugin "avandar.epidemiology" has no AI tool "fitRegression"',
    );
  });

  it("fails a tool whose plugin is not bundled", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    await runDataAgentTurn(_turn("workspace-unbundled-tool", "Fit a line."));
    await _lastAgentOptions().runPluginAiTool!({
      declaration: { ...FIT_REGRESSION_DECLARATION, pluginId: "nobody.none" },
      args: {},
    });
    const request = runPluginAiToolMock.mock.calls.at(-1)![0];

    await expect(request.invoke(PLUGIN_TOOL_CONTEXT, {})).rejects.toThrow(
      'Plugin "nobody.none" is not bundled',
    );
  });

  it("names tables in the page block as the agent knows them", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    await runDataAgentTurn(
      _turn("workspace-aliases", "How many?"),
      _page("/acme/data-explorer"),
    );
    getAllDatasetsMock.mockResolvedValue([DATASET_A, DATASET_B]);

    await runDataAgentTurn(
      _turn("workspace-aliases", "And this one?"),
      _page(`/acme/data-manager/${DATASET_A.id}`),
    );

    expect(getAllDatasetsMock).toHaveBeenCalledTimes(1);
    expect(_askedTexts()[1]).toContain(
      'Open dataset: "cases.csv" (query it as t0)',
    );
  });

  it("keeps the page and shows results in the chat when reading it fails", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    createAgentPageContextMock.mockRejectedValueOnce(new Error("bad editor"));

    await runDataAgentTurn(
      _turn("workspace-fallback", "How many?"),
      _page(`/acme/dashboards/edit/${DASHBOARD_ID}`),
    );
    await _lastAgentOptions().host.showQuery({ sql: "SELECT 1", summary: "s" });

    expect(_askedTexts()[0]).toContain("Page: Dashboard");
    expect(showQueryInChatMock).toHaveBeenCalled();
  });

  it("hides personal values in page SQL behind placeholders", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    createAgentPageContextMock.mockResolvedValueOnce(
      _dashboardWithTile(
        `SELECT * FROM t WHERE "email" = 'jane.doe@example.com' AND "last_name" = 'Doe' AND "state" = 'Texas'`,
        "Calls to 555-123-4567",
      ),
    );

    await runDataAgentTurn(
      _turn("workspace-redaction", "What is this?"),
      _page(`/acme/dashboards/edit/${DASHBOARD_ID}`),
    );

    expect(_askedTexts()[0]).toContain(
      `1. "Untitled chart" (table): SELECT * FROM t WHERE "email" = '<value 1>' AND "last_name" = '<value 2>' AND "state" = 'Texas'`,
    );
    expect(_askedTexts()[0]).not.toContain("jane.doe");
    expect(_askedTexts()[0]).not.toContain("'Doe'");
  });

  it("hides spreadsheet-header filters, alias filters, and titles", async () => {
    getAllDatasetsMock.mockResolvedValue([
      {
        ...DATASET_A,
        columns: [
          { name: "First Name", dataType: "varchar" },
          { name: "state", dataType: "varchar" },
        ],
      },
    ]);
    createAgentPageContextMock.mockResolvedValueOnce(
      _dashboardWithTile(
        `WITH x AS (SELECT "First Name" AS n, "state" FROM t) SELECT * FROM x WHERE n = 'Ann' OR "First Name" = 'Jane' AND "state" = 'Texas'`,
        "Visits by Jane",
      ),
    );

    await runDataAgentTurn(
      _turn("workspace-headers", "What is this?"),
      _page(`/acme/dashboards/edit/${DASHBOARD_ID}`),
    );

    expect(_askedTexts()[0]).not.toContain("Ann");
    expect(_askedTexts()[0]).not.toContain("Jane");
    expect(_askedTexts()[0]).toContain(`"state" = 'Texas'`);
  });

  it("keeps a value's placeholder across turns and restores it", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    createAgentPageContextMock
      .mockResolvedValueOnce(
        _dashboardWithTile(`SELECT * FROM t WHERE "last_name" = 'Doe'`),
      )
      .mockResolvedValueOnce(
        _dashboardWithTile(
          `SELECT * FROM t WHERE "last_name" IN ('Roe', 'Doe')`,
        ),
      );
    const page = _page(`/acme/dashboards/edit/${DASHBOARD_ID}`);

    await runDataAgentTurn(_turn("workspace-vault", "What is this?"), page);
    await runDataAgentTurn(_turn("workspace-vault", "And now?"), page);
    await _lastAgentOptions().host.showQuery({
      sql: `SELECT * FROM t WHERE "last_name" = '<value 1>'`,
      summary: "s",
    });

    expect(createDataAgentMock).toHaveBeenCalledTimes(1);
    expect(_askedTexts()[1]).toContain(
      `"last_name" IN ('<value 2>', '<value 1>')`,
    );
    expect(showQueryInChatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          sql: `SELECT * FROM t WHERE "last_name" = 'Doe'`,
        }),
      }),
    );
  });

  it("sends attached and mentioned blocks and names mentions in the message", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);

    await runDataAgentTurn({
      ..._turn("workspace-mentions", `Totals for ${DATASET_TOKEN}`),
      gadgetContext: {
        attachedRefs: [DASHBOARD_REF],
        contexts: _contexts(DATASET_CONTEXT, DASHBOARD_CONTEXT),
      },
    });

    const asked = _askedTexts()[0]!;
    expect(asked).toContain("<attached>");
    expect(asked).toContain('1. Dashboard "Weekly outbreak"');
    expect(asked).toContain("<mentioned>");
    expect(asked).toContain(
      '@"US deaths": Dataset "US deaths" (query it as t0)',
    );
    expect(asked).toContain('Totals for @"US deaths"');
    expect(asked).not.toContain("@{");
    expect(asked).not.toContain(DATASET_A.id);
    expect(asked).not.toContain(DASHBOARD_REF.gadgetId);
  });

  it("masks a mentioned name that page SQL revealed", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    createAgentPageContextMock.mockResolvedValueOnce(
      _dashboardWithTile(`SELECT * FROM t WHERE "patient_name" = 'Jane Doe'`),
    );

    await runDataAgentTurn(
      {
        ..._turn("workspace-mention-mask", `Visits in ${DATASET_TOKEN}`),
        gadgetContext: {
          attachedRefs: [],
          contexts: _contexts({ ...DATASET_CONTEXT, name: "Jane Doe visits" }),
        },
      },
      _page(`/acme/dashboards/edit/${DASHBOARD_ID}`),
    );

    const asked = _askedTexts()[0]!;
    expect(asked).toContain(`"patient_name" = '<value 1>'`);
    expect(asked).toContain('Visits in @"<value 1> visits"');
    expect(asked).toContain('@"<value 1> visits": Dataset "<value 1> visits"');
    expect(asked).not.toContain("Jane Doe");
  });

  it("describes only the answered message's mentions, naming earlier ones in the recap", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);

    await runDataAgentTurn({
      ..._turn("workspace-recap", [
        `Beds in ${OTHER_DATASET_TOKEN}?`,
        "There are 40.",
        `Totals for ${DATASET_TOKEN}`,
      ]),
      gadgetContext: {
        attachedRefs: [],
        contexts: _contexts(DATASET_CONTEXT, OTHER_DATASET_CONTEXT),
      },
    });

    const asked = _askedTexts()[0]!;
    expect(asked).toContain('User: Beds in @"Hospital beds"?');
    expect(asked).toContain('@"US deaths": Dataset "US deaths"');
    expect(asked).not.toContain('@"Hospital beds": Dataset');
    expect(asked).not.toContain("@{");
    expect(asked).not.toContain(OTHER_DATASET_REF.gadgetId);
  });

  it("sends no gadget blocks when loading failed, keeping last turn's tray", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    await runDataAgentTurn({
      ..._turn("workspace-load-failed", "What is pinned?"),
      gadgetContext: {
        attachedRefs: [DASHBOARD_REF],
        contexts: _contexts(DASHBOARD_CONTEXT),
      },
    });

    await runDataAgentTurn({
      ..._turn("workspace-load-failed", `Totals for ${DATASET_TOKEN}`),
      gadgetContext: { attachedRefs: [DASHBOARD_REF], contexts: undefined },
    });

    const asked = _askedTexts()[1]!;
    expect(_askedTexts()[0]).toContain('1. Dashboard "Weekly outbreak"');
    expect(asked).toContain(
      "<attached>Unchanged since the last message.</attached>",
    );
    expect(asked).not.toContain("<mentioned>");
    expect(asked).toContain('Totals for @"an unavailable dataset"');
    expect(asked).not.toContain("@{");
  });

  it("says once that the tray was emptied", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    await runDataAgentTurn({
      ..._turn("workspace-tray-emptied", "What is pinned?"),
      gadgetContext: {
        attachedRefs: [DASHBOARD_REF],
        contexts: _contexts(DASHBOARD_CONTEXT),
      },
    });

    await runDataAgentTurn(_turn("workspace-tray-emptied", "And now?"));
    await runDataAgentTurn(_turn("workspace-tray-emptied", "And still?"));

    expect(_askedTexts()[1]).toBe(
      "<attached>Nothing is attached any more.</attached>\n\nAnd now?",
    );
    expect(_askedTexts()[2]).toBe("And still?");
  });

  it("says the tray was emptied when loading failed with an empty tray", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    await runDataAgentTurn({
      ..._turn("workspace-load-failed-empty", "What is pinned?"),
      gadgetContext: {
        attachedRefs: [DASHBOARD_REF],
        contexts: _contexts(DASHBOARD_CONTEXT),
      },
    });

    await runDataAgentTurn({
      ..._turn("workspace-load-failed-empty", `Totals for ${DATASET_TOKEN}`),
      gadgetContext: { attachedRefs: [], contexts: undefined },
    });

    expect(_askedTexts()[1]).toContain(
      "<attached>Nothing is attached any more.</attached>",
    );
  });

  it("masks a value an earlier mention's SQL holds in that mention's recap name", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    const tileRef: Gadget.Ref = {
      gadgetType: "dashboard_tile",
      gadgetId: DASHBOARD_REF.gadgetId,
      subId: "block-1",
    };

    await runDataAgentTurn({
      ..._turn("workspace-recap-mask", [
        `Who is in ${ChatMentionToken.buildToken(tileRef)}?`,
        "Two people.",
        "And in total?",
      ]),
      gadgetContext: {
        attachedRefs: [],
        contexts: _contexts({
          kind: "dashboard_tile",
          ref: tileRef,
          dashboardName: "Weekly outbreak",
          tile: {
            title: "Jane Doe visits",
            chartType: "table",
            sql: `SELECT * FROM t WHERE "patient_name" = 'Jane Doe'`,
          },
        }),
      },
    });

    expect(_askedTexts()[0]).toContain('User: Who is in @"<value 1> visits"?');
  });
});

/*
 * Written by the 1B adversarial privacy review: what the agent's model
 * reads for a whole turn, recap included, when a mention is cut by a cap.
 */
describe("runDataAgentTurn mention privacy leaks", () => {
  const tileRef: Gadget.Ref = {
    gadgetType: "dashboard_tile",
    gadgetId: DASHBOARD_REF.gadgetId,
    subId: "block-1",
  };
  const tileContext: AgentGadgetContext = {
    kind: "dashboard_tile",
    ref: tileRef,
    dashboardName: "Clinic",
    tile: {
      title: "Jane Doe visits",
      chartType: "table",
      sql: `SELECT * FROM t WHERE "patient_name" = 'Jane Doe'`,
    },
  };
  const fillerContexts = ["1", "2", "3", "4", "5"].map(
    (digit): AgentGadgetContext => {
      return {
        kind: "dataset",
        ref: {
          gadgetType: "dataset",
          gadgetId: `0000000${digit}-0000-4000-8000-000000000000`,
          subId: null,
        },
        name: `Filler ${digit}`,
      };
    },
  );
  const fillerTokens = fillerContexts
    .map((context) => {
      return ChatMentionToken.buildToken(context.ref);
    })
    .join(" ");

  it("masks the sixth mention's name in the message and its pointer line", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);

    await runDataAgentTurn({
      ..._turn(
        "workspace-sixth-mention",
        `Compare ${fillerTokens} with ${ChatMentionToken.buildToken(tileRef)}`,
      ),
      gadgetContext: {
        attachedRefs: [],
        contexts: _contexts(...fillerContexts, tileContext),
      },
    });

    const asked = _askedTexts()[0]!;
    expect(asked).toContain("mentioned, not described");
    expect(asked).not.toContain("Jane");
  });

  it("masks the sixth mention's name in the recap after a reload", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    const sixthMessage = `Compare ${fillerTokens} with ${ChatMentionToken.buildToken(tileRef)}`;

    // A reload starts a new conversation, so the earlier messages come
    // back as a recap. The question repeats the mention as its sixth.
    await runDataAgentTurn({
      ..._turn("workspace-sixth-recap", [
        sixthMessage,
        "They differ.",
        sixthMessage,
      ]),
      gadgetContext: {
        attachedRefs: [],
        contexts: _contexts(...fillerContexts, tileContext),
      },
    });

    const asked = _askedTexts()[0]!;
    expect(asked).toContain("Earlier in this conversation:");
    expect(asked).not.toContain("Jane");
  });

  it("holds: masks a recap-only mention whose dashboard has more than 12 charts", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    const bigDashboard: AgentGadgetContext = {
      kind: "dashboard",
      ref: DASHBOARD_REF,
      name: "Jane Doe follow-up",
      tiles: [
        ...Array.from({ length: 12 }, (_, index) => {
          return { title: `C${index}`, chartType: "bar", sql: "SELECT 1" };
        }),
        {
          title: "Visits",
          chartType: "bar",
          sql: `SELECT * FROM t WHERE "patient_name" = 'Jane Doe'`,
        },
      ],
    };

    await runDataAgentTurn({
      ..._turn("workspace-recap-big", [
        `What is in ${ChatMentionToken.buildToken(DASHBOARD_REF)}?`,
        "Charts.",
        "And in total?",
      ]),
      gadgetContext: {
        attachedRefs: [],
        contexts: _contexts(bigDashboard),
      },
    });

    expect(_askedTexts()[0]).not.toContain("Jane");
  });
});

/*
 * Written by the second 1B privacy review. An offline turn reads real
 * mention names, so its stored reply can quote one. After a reload the
 * agent's recap replays every assistant message as written, even though
 * the vault holds the value the mentioned tile filters on.
 */
describe("runDataAgentTurn offline reply privacy leaks", () => {
  it("masks a mention's real name that an offline reply quoted, in the recap", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    const tileRef: Gadget.Ref = {
      gadgetType: "dashboard_tile",
      gadgetId: DASHBOARD_REF.gadgetId,
      subId: "block-1",
    };

    await runDataAgentTurn({
      ..._turn("workspace-offline-reply-recap", [
        `Who is in ${ChatMentionToken.buildToken(tileRef)}?`,
        '"Jane Doe visits" has two rows.',
        "And in total?",
      ]),
      gadgetContext: {
        attachedRefs: [],
        contexts: _contexts({
          kind: "dashboard_tile",
          ref: tileRef,
          dashboardName: "Clinic",
          tile: {
            title: "Jane Doe visits",
            chartType: "table",
            sql: `SELECT * FROM t WHERE "patient_name" = 'Jane Doe'`,
          },
        }),
      },
    });

    const asked = _askedTexts()[0]!;
    expect(asked).toContain("Earlier in this conversation:");
    expect(asked).not.toContain("Jane");
  });
});
