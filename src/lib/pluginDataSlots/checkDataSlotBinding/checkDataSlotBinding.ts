import { isDefined } from "@avandar/utils";
import { makeDataSlotSqlFromBinding } from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import { runDataSlotQuery } from "@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

/** How many of the slot's first rows the check returns. */
const SAMPLE_ROW_COUNT = 5;

/**
 * What a data slot's current mapping reads: how many rows, how many of them
 * have a value for each slot attribute, and the first rows. The binding UI
 * shows it so an admin can tell the mapping reads what they meant.
 *
 * "Filled" means not NULL. An empty or whitespace-only string counts as
 * filled.
 */
export type DataSlotCheckResult = Readonly<{
  rowCount: number;
  filledCountsByAttributeKey: Readonly<Record<string, number>>;
  sampleRows: ReadonlyArray<Readonly<Record<string, unknown>>>;
}>;

type DataSlotCheckOptions = {
  workspaceId: Workspace.Id;
  slot: PluginDataSlot;
  source: DataSlotSource;
  fieldsByAttributeKey: Readonly<
    Record<string, DataSlotSourceField | undefined>
  >;
};

/** A DuckDB count, which the query session may return as a bigint. */
function _getNumberFromCount(value: unknown): number {
  return typeof value === "bigint" || typeof value === "number"
    ? Number(value)
    : 0;
}

/**
 * Counts every row, and each attribute's non-null rows, of a slot query whose
 * columns are named by position (`attr_0`, ...). Positional names keep the
 * counts apart for attribute keys that differ only in case, which DuckDB
 * would treat as one column.
 */
function _buildCountsSql(
  options: Readonly<{ attributeCount: number; slotSql: string }>,
): string {
  const filledCounts = Array.from(
    { length: options.attributeCount },
    (_unused, index) => {
      return `count(attr_${index}) AS filled_count_${index}`;
    },
  );
  return [
    `SELECT count(*) AS row_count, ${filledCounts.join(", ")}`,
    `FROM (${options.slotSql}) AS slot_rows`,
  ].join("\n");
}

/**
 * Runs a data slot's query on a mapping before it is saved, and reports
 * what it reads: the row count, each attribute's filled count, and the
 * first rows. Use it wherever an admin is choosing a slot's fields, for
 * example the install wizard's data slot step.
 */
export async function checkDataSlotBinding(
  options: Readonly<DataSlotCheckOptions>,
): Promise<DataSlotCheckResult> {
  const { workspaceId, slot, source, fieldsByAttributeKey } = options;
  const attributeKeys = Object.keys(slot.attributes);
  const mappedFields = Object.values(fieldsByAttributeKey).filter(isDefined);
  // With nothing mapped this is `undefined`, which loads every source column.
  // An empty list would ask the query engine to load a dataset with zero
  // columns, a path nothing else exercises, so the safe default is kept.
  const fields = mappedFields.length > 0 ? mappedFields : undefined;
  const countedSlotSql = makeDataSlotSqlFromBinding({
    slot,
    source,
    fieldsByAttributeKey,
    aliasStyle: "position",
  });
  const counts = await runDataSlotQuery({
    workspaceId,
    source,
    fields,
    sql: _buildCountsSql({
      attributeCount: attributeKeys.length,
      slotSql: countedSlotSql,
    }),
  });
  const sample = await runDataSlotQuery({
    workspaceId,
    source,
    fields,
    sql: makeDataSlotSqlFromBinding({
      slot,
      source,
      fieldsByAttributeKey,
      limit: SAMPLE_ROW_COUNT,
    }),
  });
  const countsRow = counts.data[0] ?? {};
  return {
    rowCount: _getNumberFromCount(countsRow.row_count),
    filledCountsByAttributeKey: Object.fromEntries(
      attributeKeys.map((attributeKey, index) => {
        return [
          attributeKey,
          _getNumberFromCount(countsRow[`filled_count_${index}`]),
        ];
      }),
    ),
    sampleRows: sample.data,
  };
}
