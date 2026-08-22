import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { makeRelationRefFromQueryDataSource } from "$/models/relations/RelationRef/makeRelationRefFromQueryDataSource.ts";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { ConceptModel } from "$/models/ontology/Concept/Concept.types.ts";

const DATASET_ID = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6";
const CONCEPT_ID = "9a8b7c6d-2222-4333-8444-f6e5d4c3b2a1";

describe("makeRelationRefFromQueryDataSource", () => {
  it("reads the kind from the model type, not from the id", () => {
    // Both ids are UUIDs, so nothing about the id itself distinguishes the
    // two: only the model type does. A concept whose id happens to look like
    // any other id still has to come back as a concept.
    const concept = Model.make("Concept", {
      id: CONCEPT_ID,
      name: "Household",
    }) as unknown as ConceptModel["Read"];
    const dataset = Model.make("Dataset", {
      id: DATASET_ID,
      name: "Cases",
    }) as unknown as DatasetModel["Read"];

    expect(makeRelationRefFromQueryDataSource(concept)).toEqual({
      kind: "concept",
      id: CONCEPT_ID,
    });
    expect(makeRelationRefFromQueryDataSource(dataset)).toEqual({
      kind: "dataset",
      id: DATASET_ID,
    });
  });

  it("keeps nothing but the kind and the id", () => {
    // The point of the reference: a row's name, workspace and timestamps are
    // dropped here, so nothing downstream can start depending on them.
    const dataset = Model.make("Dataset", {
      id: DATASET_ID,
      name: "Cases",
      workspaceId: "ws_1",
    }) as unknown as DatasetModel["Read"];

    expect(
      Object.keys(makeRelationRefFromQueryDataSource(dataset)).sort(),
    ).toEqual(["id", "kind"]);
  });
});
