import { describe, expect, it, vi } from "vitest";
import { AgentDashboardBlock } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import { AgentDashboardBlockPartLazy } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlockPartLazy";
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
  "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlockPart",
  async () => {
    await loadPart.loaded;
    return {
      AgentDashboardBlockPart: ({ data }: DataMessagePartProps) => {
        return <p>Loaded {(data as { block: { text: string } }).block.text}</p>;
      },
    };
  },
);

const PROPS = {
  type: "data",
  name: AgentDashboardBlock.PART_NAME,
  data: AgentDashboardBlock.create({
    block: { kind: "HeadingBlock", text: "Deaths" },
    candidates: [{ id: "d-1", name: "COVID 2022" }],
  }),
} as unknown as DataMessagePartProps;

describe("AgentDashboardBlockPartLazy", () => {
  it("holds the card's place while its code loads, then shows the card", async () => {
    render(<AgentDashboardBlockPartLazy {...PROPS} />);

    expect(
      screen.getByRole("group", { name: "Add to dashboard" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByTestId("agent-dashboard-block-placeholder-body"),
    ).toBeInTheDocument();

    loadPart.resolve();

    expect(await screen.findByText("Loaded Deaths")).toBeVisible();
    expect(
      screen.queryByTestId("agent-dashboard-block-placeholder-body"),
    ).not.toBeInTheDocument();
  });

  it("draws nothing for data that is not a card", () => {
    render(
      <AgentDashboardBlockPartLazy
        {...({ data: { nope: true } } as unknown as DataMessagePartProps)}
      />,
    );

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});
