import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Model } from "@avandar/models";
import { makeIdLookupRecord } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { getParquetProjectionClauses } from "@/clients/DuckDbClient/duckDbSqlText";
import { getColumnReplacementsFromColumns } from "@/clients/qetl/QueryMediator/relationLoading/getColumnReplacementsFromColumns/getColumnReplacementsFromColumns";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * A Postgres table's rows exactly as the `connectors` edge function writes
 * them, for a table declaring an integer id, a text zip code, a timestamp, a
 * date, a double and a boolean.
 */
const POSTGRES_CSV =
  "id,zip_code,signed_up_at,birthday,score,is_active\r\n" +
  "7,02134,2024-03-04 05:06:07,1990-12-31,98.5,true";

/**
 * One column as `savePostgresTableDataset` stores it: loaded as text, so its
 * detected type is `VARCHAR`, and typed as its schema declared it.
 */
function _makeStoredColumn(
  originalName: string,
  dataType: AvaDataType.T,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: "33333333-3333-4333-8333-333333333333" as Dataset.Id,
    workspaceId: "22222222-2222-4222-8222-222222222222" as Workspace.Id,
    createdAt: "2026-10-19T00:00:00.000Z",
    updatedAt: "2026-10-19T00:00:00.000Z",
    name: originalName,
    originalName,
    originalDataType: dataType,
    detectedDataType: "VARCHAR",
    dataType,
    description: undefined,
    columnIdx: 0,
  });
}

const STORED_COLUMNS = [
  _makeStoredColumn("id", "bigint"),
  _makeStoredColumn("zip_code", "varchar"),
  _makeStoredColumn("signed_up_at", "timestamp"),
  _makeStoredColumn("birthday", "date"),
  _makeStoredColumn("score", "double"),
  _makeStoredColumn("is_active", "boolean"),
];

/**
 * Reads the CSV with every column as text, the way a `source-schema`
 * relation is read, then applies the replacements relation loading would.
 */
async function _loadAsSourceSchemaRelation(): Promise<{
  columnTypes: Record<string, string>;
  row: Record<string, unknown>;
}> {
  const stagedFile = path.join(
    tmpdir(),
    `ava-source-schema-${process.pid}.csv`,
  );
  writeFileSync(stagedFile, POSTGRES_CSV);
  const textColumns = STORED_COLUMNS.map((column) => {
    return `'${column.originalName}': 'VARCHAR'`;
  }).join(", ");
  const { excludeClause, replaceClause } = getParquetProjectionClauses(
    makeIdLookupRecord(getColumnReplacementsFromColumns(STORED_COLUMNS), {
      key: "originalName",
    }),
  );
  const projection = `SELECT * ${excludeClause}${replaceClause} FROM read_csv('${stagedFile}', header = true, columns = {${textColumns}})`;

  return await withDuckDb(async (connection) => {
    const describeResult = await connection.runAndReadAll(
      `DESCRIBE ${projection}`,
    );
    const rows = await connection.runAndReadAll(projection);
    const columnTypes = Object.fromEntries(
      describeResult.getRowObjects().map((describedColumn) => {
        return [
          String(describedColumn.column_name),
          String(describedColumn.column_type),
        ];
      }),
    );
    return { columnTypes, row: rows.getRowObjects()[0] ?? {} };
  });
}

describe("getColumnReplacementsFromColumns", () => {
  it("casts a source-schema relation's text to the types its schema declared", async () => {
    const { columnTypes } = await _loadAsSourceSchemaRelation();

    expect(columnTypes).toEqual({
      id: "BIGINT",
      zip_code: "VARCHAR",
      signed_up_at: "TIMESTAMP",
      birthday: "DATE",
      score: "DOUBLE",
      is_active: "BOOLEAN",
    });
  });

  it("casts each declared column's text to its value, leaving a text column's text as written", async () => {
    const { row } = await _loadAsSourceSchemaRelation();

    // DuckDB hands dates and timestamps back as value objects, so they are
    // compared by the text they print as.
    expect({
      ...row,
      signed_up_at: String(row.signed_up_at),
      birthday: String(row.birthday),
    }).toEqual({
      id: 7n,
      zip_code: "02134",
      signed_up_at: "2024-03-04 05:06:07",
      birthday: "1990-12-31",
      score: 98.5,
      is_active: true,
    });
  });
});
