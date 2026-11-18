import { describe, expect, it, vi } from "vitest";
import { addAgentDashboardBlock } from "@/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks/addAgentDashboardBlock";
import type { AgentDashboardBlockData } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";

const { loadCandidatesMock, canEditMock } = vi.hoisted(() => {
  return { loadCandidatesMock: vi.fn(), canEditMock: vi.fn() };
});

vi.mock("@/clients/dashboards/agentDashboards/agentDashboards", () => {
  return {
    loadWorkspaceDashboardCandidates: loadCandidatesMock,
    canEditDashboard: canEditMock,
  };
});

const HEADING = { kind: "HeadingBlock", text: "Deaths" } as const;

function _turn(overrides: Partial<DataAgentTurnOptions>): DataAgentTurnOptions {
  return {
    workspaceId: "ws-1",
    pageContext: {
      app: "dashboard",
      dashboard: { id: "d-open", name: "COVID 2022", tiles: [] },
    },
    dashboardEditor: {
      activeDashboardId: "d-open",
      dispatch: { queuePendingBlock: vi.fn() },
    },
    ...overrides,
  } as unknown as DataAgentTurnOptions;
}

describe("addAgentDashboardBlock", () => {
  it("queues a block for the open editor unsaved", async () => {
    canEditMock.mockResolvedValue(true);
    const turn = _turn({});
    const cards: AgentDashboardBlockData[] = [];

    await expect(
      addAgentDashboardBlock({
        turn,
        cards,
        request: { dashboard: "current", block: HEADING },
      }),
    ).resolves.toEqual({ kind: "added_to_editor" });
    expect(
      turn.dashboardEditor?.dispatch.queuePendingBlock,
    ).toHaveBeenCalledWith(expect.objectContaining({ dashboardId: "d-open" }));
    expect(cards).toEqual([]);
  });

  it("adds a card for a workspace dashboard by name", async () => {
    canEditMock.mockResolvedValue(true);
    loadCandidatesMock.mockResolvedValue([
      { id: "d-mortality", name: "Mortality", chartCount: 2 },
    ]);
    const cards: AgentDashboardBlockData[] = [];

    await expect(
      addAgentDashboardBlock({
        turn: _turn({}),
        cards,
        request: { dashboard: "Mortality", block: HEADING },
      }),
    ).resolves.toEqual({ kind: "card_shown" });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.candidates).toEqual([
      { id: "d-mortality", name: "Mortality", chartCount: 2 },
    ]);
  });

  it("matches a mentioned dashboard before the workspace", async () => {
    canEditMock.mockResolvedValue(true);
    loadCandidatesMock.mockClear();
    const turn = _turn({
      gadgetContext: {
        attachedRefs: [],
        contexts: new Map([
          [
            "dashboard:d-mention",
            {
              kind: "dashboard",
              ref: {
                gadgetType: "dashboard",
                gadgetId: "d-mention",
                subId: null,
              },
              name: "Mortality",
              tiles: [],
            },
          ],
        ]),
      },
    });
    const cards: AgentDashboardBlockData[] = [];

    await addAgentDashboardBlock({
      turn,
      cards,
      request: { dashboard: "Mortality", block: HEADING },
    });

    expect(loadCandidatesMock).not.toHaveBeenCalled();
    expect(cards[0]?.candidates[0]?.id).toBe("d-mention");
  });

  it("finds nothing for an unknown name", async () => {
    canEditMock.mockResolvedValue(true);
    loadCandidatesMock.mockResolvedValue([]);

    await expect(
      addAgentDashboardBlock({
        turn: _turn({}),
        cards: [],
        request: { dashboard: "Budget", block: HEADING },
      }),
    ).resolves.toEqual({ kind: "not_found" });
  });

  describe("when the agent names a dashboard twice in one turn", () => {
    function _ask(turn: DataAgentTurnOptions, dashboard: string) {
      return addAgentDashboardBlock({
        turn,
        cards: [],
        request: { dashboard, block: HEADING },
      });
    }

    it("loads the workspace's dashboards once", async () => {
      canEditMock.mockResolvedValue(true);
      loadCandidatesMock.mockReset();
      loadCandidatesMock.mockResolvedValue([
        { id: "d-mortality", name: "Mortality" },
      ]);
      const turn = _turn({});

      await expect(_ask(turn, "Budget")).resolves.toEqual({
        kind: "not_found",
      });
      await expect(_ask(turn, "Mortality")).resolves.toEqual({
        kind: "card_shown",
      });

      expect(loadCandidatesMock).toHaveBeenCalledTimes(1);
    });

    it("loads them again on the next turn", async () => {
      canEditMock.mockResolvedValue(true);
      loadCandidatesMock.mockReset();
      loadCandidatesMock.mockResolvedValue([]);

      await _ask(_turn({}), "Budget");
      await _ask(_turn({}), "Budget");

      expect(loadCandidatesMock).toHaveBeenCalledTimes(2);
    });

    it("loads again after a load failed", async () => {
      canEditMock.mockResolvedValue(true);
      loadCandidatesMock.mockReset();
      loadCandidatesMock
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue([{ id: "d-mortality", name: "Mortality" }]);
      const turn = _turn({});

      await expect(_ask(turn, "Mortality")).rejects.toThrow("offline");
      await expect(_ask(turn, "Mortality")).resolves.toEqual({
        kind: "card_shown",
      });
    });
  });
});
