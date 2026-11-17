import { afterEach, describe, expect, it } from "vitest";
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
});
