import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
import { buildAttributeValueSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/** The spine's alias inside the view, and the columns it exposes. */
const SPINE_ALIAS = "individuals";
/** The view's record key column, read from the spine. */
export const EXTERNAL_ID_COLUMN = "external_id";
const STATUS_COLUMN = ConceptStatusColumn.COLUMN_NAME;

/** One column of the concept relation, already resolved to what it reads. */
export type ConceptAttributeColumn =
  | {
      kind: "dataset_column";
      /**
       * The attribute this column holds. It survives a renamed column, so a
       * reader of the view maps a column back to its attribute by this.
       */
      attributeId: ConceptAttribute.Id;
      /** The relation's column name, which is the attribute's name. */
      attributeName: string;
      /** The contributing dataset's column this attribute reads. */
      selectColumnName: string;
      datasetId: string;
      /** The type of the dataset column this attribute reads. */
      columnDataType: AvaDataType.T;
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
      /** The attribute this column holds, as on the other arm. */
      attributeId: ConceptAttribute.Id;
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
 *    by construction. Do not join the datasets instead: a record present in
 *    two datasets would come back once per dataset.
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
    // Every record's status name: the case type's built-in `status` column.
    `${SPINE_ALIAS}.${quoteSqlIdentifier(STATUS_COLUMN)} AS ${quoteSqlIdentifier(STATUS_COLUMN)}`,
    ...orderedColumns
      .filter((column) => {
        // `makeConceptAttributeColumnsFromMetadata` already suffixes an
        // attribute named `external_id` or `status`, so this only guards a
        // caller that builds columns by hand. Such a column would collide with
        // a spine column above, and the spine must win: a join depends on the
        // key, and every case type's status is that column. Column names are
        // case-insensitive in DuckDB, so the comparison is too.
        const lowercasedName = column.attributeName.toLowerCase();
        return (
          lowercasedName !== EXTERNAL_ID_COLUMN &&
          lowercasedName !== STATUS_COLUMN
        );
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

  // Single values and lists alike: one function owns every value rule, so the
  // view and Sync's record name read values the same way.
  return buildAttributeValueSql({
    selectColumnName: column.selectColumnName,
    primaryKeyColumnName: column.primaryKeyColumnName,
    datasetId: column.datasetId,
    columnDataType: column.columnDataType,
    valuePickerRuleType: column.valuePickerRuleType,
    isArray: column.isArray,
    outputColumnName: column.attributeName,
    externalIdsTable: SPINE_ALIAS,
    externalIdColumn: EXTERNAL_ID_COLUMN,
  });
}
