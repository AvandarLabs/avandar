/** Tests layering import-form edits over inferred columns. */

import { propEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { applyImportedColumnEdits } from "./applyImportedColumnEdits";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

function _baseColumns(): DatasetColumn.Imported[] {
  return [
    {
      originalName: "cty",
      name: "cty",
      originalDataType: "VARCHAR",
      detectedDataType: "VARCHAR",
      dataType: "varchar",
      isDataTypeUserSet: false,
      columnIdx: 0,
    },
    {
      originalName: "pop",
      name: "pop",
      originalDataType: "BIGINT",
      detectedDataType: "BIGINT",
      dataType: "bigint",
      isDataTypeUserSet: false,
      columnIdx: 1,
    },
  ];
}

describe("applyImportedColumnEdits", () => {
  it("returns the inferred columns unchanged when nothing was edited", () => {
    expect(
      applyImportedColumnEdits({
        baseColumns: _baseColumns(),
        editsByColumnIdx: {},
      }),
    ).toEqual(_baseColumns());
  });

  it("applies a rename without touching the source name", () => {
    const [column] = applyImportedColumnEdits({
      baseColumns: _baseColumns(),
      editsByColumnIdx: { 0: { name: "City" } },
    });

    expect(column?.name).toBe("City");
    expect(column?.originalName).toBe("cty");
  });

  it("marks a changed type as user-set so query time casts it", () => {
    const [column] = applyImportedColumnEdits({
      baseColumns: _baseColumns(),
      editsByColumnIdx: { 0: { dataType: "date" } },
    });

    expect(column?.dataType).toBe("date");
    expect(column?.isDataTypeUserSet).toBe(true);
  });

  it("stops treating a type as user-set once it is set back to the inferred one", () => {
    const [column] = applyImportedColumnEdits({
      baseColumns: _baseColumns(),
      editsByColumnIdx: { 0: { dataType: "varchar" } },
    });

    expect(column?.dataType).toBe("varchar");
    expect(column?.isDataTypeUserSet).toBe(false);
  });

  it("never rewrites the fields that describe the source data", () => {
    const [column] = applyImportedColumnEdits({
      baseColumns: _baseColumns(),
      editsByColumnIdx: {
        0: { name: "City", dataType: "date", description: "Where" },
      },
    });

    expect(column?.originalName).toBe("cty");
    expect(column?.originalDataType).toBe("VARCHAR");
    expect(column?.detectedDataType).toBe("VARCHAR");
  });

  it("applies a description", () => {
    const [column] = applyImportedColumnEdits({
      baseColumns: _baseColumns(),
      editsByColumnIdx: { 0: { description: "Municipality of record" } },
    });

    expect(column?.description).toBe("Municipality of record");
  });

  it("edits one column without disturbing its siblings", () => {
    const columns = applyImportedColumnEdits({
      baseColumns: _baseColumns(),
      editsByColumnIdx: { 1: { name: "Population" } },
    });

    expect(columns[0]).toEqual(_baseColumns()[0]);
    expect(columns[1]?.name).toBe("Population");
  });

  it("keys edits by column index, not list position", () => {
    const reordered = [..._baseColumns()].reverse();
    const columns = applyImportedColumnEdits({
      baseColumns: reordered,
      editsByColumnIdx: { 1: { name: "Population" } },
    });

    expect(columns.find(propEq("columnIdx", 1))?.name).toBe("Population");
    expect(columns.find(propEq("columnIdx", 0))?.name).toBe("cty");
  });
});
