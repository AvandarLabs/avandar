/**
 * A field's period has to survive both directions: read from its row, and
 * sent with the insert, which only carries the keys the read schema names.
 */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { ConceptAttributeParsers } from "$/models/ontology/ConceptAttribute/ConceptAttributeParsers.ts";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";

const DB_ROW: ConceptAttribute.T<"DBRead"> = {
  allow_manual_edit: false,
  bucket_grain: "month",
  concept_id: "00000000-0000-4000-8000-000000000002",
  created_at: "2026-11-06T00:00:00.000Z",
  data_type: "double",
  description: null,
  id: "00000000-0000-4000-8000-000000000001",
  is_array: true,
  is_identifier: false,
  is_label: false,
  mapping_type: "dataset_column",
  name: "Temperature",
  updated_at: "2026-11-06T00:00:00.000Z",
  workspace_id: "00000000-0000-4000-8000-000000000003",
};

describe("ConceptAttributeParsers", () => {
  it("reads a field's period from its row", () => {
    const attribute = ConceptAttributeParsers.fromDBReadToModelRead(DB_ROW);

    expect(attribute.bucketGrain).toBe("month");
  });

  it("sends a field's period when the field is inserted", () => {
    const dbInsert = ConceptAttributeParsers.fromModelInsertToDBInsert(
      Model.make("ConceptAttribute", {
        conceptId: DB_ROW.concept_id as ConceptAttribute.T["conceptId"],
        workspaceId: DB_ROW.workspace_id as ConceptAttribute.T["workspaceId"],
        name: "Temperature",
        dataType: "double",
        mappingType: "dataset_column",
        isLabel: false,
        isIdentifier: false,
        isArray: true,
        allowManualEdit: false,
        bucketGrain: "week",
      }),
    );

    expect(dbInsert).toMatchObject({ bucket_grain: "week", is_array: true });
  });
});
