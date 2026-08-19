/**
 * Behaviour of the registry as the single resolution seam: which wrapper
 * answers a ref, what happens to a ref no wrapper claims, and which wiring
 * mistakes are rejected at construction.
 */
import { describe, expect, it, vi } from "vitest";
import { createRelationRegistry } from "@/clients/qetl/RelationRegistry/RelationRegistry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { SourceWrapper } from "$/models/relations/SourceWrapper/SourceWrapper.types";

// A source that can neither push down nor be acquired whole, so it needs no
// optional method and the registration invariants have nothing to complain
// about. Each test that exercises an invariant overrides the one field it
// cares about.
const INERT_CAPABILITIES = {
  relations: "single",
  acquisitionUnit: { kind: "whole-relation" },
  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "no",
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: "unbounded",
  freshnessSignal: "none",
  rowIdentity: "positional",
  multiCallAtomicity: true,
  quotaScope: { kind: "none" },
  grantedScope: [],
} satisfies RelationCapabilities;

const DATASET_REF: RelationRef.T = {
  kind: "dataset",
  id: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
};

const CONCEPT_REF: RelationRef.T = {
  kind: "concept",
  id: "22222222-2222-4222-8222-222222222222" as Concept.Id,
};

/**
 * A wrapper claiming exactly one relation kind.
 *
 * Generic over the kind rather than returning the general `SourceWrapper`,
 * because `SourceWrapper` is contravariant in its ref parameter: a wrapper that
 * handles every kind is not a legal registry entry, and a fixture typed that
 * way hid a real variance bug until the production wrappers were assembled.
 */
function _fakeWrapper<Kind extends RelationRef.T["kind"]>(
  kind: Kind,
  overrides: Partial<
    SourceWrapper<Extract<RelationRef.T, { kind: Kind }>>
  > = {},
): SourceWrapper<Extract<RelationRef.T, { kind: Kind }>> {
  return {
    name: `fake-${kind}`,
    capabilities: INERT_CAPABILITIES,
    handles: (ref): ref is Extract<RelationRef.T, { kind: Kind }> => {
      return ref.kind === kind;
    },
    describe: vi.fn(),
    ...overrides,
  };
}

describe("createRelationRegistry", () => {
  it("resolves a ref to the wrapper that handles its kind", () => {
    const registry = createRelationRegistry([
      _fakeWrapper("dataset"),
      _fakeWrapper("concept"),
    ]);

    expect(registry.resolve(CONCEPT_REF)?.name).toBe("fake-concept");
    expect(registry.resolve(DATASET_REF)?.name).toBe("fake-dataset");
  });

  it("returns undefined rather than throwing for an unclaimed ref", () => {
    const registry = createRelationRegistry([_fakeWrapper("dataset")]);

    expect(registry.resolve(CONCEPT_REF)).toBeUndefined();
  });

  it("separates resolved from unresolved so callers can ask for clarification", () => {
    const registry = createRelationRegistry([_fakeWrapper("dataset")]);

    const result = registry.resolveAll([DATASET_REF, CONCEPT_REF]);

    expect(result.resolved).toEqual([
      {
        ref: DATASET_REF,
        wrapper: expect.objectContaining({ name: "fake-dataset" }),
      },
    ]);
    expect(result.unresolved).toEqual([CONCEPT_REF]);
  });

  it("pairs every ref with its own wrapper, preserving the order asked for", () => {
    const registry = createRelationRegistry([
      _fakeWrapper("dataset"),
      _fakeWrapper("concept"),
    ]);

    const result = registry.resolveAll([CONCEPT_REF, DATASET_REF, CONCEPT_REF]);

    expect(
      result.resolved.map((relation) => {
        return [relation.ref.kind, relation.wrapper.name];
      }),
    ).toEqual([
      ["concept", "fake-concept"],
      ["dataset", "fake-dataset"],
      ["concept", "fake-concept"],
    ]);
    expect(result.unresolved).toEqual([]);
  });

  it("resolves nothing when the registry holds no wrappers", () => {
    const registry = createRelationRegistry([]);

    const result = registry.resolveAll([DATASET_REF, CONCEPT_REF]);

    expect(result.resolved).toEqual([]);
    expect(result.unresolved).toEqual([DATASET_REF, CONCEPT_REF]);
  });

  it("rejects two wrappers claiming the same kind, which is a wiring bug", () => {
    expect(() => {
      return createRelationRegistry([
        _fakeWrapper("dataset"),
        _fakeWrapper("dataset", { name: "other-dataset-wrapper" }),
      ]);
    }).toThrow(/'dataset' is already registered.*other-dataset-wrapper/s);
  });

  it("exposes every registered wrapper, in registration order", () => {
    const registry = createRelationRegistry([
      _fakeWrapper("concept"),
      _fakeWrapper("dataset"),
    ]);

    expect(
      registry.wrappers().map((wrapper) => {
        return wrapper.name;
      }),
    ).toEqual(["fake-concept", "fake-dataset"]);
  });

  it("rejects a wrapper declaring pushdown it cannot perform", () => {
    expect(() => {
      return createRelationRegistry([
        _fakeWrapper("dataset", {
          capabilities: { ...INERT_CAPABILITIES, predicatePushdown: "full" },
        }),
      ]);
    }).toThrow(/'fake-dataset'.*predicatePushdown.*no pushDown/s);
  });

  it("rejects a wrapper declaring acquirability it cannot perform", () => {
    expect(() => {
      return createRelationRegistry([
        _fakeWrapper("concept", {
          capabilities: {
            ...INERT_CAPABILITIES,
            wholeRelationAcquirable: "probe",
          },
        }),
      ]);
    }).toThrow(/'fake-concept'.*wholeRelationAcquirable.*no acquire/s);
  });

  it("accepts a wrapper whose declarations are backed by methods", () => {
    const registry = createRelationRegistry([
      _fakeWrapper("dataset", {
        capabilities: {
          ...INERT_CAPABILITIES,
          predicatePushdown: "equality",
          wholeRelationAcquirable: "yes",
        },
        acquire: vi.fn(),
        pushDown: vi.fn(),
      }),
    ]);

    expect(registry.resolve(DATASET_REF)?.name).toBe("fake-dataset");
  });
});
