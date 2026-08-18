/** Tests seeding import-time columns from a DuckDB-reported schema. */

import { prop, propEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { makeImportedColumnsFromDuckDbSchema } from "./makeImportedColumnsFromDuckDbSchema";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";

function _columnSchema(
  columnName: string,
  columnType: DuckDbColumnSchema["column_type"],
): DuckDbColumnSchema {
  return {
    column_name: columnName,
    column_type: columnType,
    null: "YES",
    key: null,
    default: null,
    extra: null,
  };
}

describe("makeImportedColumnsFromDuckDbSchema", () => {
  it("translates the DuckDB type into the queryable Avandar type", () => {
    const [bigColumn, textColumn] = makeImportedColumnsFromDuckDbSchema([
      _columnSchema("population", "HUGEINT"),
      _columnSchema("city", "VARCHAR"),
    ]);

    expect(bigColumn?.dataType).toBe("bigint");
    expect(textColumn?.dataType).toBe("varchar");
  });

  it("records the DuckDB type as both the original and detected type", () => {
    const [column] = makeImportedColumnsFromDuckDbSchema([
      _columnSchema("measured_at", "TIMESTAMP"),
    ]);

    expect(column?.originalDataType).toBe("TIMESTAMP");
    expect(column?.detectedDataType).toBe("TIMESTAMP");
  });

  it("seeds the editable name from the source name without losing it", () => {
    const [column] = makeImportedColumnsFromDuckDbSchema([
      _columnSchema("Total Population", "BIGINT"),
    ]);

    expect(column?.name).toBe("Total Population");
    expect(column?.originalName).toBe("Total Population");
  });

  it("marks a freshly inferred type as not user-set", () => {
    const columns = makeImportedColumnsFromDuckDbSchema([
      _columnSchema("city", "VARCHAR"),
      _columnSchema("population", "BIGINT"),
    ]);

    expect(columns.every(propEq("isDataTypeUserSet", false))).toBe(true);
  });

  it("numbers the columns by their position in the source schema", () => {
    const columns = makeImportedColumnsFromDuckDbSchema([
      _columnSchema("a", "VARCHAR"),
      _columnSchema("b", "VARCHAR"),
      _columnSchema("c", "VARCHAR"),
    ]);

    expect(columns.map(prop("columnIdx"))).toEqual([0, 1, 2]);
  });
});
