import { isDefined } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
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
 * Counts every row, and each attribute's non-null rows, of the slot query.
 * Counts are aliased by position, so attribute keys that differ only in
 * case cannot collide.
 */
function _makeCountsSql(
  options: Readonly<{ attributeKeys: readonly string[]; slotSql: string }>,
): string {
  const filledCounts = options.attributeKeys.map((attributeKey, index) => {
    return `count(${quoteSqlIdentifier(attributeKey)}) AS filled_count_${index}`;
  });
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
  const fields = mappedFields.length > 0 ? mappedFields : undefined;
  const slotSql = makeDataSlotSqlFromBinding({
    slot,
    source,
    fieldsByAttributeKey,
  });
  const counts = await runDataSlotQuery({
    workspaceId,
    source,
    fields,
    sql: _makeCountsSql({ attributeKeys, slotSql }),
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
