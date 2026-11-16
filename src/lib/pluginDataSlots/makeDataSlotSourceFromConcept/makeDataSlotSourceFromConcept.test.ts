import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { makeDataSlotSourceFromConcept } from "@/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

const CONCEPT = Model.make("Concept", {
  id: "concept_cases",
  name: "Measles cases",
}) as Concept.T;

function _makeAttribute(
  id: string,
  name: string,
  options: Readonly<{ dataType?: AvaDataType.T; isArray?: boolean }> = {},
): ConceptAttribute.T {
  return Model.make("ConceptAttribute", {
    id,
    conceptId: CONCEPT.id,
    workspaceId: "workspace_1",
    name,
    description: undefined,
    createdAt: "2026-11-11T00:00:00Z",
    updatedAt: "2026-11-11T00:00:00Z",
    dataType: options.dataType ?? "varchar",
    mappingType: "dataset_column",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: false,
    isArray: options.isArray ?? false,
    bucketGrain: undefined,
  }) as ConceptAttribute.T;
}

describe("makeDataSlotSourceFromConcept", () => {
  it("names the case type and lists its single-value fields", () => {
    const source = makeDataSlotSourceFromConcept({
      concept: CONCEPT,
      attributes: [
        _makeAttribute("attr_onset", "Onset date", { dataType: "date" }),
        _makeAttribute("attr_district", "District"),
      ],
    });

    expect(source).toEqual({
      kind: "concept",
      conceptId: "concept_cases",
      name: "Measles cases",
      fields: [
        {
          id: "attr_district",
          columnName: "District",
          label: "District",
          dataType: "varchar",
        },
        {
          id: "attr_onset",
          columnName: "Onset date",
          label: "Onset date",
          dataType: "date",
        },
      ],
    });
  });

  it("leaves out list fields, which hold several values per record", () => {
    const source = makeDataSlotSourceFromConcept({
      concept: CONCEPT,
      attributes: [
        _makeAttribute("attr_onset", "Onset date", { dataType: "date" }),
        _makeAttribute("attr_symptoms", "Symptoms", { isArray: true }),
      ],
    });

    expect(
      source.fields.map((field) => {
        return field.id;
      }),
    ).toEqual(["attr_onset"]);
  });

  it("takes the view's suffixed column name for a field named like the record key", () => {
    const source = makeDataSlotSourceFromConcept({
      concept: CONCEPT,
      attributes: [_makeAttribute("attr_key", "external_id")],
    });

    expect(source.fields[0]).toMatchObject({
      columnName: "external_id_2",
      label: "external_id",
    });
  });

  it("names columns against every field, so a list field still claims its name", () => {
    const source = makeDataSlotSourceFromConcept({
      concept: CONCEPT,
      attributes: [
        _makeAttribute("attr_a", "District", { isArray: true }),
        _makeAttribute("attr_b", "District"),
      ],
    });

    expect(source.fields).toEqual([
      {
        id: "attr_b",
        columnName: "District_2",
        label: "District",
        dataType: "varchar",
      },
    ]);
  });
});
