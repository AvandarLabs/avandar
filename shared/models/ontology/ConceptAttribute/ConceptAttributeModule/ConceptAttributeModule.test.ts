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

describe("ConceptAttribute.getViewColumnNames", () => {
  function _names(
    fields: ReadonlyArray<readonly [id: string, name: string]>,
  ): Record<string, string> {
    return Object.fromEntries(
      ConceptAttribute.getViewColumnNames(
        fields.map(([id, name]) => {
          return { id: id as ConceptAttribute.Id, name };
        }),
      ),
    );
  }

  it("names each field's view column after the field", () => {
    expect(
      _names([
        ["b", "County"],
        ["a", "Age"],
      ]),
    ).toEqual({ a: "Age", b: "County" });
  });

  it("suffixes a field named like the record key or the status", () => {
    expect(
      _names([
        ["a", "external_id"],
        ["b", "Status"],
      ]),
    ).toEqual({ a: "external_id_2", b: "Status_2" });
  });

  // DuckDB compares column names without case, and the view orders fields by
  // name and then id, so the same field keeps the plain name every run.
  it("suffixes the later of two fields whose names match without case", () => {
    expect(
      _names([
        ["b", "age"],
        ["a", "age"],
        ["c", "REGION"],
        ["d", "Region"],
      ]),
    ).toEqual({ a: "age", b: "age_2", d: "Region", c: "REGION_2" });
  });
});
