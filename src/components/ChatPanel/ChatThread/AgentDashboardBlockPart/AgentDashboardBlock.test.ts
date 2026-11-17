import { describe, expect, it } from "vitest";
import { AgentDashboardBlock } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";

const HEADING = { kind: "HeadingBlock", text: "Deaths" } as const;
const COVID = { id: "d-1", name: "COVID 2022" };

describe("AgentDashboardBlock", () => {
  it("creates a card with a fresh id and reads it back from its data part", () => {
    const card = AgentDashboardBlock.create({
      block: HEADING,
      summary: "Adds a heading.",
      candidates: [COVID],
    });
    const part = AgentDashboardBlock.toDataPart(card);

    expect(part).toEqual({
      type: "data",
      name: "agent-dashboard-block",
      data: card,
    });
    expect(card.cardId).toMatch(/^[0-9a-f-]{36}$/);
    expect(AgentDashboardBlock.parse(part.data)).toEqual(card);
  });

  it("rejects stored data whose block is invalid or has no candidate", () => {
    const card = AgentDashboardBlock.create({
      block: HEADING,
      summary: "Adds a heading.",
      candidates: [COVID],
    });

    expect(
      AgentDashboardBlock.parse({ ...card, block: { kind: "HeadingBlock" } }),
    ).toBeUndefined();
    expect(
      AgentDashboardBlock.parse({ ...card, candidates: [] }),
    ).toBeUndefined();
  });
});
