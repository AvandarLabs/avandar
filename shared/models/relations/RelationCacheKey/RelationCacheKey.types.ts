import type { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

/**
 * Which principal a cached relation belongs to. Never optional: a workspace
 * session and a public session are two distinct, always-present forms
 * (`w:<workspaceId>:<userId>` and
 * `p:<bucket>:<dashboardId>:<snapshotRevision>`), so there is no
 * representable "no principal" that could accidentally match across
 * sessions.
 */
export type PrincipalKey = string;

/**
 * The definition that produced a relation's bytes. Opaque text, hashed by the
 * cache and never parsed by it.
 */
export type LogicalDefinition = {
  /** Discriminates the shape of `text`, for logs and for review. */
  kind: string;
  /** Canonical, verbatim. Never normalized: reformatting invalidates. */
  text: string;
};

/** The parts of a cache key that must match exactly, by equality. */
export type RelationCacheIdentity = {
  principal: PrincipalKey;
  relation: RelationRef.T;
  definition: LogicalDefinition | undefined;
  /** Recorded for invalidation and audit; never matched at lookup. */
  sourceVersion: SourceVersion | undefined;
};

/** A full cache key: an exact identity plus the columns a query needs. */
export type RelationCacheKey = RelationCacheIdentity & {
  /** Sorted, deduplicated, case-preserved. `"all"` means every column. */
  columns: readonly string[] | "all";
};

/**
 * The cache-entry fields the reuse predicate (`serves`) reads, and nothing
 * else. Kept separate from a storage row's full shape so this module has no
 * dependency on where an entry is persisted.
 */
export type RelationCacheEntryFields = {
  principalKey: PrincipalKey;
  tableName: string;
  definitionToken: string;
  /** Sorted, deduplicated column names, or `"all"`. */
  columns: readonly string[] | "all";
  /** When set, the entry is never served. */
  staleAt: number | undefined;
};
