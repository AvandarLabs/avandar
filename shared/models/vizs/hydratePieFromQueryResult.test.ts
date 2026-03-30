import { describe, expect, it } from "vitest";
import {
  hydratePieFromQueryResult,
} from "$/models/vizs/hydratePieFromQueryResult.ts";
import type {
  QueryResultColumn,
} from "$/models/queries/QueryResult/QueryResult.types.ts";

function cols(
  pairs: ReadonlyArray<{
    name: string;
    dataType: QueryResultColumn["dataType"];
  }>,
): QueryResultColumn[] {
  return pairs.map((p) => {
    return { name: p.name, dataType: p.dataType };
  });
}

describe("hydratePieFromQueryResult", () => {
  const empty = { nameKey: undefined, valueKey: undefined };

  it("picks temporal nameKey and numeric valueKey", () => {
    const out = hydratePieFromQueryResult(
      { ...empty },
      cols([
        { name: "month", dataType: "timestamp" },
        { name: "total_cases", dataType: "double" },
      ]),
    );
    expect(out.nameKey).toBe("month");
    expect(out.valueKey).toBe("total_cases");
  });

  it("prefers text nameKey over numeric fallback", () => {
    const out = hydratePieFromQueryResult(
      { ...empty },
      cols([
        { name: "total", dataType: "double" },
        { name: "region", dataType: "varchar" },
      ]),
    );
    expect(out.valueKey).toBe("total");
    expect(out.nameKey).toBe("region");
  });

  it("falls back to a second numeric when no categorical column", () => {
    const out = hydratePieFromQueryResult(
      { ...empty },
      cols([
        { name: "a", dataType: "bigint" },
        { name: "b", dataType: "double" },
      ]),
    );
    expect(out.valueKey).toBe("a");
    expect(out.nameKey).toBe("b");
  });

  it("does not overwrite preset keys", () => {
    const out = hydratePieFromQueryResult(
      { nameKey: "custom_name", valueKey: "custom_value" },
      cols([
        { name: "cat", dataType: "varchar" },
        { name: "num", dataType: "double" },
      ]),
    );
    expect(out.nameKey).toBe("custom_name");
    expect(out.valueKey).toBe("custom_value");
  });

  it("returns unchanged when columns is empty", () => {
    const cfg = { nameKey: undefined, valueKey: undefined };
    expect(hydratePieFromQueryResult(cfg, [])).toEqual(cfg);
  });

  it("leaves valueKey undefined when there is no numeric column", () => {
    const out = hydratePieFromQueryResult(
      { ...empty },
      cols([{ name: "label", dataType: "varchar" }]),
    );
    expect(out.valueKey).toBeUndefined();
  });
});
