import {
  GHO_FACT_COLUMNS,
  getCatalogTypeFromEdmType,
  hasGhoFactSchema,
} from "@pipelines/gho/ghoFactColumns/ghoFactColumns";
import { describe, expect, it } from "vitest";

function _factProperties(): Array<{ name: string; edmType: string }> {
  return GHO_FACT_COLUMNS.map((column) => {
    return { name: column.name, edmType: column.originalDataType };
  });
}

describe("getCatalogTypeFromEdmType", () => {
  it.each([
    ["Edm.Int32", "BIGINT"],
    ["Edm.Int64", "BIGINT"],
    ["Edm.Decimal", "DOUBLE"],
    ["Edm.Double", "DOUBLE"],
    ["Edm.DateTimeOffset", "TIMESTAMP"],
    ["Edm.Boolean", "BOOLEAN"],
    ["Edm.String", "VARCHAR"],
    ["Edm.Guid", "VARCHAR"],
  ])("maps %s to %s", (edmType, catalogType) => {
    expect(getCatalogTypeFromEdmType(edmType)).toBe(catalogType);
  });
});

describe("GHO_FACT_COLUMNS", () => {
  it("types the 25 fact columns from GHO's declared Edm types", () => {
    expect(
      GHO_FACT_COLUMNS.filter((column) => {
        return column.castDataType !== "VARCHAR";
      }).map((column) => {
        return [column.name, column.castDataType];
      }),
    ).toEqual([
      ["Id", "BIGINT"],
      ["TimeDim", "BIGINT"],
      ["NumericValue", "DOUBLE"],
      ["Low", "DOUBLE"],
      ["High", "DOUBLE"],
      ["Date", "TIMESTAMP"],
      ["TimeDimensionBegin", "TIMESTAMP"],
      ["TimeDimensionEnd", "TIMESTAMP"],
    ]);
    expect(GHO_FACT_COLUMNS).toHaveLength(25);
  });
});

describe("hasGhoFactSchema", () => {
  it("accepts the fact properties in any order", () => {
    expect(hasGhoFactSchema(_factProperties().reverse())).toBe(true);
  });

  it("refuses a property whose Edm type changed", () => {
    const properties = _factProperties().map((property) => {
      return property.name === "TimeDim"
        ? { ...property, edmType: "Edm.String" }
        : property;
    });

    expect(hasGhoFactSchema(properties)).toBe(false);
  });

  it("refuses an extra property", () => {
    expect(
      hasGhoFactSchema([
        ..._factProperties(),
        { name: "Extra", edmType: "Edm.String" },
      ]),
    ).toBe(false);
  });

  it("refuses a missing property", () => {
    expect(hasGhoFactSchema(_factProperties().slice(1))).toBe(false);
  });
});
