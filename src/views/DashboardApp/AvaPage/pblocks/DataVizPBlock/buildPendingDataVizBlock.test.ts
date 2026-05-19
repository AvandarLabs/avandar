import { describe, expect, it } from "vitest";
import { buildPendingDataVizBlock } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/buildPendingDataVizBlock";

describe("buildPendingDataVizBlock", () => {
  it("constructs a DataViz Puck content item from a chat block", () => {
    const item = buildPendingDataVizBlock({
      kind: "DataViz",
      prompt: "Monthly revenue",
      sql: 'SELECT month, sum(amount) FROM "sales" GROUP BY 1',
      vizType: "bar",
    });

    expect(item.type).toBe("DataViz");
    expect(item.props.id.startsWith("DataViz-")).toBe(true);
    const props = item.props as Record<string, unknown>;
    const nlQuery = props.nlQuery as {
      prompt: string;
      rawSql: string;
      generations: readonly unknown[];
    };
    expect(nlQuery.prompt).toBe("Monthly revenue");
    expect(nlQuery.rawSql).toBe(
      'SELECT month, sum(amount) FROM "sales" GROUP BY 1',
    );
    expect(nlQuery.generations).toHaveLength(1);
    expect(props.vizType).toBe("bar");
    const vizConfig = props.vizConfig as { vizType: string };
    expect(vizConfig.vizType).toBe("bar");
  });

  it("produces a unique id per call", () => {
    const a = buildPendingDataVizBlock({
      kind: "DataViz",
      prompt: "p",
      sql: "SELECT 1",
      vizType: "table",
    });
    const b = buildPendingDataVizBlock({
      kind: "DataViz",
      prompt: "p",
      sql: "SELECT 1",
      vizType: "table",
    });
    expect(a.props.id).not.toBe(b.props.id);
  });
});
