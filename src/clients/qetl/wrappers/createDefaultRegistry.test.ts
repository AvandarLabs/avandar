import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";

import { describe, expect, it, vi } from "vitest";

import { createDefaultRegistry } from "@/clients/qetl/wrappers/createDefaultRegistry";

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

  it("resolves a concept relation to the concept wrapper", () => {
    const wrapper = _createRegistry().resolve(CONCEPT_REF);

    expect(wrapper?.name).toBe("concept");
  });

  it("registers exactly one wrapper per relation kind", () => {
    const names = _createRegistry()
      .wrappers()
      .map((wrapper) => {
        return wrapper.name;
      });

    expect(names).toEqual(["dataset", "concept"]);
  });

  // The dataset composite acquires, because all five of its source types are
  // acquire-only. The concept wrapper pushes down instead, so the mediator can
  // never choose an acquisition path a concept does not implement.
  it("declares acquisition for datasets and pushdown for concepts", () => {
    const registry = _createRegistry();
    const dataset = registry.resolve(DATASET_REF);
    const concept = registry.resolve(CONCEPT_REF);

    expect(dataset?.acquire).toBeInstanceOf(Function);
    expect(dataset?.pushDown).toBeUndefined();
    expect(concept?.pushDown).toBeInstanceOf(Function);
    expect(concept?.acquire).toBeUndefined();
  });

  it("partitions a mixed batch with no unresolved refs", () => {
    const { resolved, unresolved } = _createRegistry().resolveAll([
      DATASET_REF,
      CONCEPT_REF,
    ]);

    const names = resolved.map((relation) => {
      return relation.wrapper.name;
    });

    expect(names).toEqual(["dataset", "concept"]);
    expect(unresolved).toEqual([]);
  });
});
