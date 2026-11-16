import { describe, expect, it } from "vitest";
import { ResultChecks } from "./ResultChecks";
import type { EvalQueryResult } from "../runtime/EvalDatabase";

const TRUTH: EvalQueryResult = {
  columns: [
    { name: "state", type: "VARCHAR" },
    { name: "month", type: "VARCHAR" },
    { name: "value", type: "BIGINT" },
  ],
  rows: [
    ["California", "2021-01", 14000],
    ["Texas", "2021-01", 9000],
  ],
};

const SPEC = {
  keys: ["state", "month"],
  values: ["value"],
  mode: "all",
} as const;

describe("ResultChecks.matchTruthRows", () => {
  it("finds truth rows in a long result with dates and formatted numbers", () => {
    const verdict = ResultChecks.matchTruthRows(
      {
        columns: [
          { name: "Province_State", type: "VARCHAR" },
          { name: "month", type: "TIMESTAMP" },
          { name: "deaths", type: "VARCHAR" },
        ],
        rows: [
          ["California", "2021-01-01 00:00:00", "14,000"],
          ["Texas", "2021-01-01 00:00:00", 9000],
        ],
      },
      TRUTH,
      SPEC,
    );

    expect(verdict.pass).toBe(true);
  });

  it("finds truth rows in a wide result whose columns name the key", () => {
    const verdict = ResultChecks.matchTruthRows(
      {
        columns: [
          { name: "month", type: "DATE" },
          { name: "california_deaths", type: "BIGINT" },
          { name: "texas_deaths", type: "BIGINT" },
        ],
        rows: [["2021-01-01", 14000, 9000]],
      },
      TRUTH,
      SPEC,
    );

    expect(verdict.pass).toBe(true);
  });

  it("fails a wrong number", () => {
    const verdict = ResultChecks.matchTruthRows(
      {
        columns: [
          { name: "state", type: "VARCHAR" },
          { name: "month", type: "VARCHAR" },
          { name: "deaths", type: "BIGINT" },
        ],
        rows: [
          ["California", "2021-01", 14000],
          ["Texas", "2021-01", 9900],
        ],
      },
      TRUTH,
      SPEC,
    );

    expect(verdict.pass).toBe(false);
    expect(verdict.detail).toContain("Texas");
  });

  it("matches a month given as separate year and month columns", () => {
    const verdict = ResultChecks.matchTruthRows(
      {
        columns: [
          { name: "state", type: "VARCHAR" },
          { name: "year", type: "BIGINT" },
          { name: "month", type: "BIGINT" },
          { name: "deaths", type: "BIGINT" },
        ],
        rows: [
          ["California", 2021, 1, 14000],
          ["Texas", 2021, 1, 9000],
        ],
      },
      TRUTH,
      SPEC,
    );

    expect(verdict.pass).toBe(true);
  });
});

describe("ResultChecks.hasKeySet", () => {
  it("accepts optional names and rejects unexpected ones", () => {
    const result: EvalQueryResult = {
      columns: [{ name: "state", type: "VARCHAR" }],
      rows: [["Ohio"], ["Guam"]],
    };

    expect(ResultChecks.hasKeySet(result, ["Ohio"], ["Guam"]).pass).toBe(true);
    expect(ResultChecks.hasKeySet(result, ["Ohio"]).pass).toBe(false);
  });
});
