import { describe, expect, it } from "vitest";
import { hydrateXYFromQueryResult } from "$/models/vizs/hydrateXYFromQueryResult/hydrateXYFromQueryResult.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

function cols(
  pairs: ReadonlyArray<{
    id?: QueryColumn.Id;
    name: string;
    dataType: QueryResult.BoundColumn["dataType"];
  }>,
): QueryResult.BoundColumn[] {
  return pairs.map((p) => {
    return {
      id: p.id ?? (p.name as QueryColumn.Id),
      name: p.name,
      dataType: p.dataType,
    };
  });
}

describe("hydrateXYFromQueryResult", () => {
  const empty = { xAxisKey: undefined, yAxisKey: undefined };

  it("picks timestamp X and numeric Y for bar when both exist", () => {
    const out = hydrateXYFromQueryResult(
      { ...empty },
      cols([
        { id: "month" as QueryColumn.Id, name: "month", dataType: "timestamp" },
        {
          id: "total_cases" as QueryColumn.Id,
          name: "total_cases",
          dataType: "double",
        },
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
        {
          id: "total_cases" as QueryColumn.Id,
          name: "total_cases",
          dataType: "double",
        },
        { id: "region" as QueryColumn.Id, name: "region", dataType: "varchar" },
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
        { id: "a" as QueryColumn.Id, name: "a", dataType: "bigint" },
        { id: "b" as QueryColumn.Id, name: "b", dataType: "double" },
      ]),
      "bar",
    );
    expect(out.yAxisKey).toBe("a");
    expect(out.xAxisKey).toBe("b");
  });

  it("does not overwrite preset axis keys", () => {
    const out = hydrateXYFromQueryResult(
      {
        xAxisKey: "custom_x" as QueryColumn.Id,
        yAxisKey: "custom_y" as QueryColumn.Id,
      },
      cols([
        { id: "a" as QueryColumn.Id, name: "a", dataType: "varchar" },
        { id: "b" as QueryColumn.Id, name: "b", dataType: "double" },
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
      cols([
        {
          id: "only_text" as QueryColumn.Id,
          name: "only_text",
          dataType: "varchar",
        },
      ]),
      "bar",
    );
    expect(out.yAxisKey).toBeUndefined();
    expect(out.xAxisKey).toBeUndefined();
  });
});
