import { tmpdir } from "node:os";
import path from "node:path";
import { Model } from "@avandar/models";
import { makeIdLookupRecord } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { getParquetProjectionClauses } from "@/clients/DuckDbClient/duckDbSqlText";
import {
  getColumnReplacementsFromColumns,
  getProjectionKey,
} from "@/clients/qetl/QueryMediator/relationLoading/getColumnReplacementsFromColumns/getColumnReplacementsFromColumns";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import type { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

const PARQUET_FILE = path.join(
  tmpdir(),
  `ava-conversions-${process.pid}.parquet`,
);

function _makeColumn(
  id: string,
  name: string,
  dataType: DatasetColumn.T["dataType"],
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: id as DatasetColumn.Id,
    datasetId: "33333333-3333-4333-8333-333333333333" as Dataset.Id,
    workspaceId: "44444444-4444-4444-8444-444444444444" as Workspace.Id,
    createdAt: "2026-11-13T00:00:00.000Z",
    updatedAt: "2026-11-13T00:00:00.000Z",
    name,
    originalName: name,
    originalDataType: "BIGINT",
    detectedDataType: "BIGINT",
    dataType,
    description: undefined,
    columnIdx: 0,
    dictionaryBindingId: undefined,
  });
}

/** GENDER after a decode convert binding set its type to text. */
const GENDER = _makeColumn(
  "11111111-1111-4111-8111-111111111111",
  "GENDER",
  "varchar",
);
const CASE_ID = _makeColumn(
  "22222222-2222-4222-8222-222222222222",
  "case_id",
  "bigint",
);

function _decodeWith(
  pairs: readonly DataDictionaryCodeList.Pair[],
): ColumnConversion.T {
  return {
    datasetColumnId: GENDER.id,
    direction: "decode",
    pairs,
    isOrdered: false,
    overrides: [],
    keepsOriginalAs: undefined,
    outputDataType: "varchar",
    inputDataType: "bigint",
  };
}

const PAIRS_V1 = [
  { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
  { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
];

/** The rows relation loading's view returns for one conversion of GENDER. */
async function _readThroughView(conversion: ColumnConversion.T): Promise<{
  genders: unknown[];
  caseIds: unknown[];
  genderType: string;
}> {
  const replacements = getColumnReplacementsFromColumns(
    [CASE_ID, GENDER],
    new Map([[GENDER.id, conversion]]),
  );
  const { excludeClause, replaceClause } = getParquetProjectionClauses(
    makeIdLookupRecord(replacements, { key: "originalName" }),
  );
  return await withDuckDb(async (connection) => {
    await connection.run(
      `COPY (SELECT * FROM (VALUES (1, 1), (2, 2), (3, 9), (4, 7)) AS t(case_id, "GENDER")) TO '${PARQUET_FILE}' (FORMAT parquet)`,
    );
    await connection.run(
      `CREATE VIEW cases AS SELECT * ${excludeClause}${replaceClause} FROM read_parquet('${PARQUET_FILE}')`,
    );
    const rows = await connection.runAndReadAll(
      `SELECT case_id, "GENDER" FROM cases ORDER BY case_id`,
    );
    const described = await connection.runAndReadAll(
      `SELECT column_type FROM (DESCRIBE cases) WHERE column_name = 'GENDER'`,
    );
    return {
      genders: rows.getRowObjects().map((row) => {
        return row.GENDER;
      }),
      caseIds: rows.getRowObjects().map((row) => {
        return Number(row.case_id);
      }),
      genderType: String(described.getRowObjects()[0]?.column_type),
    };
  });
}

describe("conversions through relation loading's projection", () => {
  it("returns labels for a converted column and keeps an unmatched code as text", async () => {
    const { genders, caseIds, genderType } = await _readThroughView(
      _decodeWith(PAIRS_V1),
    );

    expect(genders).toEqual(["Male", "Female", "Unknown", "7"]);
    expect(caseIds).toEqual([1, 2, 3, 4]);
    expect(genderType).toBe("VARCHAR");
  });

  it("changes the key and the rows when the live list is relabeled", async () => {
    const relabeled = _decodeWith([
      { code: "1", label: "Man", acceptedSpellings: [], isMissing: false },
      ...PAIRS_V1.slice(1),
    ]);
    const keyBefore = getProjectionKey(
      getColumnReplacementsFromColumns(
        [GENDER],
        new Map([[GENDER.id, _decodeWith(PAIRS_V1)]]),
      ),
    );
    const keyAfter = getProjectionKey(
      getColumnReplacementsFromColumns(
        [GENDER],
        new Map([[GENDER.id, relabeled]]),
      ),
    );

    const { genders } = await _readThroughView(relabeled);

    expect(keyAfter).not.toBe(keyBefore);
    expect(genders[0]).toBe("Man");
  });
});
