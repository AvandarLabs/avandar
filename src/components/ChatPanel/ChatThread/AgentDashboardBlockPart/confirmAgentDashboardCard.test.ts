import { afterEach, describe, expect, it, vi } from "vitest";
import { useAgentDashboardCardStatus } from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import { confirmAgentDashboardCard } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/confirmAgentDashboardCard";
import { renderHook } from "@/test-utils";

const { appendMock } = vi.hoisted(() => {
  return { appendMock: vi.fn() };
});

vi.mock("@/clients/dashboards/agentDashboards/agentDashboards", () => {
  return { appendBlockToDashboard: appendMock };
});

const IDENTITY = { workspaceId: "ws-1", userId: "user-1", sessionId: "s-1" };
const CARD = {
  version: 1 as const,
  cardId: "card-1",
  block: { kind: "HeadingBlock", text: "Deaths" } as const,
  candidates: [{ id: "d-1", name: "COVID 2022" }],
};

function _statusOf(cardId: string) {
  return renderHook(() => {
    return useAgentDashboardCardStatus(IDENTITY, cardId);
  }).result.current;
}

function _closedEditor(): {
  activeDashboardId: undefined;
  dispatch: { queuePendingBlock: ReturnType<typeof vi.fn> };
} {
  return {
    activeDashboardId: undefined,
    dispatch: { queuePendingBlock: vi.fn() },
  };
}

afterEach(() => {
  window.localStorage.clear();
  vi.resetAllMocks();
});

describe("confirmAgentDashboardCard", () => {
  it("saves to the dashboard and records it confirmed", async () => {
    appendMock.mockResolvedValue({ kind: "saved" });

    await confirmAgentDashboardCard({
      card: CARD,
      dashboard: CARD.candidates[0]!,
      identity: IDENTITY,
      editor: _closedEditor(),
    });

    expect(appendMock).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      dashboardId: "d-1",
      block: CARD.block,
    });
    expect(_statusOf("card-1")).toEqual({
      status: "confirmed",
      dashboardId: "d-1",
      dashboardName: "COVID 2022",
      isUnsaved: false,
      isReported: false,
    });
  });

  it("queues into the editor when the dashboard is open there now", async () => {
    const queuePendingBlock = vi.fn();

    await confirmAgentDashboardCard({
      card: CARD,
      dashboard: CARD.candidates[0]!,
      identity: IDENTITY,
      editor: { activeDashboardId: "d-1", dispatch: { queuePendingBlock } },
    });

    expect(appendMock).not.toHaveBeenCalled();
    expect(queuePendingBlock).toHaveBeenCalledWith(
      expect.objectContaining({ dashboardId: "d-1" }),
    );
    expect(_statusOf("card-1")).toEqual(
      expect.objectContaining({ status: "confirmed", isUnsaved: true }),
    );
  });

  it.each([
    [{ kind: "stale" }, "stale"],
    [{ kind: "failed" }, "network"],
    [{ kind: "unavailable" }, "unavailable"],
  ])("records %j as a failure", async (result, reason) => {
    appendMock.mockResolvedValue(result);

    await confirmAgentDashboardCard({
      card: CARD,
      dashboard: CARD.candidates[0]!,
      identity: IDENTITY,
      editor: _closedEditor(),
    });

    expect(_statusOf("card-1")).toEqual({
      status: "failed",
      reason,
    });
  });
});
