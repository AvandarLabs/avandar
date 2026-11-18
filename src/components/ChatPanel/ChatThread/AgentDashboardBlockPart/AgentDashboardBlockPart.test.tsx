import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentDashboardCardStore,
  useAgentDashboardCardStatus,
} from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import { AgentDashboardBlock } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import { AgentDashboardBlockPart } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlockPart";
import { fireEvent, render, renderHook, screen, waitFor } from "@/test-utils";
import type { AgentDashboardCardStatus } from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import type { AgentDashboardBlockData } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import type { DataMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";

const { confirmMock, useAgentQueryResultViewMock } = vi.hoisted(() => {
  return { confirmMock: vi.fn(), useAgentQueryResultViewMock: vi.fn() };
});

// Renders the link target into `href`, so a test can assert params
// without a router.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params = {},
      ...rest
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string>;
    }) => {
      const path = Object.entries(params).reduce((href, [name, value]) => {
        return href.replace(`$${name}`, value);
      }, to);
      return createElement("a", { href: path, ...rest }, children);
    },
  };
});

vi.mock(
  "@/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView",
  () => {
    return { useAgentQueryResultView: useAgentQueryResultViewMock };
  },
);

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", slug: "acme" };
    },
  };
});

vi.mock("@/components/VisualizationContainer/VisualizationContainer", () => {
  return {
    VisualizationContainer: () => {
      return <div data-testid="viz" />;
    },
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-1" };
    },
  };
});

vi.mock("@/components/ChatPanel/ChatSessionProvider/useChatSessions", () => {
  return {
    useChatSessions: () => {
      return { index: { selectedId: "s-1" } };
    },
  };
});

vi.mock(
  "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/confirmAgentDashboardCard",
  () => {
    return { confirmAgentDashboardCard: confirmMock };
  },
);

vi.mock(
  "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager",
  () => {
    return {
      DashboardEditorStateManager: {
        useState: () => {
          return { activeDashboardId: undefined };
        },
        useDispatch: () => {
          return { queuePendingBlock: vi.fn() };
        },
      },
    };
  },
);

const IDENTITY = { workspaceId: "ws-1", userId: "user-1", sessionId: "s-1" };

const HEADING_CARD = AgentDashboardBlock.create({
  block: { kind: "HeadingBlock", text: "Deaths by month" },
  summary: "Adds a heading.",
  candidates: [{ id: "d-1", name: "COVID 2022" }],
});

function _statusOf(cardId: string) {
  return renderHook(() => {
    return useAgentDashboardCardStatus(IDENTITY, cardId);
  }).result.current;
}

function _props(card: AgentDashboardBlockData): DataMessagePartProps {
  return {
    type: "data",
    name: AgentDashboardBlock.PART_NAME,
    data: card,
    status: { type: "complete" },
  } as DataMessagePartProps;
}

function _withStatus(status: AgentDashboardCardStatus): void {
  AgentDashboardCardStore.setStatus(IDENTITY, HEADING_CARD.cardId, status);
}

beforeEach(() => {
  confirmMock.mockResolvedValue({ status: "cancelled", isReported: false });
});

afterEach(() => {
  window.localStorage.clear();
  vi.resetAllMocks();
});

describe("AgentDashboardBlockPart pending card", () => {
  it("shows the block, the dashboard, and enabled Confirm and Cancel", () => {
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    expect(
      screen.getByRole("group", { name: "Add to dashboard" }),
    ).toBeVisible();
    expect(screen.getByText("Deaths by month")).toBeVisible();
    expect(screen.getByText("COVID 2022")).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("confirms the one candidate under this session's identity", async () => {
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({
          card: HEADING_CARD,
          dashboard: HEADING_CARD.candidates[0],
          identity: IDENTITY,
        }),
      );
    });
  });

  it("holds Confirm until one of several dashboards is picked", async () => {
    const card = AgentDashboardBlock.create({
      block: HEADING_CARD.block,
      summary: "s",
      candidates: [
        {
          id: "d-1",
          name: "COVID",
          chartCount: 12,
          updatedAt: "2022-03-03T12:00:00Z",
        },
        { id: "d-2", name: "COVID", chartCount: 1 },
      ],
    });
    render(<AgentDashboardBlockPart {..._props(card)} />);

    expect(
      screen.getByRole("radiogroup", { name: "Which dashboard?" }),
    ).toBeVisible();
    expect(screen.getByText(/12 charts/)).toBeVisible();
    expect(screen.getByText(/1 chart$/)).toBeVisible();
    expect(screen.getByText(/edited/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();

    fireEvent.click(screen.getAllByRole("radio")[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({ dashboard: card.candidates[1] }),
      );
    });
  });

  it("stores a cancelled status and says nothing was added", () => {
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(_statusOf(HEADING_CARD.cardId)).toEqual({
      status: "cancelled",
      isReported: false,
    });
    expect(screen.getByText("Nothing was added.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();
  });

  it("draws a chart block from its result and says when it has no rows", () => {
    const card = AgentDashboardBlock.create({
      block: {
        kind: "DataViz",
        prompt: "Deaths by month",
        sql: "SELECT 1 AS n",
        vizType: "bar",
      },
      summary: "s",
      candidates: [{ id: "d-1", name: "COVID 2022" }],
    });
    useAgentQueryResultViewMock.mockReturnValue({ status: "ready", data: [] });
    render(<AgentDashboardBlockPart {..._props(card)} />);

    expect(screen.getByText("This chart has no rows yet.")).toBeVisible();
    expect(useAgentQueryResultViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ sql: "SELECT 1 AS n", chartType: "bar" }),
      "ws-1",
    );
  });

  it("draws a chart block's preview when the result has rows", () => {
    const card = AgentDashboardBlock.create({
      block: {
        kind: "DataViz",
        prompt: "Deaths by month",
        sql: "SELECT 1 AS n",
        vizType: "bar",
      },
      summary: "s",
      candidates: [{ id: "d-1", name: "COVID 2022" }],
    });
    useAgentQueryResultViewMock.mockReturnValue({
      status: "ready",
      data: [{ n: 1 }],
    });
    render(<AgentDashboardBlockPart {..._props(card)} />);

    expect(screen.getByTestId("viz")).toBeInTheDocument();
    expect(screen.queryByText("This chart has no rows yet.")).toBeNull();
  });
});

describe("AgentDashboardBlockPart resolved card", () => {
  it("links to the dashboard and drops the buttons once confirmed", () => {
    _withStatus({
      status: "confirmed",
      dashboardId: "d-1",
      dashboardName: "COVID 2022",
      isUnsaved: false,
      isReported: false,
    });
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    expect(
      screen.getByRole("link", { name: "Open COVID 2022" }),
    ).toHaveAttribute("href", "/acme/dashboards/edit/d-1");
    expect(screen.getByText("Added to the dashboard.")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/Save the dashboard/)).toBeNull();
  });

  it("says an unsaved block still needs saving in the open editor", () => {
    _withStatus({
      status: "confirmed",
      dashboardId: "d-1",
      dashboardName: "COVID 2022",
      isUnsaved: true,
      isReported: false,
    });
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    expect(
      screen.getByText(
        "It is in the open editor. Save the dashboard to keep it.",
      ),
    ).toBeVisible();
  });

  it("offers Retry after a network failure and makes the card pending", () => {
    _withStatus({ status: "failed", reason: "network" });
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    expect(
      screen.getByText("Couldn't save. Check your connection and try again."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(_statusOf(HEADING_CARD.cardId)).toBeUndefined();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
  });

  it("offers Retry after a stale save", () => {
    _withStatus({ status: "failed", reason: "stale" });
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    expect(
      screen.getByText("The dashboard changed while saving. Try again."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("announces only the message, not the Retry button or the link", () => {
    _withStatus({ status: "failed", reason: "network" });
    const { unmount } = render(
      <AgentDashboardBlockPart {..._props(HEADING_CARD)} />,
    );

    const failedRegion = screen.getByRole("status");
    expect(failedRegion).toHaveTextContent(
      "Couldn't save. Check your connection and try again.",
    );
    expect(failedRegion).not.toContainElement(
      screen.getByRole("button", { name: "Retry" }),
    );
    unmount();

    _withStatus({
      status: "confirmed",
      dashboardId: "d-1",
      dashboardName: "COVID 2022",
      isUnsaved: false,
      isReported: false,
    });
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    expect(screen.getByRole("status")).not.toContainElement(
      screen.getByRole("link", { name: "Open COVID 2022" }),
    );
  });

  it("moves focus to the status once Cancel removes the buttons", () => {
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("status")).toHaveFocus();
  });

  it("leaves focus alone while a card is first drawn", () => {
    _withStatus({ status: "cancelled", isReported: false });
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    expect(screen.getByRole("status")).not.toHaveFocus();
  });

  it("offers no Retry when the dashboard is gone", () => {
    _withStatus({ status: "failed", reason: "unavailable" });
    render(<AgentDashboardBlockPart {..._props(HEADING_CARD)} />);

    expect(
      screen.getByText("This dashboard is no longer available."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("draws nothing for data it cannot read", () => {
    render(<AgentDashboardBlockPart {..._props({ cardId: 3 } as never)} />);

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});
