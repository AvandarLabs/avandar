import { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import { describe, expect, it } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";

const DATASET_ID = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6" as Dataset.Id;
const CONCEPT_ID = "9a8b7c6d-2222-4333-8444-f6e5d4c3b2a1" as Concept.Id;

describe("RelationRef", () => {
  it("keeps a dataset's table name as its bare id, so stored SQL keeps working", () => {
    expect(RelationRef.toTableName({ kind: "dataset", id: DATASET_ID })).toBe(
      DATASET_ID,
    );
  });

  it("reads a bare uuid back as a dataset", () => {
    expect(RelationRef.fromTableName(DATASET_ID)).toEqual({
      kind: "dataset",
      id: DATASET_ID,
    });
  });

  it("round-trips a concept through a prefixed table name", () => {
    const ref = { kind: "concept", id: CONCEPT_ID } as const;
    const tableName = RelationRef.toTableName(ref);

    expect(tableName).toBe(`concept_${CONCEPT_ID}`);
    expect(RelationRef.fromTableName(tableName)).toEqual(ref);
  });

  it("returns undefined for a name it does not own", () => {
    expect(RelationRef.fromTableName("not_a_relation")).toBeUndefined();
    expect(RelationRef.fromTableName("concept_nope")).toBeUndefined();
  });

  it("treats two refs of different kinds with the same uuid as distinct", () => {
    const asDataset = RelationRef.toTableName({
      kind: "dataset",
      id: DATASET_ID,
    });
    const asConcept = RelationRef.toTableName({
      kind: "concept",
      id: DATASET_ID as unknown as Concept.Id,
    });

    expect(asDataset).not.toBe(asConcept);
  });

  it("recognises an uppercase uuid as a dataset without changing its case", () => {
    const uppercaseId = DATASET_ID.toUpperCase() as Dataset.Id;

    expect(RelationRef.fromTableName(uppercaseId)).toEqual({
      kind: "dataset",
      id: uppercaseId,
    });
  });

  it("returns undefined for an empty string", () => {
    expect(RelationRef.fromTableName("")).toBeUndefined();
  });

  it("recognises an uppercase uuid as a concept without changing its case", () => {
    const uppercaseId = CONCEPT_ID.toUpperCase() as Concept.Id;
    const tableName = `concept_${uppercaseId}`;

    expect(RelationRef.fromTableName(tableName)).toEqual({
      kind: "concept",
      id: uppercaseId,
    });
  });

  it("returns undefined for a doubly-prefixed name, rather than stripping only the outer prefix", () => {
    expect(
      RelationRef.fromTableName(`concept_concept_${CONCEPT_ID}`),
    ).toBeUndefined();
  });
});
