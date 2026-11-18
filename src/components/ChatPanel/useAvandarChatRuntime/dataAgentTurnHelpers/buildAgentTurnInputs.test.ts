import { afterEach, describe, expect, it } from "vitest";
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
