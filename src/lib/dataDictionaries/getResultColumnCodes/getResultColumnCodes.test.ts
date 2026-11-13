import { describe, expect, it } from "vitest";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import {
  getResultColumnCodes,
  getSourceDatasetId,
} from "@/lib/dataDictionaries/getResultColumnCodes/getResultColumnCodes";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const GENDER_CODES = {
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  ],
} as unknown as ColumnCodes.T;
const CODES = new Map([["GENDER", GENDER_CODES]]);

function _projections(sql: string, columnNames: readonly string[]) {
  return makeProjectionDescriptorsFromSql({
    sql,
    columns: columnNames.map((name) => {
      return { name, dataType: "varchar" };
    }) as never,
  });
}

describe("getResultColumnCodes", () => {
  it("gives a column selected as is its code list", () => {
    const projections = _projections(
      `SELECT "GENDER", "county" FROM "${DATASET_ID}"`,
      ["GENDER", "county"],
    );

    expect(getSourceDatasetId(projections)).toBe(DATASET_ID);
    expect(
      getResultColumnCodes({
        projections,
        datasetId: DATASET_ID,
        codesByColumnName: CODES,
      }).get("GENDER"),
    ).toBe(GENDER_CODES);
  });

  it("gives an aggregated column none", () => {
    const projections = _projections(
      `SELECT max("GENDER") AS top FROM "${DATASET_ID}"`,
      ["top"],
    );

    expect(
      getResultColumnCodes({
        projections,
        datasetId: DATASET_ID,
        codesByColumnName: CODES,
      }).size,
    ).toBe(0);
  });
});
