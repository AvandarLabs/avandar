/**
 * Verifies which column a query column reads, which `QueryResult` column
 * name it produces, and which operations it supports when its field keeps
 * every value as a list.
 */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";

it("uses an explicit output alias for an aggregate projection", () => {
  const column = QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: "dc_revenue",
      name: "revenue",
      dataType: "double",
    }) as DatasetColumn.T,
  );
  expect(
    QueryColumn.getDerivedColumnName({
      ...column,
      aggregation: "sum",
      outputAlias: "total",
    }),
  ).toBe("total");
});

function _conceptAttribute(
  id: string,
  name: string,
  options: Readonly<{
    dataType?: AvaDataType.T;
    isArray?: boolean;
    bucketGrain?: ConceptAttribute.BucketGrain;
  }> = {},
): ConceptAttribute.T {
  return Model.make("ConceptAttribute", {
    id,
    conceptId: "concept_1",
    workspaceId: "workspace_1",
    name,
    description: undefined,
    createdAt: "2026-11-06T00:00:00Z",
    updatedAt: "2026-11-06T00:00:00Z",
    dataType: options.dataType ?? "varchar",
    mappingType: "dataset_column",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: false,
    isArray: options.isArray ?? false,
    bucketGrain: options.bucketGrain,
  }) as ConceptAttribute.T;
}

describe("QueryColumn.makeFromConceptAttributes", () => {
  it("reads a renamed field from its view column", () => {
    const [county, keyNamed] = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_county", "County"),
      _conceptAttribute("attr_key", "external_id"),
    ]);

    expect(county?.sourceColumnName).toBeUndefined();
    expect(QueryColumn.getSourceColumnName(county!)).toBe("County");
    expect(QueryColumn.getSourceColumnName(keyNamed!)).toBe("external_id_2");
  });

  it("keeps a field named like the record key under its own name in the result", () => {
    const [keyNamed] = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_key", "external_id"),
    ]);

    expect(QueryColumn.getDerivedColumnName(keyNamed!)).toBe("external_id");
  });

  // `age` and `Age` are one name to DuckDB, so the later field's result is
  // named after its view column to stay a column of its own.
  it("names the result of a field that matches another without case after its view column", () => {
    const [age, secondAge] = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_a", "age"),
      _conceptAttribute("attr_b", "Age"),
    ]);

    expect(QueryColumn.getDerivedColumnName(age!)).toBe("age");
    expect(QueryColumn.getDerivedColumnName(secondAge!)).toBe("Age_2");
    expect(
      QueryColumn.getDerivedColumnName({ ...secondAge!, aggregation: "count" }),
    ).toBe("count(Age_2)");
  });
});

describe("QueryColumn.refreshFromSourceColumn", () => {
  it("gives a column saved before a rename the view column its field has now", () => {
    const saved = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_key", "county"),
    ])[0]!;
    const [fresh] = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_key", "external_id"),
    ]);

    const refreshed = QueryColumn.refreshFromSourceColumn({
      column: { ...saved, aggregation: "count", outputAlias: "n" },
      sourceColumn: fresh!,
    });

    expect(refreshed).toMatchObject({
      id: saved.id,
      aggregation: "count",
      outputAlias: "n",
      sourceColumnName: "external_id_2",
    });
  });

  it("drops a source column name and result name the field no longer needs", () => {
    const saved = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_a", "age"),
      _conceptAttribute("attr_b", "Age"),
    ])[1]!;
    const [fresh] = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_b", "Age"),
    ]);

    const refreshed = QueryColumn.refreshFromSourceColumn({
      column: saved,
      sourceColumn: fresh!,
    });

    expect(refreshed).not.toHaveProperty("sourceColumnName");
    expect(refreshed).not.toHaveProperty("resultColumnName");
  });

  it("takes the result name its field has now", () => {
    const saved = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_b", "Age"),
    ])[0]!;
    const fresh = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_a", "age"),
      _conceptAttribute("attr_b", "Age"),
    ])[1]!;

    const refreshed = QueryColumn.refreshFromSourceColumn({
      column: saved,
      sourceColumn: fresh,
    });

    expect(QueryColumn.getDerivedColumnName(refreshed)).toBe("Age_2");
  });
});

function _fieldColumn(
  options: Readonly<{
    dataType: AvaDataType.T;
    isArray: boolean;
    bucketGrain?: ConceptAttribute.BucketGrain;
  }>,
): QueryColumn.T {
  return QueryColumn.makeFromConceptAttributes([
    _conceptAttribute("attr_cases", "Cases", options),
  ])[0]!;
}

const DAILY_CASES_LIST = _fieldColumn({ dataType: "bigint", isArray: true });
const TOTAL_CASES = _fieldColumn({ dataType: "bigint", isArray: false });
const TEMPERATURE_PER_MONTH = _fieldColumn({
  dataType: "double",
  isArray: true,
  bucketGrain: "month",
});

describe("QueryColumn and list fields", () => {
  it("offers a list field only grouping and counting", () => {
    expect(QueryColumn.getValidAggregations(DAILY_CASES_LIST)).toEqual([
      "none",
      "group_by",
      "count",
    ]);
  });

  it("offers a single-value number field its number aggregations", () => {
    expect(QueryColumn.getValidAggregations(TOTAL_CASES)).toContain("sum");
  });

  it("never treats a list of numbers as numeric", () => {
    expect(QueryColumn.isNumeric(DAILY_CASES_LIST)).toBe(false);
  });

  it("treats a single-value number field as numeric", () => {
    expect(QueryColumn.isNumeric(TOTAL_CASES)).toBe(true);
  });

  it("treats a field that keeps every value as a list", () => {
    expect(QueryColumn.isList(DAILY_CASES_LIST)).toBe(true);
  });

  it("does not treat a single-value field as a list", () => {
    expect(QueryColumn.isList(TOTAL_CASES)).toBe(false);
  });

  it("treats only a single-value field as not a list", () => {
    expect(QueryColumn.isNotList(TOTAL_CASES)).toBe(true);
    expect(QueryColumn.isNotList(DAILY_CASES_LIST)).toBe(false);
  });

  // Sort, group by, and count work on a list of periods in DuckDB; sum,
  // filters, and charts do not.
  it("gives a per-month field exactly a list's operations", () => {
    expect(QueryColumn.isList(TEMPERATURE_PER_MONTH)).toBe(true);
    expect(QueryColumn.getValidAggregations(TEMPERATURE_PER_MONTH)).toEqual([
      "none",
      "group_by",
      "count",
    ]);
    expect(QueryColumn.isNumeric(TEMPERATURE_PER_MONTH)).toBe(false);
  });

  it("gives a per-month column its period when read whole, and none when counted", () => {
    expect(
      QueryColumn.getBucketGrain({
        column: TEMPERATURE_PER_MONTH,
        aggregation: undefined,
      }),
    ).toBe("month");
    expect(
      QueryColumn.getBucketGrain({
        column: TEMPERATURE_PER_MONTH,
        aggregation: "group_by",
      }),
    ).toBe("month");
    expect(
      QueryColumn.getBucketGrain({
        column: TEMPERATURE_PER_MONTH,
        aggregation: "count",
      }),
    ).toBeUndefined();
  });

  it("gives a column that is not a per-period field no period", () => {
    expect(
      QueryColumn.getBucketGrain({
        column: DAILY_CASES_LIST,
        aggregation: undefined,
      }),
    ).toBeUndefined();
  });
});
