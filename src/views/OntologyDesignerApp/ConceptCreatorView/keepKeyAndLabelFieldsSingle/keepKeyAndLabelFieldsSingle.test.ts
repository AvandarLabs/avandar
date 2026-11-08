/**
 * The form lets any dataset field keep every value, but a key matches rows
 * to a record and the label names it, so the submit keeps those to one.
 */
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeDefaultDatasetColumnAttribute } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { keepKeyAndLabelFieldsSingle } from "@/views/OntologyDesignerApp/ConceptCreatorView/keepKeyAndLabelFieldsSingle/keepKeyAndLabelFieldsSingle";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";

const CONCEPT_ID = uuid<ConceptId>();
const DATASET = { id: uuid<Dataset.Id>() } as Dataset.T;

function _listField(options: { name: string; isIdentifier?: boolean }) {
  return {
    ...makeDefaultDatasetColumnAttribute({
      conceptId: CONCEPT_ID,
      name: options.name,
      dataset: DATASET,
      datasetColumn: {
        id: uuid(),
        name: options.name,
        dataType: "varchar",
      } as DatasetColumnRead,
      isIdentifier: options.isIdentifier,
    }),
    isArray: true,
  };
}

describe("keepKeyAndLabelFieldsSingle", () => {
  it("keeps an identifier and the label to one value", () => {
    const key = _listField({ name: "County", isIdentifier: true });
    const label = _listField({ name: "Name" });

    const fields = keepKeyAndLabelFieldsSingle({
      attributes: [key, label],
      labelAttributeId: label.id,
    });

    expect(
      fields.map((field) => {
        return field.isArray;
      }),
    ).toEqual([false, false]);
  });

  it("leaves any other field keeping every value", () => {
    const symptoms = _listField({ name: "Symptoms" });

    const fields = keepKeyAndLabelFieldsSingle({
      attributes: [symptoms],
      labelAttributeId: undefined,
    });

    expect(fields[0]?.isArray).toBe(true);
  });
});
