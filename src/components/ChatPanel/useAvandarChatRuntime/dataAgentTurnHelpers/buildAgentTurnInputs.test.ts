import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { AgentDashboardCardStore } from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import { buildAgentTurnInputs } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/buildAgentTurnInputs";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type {
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";

const IDENTITY = { workspaceId: "ws-1", userId: "user-1", sessionId: "s-1" };
const DATASETS = [
  {
    id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    name: "deaths.csv",
    columns: [
      { name: "patient_name", dataType: "varchar" },
      { name: "deaths", dataType: "bigint" },
    ],
  },
];

function _tile(title: string) {
  return {
    title,
    chartType: "bar",
    sql: `SELECT 1 FROM "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" WHERE "patient_name" = 'Jane Doe'`,
  };
}

function _conversation(): DataAgentConversation {
  return {
    sqlVault: createSqlPlaceholderVault(),
    results: [],
    dashboardCards: [],
  } as unknown as DataAgentConversation;
}

function _turn(): DataAgentTurnOptions {
  return {
    workspaceId: IDENTITY.workspaceId,
    currentUser: { id: IDENTITY.userId },
    sessionId: IDENTITY.sessionId,
    apiMessages: [{ role: "user", content: "add a heading" }],
  } as unknown as DataAgentTurnOptions;
}

const PAGE = {
  app: "dashboard" as const,
  dashboard: {
    id: "d-1",
    name: "Clinic visits",
    tiles: [_tile("a"), _tile("b"), _tile("c"), _tile("d")],
  },
};

afterEach(() => {
  window.localStorage.clear();
});

describe("buildAgentTurnInputs", () => {
  it("redacts and masks on a hosted turn", () => {
    const inputs = buildAgentTurnInputs({
      conversation: _conversation(),
      datasets: DATASETS,
      pageContext: PAGE,
      turn: _turn(),
      privacy: "hosted",
    });

    expect(inputs.blocks.pageBlock).toContain("'<value 1>'");
    expect(inputs.blocks.pageBlock).not.toContain("Jane Doe");
  });

  it("keeps real values and three charts of SQL on a device turn", () => {
    const inputs = buildAgentTurnInputs({
      conversation: _conversation(),
      datasets: DATASETS,
      pageContext: PAGE,
      turn: _turn(),
      privacy: "device",
    });
    const sqlCount = inputs.blocks.pageBlock?.split("WHERE").length ?? 0;

    expect(inputs.blocks.pageBlock).toContain("'Jane Doe'");
    expect(sqlCount - 1).toBe(3);
  });

  describe("a Data Explorer page that shows nothing", () => {
    const EMPTY_EXPLORER_PAGE = {
      app: "data-explorer" as const,
      explorer: { resultColumns: [] },
    };
    const QUERY_PAGE = {
      app: "data-explorer" as const,
      explorer: {
        sql: 'SELECT SUM("deaths") FROM "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"',
        resultColumns: [{ name: "sum", dataType: "bigint" }],
      },
    };

    function _pageBlock(
      privacy: "hosted" | "device",
      pageContext: typeof EMPTY_EXPLORER_PAGE | typeof QUERY_PAGE,
      lastPageBlock?: string,
    ): string | undefined {
      return buildAgentTurnInputs({
        conversation: { ..._conversation(), lastPageBlock },
        datasets: DATASETS,
        pageContext,
        turn: _turn(),
        privacy,
      }).blocks.pageBlock;
    }

    it("sends a device turn no page block", () => {
      expect(_pageBlock("device", EMPTY_EXPLORER_PAGE)).toBeUndefined();
    });

    it("sends a hosted turn its page block", () => {
      expect(_pageBlock("hosted", EMPTY_EXPLORER_PAGE)).toBe(
        "<current_page>\nPage: Data Explorer\n</current_page>",
      );
    });

    it("sends a device turn the block of a Data Explorer that shows a query", () => {
      expect(_pageBlock("device", QUERY_PAGE)).toContain("Query on screen:");
    });

    it("sends a device turn the empty block once the model last heard of a query on screen", () => {
      const lastBlock = _pageBlock("device", QUERY_PAGE);

      expect(_pageBlock("device", EMPTY_EXPLORER_PAGE, lastBlock)).toBe(
        "<current_page>\nPage: Data Explorer\n</current_page>",
      );
    });
  });

  it("sends each resolved card once, after the reply", () => {
    AgentDashboardCardStore.setStatus(IDENTITY, "card-1", {
      status: "confirmed",
      dashboardId: "d-1",
      dashboardName: "COVID 2022",
      isUnsaved: false,
      isReported: false,
    });
    const options = {
      conversation: _conversation(),
      datasets: DATASETS,
      pageContext: undefined,
      turn: _turn(),
      privacy: "hosted" as const,
    };

    const first = buildAgentTurnInputs(options);
    expect(first.dashboardCardLines).toEqual([
      '<dashboard_card>Confirmed: added to "COVID 2022".</dashboard_card>',
    ]);
    expect(buildAgentTurnInputs(options).dashboardCardLines).toHaveLength(1);

    first.onReplied?.();

    expect(buildAgentTurnInputs(options).dashboardCardLines).toEqual([]);
  });

  it("writes nothing and notifies no card after a reply with no card to report", () => {
    const onWrite = vi.fn();
    const unsubscribe = AgentDashboardCardStore.subscribe(onWrite);
    const inputs = buildAgentTurnInputs({
      conversation: _conversation(),
      datasets: DATASETS,
      pageContext: undefined,
      turn: _turn(),
      privacy: "hosted",
    });

    inputs.onReplied?.();
    unsubscribe();

    expect(inputs.dashboardCardLines).toEqual([]);
    expect(onWrite).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
  });

  describe("names that hold a personal value", () => {
    const JANE_CARD = {
      status: "confirmed",
      dashboardId: "d-1",
      dashboardName: "Jane Doe visits",
      isUnsaved: false,
      isReported: false,
    } as const;
    const JANE_REF = {
      gadgetType: "dataset",
      gadgetId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      subId: null,
    } as const;

    function _janeTurn(): DataAgentTurnOptions {
      return {
        ..._turn(),
        titleMaskRef: { current: undefined },
        gadgetContext: {
          attachedRefs: [],
          contexts: new Map([
            [
              ChatMentionToken.buildRefKey(JANE_REF),
              { kind: "dataset", ref: JANE_REF, name: "Jane Doe visits" },
            ],
          ]),
        },
      } as unknown as DataAgentTurnOptions;
    }

    function _build(
      privacy: "hosted" | "device",
      conversation: DataAgentConversation = _conversation(),
    ) {
      AgentDashboardCardStore.setStatus(IDENTITY, "card-1", JANE_CARD);
      const turn = _janeTurn();
      return {
        turn,
        inputs: buildAgentTurnInputs({
          conversation,
          datasets: DATASETS,
          pageContext: PAGE,
          turn,
          privacy,
        }),
      };
    }

    it("masks the dashboard name in a hosted card line", () => {
      const { inputs } = _build("hosted");

      expect(inputs.dashboardCardLines).toEqual([
        '<dashboard_card>Confirmed: added to "<value 1> visits".</dashboard_card>',
      ]);
    });

    it("keeps the dashboard name in a device card line", () => {
      const { inputs } = _build("device");

      expect(inputs.dashboardCardLines).toEqual([
        '<dashboard_card>Confirmed: added to "Jane Doe visits".</dashboard_card>',
      ]);
    });

    describe("a dashboard name that looks personal on its own", () => {
      const EMAIL_NAME = "jane.doe@example.com";

      function _cardLines(privacy: "hosted" | "device") {
        AgentDashboardCardStore.setStatus(IDENTITY, "card-1", {
          ...JANE_CARD,
          dashboardName: EMAIL_NAME,
        });
        return buildAgentTurnInputs({
          conversation: _conversation(),
          datasets: DATASETS,
          pageContext: undefined,
          turn: _turn(),
          privacy,
        }).dashboardCardLines;
      }

      it("is hidden in a hosted card line", () => {
        expect(_cardLines("hosted")).toEqual([
          '<dashboard_card>Confirmed: added to "Untitled dashboard".</dashboard_card>',
        ]);
      });

      it("is kept in a device card line", () => {
        expect(_cardLines("device")).toEqual([
          `<dashboard_card>Confirmed: added to "${EMAIL_NAME}".</dashboard_card>`,
        ]);
      });
    });

    it("keeps real names even when the vault holds the value", () => {
      const conversation = _conversation();
      buildAgentTurnInputs({
        conversation,
        datasets: DATASETS,
        pageContext: PAGE,
        turn: _turn(),
        privacy: "hosted",
      });

      const { inputs } = _build("device", conversation);

      expect(inputs.dashboardCardLines?.[0]).toContain("Jane Doe visits");
      expect(inputs.maskAssistantText("Jane Doe had 2")).toBe("Jane Doe had 2");
    });

    it("names a personal-looking chart title only on a device turn", () => {
      const tileRef = {
        ...JANE_REF,
        gadgetType: "dashboard_tile",
        subId: "t1",
      } as const;
      const email = "jane.doe@example.com";
      const turn = {
        ..._turn(),
        gadgetContext: {
          attachedRefs: [],
          contexts: new Map([
            [
              ChatMentionToken.buildRefKey(tileRef),
              {
                kind: "dashboard_tile",
                ref: tileRef,
                dashboardName: "Visits",
                tile: { title: email, chartType: "bar", sql: "" },
              },
            ],
          ]),
        },
      } as unknown as DataAgentTurnOptions;
      const options = {
        conversation: _conversation(),
        datasets: DATASETS,
        pageContext: undefined,
        turn,
      };

      const hosted = buildAgentTurnInputs({ ...options, privacy: "hosted" });
      const device = buildAgentTurnInputs({ ...options, privacy: "device" });

      expect(hosted.nameOf(tileRef)).not.toContain(email);
      expect(device.nameOf(tileRef)).toContain(email);
    });

    it("gives a hosted turn's title the vault's mask", () => {
      const { turn } = _build("hosted");

      expect(turn.titleMaskRef?.current?.("Jane Doe visits")).toBe(
        "<value 1> visits",
      );
    });

    it("leaves a device turn's title mask unset", () => {
      const { turn } = _build("device");

      expect(turn.titleMaskRef?.current).toBeUndefined();
    });

    it("masks a mention's name and an earlier reply on a hosted turn", () => {
      const { inputs } = _build("hosted");

      expect(inputs.nameOf(JANE_REF)).toBe("<value 1> visits");
      expect(inputs.maskAssistantText("Jane Doe had 2")).toBe(
        "<value 1> had 2",
      );
    });

    it("shows a hosted turn's reply with the vault's value in place of its placeholder", () => {
      const { inputs } = _build("hosted");

      expect(inputs.unmaskReplyText?.("<value 1> had 2 visits.")).toBe(
        "Jane Doe had 2 visits.",
      );
    });

    it("leaves a placeholder the vault does not hold as written in a hosted reply", () => {
      const { inputs } = _build("hosted");

      expect(inputs.unmaskReplyText?.("<value 7> had 2 visits.")).toBe(
        "<value 7> had 2 visits.",
      );
    });

    it("gives a device turn no way to unmask its reply", () => {
      const { inputs } = _build("device");

      expect(inputs.unmaskReplyText).toBeUndefined();
    });

    it("keeps a mention's name and an earlier reply real on a device turn", () => {
      const { inputs } = _build("device");

      expect(inputs.nameOf(JANE_REF)).toBe("Jane Doe visits");
      expect(inputs.maskAssistantText("Jane Doe had 2")).toBe("Jane Doe had 2");
    });
  });
});
