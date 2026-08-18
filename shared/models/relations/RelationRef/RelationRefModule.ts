import { match } from "ts-pattern";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef.types.ts";

/**
 * Matches a bare UUID, case-insensitively. Case is never normalized: a
 * dataset's table name is stored verbatim in existing SQL, so recognizing an
 * uppercase UUID must not change what string comes back out.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Prefix that marks a table name as belonging to a concept. */
const CONCEPT_TABLE_NAME_PREFIX = "concept_";

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
        return datasetRef.id;
      })
      .with({ kind: "concept" }, (conceptRef) => {
        return `${CONCEPT_TABLE_NAME_PREFIX}${conceptRef.id}`;
      })
      .exhaustive();
  },

  /**
   * Recovers a relation reference from a DuckDB table name, or returns
   * undefined when the name matches no known relation kind. A bare UUID is
   * always read back as a dataset, which is what keeps the scheme backwards
   * compatible with every table name that predates the relation registry:
   * only kinds introduced after datasets carry a prefix.
   */
  fromTableName(tableName: string): RelationRefT | undefined {
    if (tableName.startsWith(CONCEPT_TABLE_NAME_PREFIX)) {
      const id = tableName.slice(CONCEPT_TABLE_NAME_PREFIX.length);
      return _isUuid(id) ?
          { kind: "concept", id: id as Concept.Id }
        : undefined;
    }

    return _isUuid(tableName) ?
        { kind: "dataset", id: tableName as Dataset.Id }
      : undefined;
  },
};
