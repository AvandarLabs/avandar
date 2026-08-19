import { quoteSqlIdentifier } from "@avandar/utils/sql";
import {
  getEntityKeyComparisonSql,
  getRowNumberedViewName,
} from "@/clients/DuckDbClient/duckDbSqlText";
import { getSQLSelectOfMapping } from "@/clients/ontology/AttributeAssertionClient/getAttributeAssertions/getSQLSelectOfMapping";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";

/** The spine's alias inside the view, and the column it exposes. */
const SPINE_ALIAS = "individuals";
const EXTERNAL_ID_COLUMN = "external_id";

/** One column of the concept relation, already resolved to what it reads. */
export type ConceptAttributeColumn =
  | {
      kind: "dataset_column";
      /** The relation's column name, which is the attribute's name. */
      attributeName: string;
      /** The contributing dataset's column this attribute reads. */
      selectColumnName: string;
      datasetId: string;
      /** The dataset column mapped to the concept's identifier attribute. */
      primaryKeyColumnName: string;
      valuePickerRuleType: DatasetColumnMapping["valuePickerRuleType"];
      isArray: boolean;
    }
  | {
      /**
       * An attribute with no dataset contribution to read, which today means a
       * manual-entry mapping. It becomes a typed NULL so the relation's schema
       * is stable whether or not a value exists, rather than the column
       * vanishing and breaking a saved query.
       */
      kind: "unmapped";
      attributeName: string;
      duckDbDataType: DuckDbDataType;
    };

/**
 * Builds the `CREATE OR REPLACE VIEW` that makes one concept a queryable
 * relation.
 *
 * Three properties of the emitted shape are load-bearing:
 *
 * 1. **The `FROM` is the spine alone.** Every attribute is a correlated scalar
 *    subquery, so no join can multiply rows and the grain is the spine's grain
 *    by construction. This is what fixes today's implementation, which
 *    concatenates one row set per contributing dataset and therefore emits an
 *    individual twice when two datasets contribute to it.
 * 2. **A missing contribution is a NULL, not a lost row.** A scalar subquery
 *    with no matching rows returns NULL, which is `LEFT JOIN` semantics without
 *    a `LEFT JOIN`. An individual no dataset contributes to still appears.
 * 3. **Columns are emitted in a stable order**, sorted by attribute name, so
 *    two runs over unchanged metadata produce byte-identical SQL. That is what
 *    lets the definition be hashed into a cache key later.
 *
 * A view rather than a materialized table, deliberately: a view is a
 * definition, so rebuilding it is nearly free and invalidation disappears
 * instead of needing a freshness rule of its own.
 */
export function buildConceptViewSql(
  options: Readonly<{
    viewName: string;
    spineTableName: string;
    attributeColumns: readonly ConceptAttributeColumn[];
  }>,
): string {
  const orderedColumns = [...options.attributeColumns].sort((left, right) => {
    return left.attributeName.localeCompare(right.attributeName);
  });

  const selectors = [
    // The spine's key is exposed as a column because it is the join key two
    // concepts share when their identifier attributes are named differently,
    // which the joined-concepts criterion needs.
    `${SPINE_ALIAS}.${quoteSqlIdentifier(EXTERNAL_ID_COLUMN)} AS ${quoteSqlIdentifier(EXTERNAL_ID_COLUMN)}`,
    ...orderedColumns
      .filter((column) => {
        // An attribute already named `external_id` would collide with the key
        // column above. The key wins, because a join depends on it.
        return column.attributeName !== EXTERNAL_ID_COLUMN;
      })
      .map(_buildColumnSelector),
  ];

  return `CREATE OR REPLACE VIEW ${quoteSqlIdentifier(options.viewName)} AS
SELECT
${selectors.join(",\n")}
FROM ${quoteSqlIdentifier(options.spineTableName)} ${SPINE_ALIAS}`;
}

function _buildColumnSelector(column: ConceptAttributeColumn): string {
  if (column.kind === "unmapped") {
    return `CAST(NULL AS ${column.duckDbDataType}) AS ${quoteSqlIdentifier(column.attributeName)}`;
  }

  return column.isArray ?
      _buildArraySelector(column)
    : getSQLSelectOfMapping({
        selectColumnName: column.selectColumnName,
        primaryKeyColumnName: column.primaryKeyColumnName,
        datasetId: column.datasetId,
        ruleType: column.valuePickerRuleType,
        outputColumnName: column.attributeName,
        externalIdsTable: SPINE_ALIAS,
        externalIdColumn: EXTERNAL_ID_COLUMN,
      });
}

/**
 * Collects every contributed value for an array-valued attribute.
 *
 * Ordered by `file_row_number` rather than left unordered, so an array is
 * deterministic by exactly the argument that makes `first` deterministic: the
 * row order within a file is stable, and `list()` without an `ORDER BY` would
 * reorder under parallel scans. A rule that is deterministic only by luck is
 * not deterministic.
 *
 * `COALESCE` to an empty list because `list()` over zero rows returns NULL, and
 * "this individual contributed no values" is better expressed as an empty array
 * than as a NULL that reads like "unknown". The value pickers do not apply:
 * all seven collapse many values to one, and an array attribute keeps them.
 */
function _buildArraySelector(
  column: Extract<ConceptAttributeColumn, { kind: "dataset_column" }>,
): string {
  const rowsView = quoteSqlIdentifier(getRowNumberedViewName(column.datasetId));
  const valueColumn = quoteSqlIdentifier(column.selectColumnName);
  // The same text comparison every value-picker rule uses, for the same
  // reason: the spine's key is Postgres `text` and the dataset's key column is
  // whatever its parquet file says.
  const keyComparison = getEntityKeyComparisonSql({
    externalIdsTable: SPINE_ALIAS,
    externalIdColumn: EXTERNAL_ID_COLUMN,
    primaryKeyColumnName: column.primaryKeyColumnName,
  });

  return `
        -- Collect every contributed value, in a deterministic order
        (
          SELECT COALESCE(list(dataset.${valueColumn} ORDER BY dataset.file_row_number), [])
          FROM ${rowsView} dataset
          WHERE ${keyComparison}
        ) AS ${quoteSqlIdentifier(column.attributeName)}
      `;
}
