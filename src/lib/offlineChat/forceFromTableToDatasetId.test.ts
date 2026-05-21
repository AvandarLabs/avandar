import { Parser } from "node-sql-parser";
import { describe, expect, it } from "vitest";
import { forceFromTableToDatasetId } from "./forceFromTableToDatasetId";
import { repairOfflineGeneratedSql } from "./repairOfflineGeneratedSql";

describe("node-sql-parser sqlify after remap", () => {
  it("may emit unquoted FROM so force must handle it", () => {
    const parser = new Parser();
    const sql = 'SELECT *\nFROM "covid_deaths"\nLIMIT 100';
    const ast = parser.astify(sql, { database: "postgresql" }) as unknown as Record<
      string,
      unknown
    >;
    const from = (ast.from as Array<{ table?: string }>)[0]!;
    from.table = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const sqlified = parser.sqlify(
      ast as unknown as Parameters<Parser["sqlify"]>[0],
    );
    const forced = forceFromTableToDatasetId({
      sql: sqlified,
      datasetTableId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      allowedTableIds: new Set(["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]),
    });
    expect(forced.sql).not.toContain("covid_deaths");
  });
});

describe("repairOfflineGeneratedSql full pipeline on multiline", () => {
  it("fixes multiline SELECT", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const result = repairOfflineGeneratedSql({
      sql: 'SELECT *\nFROM "covid_deaths"\nLIMIT 100',
      schema: {
        datasets: [{ id, name: "LONG_us_deaths.csv" }],
        columns: [],
      },
      lastUserPrompt: "covid deaths top 100",
    });
    expect(result.sql).toContain(`FROM "${id}"`);
    expect(result.sql).not.toContain("covid_deaths");
  });
});
