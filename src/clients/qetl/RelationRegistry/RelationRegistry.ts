import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { SourceWrapper } from "$/models/relations/SourceWrapper/SourceWrapper.types";

/**
 * A wrapper for one relation kind, whatever that kind is.
 *
 * `SourceWrapper<T>` is contravariant in its ref parameter, because `describe`,
 * `acquire` and `pushDown` all accept a ref. So a `SourceWrapper<DatasetRef>`
 * is **not** assignable to `SourceWrapper<RelationRef.T>`: a caller holding the
 * general type could pass a concept ref to a wrapper that only handles
 * datasets. That is exactly what the `handles` type guard prevents at runtime,
 * but the parameter type cannot say so.
 *
 * Distributing over the kind union instead gives the honest type: a registered
 * wrapper is a wrapper for *some* kind, not a wrapper for *every* kind. A ref
 * must be narrowed with `handles` before it is passed to a resolved wrapper.
 */
export type AnySourceWrapper = {
  [Kind in RelationRef.T["kind"]]: SourceWrapper<
    Extract<RelationRef.T, { kind: Kind }>
  >;
}[RelationRef.T["kind"]];

/** A ref paired with the wrapper that handles it. */
export type ResolvedRelation = {
  ref: RelationRef.T;
  wrapper: AnySourceWrapper;
};

/** Refs that resolved, and refs that no registered wrapper claimed. */
export type ResolvedRelations = {
  resolved: ResolvedRelation[];
  unresolved: RelationRef.T[];
};

/** Maps a relation reference to the wrapper that knows how to fetch it. */
export type RelationRegistry = {
  /** The wrapper handling `ref`, or undefined when no wrapper claims it. */
  resolve: (ref: RelationRef.T) => AnySourceWrapper | undefined;

  /** Partitions refs into the ones a wrapper claims and the ones none does. */
  resolveAll: (refs: readonly RelationRef.T[]) => ResolvedRelations;

  /** Every registered wrapper, in registration order. */
  wrappers: () => AnySourceWrapper[];
};

/**
 * The wrapper handling `ref`, typed for that ref's own kind.
 *
 * `resolve` can only return `AnySourceWrapper`, a union, because the registry
 * holds wrappers for every kind. A caller that already knows its ref's kind
 * cannot call `acquire` or `describe` on that union: the union's method
 * signatures disagree about which ref they accept. This narrows once, at the
 * one seam where the knowledge exists.
 *
 * The assertion is sound and is the only one in this module: the registry
 * resolved this wrapper by asking the wrapper's own `handles` guard whether it
 * accepts this ref, so the wrapper does accept it. The union type cannot carry
 * the result of that runtime check, which is what this records.
 */
export function getWrapperForRef<TRef extends RelationRef.T>(
  registry: RelationRegistry,
  ref: TRef,
): SourceWrapper<TRef> | undefined {
  return registry.resolve(ref) as SourceWrapper<TRef> | undefined;
}

/**
 * The id every probe ref carries. It never names a real dataset or concept:
 * it exists only so a wrapper's `handles` predicate can be asked which kinds
 * it claims, and no wrapper may inspect a ref's id to answer that.
 */
const _PROBE_ID = "00000000-0000-4000-8000-000000000000";

/**
 * One probe ref per relation kind, used at registration to ask each wrapper
 * which kinds it claims. Being a `Record` keyed by the kind union is what
 * makes this exhaustive: adding a kind to `RelationRef.T` fails to compile
 * here until its probe is added, so the duplicate-kind guard can never
 * silently stop covering a kind.
 *
 * The casts are unavoidable: both id types are branded UUIDs, and a probe id
 * is a literal string rather than an id read out of the database.
 */
const _PROBE_REF_BY_KIND: Record<RelationRef.T["kind"], RelationRef.T> = {
  dataset: { kind: "dataset", id: _PROBE_ID as Dataset.Id },
  concept: { kind: "concept", id: _PROBE_ID as Concept.Id },
};

/**
 * Throws when two wrappers claim the same relation kind, because then which
 * one answers a ref depends on registration order.
 */
function _assertEachKindClaimedOnce(
  wrappers: readonly AnySourceWrapper[],
): void {
  const claimantByKind = new Map<RelationRef.T["kind"], string>();

  wrappers.forEach((wrapper) => {
    Object.values(_PROBE_REF_BY_KIND).forEach((probeRef) => {
      if (!wrapper.handles(probeRef)) {
        return;
      }

      const claimant = claimantByKind.get(probeRef.kind);
      if (claimant !== undefined) {
        throw new Error(
          `Relation kind '${probeRef.kind}' is already registered to ` +
            `wrapper '${claimant}'; wrapper '${wrapper.name}' also claims ` +
            `it, which makes resolution order load-bearing.`,
        );
      }

      claimantByKind.set(probeRef.kind, wrapper.name);
    });
  });
}

/**
 * Throws when a wrapper's capability declaration promises work it has no
 * method to do. `capabilities` and the optional `acquire` / `pushDown`
 * methods are independent fields, so nothing at the type level stops a
 * wrapper declaring pushdown while implementing none. Checking it at
 * registration surfaces that wiring bug once, at startup, instead of once
 * per query.
 */
function _assertCapabilitiesMatchMethods(wrapper: AnySourceWrapper): void {
  const { capabilities, name } = wrapper;

  if (capabilities.predicatePushdown !== "none" && !wrapper.pushDown) {
    throw new Error(
      `Wrapper '${name}' declares predicatePushdown ` +
        `'${capabilities.predicatePushdown}' but implements no pushDown.`,
    );
  }

  if (capabilities.wholeRelationAcquirable !== "no" && !wrapper.acquire) {
    throw new Error(
      `Wrapper '${name}' declares wholeRelationAcquirable ` +
        `'${capabilities.wholeRelationAcquirable}' but implements no acquire.`,
    );
  }
}

/**
 * Builds the single seam that turns a relation reference into the wrapper
 * that can fetch it. Every consumer resolves through here, so adding a
 * relation kind is one registration rather than a new branch in the query
 * path.
 *
 * The wrapper list is injected rather than assembled at module level, so a
 * test can build a registry of one fake wrapper and so nothing constructs a
 * client as an import side effect. Registration order is resolution order:
 * the first wrapper whose `handles` accepts a ref answers for it.
 *
 * A ref that no wrapper claims is a first-class outcome, not a failure:
 * `resolve` returns undefined and `resolveAll` reports it under
 * `unresolved`, so a caller can ask the user for clarification instead of
 * catching an exception. A wrapper that is wired wrong, by contrast, throws
 * here at construction.
 */
export function createRelationRegistry(
  wrappers: readonly AnySourceWrapper[],
): RelationRegistry {
  wrappers.forEach(_assertCapabilitiesMatchMethods);
  _assertEachKindClaimedOnce(wrappers);

  const findWrapper = (ref: RelationRef.T): AnySourceWrapper | undefined => {
    return wrappers.find((wrapper) => {
      return wrapper.handles(ref);
    });
  };

  return {
    resolve: findWrapper,

    resolveAll: (refs) => {
      const resolved: ResolvedRelation[] = [];
      const unresolved: RelationRef.T[] = [];

      refs.forEach((ref) => {
        const wrapper = findWrapper(ref);
        if (wrapper === undefined) {
          unresolved.push(ref);
        } else {
          resolved.push({ ref, wrapper });
        }
      });

      return { resolved, unresolved };
    },

    wrappers: () => {
      return [...wrappers];
    },
  };
}
