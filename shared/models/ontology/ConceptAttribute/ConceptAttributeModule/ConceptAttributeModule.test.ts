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
  function _getViewColumnNamesFromPairs(
    fields: ReadonlyArray<readonly [id: string, name: string]>,
  ): Record<string, { columnName: string; resultName: string }> {
    return Object.fromEntries(
      ConceptAttribute.getViewColumnNames(
        fields.map(([id, name]) => {
          return { id: id as ConceptAttribute.Id, name };
        }),
      ),
    );
  }

  function _getColumnNamesFromPairs(
    fields: ReadonlyArray<readonly [id: string, name: string]>,
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(_getViewColumnNamesFromPairs(fields)).map(
        ([id, names]) => {
          return [id, names.columnName];
        },
      ),
    );
  }

  it("names each field's view column after the field", () => {
    expect(
      _getColumnNamesFromPairs([
        ["b", "County"],
        ["a", "Age"],
      ]),
    ).toEqual({ a: "Age", b: "County" });
  });

  it("suffixes a field named like the record key or the status", () => {
    expect(
      _getColumnNamesFromPairs([
        ["a", "external_id"],
        ["b", "Status"],
      ]),
    ).toEqual({ a: "external_id_2", b: "Status_2" });
  });

  // DuckDB compares column names without case, and the view orders fields by
  // name and then id, so the same field keeps the plain name every run.
  it("suffixes the later of two fields whose names match without case", () => {
    expect(
      _getColumnNamesFromPairs([
        ["b", "age"],
        ["a", "age"],
        ["c", "REGION"],
        ["d", "Region"],
      ]),
    ).toEqual({ a: "age", b: "age_2", d: "Region", c: "REGION_2" });
  });

  it("keeps a field's own name as its result name when it has no twin", () => {
    expect(_getViewColumnNamesFromPairs([["a", "Age"]])).toEqual({
      a: { columnName: "Age", resultName: "Age" },
    });
  });

  // The result keeps the name the user sees when only a reserved column
  // forced the suffix: no other field is called `external_id`.
  it("keeps a reserved-name field's own name as its result name", () => {
    expect(
      _getViewColumnNamesFromPairs([
        ["a", "external_id"],
        ["b", "Status"],
      ]),
    ).toEqual({
      a: { columnName: "external_id_2", resultName: "external_id" },
      b: { columnName: "Status_2", resultName: "Status" },
    });
  });

  // `age` and `Age` would both name their result `age`, and DuckDB reads the
  // second as `age:1`. The later field's result takes its view column's name.
  it("names the later of two fields that match without case by its view column", () => {
    expect(
      _getViewColumnNamesFromPairs([
        ["a", "age"],
        ["b", "Age"],
      ]),
    ).toEqual({
      a: { columnName: "age", resultName: "age" },
      b: { columnName: "Age_2", resultName: "Age_2" },
    });
  });

  it("separates two fields that both match a reserved name", () => {
    const names = _getViewColumnNamesFromPairs([
      ["a", "external_id"],
      ["b", "external_id"],
    ]);

    expect(names["a"]).toEqual({
      columnName: "external_id_2",
      resultName: "external_id",
    });
    expect(names["b"]).toEqual({
      columnName: "external_id_3",
      resultName: "external_id_3",
    });
  });
});
