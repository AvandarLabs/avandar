/** Tests detection of empty and duplicate import-form column names. */

import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { getImportedColumnErrors } from "./getImportedColumnErrors";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

function _column(name: string, columnIdx: number): DatasetColumn.Imported {
  return {
    originalName: `col${columnIdx}`,
    name,
    originalDataType: "VARCHAR",
    detectedDataType: "VARCHAR",
    dataType: "varchar",
    isDataTypeUserSet: false,
    columnIdx,
  };
}

function _columnIdxsWithErrors(
  columns: readonly DatasetColumn.Imported[],
): number[] {
  return getImportedColumnErrors(columns).map(prop("columnIdx"));
}

describe("getImportedColumnErrors", () => {
  it("accepts distinct non-empty names", () => {
    expect(
      getImportedColumnErrors([_column("city", 0), _column("population", 1)]),
    ).toEqual([]);
  });

  it("rejects an empty name, which DuckDB cannot even parse as an identifier", () => {
    expect(_columnIdxsWithErrors([_column("", 0), _column("city", 1)])).toEqual(
      [0],
    );
  });

  it("rejects a whitespace-only name", () => {
    expect(_columnIdxsWithErrors([_column("   ", 0)])).toEqual([0]);
  });

  // DuckDB does not reject a duplicate alias. It silently suffixes the second
  // one to `name_1` on `SELECT *`, and a lookup by name returns only the first.
  // Every query this app builds addresses columns by name, so a duplicate makes
  // one column silently unreadable rather than raising anything.
  it("rejects both sides of a duplicate name", () => {
    expect(
      _columnIdxsWithErrors([
        _column("city", 0),
        _column("population", 1),
        _column("city", 2),
      ]),
    ).toEqual([0, 2]);
  });

  // DuckDB resolves identifiers case-insensitively, so "City" and "city"
  // collide on lookup even though `SELECT *` reports them as separate columns.
  it("rejects names that differ only in case", () => {
    expect(
      _columnIdxsWithErrors([_column("City", 0), _column("city", 1)]),
    ).toEqual([0, 1]);
  });

  it("rejects names that differ only in surrounding whitespace", () => {
    expect(
      _columnIdxsWithErrors([_column("city", 0), _column("city ", 1)]),
    ).toEqual([0, 1]);
  });

  it("says which problem each column has, so the form can word it", () => {
    expect(
      getImportedColumnErrors([_column("city", 0), _column("city", 1)]),
    ).toEqual([
      { columnIdx: 0, columnName: "city", kind: "duplicate_name" },
      { columnIdx: 1, columnName: "city", kind: "duplicate_name" },
    ]);
    expect(getImportedColumnErrors([_column("", 0)])).toEqual([
      { columnIdx: 0, columnName: "", kind: "empty_name" },
    ]);
  });

  it("reports an empty name once rather than also calling it a duplicate", () => {
    expect(
      getImportedColumnErrors([_column("", 0), _column("", 1)]).map(
        prop("kind"),
      ),
    ).toEqual(["empty_name", "empty_name"]);
  });

  it("finds no errors in an empty column list", () => {
    expect(getImportedColumnErrors([])).toEqual([]);
  });
});
