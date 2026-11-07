import { describe, expect, it, vi } from "vitest";
import { createDefaultRegistry } from "@/clients/qetl/wrappers/createDefaultRegistry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";

const DATASET_REF = {
  kind: "dataset",
  id: "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6" as Dataset.Id,
} satisfies RelationRef.T;

const CONCEPT_REF = {
  kind: "concept",
  id: "9a8b7c6d-2222-4333-8444-f6e5d4c3b2a1" as Concept.Id,
} satisfies RelationRef.T;

function _createRegistry() {
  return createDefaultRegistry({
    runParquetQuery: vi.fn(),
  });
}

describe("createDefaultRegistry", () => {
  // This is the test that matters most in this file. The registry validates at
  // construction and throws when a wrapper declares a capability it does not
  // implement, so assembling the real wrapper set is the only thing that
  // proves the declarations and the implementations agree. Every wrapper's own
  // suite passed while this combination threw.
  it("assembles the real wrapper set without violating an invariant", () => {
    expect(_createRegistry).not.toThrow();
  });

  it("resolves a dataset relation to the dataset wrapper", () => {
    const wrapper = _createRegistry().resolve(DATASET_REF);

    expect(wrapper?.name).toBe("dataset");
  });

  // A concept is planned and built inside the query's lease, never acquired,
  // so no wrapper claims it.
  it("leaves a concept relation to the concept planner", () => {
    expect(_createRegistry().resolve(CONCEPT_REF)).toBeUndefined();
  });

  it("registers only the dataset wrapper", () => {
    const names = _createRegistry()
      .wrappers()
      .map((wrapper) => {
        return wrapper.name;
      });

    expect(names).toEqual(["dataset"]);
  });

  // The dataset composite acquires, because all of its source types are
  // acquire-only.
  it("declares acquisition for datasets", () => {
    const dataset = _createRegistry().resolve(DATASET_REF);

    expect(dataset?.acquire).toBeInstanceOf(Function);
    expect(dataset?.pushDown).toBeUndefined();
  });

  it("partitions a mixed batch, leaving the concept unresolved", () => {
    const { resolved, unresolved } = _createRegistry().resolveAll([
      DATASET_REF,
      CONCEPT_REF,
    ]);

    const names = resolved.map((relation) => {
      return relation.wrapper.name;
    });

    expect(names).toEqual(["dataset"]);
    expect(unresolved).toEqual([CONCEPT_REF]);
  });
});
