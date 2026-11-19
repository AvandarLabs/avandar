/** Behavioral tests for the per-session dashboard card status store. */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentDashboardCardStore,
  useAgentDashboardCardStatus,
} from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import { renderHook } from "@/test-utils";

const IDENTITY = { workspaceId: "ws-1", userId: "user-1", sessionId: "s-1" };
const CONFIRMED = {
  status: "confirmed",
  dashboardId: "d-1",
  dashboardName: "COVID 2022",
  isUnsaved: false,
  isReported: false,
} as const;

function _statusOf(cardId: string) {
  return renderHook(() => {
    return useAgentDashboardCardStatus(IDENTITY, cardId);
  }).result.current;
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("AgentDashboardCardStore", () => {
  it("stores a status per card and session", () => {
    AgentDashboardCardStore.setStatus(IDENTITY, "card-1", CONFIRMED);

    expect(_statusOf("card-1")).toEqual(CONFIRMED);
    expect(
      AgentDashboardCardStore.listUnreported({
        ...IDENTITY,
        sessionId: "s-2",
      }),
    ).toEqual([]);
  });

  it("lists resolved cards the agent has not heard about, then marks them", () => {
    AgentDashboardCardStore.setStatus(IDENTITY, "card-1", CONFIRMED);
    AgentDashboardCardStore.setStatus(IDENTITY, "card-2", {
      status: "failed",
      reason: "network",
    });
    AgentDashboardCardStore.setStatus(IDENTITY, "card-3", {
      status: "cancelled",
      isReported: false,
    });

    expect(
      AgentDashboardCardStore.listUnreported(IDENTITY).map((entry) => {
        return entry.cardId;
      }),
    ).toEqual(["card-1", "card-3"]);

    AgentDashboardCardStore.markReported(IDENTITY, ["card-1", "card-3"]);

    expect(AgentDashboardCardStore.listUnreported(IDENTITY)).toEqual([]);
  });

  it("drops a stored entry that is not a status", () => {
    window.localStorage.setItem(
      "ava.chat.dashboardCards.ws-1.user-1.s-1",
      JSON.stringify({ "card-1": { status: "exploded" }, "card-2": CONFIRMED }),
    );

    expect(AgentDashboardCardStore.listUnreported(IDENTITY)).toEqual([
      { cardId: "card-2", status: CONFIRMED },
    ]);
  });

  it("returns false and keeps the old value when storage refuses a write", () => {
    AgentDashboardCardStore.setStatus(IDENTITY, "card-1", CONFIRMED);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(
      AgentDashboardCardStore.setStatus(IDENTITY, "card-1", {
        status: "cancelled",
        isReported: false,
      }),
    ).toBe(false);
    expect(_statusOf("card-1")).toEqual(CONFIRMED);
  });

  it("makes a failed card pending again", () => {
    AgentDashboardCardStore.setStatus(IDENTITY, "card-1", {
      status: "failed",
      reason: "network",
    });

    AgentDashboardCardStore.clearStatus(IDENTITY, "card-1");

    expect(_statusOf("card-1")).toBeUndefined();
  });

  it("tells subscribers when a status changes", () => {
    const listener = vi.fn();
    const unsubscribe = AgentDashboardCardStore.subscribe(listener);

    AgentDashboardCardStore.setStatus(IDENTITY, "card-1", CONFIRMED);
    unsubscribe();
    AgentDashboardCardStore.clear(IDENTITY);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
