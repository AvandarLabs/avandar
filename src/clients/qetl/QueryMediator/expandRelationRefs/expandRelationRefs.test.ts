import { describe, expect, it } from "vitest";
import { expandRelationRefs } from "@/clients/qetl/QueryMediator/expandRelationRefs/expandRelationRefs";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";

const DATASET_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const DATASET_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb" as Dataset.Id;
const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;

/** A plan carrying only the fields expansion reads. */
function _plan(
  options: Readonly<{
    conceptId: Concept.Id;
    contributingDatasetIds: readonly Dataset.Id[];
  }>,
): ConceptRelationPlan {
  return {
    ref: { kind: "concept", id: options.conceptId },
    contributingDatasetIds: [...options.contributingDatasetIds],
    externalIds: [],
    attributeColumns: [],
  };
}

describe("expandRelationRefs", () => {
  it("leaves a dataset reference as itself", () => {
    const expanded = expandRelationRefs({
      refs: [{ kind: "dataset", id: DATASET_A }],
      conceptRelations: [],
    });

    expect(expanded).toEqual([{ kind: "dataset", id: DATASET_A }]);
  });

  // Without this the datasets the concept's view reads are never loaded, so the
  // view binds against nothing.
  it("expands a concept to itself plus every contributing dataset", () => {
    const expanded = expandRelationRefs({
      refs: [{ kind: "concept", id: CONCEPT_ID }],
      conceptRelations: [
        _plan({
          conceptId: CONCEPT_ID,
          contributingDatasetIds: [DATASET_B, DATASET_A],
        }),
      ],
    });

    expect(expanded).toEqual([
      { kind: "concept", id: CONCEPT_ID },
      { kind: "dataset", id: DATASET_A },
      { kind: "dataset", id: DATASET_B },
    ]);
  });

  // The relation cache hashes this list, so a key that varied with reference
  // order would miss on every reordering of the same query.
  it("returns the same list whatever order the references arrive in", () => {
    const plans = [
      _plan({ conceptId: CONCEPT_ID, contributingDatasetIds: [DATASET_A] }),
    ];
    const forward = expandRelationRefs({
      refs: [
        { kind: "dataset", id: DATASET_B },
        { kind: "concept", id: CONCEPT_ID },
      ],
      conceptRelations: plans,
    });
    const reversed = expandRelationRefs({
      refs: [
        { kind: "concept", id: CONCEPT_ID },
        { kind: "dataset", id: DATASET_B },
      ],
      conceptRelations: plans,
    });

    expect(forward).toEqual(reversed);
  });

  it("de-duplicates a dataset that is both named and contributed", () => {
    const expanded = expandRelationRefs({
      refs: [
        { kind: "dataset", id: DATASET_A },
        { kind: "concept", id: CONCEPT_ID },
      ],
      conceptRelations: [
        _plan({ conceptId: CONCEPT_ID, contributingDatasetIds: [DATASET_A] }),
      ],
    });

    expect(expanded).toEqual([
      { kind: "concept", id: CONCEPT_ID },
      { kind: "dataset", id: DATASET_A },
    ]);
  });

  // A dataset and a concept may carry the same uuid, and only the table name
  // tells them apart, so de-duplication must not collapse them.
  it("keeps a dataset and a concept that share a uuid apart", () => {
    const sharedId = DATASET_A as string;
    const expanded = expandRelationRefs({
      refs: [
        { kind: "dataset", id: sharedId as Dataset.Id },
        { kind: "concept", id: sharedId as Concept.Id },
      ],
      conceptRelations: [],
    });

    expect(expanded).toHaveLength(2);
  });
});
