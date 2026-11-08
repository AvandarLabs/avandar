/**
 * A field's value shape decides what it stores and how it is read, so these
 * pin the shape against the stored `is_array` and `data_type`.
 */
import { describe, expect, it } from "vitest";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";

describe("ConceptAttribute.getValueShape", () => {
  it("reads a field that keeps every value as a list and any other as one value", () => {
    expect(ConceptAttribute.getValueShape({ isArray: true })).toBe("list");
    expect(ConceptAttribute.getValueShape({ isArray: false })).toBe("single");
  });
});

describe("ConceptAttribute.valueShapeToIsArray", () => {
  it("stores each shape as the is_array it is read back from", () => {
    for (const valueShape of ["single", "list"] as const) {
      const isArray = ConceptAttribute.valueShapeToIsArray(valueShape);
      expect(ConceptAttribute.getValueShape({ isArray })).toBe(valueShape);
    }
  });
});

describe("ConceptAttribute.getOutputDataType", () => {
  it("types a list field as its column, whatever rule its draft holds", () => {
    expect(
      ConceptAttribute.getOutputDataType({
        valueShape: "list",
        ruleType: "count",
        columnDataType: "varchar",
      }),
    ).toBe("varchar");
  });

  it("types a single field as its rule's output", () => {
    expect(
      ConceptAttribute.getOutputDataType({
        valueShape: "single",
        ruleType: "count",
        columnDataType: "varchar",
      }),
    ).toBe("bigint");
  });
});
