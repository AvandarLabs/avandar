/** Verifies that `outputAlias` sets the `QueryResult` column name. */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
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

function _conceptAttribute(id: string, name: string): ConceptAttribute.T {
  return Model.make("ConceptAttribute", {
    id,
    conceptId: "concept_1",
    workspaceId: "workspace_1",
    name,
    description: undefined,
    createdAt: "2026-11-06T00:00:00Z",
    updatedAt: "2026-11-06T00:00:00Z",
    dataType: "varchar",
    mappingType: "dataset_column",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: false,
    isArray: false,
  }) as ConceptAttribute.T;
}

describe("QueryColumn.makeFromConceptAttributes", () => {
  it("reads a renamed field from its view column and keeps its name in the result", () => {
    const [county, keyNamed] = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_county", "County"),
      _conceptAttribute("attr_key", "external_id"),
    ]);

    expect(county?.sourceColumnName).toBeUndefined();
    expect(QueryColumn.getSourceColumnName(county!)).toBe("County");
    expect(QueryColumn.getSourceColumnName(keyNamed!)).toBe("external_id_2");
    expect(QueryColumn.getDerivedColumnName(keyNamed!)).toBe("external_id");
  });
});

describe("QueryColumn.refreshSource", () => {
  it("gives a column saved before the rename the view column its field has now", () => {
    const saved = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_key", "county"),
    ])[0]!;
    const [fresh] = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_key", "external_id"),
    ]);

    const refreshed = QueryColumn.refreshSource(
      { ...saved, aggregation: "count", outputAlias: "n" },
      fresh!,
    );

    expect(refreshed).toMatchObject({
      id: saved.id,
      aggregation: "count",
      outputAlias: "n",
      sourceColumnName: "external_id_2",
    });
  });

  it("drops a source column name the field no longer needs", () => {
    const [saved] = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_key", "external_id"),
    ]);
    const [fresh] = QueryColumn.makeFromConceptAttributes([
      _conceptAttribute("attr_key", "county"),
    ]);

    expect(QueryColumn.refreshSource(saved!, fresh!)).not.toHaveProperty(
      "sourceColumnName",
    );
  });
});
