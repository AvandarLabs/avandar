import { describe, expect, it } from "vitest";
import { MAX_PAGE_SQL_CHARACTERS } from "$/agent/pageContext/AgentPageContext.ts";
import { buildAgentPageContextBlock } from "$/agent/pageContext/buildAgentPageContextBlock.ts";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext.ts";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const ALIASES = SqlTableAlias.fromDatasets([
  { id: DATASET_ID, name: "deaths.csv" },
]);
const TABLE = ALIASES[0]!.tableName;

function _block(context: AgentPageContext): string {
  return buildAgentPageContextBlock({ context, aliases: ALIASES });
}

describe("buildAgentPageContextBlock", () => {
  it("names the open dataset by alias and shows the explorer query", () => {
    const block = _block({
      app: "data-explorer",
      dataset: { id: DATASET_ID, name: "deaths.csv" },
      explorer: {
        sql: `SELECT "state" FROM "${TABLE}"`,
        resultColumns: [{ name: "state", dataType: "varchar" }],
      },
    });

    expect(block).toBe(
      [
        "<current_page>",
        "Page: Data Explorer",
        'Open dataset: t0 = "deaths.csv"',
        'Query on screen: SELECT "state" FROM "t0"',
        "Result columns: state varchar",
        "</current_page>",
      ].join("\n"),
    );
  });

  it("lists at most 12 dashboard charts and counts the rest", () => {
    const tiles = Array.from({ length: 14 }, (_, index) => {
      return {
        title: `Chart ${index + 1}`,
        chartType: "bar",
        sql: `SELECT ${index} FROM "${TABLE}"`,
      };
    });
    const block = _block({
      app: "dashboard",
      dashboard: { id: "d1", name: "Measles 2026", tiles },
    });

    expect(block).toContain('Dashboard: "Measles 2026"');
    expect(block).toContain('1. "Chart 1" (bar): SELECT 0 FROM "t0"');
    expect(block).toContain('12. "Chart 12" (bar)');
    expect(block).not.toContain("Chart 13");
    expect(block).toContain("2 more charts not listed");
  });

  it("cuts long SQL", () => {
    const sql = `SELECT ${"x, ".repeat(1_000)}1 FROM "${TABLE}"`;
    const block = _block({
      app: "data-explorer",
      explorer: { sql, resultColumns: [] },
    });
    const queryLine = block.split("\n").find((line) => {
      return line.startsWith("Query on screen: ");
    })!;

    expect(queryLine.length).toBeLessThanOrEqual(
      "Query on screen: ".length + MAX_PAGE_SQL_CHARACTERS + 4,
    );
    expect(queryLine.endsWith(" ...")).toBe(true);
  });

  it("names a case's type and never the case", () => {
    const block = _block({
      app: "case",
      caseType: { id: "c1", name: "Measles case" },
    });

    expect(block).toContain('Case type: "Measles case"');
    expect(block).toContain("One case is open; its details are not shared.");
  });

  it("names only the page when there is nothing else", () => {
    expect(_block({ app: "other" })).toBe(
      "<current_page>\nPage: Other\n</current_page>",
    );
  });
});
