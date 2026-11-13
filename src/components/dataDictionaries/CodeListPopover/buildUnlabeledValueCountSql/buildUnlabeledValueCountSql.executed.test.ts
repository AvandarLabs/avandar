import { describe, expect, it } from "vitest";
import { buildUnlabeledValueCountSql } from "@/components/dataDictionaries/CodeListPopover/buildUnlabeledValueCountSql/buildUnlabeledValueCountSql";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import type { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";

const DATASET_ID = "8f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

/** GENDER as stored: 1 and 2 have labels, 7, 8, and 9 do not. */
const RAW_VALUES_SQL = `CREATE TABLE "ava_raw_${DATASET_ID}" AS SELECT * FROM (VALUES (1), (2), (7), (7), (8), (9), (NULL)) AS t ("GENDER")`;

function _makeConversion(
  overrides: ColumnConversion.T["overrides"],
): ColumnConversion.T {
  return {
    datasetColumnId: "col-gender",
    direction: "decode",
    pairs: [
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
      { code: "9", label: "", acceptedSpellings: [], isMissing: true },
    ],
    isOrdered: false,
    overrides,
    keepsOriginalAs: undefined,
    outputDataType: "varchar",
    inputDataType: undefined,
  };
}

async function _countUnlabeled(
  overrides: ColumnConversion.T["overrides"],
): Promise<number> {
  return await withDuckDb(async (connection) => {
    await connection.run(RAW_VALUES_SQL);
    const result = await connection.runAndReadAll(
      buildUnlabeledValueCountSql({
        datasetId: DATASET_ID,
        columnName: "GENDER",
        conversion: _makeConversion(overrides),
      }),
    );
    return Number(result.getRowObjects()[0]?.unlabeled_count);
  });
}

describe("buildUnlabeledValueCountSql", () => {
  it("counts each value with no label once, a code with a blank label included", async () => {
    expect(await _countUnlabeled([])).toBe(3);
  });

  it("still counts a value kept as is", async () => {
    expect(await _countUnlabeled([{ value: "7", action: "keep" }])).toBe(3);
  });

  it("leaves out a value mapped to a label or emptied", async () => {
    expect(
      await _countUnlabeled([
        { value: "7", action: "map", code: "1" },
        { value: " 8 ", action: "empty" },
      ]),
    ).toBe(1);
  });
});
