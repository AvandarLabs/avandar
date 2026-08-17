import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { describe, expect, it } from "vitest";
import { getDatasetColumnUpdate } from "./getDatasetColumnUpdate";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

const COLUMN_ID = uuid<DatasetColumn.Id>();

function _column(overrides: Partial<DatasetColumn.T> = {}): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: COLUMN_ID,
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

describe("getDatasetColumnUpdate", () => {
  it("writes nothing when nothing changed", () => {
    const column = _column();

    expect(
      getDatasetColumnUpdate({ previousColumn: column, editedColumn: column }),
    ).toBeUndefined();
  });

  it("writes only the name when only the name changed", () => {
    expect(
      getDatasetColumnUpdate({
        previousColumn: _column(),
        editedColumn: _column({ name: "City" }),
      }),
    ).toEqual({ name: "City" });
  });

  it("writes only the description when only the description changed", () => {
    expect(
      getDatasetColumnUpdate({
        previousColumn: _column(),
        editedColumn: _column({ description: "Municipality" }),
      }),
    ).toEqual({ description: "Municipality" });
  });

  it("marks a changed type as user-set so query time casts it", () => {
    expect(
      getDatasetColumnUpdate({
        previousColumn: _column(),
        editedColumn: _column({ dataType: "date" }),
      }),
    ).toEqual({ dataType: "date", isDataTypeUserSet: true });
  });

  it("clears the override when the type is set back to the detected one", () => {
    expect(
      getDatasetColumnUpdate({
        previousColumn: _column({
          dataType: "date",
          isDataTypeUserSet: true,
        }),
        editedColumn: _column({ dataType: "varchar", isDataTypeUserSet: true }),
      }),
    ).toEqual({ dataType: "varchar", isDataTypeUserSet: false });
  });

  // `dataType` is an Avandar type ("varchar") and `detectedDataType` a DuckDB
  // type ("VARCHAR"), so comparing them against each other is always unequal
  // and would report a change on every submit.
  it("does not report a type change just because the two type fields differ in form", () => {
    const column = _column({
      dataType: "varchar",
      detectedDataType: "VARCHAR",
    });

    expect(
      getDatasetColumnUpdate({
        previousColumn: column,
        editedColumn: { ...column, description: "note" },
      }),
    ).toEqual({ description: "note" });
  });

  it("writes every field the user changed at once", () => {
    expect(
      getDatasetColumnUpdate({
        previousColumn: _column(),
        editedColumn: _column({
          name: "City",
          dataType: "date",
          description: "note",
        }),
      }),
    ).toEqual({
      name: "City",
      dataType: "date",
      isDataTypeUserSet: true,
      description: "note",
    });
  });
});
