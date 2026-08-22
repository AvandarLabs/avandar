import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef.types.ts";

import { match } from "ts-pattern";

/**
 * Matches a bare UUID, case-insensitively. Case is never normalized: a
 * dataset's table name is stored verbatim in existing SQL, so recognizing an
 * uppercase UUID must not change what string comes back out. The version and
 * variant nibbles are deliberately unchecked: both id producers (the id
 * generator and Postgres) emit v4 UUIDs, and this pattern only needs to tell
 * a UUID-shaped name apart from a prefixed one, not validate RFC 4122
 * conformance. Do not tighten it, or it will start rejecting legitimate ids.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The table-name prefix for each relation kind. A dataset's prefix is the
 * empty string, by design: its table name is its bare id.
 *
 * This is the single source of truth for both directions of conversion. When
 * a new kind is added here, `_PREFIX_ENTRIES` below picks it up automatically
 * and `toTableName`'s `.exhaustive()` forces that call site to handle it too,
 * so one edit fails to compile until both directions are updated.
 *
 * Constraint on future prefixes: none may be a string-prefix of another
 * (e.g. adding `concept_archived_` alongside `concept_`) or of a bare UUID.
 * That hazard is structurally eliminated below by always testing the
 * longest prefix first: a more specific prefix is checked, and can match,
 * before a shorter prefix that it happens to start with. It is not merely a
 * rule to remember.
 */
const TABLE_NAME_PREFIX_BY_KIND: Record<RelationRefT["kind"], string> = {
  dataset: "",
  concept: "concept_",
};

// Sorted longest-prefix-first, computed once. See the constraint note above:
// this ordering is what makes the empty dataset prefix a fallback rather
// than a candidate that could swallow a differently-prefixed name.
const _PREFIX_ENTRIES: ReadonlyArray<[RelationRefT["kind"], string]> =
  Object.entries(TABLE_NAME_PREFIX_BY_KIND)
    .sort(([, prefixA], [, prefixB]) => {
      return prefixB.length - prefixA.length;
    })
    .map(([kind, prefix]) => {
      return [kind as RelationRefT["kind"], prefix];
    });

function _isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export const RelationRefModule = {
  /**
   * Converts a relation reference to the DuckDB table name it is queried
   * through. A dataset's table name is always its bare id, unprefixed, so
   * that stored SQL and bookmarked query URLs keep working unchanged; every
   * other kind gets a kind-specific prefix ahead of its id.
   */
  toTableName(ref: RelationRefT): string {
    return match(ref)
      .with({ kind: "dataset" }, (datasetRef) => {
        return `${TABLE_NAME_PREFIX_BY_KIND.dataset}${datasetRef.id}`;
      })
      .with({ kind: "concept" }, (conceptRef) => {
        return `${TABLE_NAME_PREFIX_BY_KIND.concept}${conceptRef.id}`;
      })
      .exhaustive();
  },

  /**
   * Recovers a relation reference from a DuckDB table name, or returns
   * undefined when the name matches no known relation kind. A bare UUID is
   * always read back as a dataset, which is what keeps the scheme backwards
   * compatible with every table name that predates the relation registry:
   * only kinds introduced after datasets carry a prefix. Every live kind is
   * tried, longest prefix first, from the same `TABLE_NAME_PREFIX_BY_KIND`
   * that `toTableName` uses, so the two directions cannot drift apart.
   */
  fromTableName(tableName: string): RelationRefT | undefined {
    for (const [kind, prefix] of _PREFIX_ENTRIES) {
      if (tableName.startsWith(prefix)) {
        const id = tableName.slice(prefix.length);
        return _isUuid(id) ? ({ kind, id } as RelationRefT) : undefined;
      }
    }

    return undefined;
  },

  /**
   * Whether `value` is a bare UUID, case-insensitively. The same test
   * `fromTableName` uses to tell a UUID-shaped id apart from a prefixed
   * name, exposed so a caller that needs to validate a UUID-shaped
   * component before embedding it in a delimited string (for example a
   * cache principal key) has one definition to reuse rather than a second
   * copy that could drift from this one.
   */
  isUuid: _isUuid,
};
