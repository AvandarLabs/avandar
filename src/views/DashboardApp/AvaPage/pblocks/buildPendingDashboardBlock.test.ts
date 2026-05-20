import { describe, expect, it } from "vitest";
import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock";

describe("buildPendingDashboardBlock", () => {
  it("constructs a HeadingBlock Puck item", () => {
    const item = buildPendingDashboardBlock({
      kind: "HeadingBlock",
      text: "Hello world",
      level: 1,
    });
    expect(item.type).toBe("HeadingBlock");
    expect(item.props.text).toBe("Hello world");
    expect(item.props.level).toBe(1);
  });

  it("constructs a DataViz Puck item", () => {
    const item = buildPendingDashboardBlock({
      kind: "DataViz",
      prompt: "Monthly revenue",
      sql: "SELECT 1",
      vizType: "bar",
    });
    expect(item.type).toBe("DataViz");
    const props = item.props as { nlQuery: { prompt: string } };
    expect(props.nlQuery.prompt).toBe("Monthly revenue");
  });
});
