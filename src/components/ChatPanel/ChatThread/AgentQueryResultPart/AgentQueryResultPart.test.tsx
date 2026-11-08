import { describe, expect, it, vi } from "vitest";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { AgentQueryResultPart } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart";
import { render, screen } from "@/test-utils";
import type { DataMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";

const { useAgentQueryResultViewMock } = vi.hoisted(() => {
  return { useAgentQueryResultViewMock: vi.fn() };
});

// Renders the link target into `href`, as GadgetCard.test.tsx does, so a
// test can assert params and search without a router.
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
      search,
      ...rest
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string>;
      search?: Record<string, string>;
    }) => {
      const path = Object.entries(params).reduce((href, [name, value]) => {
        return href.replace(`$${name}`, value);
      }, to);
      const query = search ? `?${new URLSearchParams(search).toString()}` : "";
      return createElement("a", { href: `${path}${query}`, ...rest }, children);
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

function _props(data: unknown): DataMessagePartProps {
  return {
    type: "data",
    name: AgentQueryResult.PART_NAME,
    data,
    status: { type: "complete" },
  } as DataMessagePartProps;
}

const RESULT = AgentQueryResult.create({
  sql: 'SELECT 1 AS "n"',
  chart: "bar",
  title: "How many cases?",
});

describe("AgentQueryResultPart", () => {
  it("shows the result as a card with a live chart and an Open link", () => {
    useAgentQueryResultViewMock.mockReturnValue({ status: "ready" });
    render(<AgentQueryResultPart {..._props(RESULT)} />);

    expect(
      screen.getByRole("group", { name: "How many cases?" }),
    ).toBeVisible();
    expect(screen.getByTestId("viz")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open How many cases?" }),
    ).toHaveAttribute(
      "href",
      `/acme/data-explorer?${new URLSearchParams({ sql: RESULT.sql })}`,
    );
  });

  it("says the result is loading while it runs", () => {
    useAgentQueryResultViewMock.mockReturnValue({ status: "loading" });
    render(<AgentQueryResultPart {..._props(RESULT)} />);

    expect(screen.getByText("Loading result")).toBeInTheDocument();
  });

  it("says the result is unavailable when it cannot run", () => {
    useAgentQueryResultViewMock.mockReturnValue({ status: "unavailable" });
    render(<AgentQueryResultPart {..._props(RESULT)} />);

    expect(screen.getByText("Unavailable result")).toBeInTheDocument();
    expect(screen.queryByTestId("viz")).not.toBeInTheDocument();
  });

  it("shows a link result as an inline chip", () => {
    useAgentQueryResultViewMock.mockReturnValue({ status: "ready" });
    render(
      <AgentQueryResultPart {..._props({ ...RESULT, display: "link" })} />,
    );

    expect(
      screen.getByRole("link", { name: "How many cases?" }),
    ).toHaveAttribute(
      "href",
      `/acme/data-explorer?${new URLSearchParams({ sql: RESULT.sql })}`,
    );
    expect(screen.queryByTestId("viz")).not.toBeInTheDocument();
  });

  it("draws nothing for data it cannot read", () => {
    render(<AgentQueryResultPart {..._props({ sql: 3 })} />);

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
