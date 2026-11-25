import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type {
  DataSlotAttributeType,
  PluginDataSlot,
} from "@avandar/plugin-manifest/runtime";

/**
 * Rows `querySlot` returns at most. A caller that wants to detect truncation
 * passes `QUERY_SLOT_MAX_ROWS + 1` as the `limit` and compares the number of
 * rows it gets back with `QUERY_SLOT_MAX_ROWS`.
 */
export const QUERY_SLOT_MAX_ROWS = 200_000;

/**
 * The SQL type of the NULL an unmapped optional attribute is selected as. A
 * mapped attribute is not cast: it keeps its source column's own type.
 */
const NULL_SQL_TYPE_BY_ATTRIBUTE_TYPE: Readonly<
  Record<DataSlotAttributeType, string>
> = {
  number: "DOUBLE",
  date: "DATE",
  text: "VARCHAR",
  boolean: "BOOLEAN",
  "geo.admin1": "VARCHAR",
  "geo.admin2": "VARCHAR",
};

function _getTableNameFromSource(source: DataSlotSource): string {
  return source.kind === "concept"
    ? RelationRef.toTableName({ kind: "concept", id: source.conceptId })
    : RelationRef.toTableName({ kind: "dataset", id: source.datasetId });
}

/** How the SQL names each attribute's output column. */
type DataSlotColumnAliasStyle = "attributeKey" | "position";

function _getAliasFromAttribute(
  options: Readonly<{
    attributeKey: string;
    index: number;
    aliasStyle: DataSlotColumnAliasStyle;
  }>,
): string {
  return options.aliasStyle === "position"
    ? `attr_${options.index}`
    : options.attributeKey;
}

/**
 * Makes the SQL that reads a bound data slot: one column per slot attribute,
 * in manifest order, from the case type's view or the dataset's relation.
 * Output columns are named by the attribute key, so a plugin sees the same
 * column names for every binding and never a workspace field name. An
 * unmapped optional attribute is a typed NULL. A mapped attribute keeps its
 * source column's own type, for example a BIGINT stays a BIGINT.
 *
 * Use it wherever a slot's records are read, for example a command's
 * `querySlot` or the binding check in Settings.
 *
 * - `limit`: must be a non-negative safe integer. To detect truncation, pass
 *   `QUERY_SLOT_MAX_ROWS + 1` and compare the returned row count.
 * - `aliasStyle`: `"position"` names the columns `attr_0`, `attr_1`, ...
 *   instead of by attribute key. Use it when the SQL is wrapped by a query
 *   that refers to the columns, because DuckDB ignores identifier case and
 *   so would bind `foo` to a `Foo` column.
 */
export function makeDataSlotSqlFromBinding(
  options: Readonly<{
    slot: PluginDataSlot;
    source: DataSlotSource;
    fieldsByAttributeKey: Readonly<
      Record<string, DataSlotSourceField | undefined>
    >;
    limit?: number;
    aliasStyle?: DataSlotColumnAliasStyle;
  }>,
): string {
  const {
    slot,
    source,
    fieldsByAttributeKey,
    limit,
    aliasStyle = "attributeKey",
  } = options;
  if (limit !== undefined && !(Number.isSafeInteger(limit) && limit >= 0)) {
    throw new Error(
      `A data slot query limit must be a non-negative integer, got ${limit}`,
    );
  }
  const selectList = Object.entries(slot.attributes).map(
    ([attributeKey, attribute], index) => {
      const field = fieldsByAttributeKey[attributeKey];
      const expression =
        field === undefined
          ? `CAST(NULL AS ${NULL_SQL_TYPE_BY_ATTRIBUTE_TYPE[attribute.type]})`
          : quoteSqlIdentifier(field.columnName);
      const alias = _getAliasFromAttribute({ attributeKey, index, aliasStyle });
      return `${expression} AS ${quoteSqlIdentifier(alias)}`;
    },
  );
  const fromClause = `FROM ${quoteSqlIdentifier(_getTableNameFromSource(source))}`;
  const limitClause = limit === undefined ? "" : `\nLIMIT ${limit}`;
  return `SELECT ${selectList.join(", ")}\n${fromClause}${limitClause}`;
}
