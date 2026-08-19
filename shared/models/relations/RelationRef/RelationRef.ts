/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef.types.ts";

export { RelationRefModule as RelationRef } from "$/models/relations/RelationRef/RelationRefModule.ts";

export namespace RelationRef {
  /**
   * Anything the query engine can treat as a queryable relation: a dataset
   * or an ontology concept today, with more kinds to come. `kind` is the
   * discriminant every downstream consumer (the registry, wrappers, the
   * cache key, authorization checks) switches on.
   */
  export type T = RelationRefT;
}
