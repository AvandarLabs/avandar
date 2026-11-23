/**
 * A case type's query columns are its attributes followed by its built-in
 * `status` column, in that order, because the column picker lists them as
 * they come.
 */
import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeQueryColumnsFromConcept } from "@/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";

const CONCEPT_ID = uuid<Concept.Id>();

function _makeAttribute(name: string): ConceptAttribute.T {
  const now = "2026-10-25T00:00:00.000Z";
  return Model.make("ConceptAttribute", {
    id: uuid<ConceptAttribute.Id>(),
    conceptId: CONCEPT_ID,
    workspaceId: uuid<Workspace.Id>(),
    name,
    description: undefined,
    createdAt: now,
    updatedAt: now,
    dataType: "varchar",
    mappingType: "manual_entry",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: true,
    isArray: false,
    bucketGrain: undefined,
  });
}

describe("makeQueryColumnsFromConcept", () => {
  it("offers every attribute and then the built-in status column", () => {
    const columns = makeQueryColumnsFromConcept({
      conceptId: CONCEPT_ID,
      attributes: [_makeAttribute("age"), _makeAttribute("district")],
    });

    expect(columns.map(prop("baseColumn.name"))).toEqual([
      "age",
      "district",
      "status",
    ]);
    expect(columns.map(prop("baseColumn.__type"))).toEqual([
      "ConceptAttribute",
      "ConceptAttribute",
      "ConceptStatusColumn",
    ]);
  });

  it("offers the status column for a case type with no attributes", () => {
    const columns = makeQueryColumnsFromConcept({
      conceptId: CONCEPT_ID,
      attributes: [],
    });

    expect(columns.map(prop("baseColumn.name"))).toEqual(["status"]);
  });

  it("reads a field named like the record key from its suffixed view column", () => {
    const columns = makeQueryColumnsFromConcept({
      conceptId: CONCEPT_ID,
      attributes: [_makeAttribute("external_id")],
    });

    expect(columns.map(prop("sourceColumnName"))).toEqual([
      "external_id_2",
      undefined,
    ]);
  });
});
