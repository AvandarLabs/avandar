import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { toCsvColumn } from "@/clients/qetl/QueryMediator/conceptRelation/toCsvColumn";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { ConceptRelationRef } from "$/models/relations/RelationRef/RelationRef.types";

/**
 * The spine table's name suffix, and the one column it carries.
 *
 * `concept_<id>__individuals` deliberately keeps the `concept_` prefix:
 * `RelationRef.fromTableName` strips that prefix and then tests
 * `<id>__individuals` for UUID shape, which fails, so the spine resolves to
 * `undefined` rather than to the concept it belongs to. A name that resolved to
 * a relation would make the SQL analyzer treat the spine as a queryable
 * relation and try to load it.
 */
const SPINE_TABLE_SUFFIX = "__individuals";
const SPINE_KEY_COLUMN = "external_id";

/** Names the spine table that holds one concept's authoritative rows. */
export function getConceptSpineTableNameFromRef(
  ref: Readonly<ConceptRelationRef>,
): string {
  return `${RelationRef.toTableName(ref)}${SPINE_TABLE_SUFFIX}`;
}

/**
 * Rejects an `external_id` that cannot survive the trip into DuckDB.
 *
 * This obligation belongs here and nowhere else. `toCsvColumn` quotes an empty
 * field as `""`, which keeps the row, but DuckDB's CSV reader maps a quoted
 * empty field to NULL, so an empty id arrives as a NULL key that matches no
 * contributing dataset row: the individual survives with every attribute NULL,
 * which reads as "we know nothing about them" rather than as the data error it
 * is. The CSV writer cannot fix that, because it does not know what the column
 * means; `toCsvColumn`'s tests assert the limitation deliberately.
 *
 * Loud rather than skipped, because dropping the row would change the
 * relation's grain silently and quietly disagree with `individuals`, whose
 * `external_id` is `not null` in Postgres and therefore should never be empty
 * in the first place.
 */
function _assertExternalIdsLoadable(
  options: Readonly<{
    externalIds: readonly string[];
    ref: ConceptRelationRef;
  }>,
): void {
  const emptyIdCount = options.externalIds.filter((externalId) => {
    return externalId === "";
  }).length;
  if (emptyIdCount > 0) {
    throw new Error(
      `Concept '${options.ref.id}' has ${emptyIdCount} individual(s) with an ` +
        `empty external_id, which cannot be matched to any dataset row. Fix ` +
        `the individuals rather than querying the concept.`,
    );
  }
}

/**
 * Creates an empty spine, for a concept that has no individuals yet.
 *
 * A separate path because `loadCsv` throws on a file with zero rows, by design:
 * for a dataset, zero rows means the sniff got the dialect wrong. For a concept
 * it means nobody has generated individuals, which is an ordinary state and
 * must answer with an empty relation rather than fail the query.
 *
 * The drop goes through `dropTableViewAndFile` rather than a bare `CREATE OR
 * REPLACE`, because a previous non-empty load left a *view* over a registered
 * parquet file behind, and `CREATE OR REPLACE TABLE` over an existing view is
 * an error in DuckDB.
 */
async function _createEmptyConceptSpine(
  options: Readonly<{
    spineTableName: string;
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<void> {
  await DuckDbClient.dropTableViewAndFile({
    tableOrViewName: options.spineTableName,
    datasetDuckDbLease: options.datasetDuckDbLease,
  });
  await DuckDbClient.runRawQuery(
    `CREATE TABLE ${quoteSqlIdentifier(options.spineTableName)} ` +
      `(${quoteSqlIdentifier(SPINE_KEY_COLUMN)} VARCHAR)`,
    { datasetDuckDbLease: options.datasetDuckDbLease },
  );
}

/**
 * Loads one concept's authoritative rows into DuckDB as its relation's spine.
 *
 * The spine is what makes the concept relation's grain one row per individual:
 * the view's `FROM` is this table alone and every attribute is a correlated
 * scalar subquery, so nothing downstream can multiply or drop a row. Postgres
 * already guarantees the grain through `unique (concept_id, external_id)` on
 * `individuals`, and this path neither de-duplicates nor filters, so the
 * guarantee carries through.
 *
 * The rows travel as CSV text rather than as a `VALUES` list because
 * `external_id` is user data: inlining it would mean escaping user text into
 * SQL, duplicating the one injection surface the codebase already has
 * (`AttributeAssertionClient`'s `WHERE "<pk>" = '<externalId>'`).
 *
 * The key column is pinned to `VARCHAR` rather than sniffed, because
 * `individuals.external_id` is `text` in Postgres and a sniffed type would vary
 * with the data: all-numeric ids would arrive as `BIGINT` on one concept and as
 * `VARCHAR` on the next. Every comparison against a dataset's key column casts
 * both sides to text (`getEntityKeyComparisonSql`), so a pinned `VARCHAR` is
 * the type that makes those comparisons mean what Postgres means.
 *
 * **The caller must hold a lease covering the spine table's name**, not just
 * the contributing datasets': `loadCsv` coordinates on the table name it is
 * given. `createQetlQueryRunner` adds the planned spines' names to the lease it
 * takes; a nested virtual-dataset query that names a concept the outer query
 * does not will fail loudly on an insufficient lease rather than corrupt
 * anything.
 *
 * Reloading the whole spine on every query is right at demo scale (thousands of
 * individuals) and becomes the dominant cost in the tens of thousands. Caching
 * it belongs to the relation cache, keyed on the concept plus the
 * `modified-time` freshness signal `ConceptWrapper` already declares.
 */
export async function loadConceptSpine(
  options: Readonly<{
    ref: ConceptRelationRef;
    externalIds: readonly string[];
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<string> {
  _assertExternalIdsLoadable(options);
  const spineTableName = getConceptSpineTableNameFromRef(options.ref);

  if (options.externalIds.length === 0) {
    await _createEmptyConceptSpine({
      spineTableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
    return spineTableName;
  }

  await DuckDbClient.loadCsv({
    tableName: spineTableName,
    fileText: toCsvColumn(SPINE_KEY_COLUMN, options.externalIds),
    columns: [[SPINE_KEY_COLUMN, "VARCHAR"]],
    datasetDuckDbLease: options.datasetDuckDbLease,
  });
  return spineTableName;
}
