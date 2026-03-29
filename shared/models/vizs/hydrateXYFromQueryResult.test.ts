import { describe, expect, it } from "vitest";
import { hydrateXYFromQueryResult } from "$/models/vizs/hydrateXYFromQueryResult.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";

function cols(
  pairs: readonly { name: string; dataType: QueryResultColumn["dataType"] }[],
): QueryResultColumn[] {
  return pairs.map((p) => {
    return { name: p.name, dataType: p.dataType };
  });
}

describe("hydrateXYFromQueryResult", () => {
  const empty = { xAxisKey: undefined, yAxisKey: undefined };

  it("picks timestamp X and numeric Y for bar when both exist", () => {
    const out = hydrateXYFromQueryResult(
      { ...empty },
      cols([
        { name: "month", dataType: "timestamp" },
        { name: "total_cases", dataType: "double" },
      ]),
      "bar",
    );
    expect(out.xAxisKey).toBe("month");
    expect(out.yAxisKey).toBe("total_cases");
  });

  it("prefers varchar X over numeric X for bar when Y is the first numeric", () => {
    const out = hydrateXYFromQueryResult(
      { ...empty },
      cols([
        { name: "total_cases", dataType: "double" },
        { name: "region", dataType: "varchar" },
      ]),
      "bar",
    );
    expect(out.yAxisKey).toBe("total_cases");
    expect(out.xAxisKey).toBe("region");
  });

  it("uses two numerics for bar X and Y when no category column", () => {
    const out = hydrateXYFromQueryResult(
      { ...empty },
      cols([
        { name: "a", dataType: "bigint" },
        { name: "b", dataType: "double" },
      ]),
      "bar",
    );
    expect(out.yAxisKey).toBe("a");
    expect(out.xAxisKey).toBe("b");
  });

  it("uses two numerics for scatter X and Y", () => {
    const out = hydrateXYFromQueryResult(
      { ...empty },
      cols([
        { name: "xval", dataType: "double" },
        { name: "yval", dataType: "double" },
      ]),
      "scatter",
    );
    expect(out.yAxisKey).toBe("xval");
    expect(out.xAxisKey).toBe("yval");
  });

  it("does not overwrite preset axis keys", () => {
    const out = hydrateXYFromQueryResult(
      { xAxisKey: "custom_x", yAxisKey: "custom_y" },
      cols([
        { name: "a", dataType: "varchar" },
        { name: "b", dataType: "double" },
      ]),
      "bar",
    );
    expect(out.xAxisKey).toBe("custom_x");
    expect(out.yAxisKey).toBe("custom_y");
  });

  it("returns unchanged when columns empty", () => {
    const cfg = { xAxisKey: undefined, yAxisKey: undefined };
    const out = hydrateXYFromQueryResult(cfg, [], "line");
    expect(out).toEqual(cfg);
  });

  it("leaves Y undefined when no numeric column", () => {
    const out = hydrateXYFromQueryResult(
      { ...empty },
      cols([{ name: "only_text", dataType: "varchar" }]),
      "bar",
    );
    expect(out.yAxisKey).toBeUndefined();
    expect(out.xAxisKey).toBeUndefined();
  });
});
