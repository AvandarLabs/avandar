import { describe, expect, it } from "vitest";
import { AgentQueryResult } from "./AgentQueryResult";

describe("AgentQueryResult", () => {
  it("becomes a data part the thread can store", () => {
    const result = AgentQueryResult.create({
      sql: 'SELECT 1 AS "n"',
      chart: "bar",
      title: "How many?",
    });

    expect(AgentQueryResult.toDataPart(result)).toEqual({
      type: "data",
      name: "agent-query-result",
      data: {
        version: 1,
        sql: 'SELECT 1 AS "n"',
        chartType: "bar",
        title: "How many?",
        display: "embed",
      },
    });
  });

  it("shows a result without a chart as a table", () => {
    expect(
      AgentQueryResult.create({ sql: "SELECT 1", title: "t" }).chartType,
    ).toBe("table");
  });

  it("parses stored data and refuses anything else", () => {
    const result = AgentQueryResult.create({ sql: "SELECT 1", title: "t" });

    expect(AgentQueryResult.parse(result)).toEqual(result);
    expect(AgentQueryResult.parse({ ...result, chartType: "radar" })).toBe(
      undefined,
    );
    expect(AgentQueryResult.parse({ ...result, title: "" })).toBe(undefined);
    expect(AgentQueryResult.parse({ sql: 1 })).toBe(undefined);
    expect(AgentQueryResult.parse(undefined)).toBe(undefined);
  });
});
