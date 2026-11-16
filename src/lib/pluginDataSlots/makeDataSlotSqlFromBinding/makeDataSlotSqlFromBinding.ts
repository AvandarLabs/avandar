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

/** Rows `querySlot` returns at most. It queries one more to set isTruncated. */
export const QUERY_SLOT_MAX_ROWS = 200_000;

/**
 * The SQL type of the NULL an unmapped optional attribute is selected as, so
 * a slot's result has the same column types whatever is mapped.
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

/**
 * Makes the SQL that reads a bound data slot: one column per slot attribute,
 * in manifest order, named by the attribute key, from the case type's view or
 * the dataset's relation. An unmapped optional attribute is a typed NULL, so
 * the plugin sees the same columns for every binding and never a workspace
 * field name.
 *
 * Use it wherever a slot's records are read, for example a command's
 * `querySlot` or the binding check in Settings.
 */
export function makeDataSlotSqlFromBinding(
  options: Readonly<{
    slot: PluginDataSlot;
    source: DataSlotSource;
    fieldsByAttributeKey: Readonly<
      Record<string, DataSlotSourceField | undefined>
    >;
    limit?: number;
  }>,
): string {
  const { slot, source, fieldsByAttributeKey, limit } = options;
  const selectList = Object.entries(slot.attributes).map(
    ([attributeKey, attribute]) => {
      const field = fieldsByAttributeKey[attributeKey];
      const expression =
        field === undefined
          ? `CAST(NULL AS ${NULL_SQL_TYPE_BY_ATTRIBUTE_TYPE[attribute.type]})`
          : quoteSqlIdentifier(field.columnName);
      return `${expression} AS ${quoteSqlIdentifier(attributeKey)}`;
    },
  );
  const fromClause = `FROM ${quoteSqlIdentifier(_getTableNameFromSource(source))}`;
  const limitClause = limit === undefined ? "" : `\nLIMIT ${limit}`;
  return `SELECT ${selectList.join(", ")}\n${fromClause}${limitClause}`;
}
