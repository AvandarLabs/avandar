import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import {
  getColumnReplacementsFromColumns,
  getProjectionKey,
} from "@/clients/qetl/QueryMediator/relationLoading/getColumnReplacementsFromColumns/getColumnReplacementsFromColumns";
import type { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

const GENDER_ID = "11111111-1111-4111-8111-111111111111" as DatasetColumn.Id;
const COPY_ID = "22222222-2222-4222-8222-222222222222" as DatasetColumn.Id;

function _makeColumn(
  options: Pick<DatasetColumn.T, "id" | "name" | "originalName"> &
    Partial<DatasetColumn.T>,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    datasetId: "33333333-3333-4333-8333-333333333333" as Dataset.Id,
    workspaceId: "44444444-4444-4444-8444-444444444444" as Workspace.Id,
    createdAt: "2026-11-13T00:00:00.000Z",
    updatedAt: "2026-11-13T00:00:00.000Z",
    originalDataType: "BIGINT",
    detectedDataType: "BIGINT",
    dataType: "bigint",
    description: undefined,
    columnIdx: 0,
    dictionaryBindingId: undefined,
    ...options,
  });
}

const GENDER_CONVERSION: ColumnConversion.T = {
  datasetColumnId: GENDER_ID,
  direction: "decode",
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
    { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
  ],
  isOrdered: false,
  overrides: [],
  keepsOriginalAs: undefined,
  outputDataType: "varchar",
  inputDataType: "bigint",
};

describe("getColumnReplacementsFromColumns", () => {
  it("gives a converted column its conversion and no cast before it", () => {
    // Converting set the stored type to `varchar`, which differs from the
    // detected `BIGINT`. That is the output's type, not a cast: the column
    // was `bigint` before converting, as it loads, so nothing is cast first.
    const gender = _makeColumn({
      id: GENDER_ID,
      name: "GENDER",
      originalName: "GENDER",
      dataType: "varchar",
    });

    const replacements = getColumnReplacementsFromColumns(
      [gender],
      new Map([[GENDER_ID, GENDER_CONVERSION]]),
    );

    expect(replacements).toEqual([
      {
        originalName: "GENDER",
        alias: undefined,
        dataType: undefined,
        valueMapping: GENDER_CONVERSION,
        originalCopyDataType: undefined,
      },
    ]);
  });

  it("casts a converted column to its type before converting, so the codes match", () => {
    // Stored as text ("01") but typed `bigint` before converting: the CASE
    // reads the cast value, so "01" matches code 1.
    const gender = _makeColumn({
      id: GENDER_ID,
      name: "GENDER",
      originalName: "GENDER",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
    });

    const [replacement] = getColumnReplacementsFromColumns(
      [gender],
      new Map([[GENDER_ID, GENDER_CONVERSION]]),
    );

    expect(replacement?.dataType).toBe("BIGINT");
  });

  it("casts nothing before converting when the conversion names no input type", () => {
    const gender = _makeColumn({
      id: GENDER_ID,
      name: "GENDER",
      originalName: "GENDER",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
    });

    const [replacement] = getColumnReplacementsFromColumns(
      [gender],
      new Map([
        [GENDER_ID, { ...GENDER_CONVERSION, inputDataType: undefined }],
      ]),
    );

    expect(replacement?.dataType).toBeUndefined();
  });

  it("casts the keep-original copy as the copy's own row asks", () => {
    // The column held text codes cast to numbers before it was converted,
    // so its copy keeps that cast while the converted column holds labels.
    const gender = _makeColumn({
      id: GENDER_ID,
      name: "GENDER",
      originalName: "GENDER",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
    });
    const copy = _makeColumn({
      id: COPY_ID,
      name: "GENDER_original",
      originalName: "GENDER",
      dataType: "bigint",
      detectedDataType: "VARCHAR",
      dictionaryBindingId:
        "55555555-5555-4555-8555-555555555555" as DictionaryBinding.Id,
    });

    const [replacement] = getColumnReplacementsFromColumns(
      [gender, copy],
      new Map([
        [
          GENDER_ID,
          { ...GENDER_CONVERSION, keepsOriginalAs: "GENDER_original" },
        ],
      ]),
    );

    expect(replacement?.originalCopyDataType).toBe("BIGINT");
  });

  it("leaves the copy uncast when its row loads as stored", () => {
    const gender = _makeColumn({
      id: GENDER_ID,
      name: "GENDER",
      originalName: "GENDER",
      dataType: "varchar",
    });
    const copy = _makeColumn({
      id: COPY_ID,
      name: "GENDER_original",
      originalName: "GENDER",
      dictionaryBindingId:
        "55555555-5555-4555-8555-555555555555" as DictionaryBinding.Id,
    });

    const [replacement] = getColumnReplacementsFromColumns(
      [gender, copy],
      new Map([
        [
          GENDER_ID,
          { ...GENDER_CONVERSION, keepsOriginalAs: "GENDER_original" },
        ],
      ]),
    );

    expect(replacement?.originalCopyDataType).toBeUndefined();
  });

  it("keeps a converted column's rename", () => {
    const gender = _makeColumn({
      id: GENDER_ID,
      name: "sex",
      originalName: "GENDER",
      dataType: "varchar",
    });

    const [replacement] = getColumnReplacementsFromColumns(
      [gender],
      new Map([[GENDER_ID, GENDER_CONVERSION]]),
    );

    expect(replacement?.alias).toBe("sex");
  });

  it("leaves a keep-original copy to the conversion it belongs to", () => {
    // The copy shares the converted column's Parquet header and is renamed,
    // so without the skip it would emit a second `EXCLUDE` of "GENDER".
    const copy = _makeColumn({
      id: COPY_ID,
      name: "GENDER_original",
      originalName: "GENDER",
      dictionaryBindingId:
        "55555555-5555-4555-8555-555555555555" as DictionaryBinding.Id,
    });

    expect(getColumnReplacementsFromColumns([copy])).toEqual([]);
  });

  it("still renames and casts a column with no conversion", () => {
    const zip = _makeColumn({
      id: COPY_ID,
      name: "zip",
      originalName: "zip_code",
      dataType: "varchar",
    });

    expect(getColumnReplacementsFromColumns([zip])).toEqual([
      { originalName: "zip_code", alias: "zip", dataType: "VARCHAR" },
    ]);
  });
});

describe("getProjectionKey", () => {
  it("does not depend on the order of the replacements or their keys", () => {
    const rename = { originalName: "zip_code", alias: "zip" };
    const conversion = {
      valueMapping: GENDER_CONVERSION,
      originalName: "GENDER",
    };

    expect(getProjectionKey([rename, conversion])).toBe(
      getProjectionKey([conversion, rename]),
    );
  });

  it("changes when a code list's label changes", () => {
    const relabeled: ColumnConversion.T = {
      ...GENDER_CONVERSION,
      pairs: [
        { code: "1", label: "Man", acceptedSpellings: [], isMissing: false },
        GENDER_CONVERSION.pairs[1]!,
      ],
    };

    expect(
      getProjectionKey([
        { originalName: "GENDER", valueMapping: GENDER_CONVERSION },
      ]),
    ).not.toBe(
      getProjectionKey([{ originalName: "GENDER", valueMapping: relabeled }]),
    );
  });

  it("changes when the keep-original copy's cast changes", () => {
    const converted = {
      originalName: "GENDER",
      valueMapping: GENDER_CONVERSION,
    };

    expect(getProjectionKey([converted])).not.toBe(
      getProjectionKey([{ ...converted, originalCopyDataType: "BIGINT" }]),
    );
  });

  it("gives a dataset with nothing to replace a key of its own", () => {
    expect(getProjectionKey([])).toBe("[]");
  });
});
