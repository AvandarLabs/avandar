import { describe, expect, it, vi } from "vitest";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { AgentQueryResultPartLazy } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPartLazy";
import { render, screen } from "@/test-utils";
import type { DataMessagePartProps } from "@assistant-ui/react";

const { loadPart } = vi.hoisted(() => {
  let resolve = (): void => {};
  const loaded = new Promise<void>((resolveLoaded) => {
    resolve = resolveLoaded;
  });
  return {
    loadPart: {
      loaded,
      resolve: (): void => {
        resolve();
      },
    },
  };
});

// The real part pulls in the chart stack. The stand-in loads only when the
// test releases it, so the placeholder can be checked first.
vi.mock(
  "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart",
  async () => {
    await loadPart.loaded;
    return {
      AgentQueryResultPart: ({ data }: DataMessagePartProps) => {
        return <p>Loaded {(data as { title: string }).title}</p>;
      },
    };
  },
);

const PROPS = {
  type: "data",
  name: AgentQueryResult.PART_NAME,
  data: AgentQueryResult.create({
    sql: "SELECT 1",
    chart: "bar",
    title: "Cases by state",
  }),
} as unknown as DataMessagePartProps;

describe("AgentQueryResultPartLazy", () => {
  it("holds the card's place while the result card loads, then shows it", async () => {
    render(<AgentQueryResultPartLazy {...PROPS} />);

    const placeholder = screen.getByRole("group", { name: "Loading result" });
    expect(placeholder).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByTestId("agent-query-result-placeholder-body"),
    ).toBeInTheDocument();

    loadPart.resolve();

    expect(await screen.findByText("Loaded Cases by state")).toBeVisible();
    expect(
      screen.queryByTestId("agent-query-result-placeholder-body"),
    ).not.toBeInTheDocument();
  });

  it("draws nothing for data that is not a result", () => {
    render(
      <AgentQueryResultPartLazy
        {...({ data: { nope: true } } as unknown as DataMessagePartProps)}
      />,
    );

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByText(/Loaded/)).not.toBeInTheDocument();
  });
});
