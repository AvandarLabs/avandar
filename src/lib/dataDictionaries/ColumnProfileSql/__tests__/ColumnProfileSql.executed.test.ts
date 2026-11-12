import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import { ColumnProfileSql } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  ColumnValueRow,
  ProfiledColumn,
} from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * This suite lives under `src/` beside the module it tests. It reuses
 * `withDuckDb`, whose DuckDB driver is Node-only, as the other executed
 * tests do.
 */
const DATASET = { id: uuid<Dataset.Id>(), name: "Line list" };

const COLUMNS: readonly ProfiledColumn[] = [
  { name: "case_id", dataType: "varchar" },
  { name: "GENDER", dataType: "bigint" },
  { name: "onset", dataType: "varchar" },
  { name: "ses_cat", dataType: "bigint" },
];

async function _createLineList(connection: DuckDBConnection): Promise<void> {
  await connection.run(`
    CREATE TABLE "${DATASET.id}" AS
    SELECT
      'NY-' || lpad(CAST(i AS VARCHAR), 3, '0') AS case_id,
      CASE WHEN i % 8 = 0 THEN 9 WHEN i % 2 = 0 THEN 2 ELSE 1 END AS "GENDER",
      strftime(DATE '2026-02-01' + CAST(i AS INTEGER), '%m/%d/%Y') AS onset,
      (i % 4) + 1 AS ses_cat
    FROM range(1, 25) AS t(i)
  `);
}

async function _profile(
  connection: DuckDBConnection,
): Promise<ColumnProfile.T[]> {
  const summary = await connection.runAndReadAll(
    ColumnProfileSql.buildSummarySql({
      datasetId: DATASET.id,
      columns: COLUMNS,
    }),
  );
  const summaryRow = summary.getRowObjects()[0] ?? {};
  const listedColumnIndexes = ColumnProfileSql.getListedColumnIndexes({
    columns: COLUMNS,
    summaryRow,
  });
  const values = await connection.runAndReadAll(
    ColumnProfileSql.buildValuesSql({
      datasetId: DATASET.id,
      columns: [...listedColumnIndexes].map((index) => {
        return { index, name: COLUMNS[index]?.name ?? "" };
      }),
    }),
  );
  return ColumnProfileSql.makeColumnProfilesFromRows({
    dataset: DATASET,
    columns: COLUMNS,
    summaryRow,
    valueRows: values.getRowObjects() as ColumnValueRow[],
    listedColumnIndexes,
  });
}

describe("ColumnProfileSql on a real DuckDB", () => {
  it("profiles a line list into the kinds a dictionary needs", async () => {
    await withDuckDb(async (connection) => {
      await _createLineList(connection);
      const profiles = await _profile(connection);
      expect(profiles.map(ColumnProfile.getEntryKind)).toEqual([
        "identifier",
        "categorical",
        "date",
        "ordered",
      ]);
    });
  });

  it("lists a coded column's values with their row counts, most rows first", async () => {
    await withDuckDb(async (connection) => {
      await _createLineList(connection);
      const [, gender] = await _profile(connection);
      expect(gender?.values).toEqual([
        { value: "1", rowCount: 12 },
        { value: "2", rowCount: 9 },
        { value: "9", rowCount: 3 },
      ]);
    });
  });

  it("reads the date share from a sample while counting every row", async () => {
    await withDuckDb(async (connection) => {
      await connection.run(`
        CREATE TABLE "${DATASET.id}" AS
        SELECT strftime(DATE '2000-01-01' + CAST(i % 5000 AS INTEGER), '%Y-%m-%d') AS onset
        FROM range(0, 30000) AS t(i)
      `);
      const columns: ProfiledColumn[] = [
        { name: "onset", dataType: "varchar" },
      ];
      const summary = await connection.runAndReadAll(
        ColumnProfileSql.buildSummarySql({ datasetId: DATASET.id, columns }),
      );
      const [profile] = ColumnProfileSql.makeColumnProfilesFromRows({
        dataset: DATASET,
        columns,
        summaryRow: summary.getRowObjects()[0] ?? {},
        valueRows: [],
        listedColumnIndexes: new Set(),
      });
      expect(profile).toMatchObject({ rowCount: 30000, dateShare: 1 });
    });
  });
});
