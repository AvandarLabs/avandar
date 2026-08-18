/** Tests which saved-column edits become DuckDB view replacements. */

import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { describe, expect, it } from "vitest";
import { getColumnReplacements } from "./getColumnReplacements";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

function _createColumn(
  overrides: Partial<DatasetColumn.T> = {},
): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name: "city",
    originalName: "city",
    originalDataType: "VARCHAR",
    detectedDataType: "VARCHAR",
    dataType: "varchar",
    isDataTypeUserSet: false,
    description: undefined,
    columnIdx: 0,
    ...overrides,
  });
}

describe("getColumnReplacements", () => {
  it("leaves an untouched column out so the parquet is read as stored", () => {
    expect(getColumnReplacements([_createColumn()])).toEqual([]);
  });

  it("aliases a renamed column, keyed by the name in the parquet", () => {
    expect(
      getColumnReplacements([
        _createColumn({ originalName: "cty", name: "City" }),
      ]),
    ).toEqual([{ originalName: "cty", alias: "City", dataType: undefined }]);
  });

  it("casts a column whose type the user set", () => {
    expect(
      getColumnReplacements([
        _createColumn({
          detectedDataType: "VARCHAR",
          dataType: "date",
          isDataTypeUserSet: true,
        }),
      ]),
    ).toEqual([{ originalName: "city", alias: undefined, dataType: "DATE" }]);
  });

  it("both aliases and casts when the user changed name and type", () => {
    expect(
      getColumnReplacements([
        _createColumn({
          originalName: "d",
          name: "Recorded On",
          detectedDataType: "VARCHAR",
          dataType: "timestamp",
          isDataTypeUserSet: true,
        }),
      ]),
    ).toEqual([
      { originalName: "d", alias: "Recorded On", dataType: "TIMESTAMP" },
    ]);
  });

  // The XLSX import path fabricates a VARCHAR schema during its sniff, so every
  // column is saved as `varchar`. The background transcode then reconciles
  // `detectedDataType` to what `read_xlsx` really produced. A derived
  // "dataType differs from detectedDataType" test reads that as a user override
  // and casts the whole dataset back to text, discarding the real types.
  it("does not cast a column the user never typed, even after a re-parse revised the detected type", () => {
    expect(
      getColumnReplacements([
        _createColumn({
          detectedDataType: "BIGINT",
          dataType: "varchar",
          isDataTypeUserSet: false,
        }),
      ]),
    ).toEqual([]);
  });

  it("still aliases a renamed column that the re-parse re-typed", () => {
    expect(
      getColumnReplacements([
        _createColumn({
          originalName: "pop",
          name: "Population",
          detectedDataType: "BIGINT",
          dataType: "varchar",
          isDataTypeUserSet: false,
        }),
      ]),
    ).toEqual([
      { originalName: "pop", alias: "Population", dataType: undefined },
    ]);
  });

  it("returns replacements only for the columns that need them", () => {
    const replacements = getColumnReplacements([
      _createColumn({ originalName: "a", name: "a" }),
      _createColumn({ originalName: "b", name: "B" }),
      _createColumn({ originalName: "c", name: "c" }),
    ]);

    expect(replacements.map(prop("originalName"))).toEqual(["b"]);
  });
});
