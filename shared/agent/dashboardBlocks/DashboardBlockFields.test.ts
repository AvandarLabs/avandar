import { describe, expect, it } from "vitest";
import {
  mapDashboardBlockText,
  parseDashboardBlockFields,
} from "$/agent/dashboardBlocks/DashboardBlockFields.ts";

describe("parseDashboardBlockFields", () => {
  it("reads a chart, trimming and unfencing its SQL", () => {
    expect(
      parseDashboardBlockFields({
        kind: "DataViz",
        prompt: " Deaths ",
        sql: "```sql\nSELECT 1\n```",
        vizType: "line",
      }),
    ).toEqual({
      kind: "valid",
      block: {
        kind: "DataViz",
        prompt: "Deaths",
        sql: "SELECT 1",
        vizType: "line",
      },
    });
  });

  it("reads a chart with no kind when it has prompt and sql", () => {
    const parsed = parseDashboardBlockFields({
      prompt: "Deaths",
      sql: "SELECT 1",
      vizType: "bar",
    });

    expect(parsed.kind === "valid" && parsed.block.kind).toBe("DataViz");
  });

  it.each([
    [{ kind: "Chart" }, /kind must be one of/],
    [{ kind: "DataViz", prompt: "x", sql: "SELECT 1" }, /vizType/],
    [{ kind: "DataViz", prompt: "x", vizType: "bar" }, /prompt and sql/],
    [{ kind: "HeadingBlock", text: "  " }, /HeadingBlock needs text/],
    [{ kind: "CalloutBlock", title: "x" }, /title and body/],
    [{ kind: "ListBlock", items: ["", " "] }, /at least one item/],
    ["not an object", /must be an object/],
  ])("explains why %j is invalid", (raw, reason) => {
    const parsed = parseDashboardBlockFields(raw);

    expect(parsed.kind).toBe("invalid");
    expect(parsed.kind === "invalid" && parsed.reason).toMatch(reason);
  });

  it("keeps only allowed optional values", () => {
    expect(
      parseDashboardBlockFields({
        kind: "HeadingBlock",
        text: "Deaths",
        level: 7,
        align: "center",
      }),
    ).toEqual({
      kind: "valid",
      block: { kind: "HeadingBlock", text: "Deaths", align: "center" },
    });
    expect(
      parseDashboardBlockFields({
        kind: "CalloutBlock",
        title: "Note",
        body: "Partial",
        tone: "warning",
      }),
    ).toEqual({
      kind: "valid",
      block: {
        kind: "CalloutBlock",
        title: "Note",
        body: "Partial",
        tone: "warning",
      },
    });
  });

  it.each([[null], [7]])(
    "reads a chart whose kind is %j as a DataViz",
    (kind) => {
      expect(
        parseDashboardBlockFields({
          kind,
          prompt: "Deaths",
          sql: "SELECT 1",
          vizType: "bar",
        }),
      ).toEqual({
        kind: "valid",
        block: {
          kind: "DataViz",
          prompt: "Deaths",
          sql: "SELECT 1",
          vizType: "bar",
        },
      });
    },
  );

  it("rejects a non-string kind when there is no prompt and sql", () => {
    const parsed = parseDashboardBlockFields({ kind: null, text: "a" });

    expect(parsed.kind === "invalid" && parsed.reason).toMatch(
      /kind must be one of/,
    );
  });

  it.each([
    [
      { kind: "ParagraphBlock", text: "a" },
      { kind: "ParagraphBlock", text: "a" },
    ],
    [
      { kind: "QuoteBlock", quote: "a", cite: "b" },
      { kind: "QuoteBlock", quote: "a", cite: "b" },
    ],
    [{ kind: "DividerBlock" }, { kind: "DividerBlock" }],
    [
      { kind: "ListBlock", items: ["a", " b "], listType: "ordered" },
      { kind: "ListBlock", items: ["a", "b"], listType: "ordered" },
    ],
    [
      { kind: "CodeBlock", code: "x", language: "sql" },
      { kind: "CodeBlock", code: "x", language: "sql" },
    ],
    [
      { kind: "TableBlock", data: "a,b", delimiter: "comma", hasHeader: false },
      { kind: "TableBlock", data: "a,b", delimiter: "comma", hasHeader: false },
    ],
    [
      { kind: "Card", title: "a" },
      { kind: "Card", title: "a" },
    ],
  ])("keeps the fields of each block kind: %j", (raw, block) => {
    expect(parseDashboardBlockFields(raw)).toEqual({ kind: "valid", block });
  });
});

describe("mapDashboardBlockText", () => {
  it("maps SQL with one function and shown text with the other", () => {
    const mapped = mapDashboardBlockText(
      {
        kind: "DataViz",
        prompt: "<value 1>",
        sql: "'<value 1>'",
        vizType: "bar",
      },
      {
        mapSql: (sql) => {
          return sql.replace("<value 1>", "Kings");
        },
        mapText: (text) => {
          return text.replace("<value 1>", "Kings County");
        },
      },
    );

    expect(mapped).toEqual({
      kind: "DataViz",
      prompt: "Kings County",
      sql: "'Kings'",
      vizType: "bar",
    });
  });

  it("maps every item of a list", () => {
    expect(
      mapDashboardBlockText(
        { kind: "ListBlock", items: ["a", "b"] },
        {
          mapSql: (sql) => {
            return sql;
          },
          mapText: (text) => {
            return text.toUpperCase();
          },
        },
      ),
    ).toEqual({ kind: "ListBlock", items: ["A", "B"] });
  });
});
