import type { QueryFilterNodeId } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/** Generates a new filter-node id. */
export function makeQueryFilterNodeId(): QueryFilterNodeId {
  return crypto.randomUUID();
}
